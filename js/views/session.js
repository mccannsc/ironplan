/**
 * Active Workout Session – the core logging experience.
 * This is the most interaction-heavy screen in IronPlan.
 */

import { Store } from '../store.js';
import { navigate, back } from '../router.js';
import {
  uid, fmtWeight, today, fmtDuration, esc, clamp,
} from '../utils.js';
import {
  EXERCISES_MAP, MUSCLE_LABELS, EQUIPMENT_LABELS, getSubstitutions, checkOverload, suggestWeight, getNextWeight,
} from '../data/exercises.js?v=6';
import { toast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showSummary } from './summary.js';

let _timerInterval = null;
let _restInterval = null;
const _sessionPBs = new Set(); // exercise IDs that hit a new PB this session

// ─── Rest Timer ─────────────────────────────────────────────────────────────

const _REST_KEY = 'ironplan_rest_v1';

function _saveRestState(startedAt, duration) {
  try { localStorage.setItem(_REST_KEY, JSON.stringify({ startedAt, duration })); } catch (_) {}
}

function _loadRestState() {
  try { return JSON.parse(localStorage.getItem(_REST_KEY)); } catch (_) { return null; }
}

function _clearRestState() {
  try { localStorage.removeItem(_REST_KEY); } catch (_) {}
}

function _requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

function _onRestComplete() {
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  toast("Let's go! Next set!", 'success', 4000);
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('IronPlan – Rest complete', {
        body: "Let's go! Next set! 💪",
        icon: '/icons/icon-192.png',
        tag: 'rest-timer',
      });
    } catch (_) {}
  }
}

function _getRestDuration(ex) {
  const compound = ['push', 'pull', 'squat', 'hinge'];
  if (compound.includes(ex?.pattern)) return 120;
  if (ex?.pattern === 'isolation') return 90;
  return 60;
}

function _startRestTimer(duration) {
  _clearRestTimer();
  _requestNotifPermission();
  const startedAt = Date.now();
  _saveRestState(startedAt, duration);
  _runRestTimer(startedAt, duration);
}

function _runRestTimer(startedAt, totalDuration) {
  if (_restInterval) { clearInterval(_restInterval); _restInterval = null; }

  let el = document.getElementById('rest-timer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rest-timer';
    el.className = 'rest-timer';
    document.getElementById('app').appendChild(el);
  }

  function update() {
    const remaining = Math.ceil(totalDuration - (Date.now() - startedAt) / 1000);
    if (remaining <= 0) {
      _clearRestTimer();
      _onRestComplete();
      return;
    }
    const pct = Math.max(0, (remaining / totalDuration) * 100);
    el.innerHTML = `
      <div class="rest-timer__inner">
        <div class="rest-timer__info">
          <span class="rest-timer__label">Rest</span>
          <span class="rest-timer__count">${remaining}s</span>
        </div>
        <div class="rest-timer__bar-wrap">
          <div class="rest-timer__bar" style="width:${pct}%"></div>
        </div>
        <button class="rest-timer__skip" id="rest-skip-btn">Skip</button>
      </div>
    `;
    document.getElementById('rest-skip-btn')?.addEventListener('click', _clearRestTimer);
  }

  update();
  _restInterval = setInterval(update, 500);
}

export function clearRestTimer() { _clearRestTimer(); }

function _clearRestTimer() {
  if (_restInterval) { clearInterval(_restInterval); _restInterval = null; }
  const el = document.getElementById('rest-timer');
  if (el) el.remove();
  _clearRestState();
}

export function renderSession({ workoutId }) {
  _sessionPBs.clear();
  const workout = Store.getWorkout(workoutId);
  if (!workout) { navigate('/'); return; }

  // Resume active session or create a new one
  let session = Store.getState().activeSession;
  if (!session || session.workout_id !== workoutId) {
    session = _buildSession(workout);
    Store.startSession(session);
  }

  _renderSessionUI(workout, session);
}

