import { Store } from '../store.js';
import { navigate, back } from '../router.js';
import { uid, esc, timeAgo, debounce, equipmentIcon } from '../utils.js';
import {
  EXERCISES, EXERCISES_MAP, MUSCLE_LABELS, EQUIPMENT_LABELS, PATTERN_LABELS,
} from '../data/exercises.js';
import { toast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

// ─── Workout List ──────────────────────────────────────────────────────────

export function renderWorkouts() {
  const { workouts } = Store.getState();

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--workouts">
      <header class="page-header">
        <div class="page-header__inner">
          <h1 class="page-header__title">Workouts</h1>
          <button class="btn btn--accent btn--sm" id="new-workout-btn">+ New</button>
        </div>
      </header>

      ${workouts.length === 0
        ? `<div class="empty-state empty-state--tall">
             <div class="empty-state__icon">📋</div>
             <p class="empty-state__text">No workouts yet.<br>Build your first split.</p>
             <button class="btn btn--accent" id="create-first-btn">Create Workout</button>
           </div>`
        : `<div class="workout-list">
             ${workouts.map(_workoutListItem).join('')}
           </div>`
      }

      <div class="bottom-spacer"></div>
    </div>
  `;

  document.getElementById('new-workout-btn')?.addEventListener('click', () => navigate('/workouts/new'));
  document.getElementById('create-first-btn')?.addEventListener('click', () => navigate('/workouts/new'));

  document.querySelectorAll('[data-start-workout]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); navigate(`/session/${btn.dataset.startWorkout}`); });
  });

  document.querySelectorAll('[data-edit-workout]').forEach(btn => {
    btn.addEventListener('click', () => navigate(`/workouts/${btn.dataset.editWorkout}`));
  });

  document.querySelectorAll('[data-delete-workout]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.deleteWorkout;
      const w = Store.getWorkout(id);
      if (confirm(`Delete "${w?.name}"? This cannot be undone.`)) {
        Store.deleteWorkout(id);
        toast('Workout deleted', 'info');
        renderWorkouts();
      }
    });
  });
}

function _workoutListItem(w) {
  const lastLog = Store.getLastLog(w.id);
  const exCount = w.exercises.length;
  return `
    <div class="workout-list-item">
      <div class="workout-list-item__info" data-edit-workout="${w.id}">
        <div class="workout-list-item__name">${esc(w.name)}</div>
        <div class="workout-list-item__meta">
          ${exCount} exercise${exCount !== 1 ? 's' : ''}
          ${lastLog ? ` · Last: ${timeAgo(lastLog.date)}` : ' · Never done'}
        </div>
        ${exCount > 0 ? `<div class="workout-list-item__exercises">
          ${w.exercises.slice(0, 4).map(ei => {
            const ex = EXERCISES_MAP[ei.exercise_id];
            return ex ? `<span class="ex-pill">${esc(ex.name)}</span>` : '';
          }).join('')}
          ${exCount > 4 ? `<span class="ex-pill ex-pill--more">+${exCount - 4}</span>` : ''}
        </div>` : ''}
      </div>
      <div class="workout-list-item__actions">
        <button class="btn btn--accent btn--sm" data-start-workout="${w.id}">▶ Start</button>
        <button class="btn-icon btn-icon--danger" data-delete-workout="${w.id}" aria-label="Delete workout">🗑</button>
      </div>
    </div>
  `;
}

// ─── Workout Builder (Create / Edit) ──────────────────────────────────────

export function renderWorkoutBuilder({ id } = {}) {
  const isEdit = Boolean(id);
  const workout = isEdit ? Store.getWorkout(id) : null;

  if (isEdit && !workout) { navigate('/workouts'); return; }

  // Working copy of exercise instances (mutable during building)
  let exercises = workout ? workout.exercises.map(e => ({ ...e })) : [];
  let workoutName = workout?.name || '';

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--builder" id="builder-page">
      <header class="page-header page-header--back">
        <button class="btn-icon btn-back" id="back-btn" aria-label="Back">‹</button>
        <h1 class="page-header__title">${isEdit ? 'Edit Workout' : 'New Workout'}</h1>
        <button class="btn btn--accent btn--sm" id="save-btn">Save</button>
      </header>

      <div class="builder-body">
        <!-- Name input -->
        <div class="field">
          <label class="field__label">Workout Name</label>
          <input
            type="text"
            id="workout-name"
            class="input input--lg"
            placeholder="e.g. Upper 1, Push A, Leg Day"
            value="${esc(workoutName)}"
            maxlength="40"
          />
        </div>

        <!-- Exercise list -->
        <div class="field">
          <div class="field__header">
            <label class="field__label">Exercises</label>
            <button class="btn btn--ghost btn--sm" id="add-exercise-btn">+ Add</button>
          </div>
          <div id="exercise-instances">
            ${exercises.map((ei, idx) => _exerciseInstanceRow(ei, idx)).join('')}
            ${exercises.length === 0 ? `<p class="builder-empty">No exercises yet. Tap + Add.</p>` : ''}
          </div>
        </div>
      </div>

      <div class="bottom-spacer"></div>
    </div>
  `;

  function refreshInstances() {
    const container = document.getElementById('exercise-instances');
    container.innerHTML = exercises.length
      ? exercises.map((ei, idx) => _exerciseInstanceRow(ei, idx)).join('')
      : `<p class="builder-empty">No exercises yet. Tap + Add.</p>`;
    _bindInstanceEvents();
  }

  function _bindInstanceEvents() {
    // Delete
    document.querySelectorAll('[data-remove-ex]').forEach(btn => {
      btn.addEventListener('click', () => {
        exercises.splice(parseInt(btn.dataset.removeEx), 1);
        exercises.forEach((e, i) => { e.order = i; });
        refreshInstances();
      });
    });

    // Move up
    document.querySelectorAll('[data-move-up]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.moveUp);
        if (i > 0) {
          [exercises[i], exercises[i-1]] = [exercises[i-1], exercises[i]];
          exercises.forEach((e, j) => { e.order = j; });
          refreshInstances();
        }
      });
    });

    // Move down
    document.querySelectorAll('[data-move-down]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.moveDown);
        if (i < exercises.length - 1) {
          [exercises[i], exercises[i+1]] = [exercises[i+1], exercises[i]];
          exercises.forEach((e, j) => { e.order = j; });
          refreshInstances();
        }
      });
    });

    // Sets input
    document.querySelectorAll('[data-field-sets]').forEach(input => {
      input.addEventListener('change', () => {
        const i = parseInt(input.dataset.fieldSets);
        exercises[i].sets = Math.max(1, Math.min(10, parseInt(input.value) || 3));
        input.value = exercises[i].sets;
      });
    });

    // Rep range inputs
    document.querySelectorAll('[data-field-repmin]').forEach(input => {
      input.addEventListener('change', () => {
        const i = parseInt(input.dataset.fieldRepmin);
        const v = Math.max(1, parseInt(input.value) || 1);
        exercises[i].rep_range[0] = v;
        if (v > exercises[i].rep_range[1]) {
          exercises[i].rep_range[1] = v;
          const maxInput = document.querySelector(`[data-field-repmax="${i}"]`);
          if (maxInput) maxInput.value = v;
        }
      });
    });

    document.querySelectorAll('[data-field-repmax]').forEach(input => {
      input.addEventListener('change', () => {
        const i = parseInt(input.dataset.fieldRepmax);
        const v = Math.max(exercises[i].rep_range[0], parseInt(input.value) || 1);
        exercises[i].rep_range[1] = v;
        input.value = v;
      });
    });

    // Notes
    document.querySelectorAll('[data-field-notes]').forEach(input => {
      input.addEventListener('input', () => {
        const i = parseInt(input.dataset.fieldNotes);
        exercises[i].notes = input.value;
      });
    });
  }

  // Add exercise button
  document.getElementById('add-exercise-btn').addEventListener('click', () => {
    _openExercisePicker(selected => {
      exercises.push({
        id: uid(),
        exercise_id: selected.id,
        sets: 3,
        rep_range: [8, 12],
        notes: '',
        order: exercises.length,
      });
      refreshInstances();
    });
  });

  // Save
  document.getElementById('save-btn').addEventListener('click', () => {
    const name = document.getElementById('workout-name').value.trim();
    if (!name) { toast('Please enter a workout name', 'error'); return; }
    if (exercises.length === 0) { toast('Add at least one exercise', 'error'); return; }

    if (isEdit) {
      Store.updateWorkout(id, { name, exercises });
      toast('Workout saved', 'success');
      navigate(`/workouts/${id}`);
    } else {
      const newWorkout = {
        id: uid(),
        name,
        exercises,
        created_at: new Date().toISOString(),
      };
      Store.addWorkout(newWorkout);
      toast('Workout created', 'success');
      navigate('/workouts');
    }
  });

  document.getElementById('back-btn').addEventListener('click', () => back());

  _bindInstanceEvents();
}

