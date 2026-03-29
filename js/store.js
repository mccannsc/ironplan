/**
 * IronPlan Store – Supabase-backed state management.
 *
 * In-memory state is the source of truth for the UI; Supabase is synced in the
 * background.  activeSession is persisted to localStorage only (it's transient).
 */

import { supabase } from './lib/supabase.js';
import { debounce } from './utils.js';
import { DEFAULT_WORKOUTS } from './data/defaults.js';

const SESSION_KEY  = 'ironplan_session_v1';
const SEQUENCE_KEY = 'ironplan_sequence_v1';

const DEFAULT_STATE = {
  workouts: [],
  workoutLogs: [],
  activeSession: null,
};

let _state = { ...DEFAULT_STATE, activeSession: _loadSession() };
let _userId = null;
const _listeners = new Set();
let _notes = {};          // exerciseId → note string
let _bodyweightLogs = []; // [{ id, date, weight }]
let _sequence = _loadSequence(); // ordered workout IDs for rotation

function _loadSequence() {
  try { return JSON.parse(localStorage.getItem(SEQUENCE_KEY)) || []; }
  catch (_) { return []; }
}

function _saveSequence(ids) {
  try { localStorage.setItem(SEQUENCE_KEY, JSON.stringify(ids)); }
  catch (_) { /* ignore */ }
}

// ─── Session (localStorage only) ────────────────────────────────────────────

function _loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function _saveSession(session) {
  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (_) { /* ignore */ }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function _notify() {
  _listeners.forEach(fn => fn(_state));
}

function _set(updater) {
  _state = typeof updater === 'function' ? updater(_state) : { ..._state, ...updater };
  _notify();
}

// ─── Supabase sync helpers ───────────────────────────────────────────────────

async function _upsertWorkout(workout) {
  if (!_userId) return;
  const { error } = await supabase.from('workouts').upsert({
    id: workout.id,
    user_id: _userId,
    name: workout.name,
    exercises: workout.exercises,
  });
  if (error) console.error('Workout sync error:', error);
}

async function _deleteWorkoutRemote(id) {
  if (!_userId) return;
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) console.error('Workout delete error:', error);
}

async function _upsertLog(log) {
  if (!_userId) return;
  const { error } = await supabase.from('workout_logs').upsert({
    id: log.id,
    user_id: _userId,
    workout_id: log.workout_id,
    date: log.date,
    started_at: log.started_at,
    completed_at: log.completed_at ?? null,
    completed: log.completed,
    exercises: log.exercises,
  });
  if (error) console.error('Log sync error:', error);
}

// Debounced session sync – avoids hammering Supabase on every set tap
const _syncSessionDebounced = debounce((session) => {
  if (session) _upsertLog(session);
}, 1000);

// ─── Public API ─────────────────────────────────────────────────────────────