function _buildSession(workout) {
  const lastLog = Store.getLastLog(workout.id);

  return {
    id: uid(),
    workout_id: workout.id,
    date: today(),
    started_at: new Date().toISOString(),
    completed: false,
    exercises: workout.exercises.map(ei => {
      const prevExLog = lastLog?.exercises.find(e => e.exercise_instance_id === ei.id);
      const prevSets = prevExLog?.sets.filter(s => s.completed) || [];
      const ex = EXERCISES_MAP[ei.exercise_id];
      const nextWeight = getNextWeight(prevSets, ei.rep_range, ex?.primary_muscle);

      return {
        exercise_instance_id: ei.id,
        exercise_id: ei.exercise_id,
        substituted_exercise_id: null,
        effort: null,
        sets: Array.from({ length: ei.sets }, (_, i) => {
          const prev = prevExLog?.sets[i];
          return {
            set_number: i + 1,
            weight: nextWeight ?? prev?.weight ?? 0,
            reps: prev?.reps ?? ei.rep_range[0],
            completed: false,
          };
        }),
      };
    }),
  };
}

function _renderSessionUI(workout, session) {
  if (_timerInterval) clearInterval(_timerInterval);

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--session" id="session-page">
      <header class="session-header">
        <button class="btn-icon btn-back" id="session-back-btn" aria-label="Back">‹</button>
        <div class="session-header__info">
          <div class="session-header__name">${esc(workout.name)}</div>
          <div class="session-header__timer" id="session-timer">00:00</div>
        </div>
        <button class="btn btn--green btn--sm" id="finish-btn">Finish ✓</button>
      </header>

      <div class="session-body" id="session-body">
        ${session.exercises.map((exLog, idx) => _exerciseBlock(exLog, workout, idx)).join('')}
      </div>

      <div class="bottom-spacer"></div>
    </div>
  `;

  // Resume rest timer if one was in progress (survives navigation / reload)
  const savedRest = _loadRestState();
  if (savedRest) {
    const remaining = savedRest.duration - Math.floor((Date.now() - savedRest.startedAt) / 1000);
    if (remaining > 0) {
      _runRestTimer(savedRest.startedAt, savedRest.duration);
    } else {
      _clearRestState();
      _onRestComplete();
    }
  }

  // Start session timer
  const started = new Date(session.started_at);
  function updateTimer() {
    const elapsed = Math.floor((Date.now() - started) / 1000);
    const el = document.getElementById('session-timer');
    if (el) el.textContent = _fmtElapsed(elapsed);
  }
  updateTimer();
  _timerInterval = setInterval(updateTimer, 1000);

  // Back / exit — rest timer intentionally keeps running as overlay
  document.getElementById('session-back-btn').addEventListener('click', () => {
    if (confirm('Leave this session? Progress is saved and you can resume later.')) {
      clearInterval(_timerInterval);
      navigate('/');
    }
  });

  // Finish
  document.getElementById('finish-btn').addEventListener('click', () => {
    const completed = Store.completeSession();
    clearInterval(_timerInterval);
    _clearRestTimer(); // explicitly clear rest timer on completion
    showSummary(completed, workout);
  });

  _bindSessionEvents(workout, session);
}

function _exerciseBlock(exLog, workout, exIdx) {
  const ei = workout.exercises.find(e => e.id === exLog.exercise_instance_id);
  if (!ei) return '';

  const effectiveExId = exLog.substituted_exercise_id || exLog.exercise_id;
  const ex = EXERCISES_MAP[effectiveExId];
  if (!ex) return '';

  const lastLog = Store.getLastExerciseLog(effectiveExId);
  const prevSets = lastLog?.sets.filter(s => s.completed) || [];
  const bestLift = Store.getBestLift(effectiveExId);
  const nextWeight = getNextWeight(prevSets, ei.rep_range, ex.primary_muscle);
  const repRange = ei.rep_range;

  const allDone = exLog.sets.every(s => s.completed);
  const overload = allDone ? checkOverload(exLog.sets, repRange) : null;

  return `
    <div class="ex-block ${allDone ? 'ex-block--done' : ''}" id="ex-block-${exIdx}" data-ex-idx="${exIdx}">
      <div class="ex-block__header">
        <div class="ex-block__num">${exIdx + 1}</div>
        <div class="ex-block__info">
          <div class="ex-block__name">${esc(ex.name)}</div>
          <div class="ex-block__meta">
            <span class="muscle-chip muscle-chip--sm">${MUSCLE_LABELS[ex.primary_muscle] || ex.primary_muscle}</span>
            <span class="ex-block__range">${repRange[0]}–${repRange[1]} reps</span>
            ${exLog.substituted_exercise_id ? '<span class="badge badge--blue">Swapped</span>' : ''}
          </div>
        </div>
        <div class="ex-block__actions">
          <button class="btn btn--ghost btn--xs swap-btn" data-swap-idx="${exIdx}" aria-label="Swap exercise">⇄</button>
          <button class="btn-icon btn-icon--sm info-btn" data-info-id="${effectiveExId}" aria-label="Exercise info">ⓘ</button>
        </div>
      </div>

      <div class="ex-block__stats" id="ex-stats-${exIdx}">
        ${bestLift ? `<span class="ex-stat ex-stat--pb">🏆 Best: ${fmtWeight(bestLift.weight)}kg × ${bestLift.reps}</span>` : ''}
        ${prevSets.length ? `<span class="ex-stat ex-stat--prev">Last: ${prevSets.map(s => `${fmtWeight(s.weight)}kg×${s.reps}`).join(', ')}</span>` : ''}
        <span class="ex-stat ex-stat--next">${nextWeight !== null ? `→ Next: ${fmtWeight(nextWeight)}kg` : 'Start comfortable'}</span>
      </div>

      <div class="ex-block__sets" id="sets-${exIdx}">
        <div class="sets-header">
          <span class="sets-col sets-col--num">Set</span>
          <span class="sets-col sets-col--weight">Weight (kg)</span>
          <span class="sets-col sets-col--reps">Reps</span>
          <span class="sets-col sets-col--check"></span>
        </div>
        ${exLog.sets.map((s, sIdx) => _setRow(s, sIdx, exIdx, prevSets[sIdx], sIdx > 0)).join('')}
      </div>

      ${overload ? `
        <div class="overload-banner">
          <span class="overload-banner__icon">🔥</span>
          <span class="overload-banner__text">
            All sets hit ${repRange[1]} reps! Try
            <strong>${fmtWeight(suggestWeight(overload.topWeight, ex.primary_muscle))}kg</strong>
            next session.
          </span>
        </div>
      ` : ''}

      <div class="ex-block__footer">
        <div class="effort-row" id="effort-row-${exIdx}">
          <span class="effort-row__label">Effort:</span>
          ${['easy', 'normal', 'hard'].map(e => `
            <button class="effort-btn ${exLog.effort === e ? `effort-btn--active effort-btn--${e}` : ''}"
              data-effort-btn data-ex="${exIdx}" data-effort="${e}">${e.charAt(0).toUpperCase() + e.slice(1)}</button>
          `).join('')}
        </div>
        <button class="btn btn--ghost btn--xs add-set-btn" data-add-set-idx="${exIdx}">+ Add Set</button>
      </div>
    </div>
  `;
}

function _setRow(s, sIdx, exIdx, prevSet, showRepeat = false) {
  const done = s.completed;
  return `
    <div class="set-row ${done ? 'set-row--done' : ''}" id="set-row-${exIdx}-${sIdx}">
      <span class="sets-col sets-col--num set-num">${showRepeat && !done ? `<button class="repeat-btn" data-repeat-set data-ex="${exIdx}" data-set="${sIdx}" title="Repeat last set" aria-label="Repeat last set">↻</button>` : sIdx + 1}</span>
      <div class="sets-col sets-col--weight">
        <div class="stepper">
          <button class="stepper__btn stepper__btn--dec" data-stepper-dec data-ex="${exIdx}" data-set="${sIdx}" data-field="weight">−</button>
          <input
            type="number"
            class="stepper__input"
            value="${s.weight}"
            min="0"
            max="500"
            step="2.5"
            data-weight-input
            data-ex="${exIdx}"
            data-set="${sIdx}"
          />
          <button class="stepper__btn stepper__btn--inc" data-stepper-inc data-ex="${exIdx}" data-set="${sIdx}" data-field="weight">+</button>
        </div>
      </div>
      <div class="sets-col sets-col--reps">
        <div class="stepper">
          <button class="stepper__btn stepper__btn--dec" data-stepper-dec data-ex="${exIdx}" data-set="${sIdx}" data-field="reps">−</button>
          <input
            type="number"
            class="stepper__input"
            value="${s.reps}"
            min="1"
            max="100"
            step="1"
            data-reps-input
            data-ex="${exIdx}"
            data-set="${sIdx}"
          />
          <button class="stepper__btn stepper__btn--inc" data-stepper-inc data-ex="${exIdx}" data-set="${sIdx}" data-field="reps">+</button>
        </div>
      </div>
      <div class="sets-col sets-col--check">
        <button
          class="check-btn ${done ? 'check-btn--done' : ''}"
          data-complete-set
          data-ex="${exIdx}"
          data-set="${sIdx}"
          aria-label="${done ? 'Undo set' : 'Complete set'}"
        >${done ? '✓' : '○'}</button>
      </div>
    </div>
  `;
}

function _refreshEffortRow(exIdx, currentEffort) {
  const row = document.getElementById(`effort-row-${exIdx}`);
  if (!row) return;
  row.querySelectorAll('[data-effort-btn]').forEach(btn => {
    const e = btn.dataset.effort;
    btn.className = `effort-btn${currentEffort === e ? ` effort-btn--active effort-btn--${e}` : ''}`;
  });
}

function _bindSessionEvents(workout, session) {
  const body = document.getElementById('session-body');
  if (!session) return;

  // Delegate all events from session body
  body.addEventListener('click', e => {
    // Complete / undo set
    const completeBtn = e.target.closest('[data-complete-set]');
    if (completeBtn) {
      const exIdx = parseInt(completeBtn.dataset.ex);
      const sIdx = parseInt(completeBtn.dataset.set);
      _toggleSet(workout, session, exIdx, sIdx);
      return;
    }

    // Stepper dec/inc
    const stepDec = e.target.closest('[data-stepper-dec]');
    const stepInc = e.target.closest('[data-stepper-inc]');
    if (stepDec || stepInc) {
      const btn = stepDec || stepInc;
      const exIdx = parseInt(btn.dataset.ex);
      const sIdx = parseInt(btn.dataset.set);
      const field = btn.dataset.field;
      const delta = stepDec ? -1 : 1;
      _stepField(session, exIdx, sIdx, field, delta);
      return;
    }

    // Swap exercise
    const swapBtn = e.target.closest('[data-swap-idx]');
    if (swapBtn) {
      const exIdx = parseInt(swapBtn.dataset.swapIdx);
      _openSubstitutionModal(workout, session, exIdx);
      return;
    }

    // Exercise info
    const infoBtn = e.target.closest('[data-info-id]');
    if (infoBtn) {
      navigate(`/exercises/${infoBtn.dataset.infoId}`);
      return;
    }

    // Add extra set
    const addSetBtn = e.target.closest('[data-add-set-idx]');
    if (addSetBtn) {
      const exIdx = parseInt(addSetBtn.dataset.addSetIdx);
      _addSet(workout, session, exIdx);
      return;
    }

    // Effort button
    const effortBtn = e.target.closest('[data-effort-btn]');
    if (effortBtn) {
      const exIdx = parseInt(effortBtn.dataset.ex);
      const effort = effortBtn.dataset.effort;
      const exLog = session.exercises[exIdx];
      exLog.effort = exLog.effort === effort ? null : effort;
      Store.updateSession(session);
      _refreshEffortRow(exIdx, exLog.effort);
      return;
    }

    // Repeat last set
    const repeatBtn = e.target.closest('[data-repeat-set]');
    if (repeatBtn) {
      const exIdx = parseInt(repeatBtn.dataset.ex);
      const sIdx = parseInt(repeatBtn.dataset.set);
      const exLog = session.exercises[exIdx];
      // Find last completed set before this one
      const lastDone = [...exLog.sets].slice(0, sIdx).reverse().find(s => s.completed);
      if (lastDone) {
        exLog.sets[sIdx].weight = lastDone.weight;
        exLog.sets[sIdx].reps = lastDone.reps;
        Store.updateSession(session);
        const weightInput = document.querySelector(`[data-weight-input][data-ex="${exIdx}"][data-set="${sIdx}"]`);
        const repsInput = document.querySelector(`[data-reps-input][data-ex="${exIdx}"][data-set="${sIdx}"]`);
        if (weightInput) weightInput.value = lastDone.weight;
        if (repsInput) repsInput.value = lastDone.reps;
      }
      return;
    }
  });

  // Weight / reps direct input changes (delegated)
  body.addEventListener('change', e => {
    const weightInput = e.target.closest('[data-weight-input]');
    const repsInput = e.target.closest('[data-reps-input]');
    if (weightInput) {
      const exIdx = parseInt(weightInput.dataset.ex);
      const sIdx = parseInt(weightInput.dataset.set);
      const val = parseFloat(weightInput.value) || 0;
      session.exercises[exIdx].sets[sIdx].weight = Math.max(0, val);
      weightInput.value = session.exercises[exIdx].sets[sIdx].weight;
      Store.updateSession(session);
    }
    if (repsInput) {
      const exIdx = parseInt(repsInput.dataset.ex);
      const sIdx = parseInt(repsInput.dataset.set);
      const val = parseInt(repsInput.value) || 1;
      session.exercises[exIdx].sets[sIdx].reps = Math.max(1, val);
      repsInput.value = session.exercises[exIdx].sets[sIdx].reps;
      Store.updateSession(session);
    }
  });
}

function _toggleSet(workout, session, exIdx, sIdx) {
  const exLog = session.exercises[exIdx];
  const set = exLog.sets[sIdx];
  set.completed = !set.completed;
  Store.updateSession(session);

  // Update set row in-place
  const row = document.getElementById(`set-row-${exIdx}-${sIdx}`);
  if (row) {
    const btn = row.querySelector('[data-complete-set]');
    if (btn) {
      btn.textContent = set.completed ? '✓' : '○';
      btn.classList.toggle('check-btn--done', set.completed);
    }
    row.classList.toggle('set-row--done', set.completed);
  }

  // Recheck overload banner and block done state
  _refreshExBlock(workout, session, exIdx);

  if (set.completed) {
    if (navigator.vibrate) navigator.vibrate(30);

    // PB detection
    const effectiveExId = exLog.substituted_exercise_id || exLog.exercise_id;
    if (!_sessionPBs.has(effectiveExId)) {
      const best = Store.getBestLift(effectiveExId);
      const isPB = !best || set.weight > best.weight ||
        (set.weight === best.weight && set.reps > best.reps);
      if (isPB && set.weight > 0) {
        _sessionPBs.add(effectiveExId);
        toast(`New PB! 🎉 ${fmtWeight(set.weight)}kg × ${set.reps}`, 'success', 4000);
        _updateStatsBar(effectiveExId, exIdx, set);
      }
    }

    // Rest timer
    const ex = EXERCISES_MAP[effectiveExId];
    _startRestTimer(_getRestDuration(ex));

    // Auto-advance focus to next incomplete set weight input
    const nextSIdx = exLog.sets.findIndex((s, i) => i > sIdx && !s.completed);
    if (nextSIdx !== -1) {
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-weight-input][data-ex="${exIdx}"][data-set="${nextSIdx}"]`);
        if (nextInput) nextInput.focus();
      }, 50);
    }
  } else {
    _clearRestTimer();
  }
}