function _exerciseInstanceRow(ei, idx) {
  const ex = EXERCISES_MAP[ei.exercise_id];
  if (!ex) return '';
  return `
    <div class="instance-row" data-instance-idx="${idx}">
      <div class="instance-row__header">
        <div class="instance-row__order">${idx + 1}</div>
        <div class="instance-row__name">${esc(ex.name)}</div>
        <div class="instance-row__controls">
          <button class="btn-icon btn-icon--sm" data-move-up="${idx}" title="Move up" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn-icon btn-icon--sm" data-move-down="${idx}" title="Move down">↓</button>
          <button class="btn-icon btn-icon--danger btn-icon--sm" data-remove-ex="${idx}" title="Remove">✕</button>
        </div>
      </div>
      <div class="instance-row__meta">
        <span class="muscle-chip muscle-chip--sm">${MUSCLE_LABELS[ex.primary_muscle] || ex.primary_muscle}</span>
        <span class="equip-label">${equipmentIcon(ex.equipment)} ${EQUIPMENT_LABELS[ex.equipment]}</span>
      </div>
      <div class="instance-row__fields">
        <div class="field-inline">
          <label>Sets</label>
          <input type="number" class="input input--sm input--num" value="${ei.sets}" min="1" max="10" data-field-sets="${idx}" />
        </div>
        <div class="field-inline">
          <label>Reps</label>
          <div class="rep-range-inputs">
            <input type="number" class="input input--sm input--num" value="${ei.rep_range[0]}" min="1" max="50" data-field-repmin="${idx}" />
            <span class="rep-range-sep">–</span>
            <input type="number" class="input input--sm input--num" value="${ei.rep_range[1]}" min="1" max="50" data-field-repmax="${idx}" />
          </div>
        </div>
      </div>
      <div class="instance-row__notes">
        <input type="text" class="input input--sm" placeholder="Notes (optional)" value="${esc(ei.notes || '')}" data-field-notes="${idx}" maxlength="100" />
      </div>
    </div>
  `;
}

