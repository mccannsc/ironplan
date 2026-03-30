/**
 * IronPlan Store – offline-first state management.
 *
 * Data flow on init:
 *   1. Load IndexedDB immediately → UI renders with local data (works offline)
 *   2. Refresh from Supabase in background → merges remote data
 *
 * Data flow on write:
 *   1. Update in-memory state → UI re-renders immediately
 *   2. Write to IndexedDB → persists locally
 *   3. Try Supabase → if offline or fails, enqueue for later sync
 *
 * Sync queue is processed automatically when app comes back online.
 */

import { supabase } from './lib/supabase.js';
import { debounce } from './utils.js';
import { DEFAULT_WORKOUTS } from './data/defaults.js';
import {
  idbGetAll, idbPut, idbPutMany, idbDelete,
  idbEnqueue, idbGetByStatus, idbCountByStatus, idbUpdateQueueItem,
} from './lib/idb.js';

const SESSION_KEY  = 'ironplan_session_v1';
const SEQUENCE_KEY = 'ironplan_sequence_v1';

const DEFAULT_STATE = {
  workouts: [],
  workoutLogs: [],
  activeSession: null,
};

let _state    = { ...DEFAULT_STATE, activeSession: _loadSession() };
let _userId   = null;
const _listeners = new Set();
let _notes    = {};
let _bodyweightLogs = [];
let _sequence = _loadSequence();

// ─── Sync status ─────────────────────────────────────────────────────────────

let _syncStatus = navigator.onLine ? 'online' : 'offline';
const _syncListeners = new Set();

function _setSyncStatus(s) {
  if (_syncStatus === s) return;
  _syncStatus = s;
  _syncListeners.forEach(fn => fn(s));
}

// ─── Sequence (localStorage) ─────────────────────────────────────────────────

function _loadSequence() {
  try { return JSON.parse(localStorage.getItem(SEQUENCE_KEY)) || []; }
  catch (_) { return []; }
}

function _saveSequence(ids) {
  try { localStorage.setItem(SEQUENCE_KEY, JSON.stringify(ids)); } catch (_) {}
}

// ─── Active session (localStorage) ───────────────────────────────────────────

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
  } catch (_) {}
}

// ─── Internal state helpers ───────────────────────────────────────────────────

function _notify() { _listeners.forEach(fn => fn(_state)); }

function _set(updater) {
  _state = typeof updater === 'function' ? updater(_state) : { ..._state, ...updater };
  _notify();
}

// ─── IDB + Supabase write helpers ────────────────────────────────────────────
// Pattern: write to IDB immediately, try Supabase, queue if offline/fails.

async function _upsertWorkout(workout) {
  idbPut('workouts', workout).catch(() => {});
  if (!_userId) return;
  if (!navigator.onLine) {
    idbEnqueue({ action_type: 'upsert_workout', payload: workout }).catch(() => {});
    return;
  }
  const { error } = await supabase.from('workouts').upsert({
    id: workout.id, user_id: _userId, name: workout.name, exercises: workout.exercises,
  });
  if (error) {
    console.error('Workout sync error:', error);
    idbEnqueue({ action_type: 'upsert_workout', payload: workout }).catch(() => {});
  }
}

async function _deleteWorkoutRemote(id) {
  idbDelete('workouts', id).catch(() => {});
  if (!_userId) return;
  if (!navigator.onLine) {
    idbEnqueue({ action_type: 'delete_workout', payload: { id } }).catch(() => {});
    return;
  }
  const { error } = await supabase.from('workouts').delete().eq('id', id).eq('user_id', _userId);
  if (error) {
    console.error('Workout delete error:', error);
    idbEnqueue({ action_type: 'delete_workout', payload: { id } }).catch(() => {});
  }
}