function _stepField(session, exIdx, sIdx, field, delta) {
  const set = session.exercises[exIdx].sets[sIdx];
  if (field === 'weight') {
    set.weight = Math.max(0, Math.round((set.weight + delta * 2.5) * 10) / 10);
    const input = document.querySelector(`[data-weight-input][data-ex="${exIdx}"][data-set="${sIdx}"]`);
    if (input) input.value = set.weight;
  } else {
    set.reps = Math.max(1, set.reps + delta);
    const input = document.querySelector(`[data-reps-input][data-ex="${exIdx}"][data-set="${sIdx}"]`);
    if (input) input.value = set.reps;
  }
  Store.updateSession(session);
}

function _addSet(workout, session, exIdx) {
  const exLog = session.exercises[exIdx];
  const lastSet = exLog.sets[exLog.sets.length - 1];
  exLog.sets.push({
    set_number: exLog.sets.length + 1,
    weight: lastSet?.weight ?? 0,
    reps: lastSet?.reps ?? 8,
    completed: false,
  });
  Store.updateSession(session);

  // Re-render just this block's sets
  _refreshExBlock(workout, session, exIdx);
}

function _refreshExBlock(workout, session, exIdx) {
  const exLog = session.exercises[exIdx];
  const ei = workout.exercises.find(e => e.id === exLog.exercise_instance_id);
  if (!ei) return;

  const effectiveExId = exLog.substituted_exercise_id || exLog.exercise_id;
  const ex = EXERCISES_MAP[effectiveExId];
  if (!ex) return;

  // Update block done state
  const block = document.getElementById(`ex-block-${exIdx}`);
  if (!block) return;
  const allDone = exLog.sets.every(s => s.completed);
  block.classList.toggle('ex-block--done', allDone);

  // Update stats bar (best + last session + next weight)
  const statsBar = document.getElementById(`ex-stats-${exIdx}`);
  if (statsBar) {
    const bestLift = Store.getBestLift(effectiveExId);
    const lastLog = Store.getLastExerciseLog(effectiveExId);
    const prevSets = lastLog?.sets.filter(s => s.completed) || [];
    const nextWeight = getNextWeight(prevSets, ei.rep_range, ex.primary_muscle);
    statsBar.innerHTML =
      (bestLift ? `<span class="ex-stat ex-stat--pb">🏆 Best: ${fmtWeight(bestLift.weight)}kg × ${bestLift.reps}</span>` : '') +
      (prevSets.length ? `<span class="ex-stat ex-stat--prev">Last: ${prevSets.map(s => `${fmtWeight(s.weight)}kg×${s.reps}`).join(', ')}</span>` : '') +
      `<span class="ex-stat ex-stat--next">${nextWeight !== null ? `→ Next: ${fmtWeight(nextWeight)}kg` : 'Start comfortable'}</span>`;
  }

  // Update sets
  const setsContainer = document.getElementById(`sets-${exIdx}`);
  if (setsContainer) {
    const lastLog = Store.getLastExerciseLog(effectiveExId);
    const prevSets = lastLog?.sets.filter(s => s.completed) || [];
    const headerHTML = `
      <div class="sets-header">
        <span class="sets-col sets-col--num">Set</span>
        <span class="sets-col sets-col--weight">Weight (kg)</span>
        <span class="sets-col sets-col--reps">Reps</span>
        <span class="sets-col sets-col--check"></span>
      </div>
    `;
    setsContainer.innerHTML = headerHTML +
      exLog.sets.map((s, sIdx) => _setRow(s, sIdx, exIdx, prevSets[sIdx], sIdx > 0)).join('');
  }

  // Update overload banner
  const overload = allDone ? checkOverload(exLog.sets, ei.rep_range) : null;
  let banner = block.querySelector('.overload-banner');
  if (overload && !banner) {
    const suggested = fmtWeight(suggestWeight(overload.topWeight, ex.primary_muscle));
    const addSetBtn = block.querySelector('.ex-block__add-set');
    const newBanner = document.createElement('div');
    newBanner.className = 'overload-banner';
    newBanner.innerHTML = `
      <span class="overload-banner__icon">🔥</span>
      <span class="overload-banner__text">
        All sets hit ${ei.rep_range[1]} reps! Try <strong>${suggested}kg</strong> next session.
      </span>
    `;
    block.insertBefore(newBanner, addSetBtn);
  } else if (!overload && banner) {
    banner.remove();
  }
}

