/**
 * IronPlan Store – Supabase-backed state management.
 *
 * Persistence:
 *   - Workout templates  → localStorage (WORKOUTS_KEY). Supabase `workouts` gets
 *     {id, user_id, name} only (no exercises JSONB — that column doesn't exist).
 *   - Completed sessions → Supabase `workout_sessions` + `set_logs`.
 *   - Active session     → localStorage only (transient; written to Supabase on
 *     completeSession / addWorkoutLog).
 *
 * All Supabase ID columns are UUID type.  Text IDs from uid() are mapped to
 * deterministic UUIDs via _textToUUID(ns, key) so the same text ID always
 * produces the same UUID without needing to store the mapping.
 */

import { supabase } from './lib/supabase.js';
import { DEFAULT_WORKOUTS } from './data/defaults.js';
import { EXERCISES } from './data/exercises.js?v=6';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const SESSION_KEY   = 'ironplan_session_v1';
const WORKOUTS_KEY  = 'ironplan_workouts_v2';
const EX_SEEDED_KEY = 'ironplan_ex_seeded_v1';

// ─── State ────────────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  workouts:    [],
  workoutLogs: [],
  activeSession: null,
};

let _state  = { ...DEFAULT_STATE, activeSession: _loadSession() };
let _userId = null;
const _listeners = new Set();
let _notes        = {};
let _bodyweightLogs = [];

// ─── Deterministic UUID helper ────────────────────────────────────────────────
// Produces a stable UUID-format string from any (namespace, key) pair.
// Uses FNV-1a 32-bit hashed 4× (128 bits total) — no async crypto needed.

function _textToUUID(ns, key) {
  const str = ns + ':' + key;
  function fnv32(s, offset) {
    let h = (offset || 2166136261) >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }
  const a = fnv32(str).toString(16).padStart(8, '0');
  const b = fnv32(str + '\x01').toString(16).padStart(8, '0');
  const c = fnv32(str + '\x02').toString(16).padStart(8, '0');
  const d = fnv32(str + '\x03').toString(16).padStart(8, '0');
  const h = a + b + c + d; // 32 hex chars = 128 bits
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

// If a string already looks like a UUID, return it unchanged; otherwise map it.
function _toSessionUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id
    : _textToUUID('ip-s', id);
}

// ─── Exercise UUID reverse-map ────────────────────────────────────────────────
// Build once: UUID → exercise text ID (for converting set_logs back to in-memory format)

const _exUUIDtoTextId = {};
EXERCISES.forEach(ex => {
  _exUUIDtoTextId[_textToUUID('ip-ex', ex.id)] = ex.id;
});

// ─── localStorage helpers ─────────────────────────────────────────────────────

function _loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function _saveSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else         localStorage.removeItem(SESSION_KEY);
  } catch (_) { /* ignore */ }
}