// ─── Exercise Picker Modal ─────────────────────────────────────────────────

function _openExercisePicker(onSelect) {
  let searchQ = '';
  let muscleFilter = '';

  const primaryMuscles = [...new Set(EXERCISES.map(e => e.primary_muscle))].sort();

  const body = `
    <div class="picker">
      <div class="picker__search">
        <input type="search" class="input" id="picker-search" placeholder="Search…" autocomplete="off" />
      </div>
      <div class="picker__filters">
        <button class="filter-chip filter-chip--active filter-chip--sm" data-pmuscle="">All</button>
        ${primaryMuscles.map(m =>
          `<button class="filter-chip filter-chip--sm" data-pmuscle="${m}">${MUSCLE_LABELS[m] || m}</button>`
        ).join('')}
      </div>
      <div class="picker__list" id="picker-list">
        ${_pickerItems(EXERCISES)}
      </div>
    </div>
  `;

  openModal({ title: 'Add Exercise', body, classes: 'modal--picker' });

  function refresh() {
    let list = EXERCISES;
    if (muscleFilter) list = list.filter(e => e.primary_muscle === muscleFilter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q));
    }
    const el = document.getElementById('picker-list');
    if (el) el.innerHTML = list.length ? _pickerItems(list) : `<p class="picker__empty">No results</p>`;
    _bindPickerItems();
  }

  function _bindPickerItems() {
    document.querySelectorAll('[data-pick-exercise]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ex = EXERCISES_MAP[btn.dataset.pickExercise];
        if (ex) { closeModal(); onSelect(ex); }
      });
    });
  }

  document.getElementById('picker-search')?.addEventListener('input', debounce(e => {
    searchQ = e.target.value.trim();
    refresh();
  }, 150));

  document.querySelector('.picker__filters')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-pmuscle]');
    if (!btn) return;
    document.querySelectorAll('.picker__filters .filter-chip').forEach(b => b.classList.remove('filter-chip--active'));
    btn.classList.add('filter-chip--active');
    muscleFilter = btn.dataset.pmuscle;
    refresh();
  });

  _bindPickerItems();
}