async function _upsertLog(log) {
  // Only persist completed logs to IDB; in-progress stays in session localStorage
  if (log.completed) {
    idbPut('workout_logs', log).catch(() => {});
  }
  if (!_userId) return;
  if (!navigator.onLine) {
    if (log.completed) idbEnqueue({ action_type: 'upsert_log', payload: log }).catch(() => {});
    return;
  }
  const { error } = await supabase.from('workout_logs').upsert({
    id: log.id, user_id: _userId, workout_id: log.workout_id,
    date: log.date, started_at: log.started_at,
    completed_at: log.completed_at ?? null,
    completed: log.completed, exercises: log.exercises,
  });
  if (error) {
    console.error('Log sync error:', error);
    if (log.completed) idbEnqueue({ action_type: 'upsert_log', payload: log }).catch(() => {});
  }
}

// Debounced sync for in-progress session updates (fires max once per second)
const _syncSessionDebounced = debounce((session) => {
  if (session) _upsertLog(session);
}, 1000);

// ─── Background Supabase refresh ─────────────────────────────────────────────

async function _refreshFromSupabase() {
  if (!_userId || !navigator.onLine) return;
  _setSyncStatus('syncing');
  try {
    // Drain the sync queue first so remote data reflects local writes
    await _processSyncQueue();

    const [
      { data: workouts, error: we },
      { data: logs,     error: le },
      { data: notes },
      { data: bwLogs },
    ] = await Promise.all([
      supabase.from('workouts').select('*').eq('user_id', _userId).order('created_at'),
      supabase.from('workout_logs').select('*').eq('user_id', _userId).order('date', { ascending: false }),
      supabase.from('exercise_notes').select('*').eq('user_id', _userId),
      supabase.from('bodyweight_logs').select('*').eq('user_id', _userId).order('date', { ascending: false }),
    ]);

    if (we) throw we;
    if (le) throw le;

    if (workouts) {
      // Keep locally-created workouts that haven't synced to remote yet
      const remoteIds  = new Set(workouts.map(w => w.id));
      const localOnly  = _state.workouts.filter(w => !remoteIds.has(w.id));
      _set(s => ({ ...s, workouts: [...workouts, ...localOnly] }));
      idbPutMany('workouts', workouts).catch(() => {});
    }
    if (logs) {
      // Keep local completed logs pending sync (don't overwrite with stale remote)
      const pending     = await idbGetByStatus('pending').catch(() => []);
      const pendingIds  = new Set(pending.filter(p => p.action_type === 'upsert_log').map(p => p.payload.id));
      const remoteLogs  = logs.filter(l => !pendingIds.has(l.id));
      const localPending = _state.workoutLogs.filter(l => pendingIds.has(l.id));
      _set(s => ({ ...s, workoutLogs: [...remoteLogs, ...localPending] }));
      idbPutMany('workout_logs', remoteLogs).catch(() => {});
    }
    if (notes) {
      _notes = {};
      notes.forEach(n => { _notes[n.exercise_id] = n.note; });
      idbPutMany('exercise_notes', notes).catch(() => {});
    }
    if (bwLogs) {
      _bodyweightLogs = bwLogs;
      idbPutMany('bodyweight_logs', bwLogs).catch(() => {});
    }

    const failedCount = await idbCountByStatus('failed').catch(() => 0);
    _setSyncStatus(failedCount > 0 ? 'failed' : 'online');
  } catch (e) {
    console.warn('Supabase refresh failed:', e);
    _setSyncStatus(navigator.onLine ? 'failed' : 'offline');
  }
}

// ─── Sync queue processing ───────────────────────────────────────────────────

async function _processSyncQueue() {
  const items = await idbGetByStatus('pending').catch(() => []);
  for (const item of items) {
    try {
      await idbUpdateQueueItem(item.id, { status: 'syncing' });
      await _executeSyncAction(item.action_type, item.payload);
      await idbUpdateQueueItem(item.id, { status: 'synced' });
    } catch (e) {
      await idbUpdateQueueItem(item.id, { status: 'failed' }).catch(() => {});
      console.warn('Sync queue item failed:', item.action_type, e);
    }
  }
}