function _loadWorkoutsLocal() {
  try {
    const raw = localStorage.getItem(WORKOUTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function _saveWorkoutsLocal(workouts) {
  try { localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts)); }
  catch (_) { /* ignore */ }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _notify() { _listeners.forEach(fn => fn(_state)); }

function _set(updater) {
  _state = typeof updater === 'function' ? updater(_state) : { ..._state, ...updater };
  _notify();
}

// ─── Supabase: workout sync ───────────────────────────────────────────────────

async function _upsertWorkout(workout) {
  if (!_userId) return;
  const { error } = await supabase.from('workouts').upsert({
    id:      _textToUUID('ip-wk', workout.id),
    user_id: _userId,
    name:    workout.name,
  }, { onConflict: 'id' });
  if (error) console.error('Workout sync error:', error);
}

async function _deleteWorkoutRemote(id) {
  if (!_userId) return;
  const wkUUID = _textToUUID('ip-wk', id);
  // Cascade on workout_sessions (and their set_logs) is handled by Supabase FK
  supabase.from('workout_sessions').delete().eq('workout_id', wkUUID).then(({ error }) => {
    if (error) console.error('Sessions delete error:', error);
  });
  const { error } = await supabase.from('workouts').delete().eq('id', wkUUID);
  if (error) console.error('Workout delete error:', error);
}

// ─── Supabase: session & set-log sync ─────────────────────────────────────────

async function _upsertSession(session) {
  if (!_userId) return;
  const { error } = await supabase.from('workout_sessions').upsert({
    id:         _toSessionUUID(session.id),
    user_id:    _userId,
    workout_id: _textToUUID('ip-wk', session.workout_id),
    date:       session.date,
  }, { onConflict: 'id' });
  if (error) console.error('Session upsert error:', error);
}

async function _insertSetLogs(sessionTextId, exercises) {
  if (!_userId || !exercises?.length) return;
  const sessionUUID = _toSessionUUID(sessionTextId);
  const rows = [];
  for (const exLog of exercises) {
    const exId   = exLog.substituted_exercise_id || exLog.exercise_id;
    const exUUID = _textToUUID('ip-ex', exId);
    (exLog.sets || []).forEach((s, i) => {
      if (!s.completed) return;
      rows.push({
        id:         _textToUUID('ip-sl', `${sessionTextId}:${exId}:${i}`),
        session_id: sessionUUID,
        exercise_id: exUUID,
        weight:     s.weight || 0,
        reps:       s.reps   || 0,
        set_number: i + 1,
      });
    });
  }
  if (!rows.length) return;
  const { error } = await supabase.from('set_logs').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Set logs insert error:', error);
}

async function _deleteSetLogs(sessionId) {
  if (!_userId) return;
  const { error } = await supabase.from('set_logs').delete().eq('session_id', _toSessionUUID(sessionId));
  if (error) console.error('Set logs delete error:', error);
}

// ─── Supabase: exercises table seed ──────────────────────────────────────────
// set_logs.exercise_id FKs to exercises.id — seed once per device.

async function _seedExercisesIfNeeded() {
  if (!_userId) return;
  if (localStorage.getItem(EX_SEEDED_KEY)) return;

  // Check if already seeded (another device may have done it)
  const { count } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
  if (count > 0) {
    localStorage.setItem(EX_SEEDED_KEY, '1');
    return;
  }

  const rows = EXERCISES.map(ex => ({
    id:             _textToUUID('ip-ex', ex.id),
    name:           ex.name,
    primary_muscle: ex.primary_muscle,
    equipment:      ex.equipment  || null,
    pattern:        ex.pattern    || null,
  }));

  // ignoreDuplicates: true → INSERT ON CONFLICT DO NOTHING (no UPDATE policy needed)
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('exercises').upsert(
      rows.slice(i, i + 50),
      { onConflict: 'id', ignoreDuplicates: true }
    );
    if (error) {
      console.error('Exercise seed error:', error);
      return;
    }
  }
  localStorage.setItem(EX_SEEDED_KEY, '1');
}

// ─── DB row → in-memory log ───────────────────────────────────────────────────
// Converts a workout_sessions row (with nested set_logs) into the log shape
// the rest of the app expects.

function _sessionRowToLog(ws, wkUUIDtoTextId) {
  const textWorkoutId = wkUUIDtoTextId[ws.workout_id] || ws.workout_id;

  // Group set_logs by exercise UUID → text ID
  const exMap = {};
  for (const sl of (ws.set_logs || [])) {
    const textExId = _exUUIDtoTextId[sl.exercise_id] || sl.exercise_id;
    if (!exMap[textExId]) exMap[textExId] = [];
    exMap[textExId].push(sl);
  }

  const exercises = Object.entries(exMap).map(([exId, sets]) => ({
    exercise_id: exId,
    sets: sets
      .sort((a, b) => a.set_number - b.set_number)
      .map(s => ({ weight: s.weight, reps: s.reps, completed: true })),
  }));

  return {
    id:           ws.id,          // UUID string — used as logId in routes
    workout_id:   textWorkoutId,
    date:         ws.date.slice(0, 10), // normalize '2026-04-11T00:00:00' → '2026-04-11'
    started_at:   null,
    completed_at: null,
    completed:    true,
    exercises,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const Store = {

  /**
   * Load all user data. Must be called once after sign-in.
   */
  async init(userId) {
    _userId = userId;

    // Workouts live in localStorage (exercises/rep_range not in Supabase schema)
    const localWorkouts = _loadWorkoutsLocal();

    // Seed exercises table for FK integrity (no-op if already done)
    await _seedExercisesIfNeeded();

    // Fetch completed sessions + their set_logs, plus side-data
    const [
      { data: sessions, error: se },
      { data: notes },
      { data: bwLogs },
    ] = await Promise.all([
      supabase.from('workout_sessions')
        .select('*, set_logs(*)')
        .eq('user_id', userId)
        .order('date', { ascending: false }),
      supabase.from('exercise_notes').select('*').eq('user_id', userId),
      supabase.from('bodyweight_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
    ]);

    if (se) console.error('Sessions fetch error:', se);

    _notes = {};
    (notes ?? []).forEach(n => { _notes[n.exercise_id] = n.note; });
    _bodyweightLogs = bwLogs ?? [];

    // Build UUID → text ID map for workouts (to reverse-map workout_sessions.workout_id)
    const wkUUIDtoTextId = {};
    localWorkouts.forEach(w => {
      wkUUIDtoTextId[_textToUUID('ip-wk', w.id)] = w.id;
    });

    const workoutLogs = (sessions ?? []).map(ws => _sessionRowToLog(ws, wkUUIDtoTextId));

    _set({ workouts: localWorkouts, workoutLogs });
  },

  getState() { return _state; },

  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  // ── Workouts ───────────────────────────────────────────────────────────────

  addWorkout(workout) {
    _set(s => ({ workouts: [...s.workouts, workout] }));
    _saveWorkoutsLocal(_state.workouts);
    _upsertWorkout(workout);
  },

  updateWorkout(id, updates) {
    _set(s => ({
      workouts: s.workouts.map(w => w.id === id ? { ...w, ...updates } : w),
    }));
    _saveWorkoutsLocal(_state.workouts);
    const updated = _state.workouts.find(w => w.id === id);
    if (updated) _upsertWorkout(updated);
  },

  deleteWorkout(id) {
    _set(s => ({
      workouts:    s.workouts.filter(w => w.id !== id),
      workoutLogs: s.workoutLogs.filter(l => l.workout_id !== id),
    }));
    _saveWorkoutsLocal(_state.workouts);
    _deleteWorkoutRemote(id);
  },

  getWorkout(id) {
    return _state.workouts.find(w => w.id === id) || null;
  },

  // ── Default workouts ───────────────────────────────────────────────────────

  seedDefaultWorkouts() {
    if (_state.workouts.length > 0) return;
    const newWorkouts = DEFAULT_WORKOUTS.map((def, i) => {
      const id = (Date.now() + i).toString(36) + Math.random().toString(36).slice(2, 7);
      return {
        id,
        name: def.name,
        order_position: def.order_position,
        exercises: def.exercises.map((e, j) => ({
          id: id + '_' + j,
          exercise_id: e.exercise_id,
          sets: e.sets,
          rep_range: e.rep_range,
          notes: '',
          order: j,
        })),
        created_at: new Date().toISOString(),
      };
    });
    _set(s => ({ ...s, workouts: [...s.workouts, ...newWorkouts] }));
    _saveWorkoutsLocal(_state.workouts);
    newWorkouts.forEach(w => _upsertWorkout(w));
  },

  getNextWorkout() {
    const { workouts, workoutLogs } = _state;
    if (!workouts.length) return null;

    const ordered = [...workouts].sort((a, b) => {
      const pa = a.order_position ?? 9999;
      const pb = b.order_position ?? 9999;
      return pa !== pb ? pa - pb : 0;
    });

    const lastLog = [...workoutLogs]
      .filter(l => l.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (!lastLog) return ordered[0];

    const idx = ordered.findIndex(w => w.id === lastLog.workout_id);
    if (idx === -1) return ordered[0];

    return ordered[(idx + 1) % ordered.length];
  },

  // ── Sessions / Logging ─────────────────────────────────────────────────────

  startSession(workoutLog) {
    _set({ activeSession: workoutLog });
    _saveSession(workoutLog);
    // Active (in-progress) sessions are localStorage-only until completed
  },

  updateSession(session) {
    _set({ activeSession: session });
    _saveSession(session);
    // No Supabase sync mid-workout — only on complete
  },

  completeSession() {
    const session = _state.activeSession;
    if (!session) return;
    const completed = { ...session, completed: true, completed_at: new Date().toISOString() };
    _set(s => ({
      workoutLogs: [...s.workoutLogs.filter(l => l.id !== completed.id), completed],
      activeSession: null,
    }));
    _saveSession(null);
    // Persist to Supabase
    _upsertSession(completed).then(() => {
      _insertSetLogs(completed.id, completed.exercises || []);
    });
    return completed;
  },

  cancelSession() {
    _set({ activeSession: null });
    _saveSession(null);
    // No row to clean up in Supabase (never written mid-session)
  },

  getLastLog(workoutId) {
    const logs = _state.workoutLogs
      .filter(l => l.workout_id === workoutId && l.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return logs[0] || null;
  },

  getWorkoutLogs(workoutId) {
    return _state.workoutLogs
      .filter(l => l.workout_id === workoutId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  updateWorkoutLog(logId, updates) {
    _set(s => ({
      workoutLogs: s.workoutLogs.map(l => l.id === logId ? { ...l, ...updates } : l),
    }));
    const updated = _state.workoutLogs.find(l => l.id === logId);
    if (updated) {
      _upsertSession(updated).then(() => {
        _deleteSetLogs(updated.id).then(() => {
          _insertSetLogs(updated.id, updated.exercises || []);
        });
      });
    }
  },

  addWorkoutLog(log) {
    _set(s => ({ workoutLogs: [...s.workoutLogs, log] }));
    _upsertSession(log).then(() => {
      _insertSetLogs(log.id, log.exercises || []);
    });
  },

  // ── Exercise data ──────────────────────────────────────────────────────────

  getLastNExerciseLogs(exerciseId, n = 3) {
    return _state.workoutLogs
      .filter(l => l.completed && l.exercises.some(e =>
        e.exercise_id === exerciseId || e.substituted_exercise_id === exerciseId
      ))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, n)
      .map(log => {
        const ex = log.exercises.find(e =>
          e.exercise_id === exerciseId || e.substituted_exercise_id === exerciseId
        );
        return ex ? { ...ex, date: log.date } : null;
      })
      .filter(Boolean);
  },

  getLastExerciseLog(exerciseId) {
    let best = null;
    for (const log of _state.workoutLogs) {
      if (!log.completed) continue;
      const found = log.exercises.find(e => e.exercise_id === exerciseId);
      if (found) {
        if (!best || new Date(log.date) > new Date(best.date)) {
          best = { ...found, date: log.date };
        }
      }
    }
    return best;
  },

  getBestLift(exerciseId) {
    let best = null;
    for (const log of _state.workoutLogs) {
      if (!log.completed) continue;
      const exLog = log.exercises.find(e =>
        e.exercise_id === exerciseId || e.substituted_exercise_id === exerciseId
      );
      if (!exLog) continue;
      for (const s of exLog.sets) {
        if (!s.completed) continue;
        if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
          best = { weight: s.weight, reps: s.reps };
        }
      }
    }
    return best;
  },

  // ── Progress flags ─────────────────────────────────────────────────────────

  getProgressFlag(exerciseId) {
    const relevant = _state.workoutLogs
      .filter(l => l.completed && l.exercises.some(e =>
        e.exercise_id === exerciseId || e.substituted_exercise_id === exerciseId
      ))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);

    if (relevant.length < 2) return null;

    const bests = relevant.map(session => {
      const ex = session.exercises.find(e =>
        e.exercise_id === exerciseId || e.substituted_exercise_id === exerciseId
      );
      const completed = ex?.sets.filter(s => s.completed) || [];
      if (!completed.length) return null;
      const maxW = Math.max(...completed.map(s => s.weight));
      const maxR = Math.max(...completed.filter(s => s.weight === maxW).map(s => s.reps));
      return { weight: maxW, reps: maxR };
    }).filter(Boolean);

    if (bests.length < 2) return null;
    const [a, b] = bests;
    if (a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps)) return 'green';
    if (a.weight < b.weight || (a.weight === b.weight && a.reps < b.reps)) return 'red';
    return 'amber';
  },

  getPlateauSuggestion(exerciseId) {
    const flag = Store.getProgressFlag(exerciseId);
    if (!flag || flag === 'green') return null;

    const relevant = _state.workoutLogs
      .filter(l => l.completed && l.exercises.some(e =>
        e.exercise_id === exerciseId || e.substituted_exercise_id === exerciseId
      ))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    if (relevant.length >= 4) {
      const bests = relevant.map(session => {
        const ex = session.exercises.find(e =>
          e.exercise_id === exerciseId || e.substituted_exercise_id === exerciseId
        );
        const completed = ex?.sets.filter(s => s.completed) || [];
        if (!completed.length) return null;
        const maxW = Math.max(...completed.map(s => s.weight));
        const maxR = Math.max(...completed.filter(s => s.weight === maxW).map(s => s.reps));
        return { weight: maxW, reps: maxR };
      }).filter(Boolean);

      if (bests.length >= 4) {
        const newest = bests[0];
        const oldest = bests[bests.length - 1];
        if (newest.weight <= oldest.weight && newest.reps <= oldest.reps) {
          return 'No progress in 4+ sessions — consider swapping this exercise.';
        }
      }
    }

    if (flag === 'red') return 'Weight dropped — reduce 5–10% and rebuild.';
    return 'Stalled — aim for one more rep before adding weight.';
  },

  // ── Exercise notes ─────────────────────────────────────────────────────────

  getNote(exerciseId) {
    return _notes[exerciseId] || '';
  },

  async saveNote(exerciseId, note) {
    _notes[exerciseId] = note;
    if (!_userId) return;
    const { error } = await supabase.from('exercise_notes').upsert(
      { user_id: _userId, exercise_id: exerciseId, note, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,exercise_id' }
    );
    if (error) console.error('Note save error:', error);
  },

  // ── Bodyweight ─────────────────────────────────────────────────────────────

  getBodyweightLogs() {
    return _bodyweightLogs;
  },

  async addBodyweight(weight, date = null) {
    const d = date || new Date().toISOString().slice(0, 10);
    _bodyweightLogs = [
      { date: d, weight },
      ..._bodyweightLogs.filter(b => b.date !== d),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!_userId) return;
    const { error } = await supabase.from('bodyweight_logs').upsert(
      { user_id: _userId, date: d, weight },
      { onConflict: 'user_id,date' }
    );
    if (error) console.error('Bodyweight save error:', error);
  },

  // ── Weekly stats ───────────────────────────────────────────────────────────

  getWeeklyStats() {
    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);

    function toDate(str) { return new Date(str + 'T00:00:00'); }

    const thisWeekLogs = _state.workoutLogs.filter(l =>
      l.completed && toDate(l.date) >= weekStart
    );
    const prevWeekLogs = _state.workoutLogs.filter(l =>
      l.completed && toDate(l.date) >= prevWeekStart && toDate(l.date) < weekStart
    );

    function calcVolume(logs) {
      return Math.round(logs.reduce((total, log) =>
        total + log.exercises.reduce((et, ex) =>
          et + ex.sets.filter(s => s.completed).reduce((st, s) => st + s.weight * s.reps, 0)
        , 0)
      , 0));
    }

    function countSets(logs) {
      return logs.reduce((n, l) =>
        n + l.exercises.reduce((et, ex) => et + ex.sets.filter(s => s.completed).length, 0)
      , 0);
    }

    function calcAvgDurationMins(logs) {
      const withDur = logs.filter(l => l.started_at && l.completed_at);
      if (!withDur.length) return null;
      const total = withDur.reduce((sum, l) =>
        sum + Math.floor((new Date(l.completed_at) - new Date(l.started_at)) / 60000)
      , 0);
      return Math.round(total / withDur.length);
    }

    return {
      thisWeek: {
        workouts:        thisWeekLogs.length,
        volume:          calcVolume(thisWeekLogs),
        sets:            countSets(thisWeekLogs),
        avgDurationMins: calcAvgDurationMins(thisWeekLogs),
      },
      prevWeek: {
        workouts: prevWeekLogs.length,
        volume:   calcVolume(prevWeekLogs),
      },
      latestBodyweight: _bodyweightLogs[0] || null,
      lastWorkoutDurationMins: null, // no timestamps in workout_sessions schema
    };
  },

  getThisWeekLogs() {
    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);
    function toDate(str) { return new Date(str + 'T00:00:00'); }
    return _state.workoutLogs
      .filter(l => l.completed && toDate(l.date) >= weekStart)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  getPBsThisWeek() {
    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);
    function toDate(str) { return new Date(str + 'T00:00:00'); }

    const thisWeekLogs = _state.workoutLogs.filter(l =>
      l.completed && toDate(l.date) >= weekStart
    );
    if (!thisWeekLogs.length) return [];

    const prevBests = {};
    for (const log of _state.workoutLogs) {
      if (!log.completed || toDate(log.date) >= weekStart) continue;
      for (const exLog of log.exercises) {
        const exId = exLog.substituted_exercise_id || exLog.exercise_id;
        for (const s of exLog.sets) {
          if (!s.completed || s.weight === 0) continue;
          if (!prevBests[exId] || s.weight > prevBests[exId].weight ||
              (s.weight === prevBests[exId].weight && s.reps > prevBests[exId].reps)) {
            prevBests[exId] = { weight: s.weight, reps: s.reps };
          }
        }
      }
    }

    const pbs = {};
    for (const log of thisWeekLogs) {
      for (const exLog of log.exercises) {
        const exId = exLog.substituted_exercise_id || exLog.exercise_id;
        for (const s of exLog.sets) {
          if (!s.completed || s.weight === 0) continue;
          const prev = prevBests[exId];
          const isNewPB = !prev || s.weight > prev.weight ||
            (s.weight === prev.weight && s.reps > prev.reps);
          if (isNewPB) {
            if (!pbs[exId] || s.weight > pbs[exId].weight ||
                (s.weight === pbs[exId].weight && s.reps > pbs[exId].reps)) {
              pbs[exId] = { exerciseId: exId, weight: s.weight, reps: s.reps };
            }
          }
        }
      }
    }
    return Object.values(pbs);
  },

  // ── Dev helpers ────────────────────────────────────────────────────────────

  clearAll() {
    _state = { ...DEFAULT_STATE };
    localStorage.removeItem(SESSION_KEY);
    _notify();
  },
};

// Expose for debugging
if (typeof window !== 'undefined') window._IronPlanStore = Store;