function _openSubstitutionModal(workout, session, exIdx) {
  const exLog = session.exercises[exIdx];
  const currentExId = exLog.substituted_exercise_id || exLog.exercise_id;
  const currentEx = EXERCISES_MAP[currentExId];
  if (!currentEx) return;

  const subs = getSubstitutions(currentExId);

  const body = `
    <div class="sub-modal">
      <p class="sub-modal__replacing">
        Replacing: <strong>${esc(currentEx.name)}</strong>
      </p>
      ${subs.length === 0
        ? `<p class="sub-modal__empty">No substitutions found for this exercise.</p>`
        : `<div class="sub-list">
             ${subs.map(ex => `
               <button class="sub-item" data-sub-id="${ex.id}">
                 <div class="sub-item__main">
                   <div class="sub-item__name">${esc(ex.name)}</div>
                   <div class="sub-item__meta">
                     <span class="muscle-chip muscle-chip--sm">${MUSCLE_LABELS[ex.primary_muscle] || ex.primary_muscle}</span>
                     <span class="equip-label">${EQUIPMENT_LABELS[ex.equipment] || ex.equipment}</span>
                   </div>
                 </div>
                 <span class="sub-item__arrow">›</span>
               </button>
             `).join('')}
           </div>`
      }
    </div>
  `;

  openModal({
    title: 'Swap Exercise',
    body,
    classes: 'modal--sub',
  });

  document.querySelectorAll('[data-sub-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const newExId = btn.dataset.subId;
      const newEx = EXERCISES_MAP[newExId];
      if (!newEx) return;

      // Update session
      exLog.substituted_exercise_id = newExId;

      // Reset sets with new defaults
      const ei = workout.exercises.find(e => e.id === exLog.exercise_instance_id);
      const lastLog = Store.getLastExerciseLog(newExId);
      exLog.sets = exLog.sets.map((s, i) => ({
        ...s,
        weight: lastLog?.sets[i]?.weight ?? s.weight,
        reps: lastLog?.sets[i]?.reps ?? (ei?.rep_range[0] ?? s.reps),
        completed: false,
      }));

      Store.updateSession(session);
      closeModal();
      toast(`Swapped to ${newEx.name}`, 'success');

      // Re-render the block
      const block = document.getElementById(`ex-block-${exIdx}`);
      if (block) {
        block.outerHTML = _exerciseBlock(exLog, workout, exIdx);
      }
    });
  });
}

function _updateStatsBar(exerciseId, exIdx, newBest) {
  const statsBar = document.getElementById(`ex-stats-${exIdx}`);
  if (!statsBar) return;
  const pbEl = statsBar.querySelector('.ex-stat--pb');
  const pbText = `🏆 Best: ${fmtWeight(newBest.weight)}kg × ${newBest.reps}`;
  if (pbEl) {
    pbEl.textContent = pbText;
  } else {
    const span = document.createElement('span');
    span.className = 'ex-stat ex-stat--pb';
    span.textContent = pbText;
    statsBar.prepend(span);
  }
}

function _fmtElapsed(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