async function _executeSyncAction(actionType, payload) {
  if (!_userId) throw new Error('Not authenticated');
  let result;
  switch (actionType) {
    case 'upsert_workout':
      result = await supabase.from('workouts').upsert({
        id: payload.id, user_id: _userId, name: payload.name, exercises: payload.exercises,
      });
      break;
    case 'delete_workout':
      result = await supabase.from('workouts').delete().eq('id', payload.id).eq('user_id', _userId);
      break;
    case 'upsert_log':
      result = await supabase.from('workout_logs').upsert({ ...payload, user_id: _userId });
      break;
    case 'delete_log':
      result = await supabase.from('workout_logs').delete().eq('id', payload.id).eq('user_id', _userId);
      break;
    case 'delete_logs_for_workout':
      result = await supabase.from('workout_logs').delete().eq('workout_id', payload.workout_id).eq('user_id', _userId);
      break;
    case 'upsert_note':
      result = await supabase.from('exercise_notes').upsert(
        { user_id: _userId, exercise_id: payload.exercise_id, note: payload.note, updated_at: payload.updated_at },
        { onConflict: 'user_id,exercise_id' }
      );
      break;
    case 'upsert_bodyweight':
      result = await supabase.from('bodyweight_logs').upsert(
        { user_id: _userId, date: payload.date, weight: payload.weight },
        { onConflict: 'user_id,date' }
      );
      break;
    default:
      console.warn('Unknown sync action:', actionType);
      return;
  }
  if (result?.error) throw result.error;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const Store = {

  /**
   * Initialise store for a user.
   * Loads from IndexedDB immediately (offline-first), then refreshes from
   * Supabase in the background without blocking the UI.
   */
  async init(userId) {
    _userId = userId;

    // Step 1: local data — fast, works offline
    try {
      const [workouts, logs, notes, bwLogs] = await Promise.all([
        idbGetAll('workouts'),
        idbGetAll('workout_logs'),
        idbGetAll('exercise_notes'),
        idbGetAll('bodyweight_logs'),
      ]);
      _notes = {};
      notes.forEach(n => { _notes[n.exercise_id] = n.note; });
      _bodyweightLogs = [...bwLogs].sort((a, b) => b.date.localeCompare(a.date));
      _set({ workouts, workoutLogs: logs });
    } catch (e) {
      console.warn('IDB load failed, starting empty:', e);
    }

    // Step 2: remote refresh — non-blocking
    _refreshFromSupabase().catch(() => {});
  },

  getState() { return _state; },

  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  // ── Sync status ────────────────────────────────────────────────────────────

  getSyncStatus() { return _syncStatus; },

  onSyncStatus(fn) {
    _syncListeners.add(fn);
    return () => _syncListeners.delete(fn);
  },

  async retrySync() {
    // Reset failed items back to pending, then re-run the refresh
    const failed = await idbGetByStatus('failed').catch(() => []);
    for (const item of failed) {
      await idbUpdateQueueItem(item.id, { status: 'pending' }).catch(() => {});
    }
    _refreshFromSupabase().catch(() => {});
  },

  // ── Workouts ───────────────────────────────────────────────────────────────

  addWorkout(workout) {
    _set(s => ({ ...s, workouts: [...s.workouts, workout] }));
    _upsertWorkout(workout);
  },

  updateWorkout(id, updates) {
    _set(s => ({
      ...s,
      workouts: s.workouts.map(w => w.id === id ? { ...w, ...updates } : w),
    }));
    const updated = _state.workouts.find(w => w.id === id);
    if (updated) _upsertWorkout(updated);
  },

  deleteWorkout(id) {
    _sequence = _sequence.filter(sid => sid !== id);
    _saveSequence(_sequence);

    _set(s => ({
      ...s,
      workouts:    s.workouts.filter(w => w.id !== id),
      workoutLogs: s.workoutLogs.filter(l => l.workout_id !== id),
    }));

    _deleteWorkoutRemote(id);

    // Also delete logs from IDB and queue remote delete
    idbGetAll('workout_logs').then(logs => {
      logs.filter(l => l.workout_id === id).forEach(l => idbDelete('workout_logs', l.id).catch(() => {}));
    }).catch(() => {});

    if (_userId) {
      if (!navigator.onLine) {
        idbEnqueue({ action_type: 'delete_logs_for_workout', payload: { workout_id: id } }).catch(() => {});
      } else {
        supabase.from('workout_logs').delete().eq('workout_id', id).eq('user_id', _userId)
          .then(({ error }) => {
            if (error) idbEnqueue({ action_type: 'delete_logs_for_workout', payload: { workout_id: id } }).catch(() => {});
          });
      }
    }
  },

  getWorkout(id) {
    return _state.workouts.find(w => w.id === id) || null;
  },

  // ── Default workouts + sequence ────────────────────────────────────────────

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
    _sequence = newWorkouts.map(w => w.id);
    _saveSequence(_sequence);
    newWorkouts.forEach(w => _upsertWorkout(w));
  },

  getNextWorkout() {
    const validSeq = _sequence.filter(id => _state.workouts.some(w => w.id === id));
    if (validSeq.length === 0) return _state.workouts[0] || null;
    const lastLog = [..._state.workoutLogs]
      .filter(l => l.completed && validSeq.includes(l.workout_id))
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (!lastLog) return _state.workouts.find(w => w.id === validSeq[0]) || null;
    const currentIdx = validSeq.indexOf(lastLog.workout_id);
    const nextId     = validSeq[(currentIdx + 1) % validSeq.length];
    return _state.workouts.find(w => w.id === nextId) || null;
  },

  // ── Sessions ───────────────────────────────────────────────────────────────

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
      // Deduplicate: remove any in-progress version before adding completed
      workoutLogs: [...s.workoutLogs.filter(l => l.id !== completed.id), completed],
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
    if (!session?.id) return;
    if (!navigator.onLine) {
      idbEnqueue({ action_type: 'delete_log', payload: { id: session.id } }).catch(() => {});
    } else if (_userId) {
      supabase.from('workout_logs').delete().eq('id', session.id).then(({ error }) => {
        if (error) console.error('Session cancel error:', error);
      });
    }
  },

  getLastLog(workoutId) {
    return _state.workoutLogs
      .filter(l => l.workout_id === workoutId && l.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
  },

  getWorkoutLogs(workoutId) {
    return _state.workoutLogs
      .filter(l => l.workout_id === workoutId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

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
      if (found && (!best || new Date(log.date) > new Date(best.date))) {
        best = { ...found, date: log.date };
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
      const done = ex?.sets.filter(s => s.completed) || [];
      if (!done.length) return null;
      const maxW = Math.max(...done.map(s => s.weight));
      const maxR = Math.max(...done.filter(s => s.weight === maxW).map(s => s.reps));
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
        const done = ex?.sets.filter(s => s.completed) || [];
        if (!done.length) return null;
        const maxW = Math.max(...done.map(s => s.weight));
        const maxR = Math.max(...done.filter(s => s.weight === maxW).map(s => s.reps));
        return { weight: maxW, reps: maxR };
      }).filter(Boolean);

      if (bests.length >= 4) {
        const [newest, , , oldest] = bests;
        if (newest.weight <= oldest.weight && newest.reps <= oldest.reps) {
          return 'No progress in 4+ sessions — consider swapping this exercise.';
        }
      }
    }

    if (flag === 'red') return 'Weight dropped — reduce 5–10% and rebuild.';
    return 'Stalled — aim for one more rep before adding weight.';
  },

  // ── Exercise notes ─────────────────────────────────────────────────────────

  getNote(exerciseId) { return _notes[exerciseId] || ''; },

  async saveNote(exerciseId, note) {
    _notes[exerciseId] = note;
    const noteData = { exercise_id: exerciseId, note, updated_at: new Date().toISOString() };
    idbPut('exercise_notes', noteData).catch(() => {});
    if (!_userId) return;
    if (!navigator.onLine) {
      idbEnqueue({ action_type: 'upsert_note', payload: noteData }).catch(() => {});
      return;
    }
    const { error } = await supabase.from('exercise_notes').upsert(
      { user_id: _userId, exercise_id: exerciseId, note, updated_at: noteData.updated_at },
      { onConflict: 'user_id,exercise_id' }
    );
    if (error) {
      console.error('Note save error:', error);
      idbEnqueue({ action_type: 'upsert_note', payload: noteData }).catch(() => {});
    }
  },

  // ── Weekly stats & bodyweight ──────────────────────────────────────────────

  getWeeklyStats() {
    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);

    const toDate = str => new Date(str + 'T00:00:00');

    const thisWeekLogs = _state.workoutLogs.filter(l =>
      l.completed && toDate(l.date) >= weekStart
    );
    const prevWeekLogs = _state.workoutLogs.filter(l =>
      l.completed && toDate(l.date) >= prevWeekStart && toDate(l.date) < weekStart
    );

    const calcVolume = logs => Math.round(logs.reduce((total, log) =>
      total + log.exercises.reduce((et, ex) =>
        et + ex.sets.filter(s => s.completed).reduce((st, s) => st + s.weight * s.reps, 0)
      , 0)
    , 0));

    const countSets = logs => logs.reduce((n, l) =>
      n + l.exercises.reduce((et, ex) => et + ex.sets.filter(s => s.completed).length, 0)
    , 0);

    const calcAvgDurationMins = logs => {
      const withDur = logs.filter(l => l.started_at && l.completed_at);
      if (!withDur.length) return null;
      const total = withDur.reduce((sum, l) =>
        sum + Math.floor((new Date(l.completed_at) - new Date(l.started_at)) / 60000)
      , 0);
      return Math.round(total / withDur.length);
    };

    const lastCompleted = [..._state.workoutLogs]
      .filter(l => l.completed && l.started_at && l.completed_at)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;

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
      latestBodyweight:      _bodyweightLogs[0] || null,
      lastWorkoutDurationMins: lastCompleted
        ? Math.floor((new Date(lastCompleted.completed_at) - new Date(lastCompleted.started_at)) / 60000)
        : null,
    };
  },

  async addBodyweight(weight) {
    const date   = new Date().toISOString().slice(0, 10);
    const bwData = { date, weight };
    _bodyweightLogs = [bwData, ..._bodyweightLogs.filter(b => b.date !== date)];
    idbPut('bodyweight_logs', bwData).catch(() => {});
    if (!_userId) return;
    if (!navigator.onLine) {
      idbEnqueue({ action_type: 'upsert_bodyweight', payload: bwData }).catch(() => {});
      return;
    }
    const { error } = await supabase.from('bodyweight_logs').upsert(
      { user_id: _userId, date, weight },
      { onConflict: 'user_id,date' }
    );
    if (error) {
      console.error('Bodyweight save error:', error);
      idbEnqueue({ action_type: 'upsert_bodyweight', payload: bwData }).catch(() => {});
    }
  },

  // ── Dev helpers ────────────────────────────────────────────────────────────

  clearAll() {
    _state = { ...DEFAULT_STATE };
    localStorage.removeItem(SESSION_KEY);
    _notify();
  },
};

// ─── Online / offline detection ───────────────────────────────────────────────

window.addEventListener('online', () => {
  _setSyncStatus('syncing');
  _refreshFromSupabase().catch(() => _setSyncStatus('failed'));
});

window.addEventListener('offline', () => {
  _setSyncStatus('offline');
});

// Expose for debugging
if (typeof window !== 'undefined') window._IronPlanStore = Store;