function _pickerItems(exercises) {
  return exercises.map(e => `
    <button class="picker-item" data-pick-exercise="${e.id}">
      <span class="picker-item__icon">${equipmentIcon(e.equipment)}</span>
      <span class="picker-item__info">
        <span class="picker-item__name">${esc(e.name)}</span>
        <span class="picker-item__sub">${MUSCLE_LABELS[e.primary_muscle] || e.primary_muscle} · ${EQUIPMENT_LABELS[e.equipment]}</span>
      </span>
    </button>
  `).join('');
}

// ─── Workout Detail (View) ─────────────────────────────────────────────────

export function renderWorkoutDetail({ id }) {
  const workout = Store.getWorkout(id);
  if (!workout) { navigate('/workouts'); return; }

  const lastLog = Store.getLastLog(id);
  const logs = Store.getWorkoutLogs(id);

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--workout-detail">
      <header class="page-header page-header--back">
        <button class="btn-icon btn-back" id="back-btn">‹</button>
        <h1 class="page-header__title">${esc(workout.name)}</h1>
        <button class="btn btn--ghost btn--sm" id="edit-btn">Edit</button>
      </header>

      <div class="workout-detail">
        <div class="workout-detail__actions">
          <button class="btn btn--accent btn--lg btn--full" id="start-btn">▶ Start Workout</button>
        </div>

        <section class="section">
          <h2 class="section__title">${workout.exercises.length} Exercises</h2>
          <div class="exercise-list">
            ${workout.exercises.map((ei, idx) => _detailExerciseRow(ei, idx)).join('')}
          </div>
        </section>

        ${logs.length > 0 ? `
          <section class="section">
            <h2 class="section__title">History</h2>
            <div class="history-list">
              ${logs.slice(0, 5).map(l => _historyRow(l)).join('')}
            </div>
          </section>
        ` : ''}
      </div>

      <div class="bottom-spacer"></div>
    </div>
  `;

  document.getElementById('back-btn').addEventListener('click', () => back());
  document.getElementById('edit-btn').addEventListener('click', () => navigate(`/workouts/${id}/edit`));
  document.getElementById('start-btn').addEventListener('click', () => navigate(`/session/${id}`));
}

function _detailExerciseRow(ei, idx) {
  const ex = EXERCISES_MAP[ei.exercise_id];
  if (!ex) return '';
  return `
    <div class="exercise-item">
      <div class="exercise-item__order">${idx + 1}</div>
      <div class="exercise-item__info">
        <div class="exercise-item__name">${esc(ex.name)}</div>
        <div class="exercise-item__meta">
          <span>${ei.sets} sets · ${ei.rep_range[0]}–${ei.rep_range[1]} reps</span>
          <span class="muscle-chip muscle-chip--sm">${MUSCLE_LABELS[ex.primary_muscle] || ex.primary_muscle}</span>
        </div>
        ${ei.notes ? `<div class="exercise-item__notes">${esc(ei.notes)}</div>` : ''}
      </div>
    </div>
  `;
}

function _historyRow(log) {
  const totalSets = log.exercises.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0);
  const date = new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `
    <div class="history-row">
      <span class="history-row__date">${date}</span>
      <span class="history-row__sets">${totalSets} sets</span>
      ${log.completed ? '<span class="badge badge--green">Complete</span>' : '<span class="badge badge--grey">Partial</span>'}
    </div>
  `;
}
