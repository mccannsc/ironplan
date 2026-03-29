/**
 * IronPlan Store – Supabase-backed state management.
 *
 * In-memory state is the source of truth for the UI; Supabase is synced in the
 * background.  activeSession is persisted to localStorage only (it's transient).
 */

import { supabase } from './lib/supabase.js';
import { debounce } from './utils.js';

const SESSION_KEY = 'ironplan_session_v1';

const DEFAULT_STATE = {
  workouts: [],
  workoutLogs: [],
  activeSession: null,
};

let _state = { ...DEFAULT_STATE, activeSession: _loadSession() };
let _userId = null;
const _listeners = new Set();

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

    const [{ data: workouts, error: we }, { data: logs, error: le }] = await Promise.all([
      supabase.from('workouts').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('workout_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
    ]);

    if (we) console.error('Workouts fetch error:', we);
    if (le) console.error('Logs fetch error:', le);

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

  // ── Dev helpers ───────────────────────────────────────────────────────────

  clearAll() {
    _state = { ...DEFAULT_STATE };
    localStorage.removeItem(SESSION_KEY);
    _notify();
  },
};

// Expose for debugging
if (typeof window !== 'undefined') window._IronPlanStore = Store;