export const Store = {

  /**
   * Load all user data from Supabase. Must be called once after sign-in.
   */
  async init(userId) {
    _userId = userId;

    const [
      { data: workouts, error: we },
      { data: logs, error: le },
      { data: notes },
      { data: bwLogs },
    ] = await Promise.all([
      supabase.from('workouts').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('workout_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('exercise_notes').select('*').eq('user_id', userId),
      supabase.from('bodyweight_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
    ]);

    if (we) console.error('Workouts fetch error:', we);
    if (le) console.error('Logs fetch error:', le);

    _notes = {};
    (notes ?? []).forEach(n => { _notes[n.exercise_id] = n.note; });
    _bodyweightLogs = bwLogs ?? [];

    _set({
      workouts: workouts ?? [],
      workoutLogs: logs ?? [],
    });
  },

  getState() { return _state; },

  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  // ── Workouts ──────────────────────────────────────────────────────────────

  addWorkout(workout) {
    _set(s => ({ workouts: [...s.workouts, workout] }));
    _upsertWorkout(workout);
  },

  updateWorkout(id, updates) {
    _set(s => ({
      workouts: s.workouts.map(w => w.id === id ? { ...w, ...updates } : w),
    }));
    const updated = _state.workouts.find(w => w.id === id);
    if (updated) _upsertWorkout(updated);
  },

  deleteWorkout(id) {
    // Remove from rotation sequence
    _sequence = _sequence.filter(sid => sid !== id);
    _saveSequence(_sequence);

    _set(s => ({
      workouts: s.workouts.filter(w => w.id !== id),
      workoutLogs: s.workoutLogs.filter(l => l.workout_id !== id),
    }));
    _deleteWorkoutRemote(id);
    // Also remove logs from Supabase
    if (_userId) {
      supabase.from('workout_logs').delete().eq('workout_id', id).then(({ error }) => {
        if (error) console.error('Log delete error:', error);
      });
    }
  },

  getWorkout(id) {
    return _state.workouts.find(w => w.id === id) || null;
  },

  // ── Default Workouts + Sequence ───────────────────────────────────────────

  /**
   * Create the 4 default workouts if the user has none.
   * Uses a single batch state update to avoid clobbering workoutLogs.
   * Sets the rotation sequence in localStorage.
   */
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

    // Single _set preserves workoutLogs, activeSession, etc.
    _set(s => ({ ...s, workouts: [...s.workouts, ...newWorkouts] }));

    _sequence = newWorkouts.map(w => w.id);
    _saveSequence(_sequence);

    // Sync all to Supabase in background
    newWorkouts.forEach(w => _upsertWorkout(w));
  },

  /** Returns the next workout to do based on rotation sequence + last completed log */
  getNextWorkout() {
    // Filter sequence to workouts that still exist
    const validSeq = _sequence.filter(id => _state.workouts.some(w => w.id === id));

    // Fall back to first workout if no sequence set
    if (validSeq.length === 0) {
      return _state.workouts[0] || null;
    }

    // Find most recent completed log whose workout is in the sequence
    const lastLog = [..._state.workoutLogs]
      .filter(l => l.completed && validSeq.includes(l.workout_id))
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (!lastLog) {
      // No history → start at beginning
      return _state.workouts.find(w => w.id === validSeq[0]) || null;
    }

    const currentIdx = validSeq.indexOf(lastLog.workout_id);
    const nextId = validSeq[(currentIdx + 1) % validSeq.length];
    return _state.workouts.find(w => w.id === nextId) || null;
  },

  // ── Sessions / Logging ────────────────────────────────────────────────────

  startSession(workoutLog) {
    _set({ activeSession: workoutLog });
    _saveSession(workoutLog);
    _upsertLog(workoutLog);
  },

  updateSession(session) {
    _set({ activeSession: session });
    _saveSession(session);
    _syncSessionDebounced(session);
  },

  completeSession() {
    const session = _state.activeSession;
    if (!session) return;
    const completed = { ...session, completed: true, completed_at: new Date().toISOString() };
    _set(s => ({
      workoutLogs: [...s.workoutLogs, completed],
      activeSession: null,
    }));
    _saveSession(null);
    _upsertLog(completed);
    return completed;
  },

  cancelSession() {
    const session = _state.activeSession;
    _set({ activeSession: null });
    _saveSession(null);
    // Delete the in-progress log from Supabase
    if (_userId && session?.id) {
      supabase.from('workout_logs').delete().eq('id', session.id).then(({ error }) => {
        if (error) console.error('Session cancel error:', error);
      });
    }
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

  /** Get last N exercise logs for an exercise, most recent first */
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

  /** Get the all-time best completed set for an exercise: highest weight, then most reps */
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
        if (
          !best ||
          s.weight > best.weight ||
          (s.weight === best.weight && s.reps > best.reps)
        ) {
          best = { weight: s.weight, reps: s.reps };
        }
      }
    }
    return best;
  },

  // ── Progress Flags ────────────────────────────────────────────────────────

  /** Compare last 3 sessions for an exercise. Returns 'green'|'amber'|'red'|null */
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

  /** Return a plateau suggestion string, or null if no plateau */
  getPlateauSuggestion(exerciseId) {
    const flag = Store.getProgressFlag(exerciseId);
    if (!flag || flag === 'green') return null;

    // Check for 4+ stalled sessions
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

  // ── Exercise Notes ────────────────────────────────────────────────────────

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

  // ── Weekly Stats & Bodyweight ─────────────────────────────────────────────

  getWeeklyStats() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
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

    const lastCompleted = [..._state.workoutLogs]
      .filter(l => l.completed && l.started_at && l.completed_at)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;

    return {
      thisWeek: {
        workouts: thisWeekLogs.length,
        volume: calcVolume(thisWeekLogs),
        sets: countSets(thisWeekLogs),
        avgDurationMins: calcAvgDurationMins(thisWeekLogs),
      },
      prevWeek: {
        workouts: prevWeekLogs.length,
        volume: calcVolume(prevWeekLogs),
      },
      latestBodyweight: _bodyweightLogs[0] || null,
      lastWorkoutDurationMins: lastCompleted
        ? Math.floor((new Date(lastCompleted.completed_at) - new Date(lastCompleted.started_at)) / 60000)
        : null,
    };
  },

  async addBodyweight(weight) {
    const date = new Date().toISOString().slice(0, 10);
    _bodyweightLogs = [{ date, weight }, ..._bodyweightLogs.filter(b => b.date !== date)];
    if (!_userId) return;
    const { error } = await supabase.from('bodyweight_logs').upsert(
      { user_id: _userId, date, weight },
      { onConflict: 'user_id,date' }
    );
    if (error) console.error('Bodyweight save error:', error);
  },

  // ── Dev helpers ───────────────────────────────────────────────────────────

  clearAll() {
    _state = { ...DEFAULT_STATE };
    localStorage.removeItem(SESSION_KEY);
    _notify();
  },
};

// Expose for debugging
if (typeof window !== 'undefined') window._IronPlanStore = Store;
