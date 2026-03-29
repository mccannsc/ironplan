import { Store } from '../store.js';
import { navigate, back } from '../router.js';
import {
  EXERCISES, EXERCISES_MAP, MUSCLE_LABELS, EQUIPMENT_LABELS, PATTERN_LABELS,
} from '../data/exercises.js';
import { esc, equipmentIcon, debounce } from '../utils.js';

// ─── Exercise Browser ──────────────────────────────────────────────────────

export function renderExercises() {
  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--exercises">
      <header class="page-header">
        <div class="page-header__inner">
          <h1 class="page-header__title">Exercises</h1>
          <span class="page-header__count">${EXERCISES.length}</span>
        </div>
      </header>

      <div class="search-bar">
        <span class="search-bar__icon">🔍</span>
        <input
          type="search"
          class="search-bar__input"
          id="exercise-search"
          placeholder="Search exercises…"
          autocomplete="off"
        />
      </div>

      <div class="filter-row" id="muscle-filters">
        <button class="filter-chip filter-chip--active" data-muscle="">All</button>
        ${Object.entries(_muscleGroupMap()).map(([group, label]) =>
          `<button class="filter-chip" data-muscle="${group}">${label}</button>`
        ).join('')}
      </div>

      <div class="filter-row" id="equipment-filters">
        <button class="filter-chip filter-chip--active" data-equip="">Any</button>
        ${Object.entries(EQUIPMENT_LABELS).map(([eq, label]) =>
          `<button class="filter-chip" data-equip="${eq}">${label}</button>`
        ).join('')}
      </div>

      <div class="exercise-list" id="exercise-list">
        ${_renderExerciseItems(EXERCISES)}
      </div>

      <div class="bottom-spacer"></div>
    </div>
  `;

  let selectedMuscle = '';
  let selectedEquip = '';
  let searchQuery = '';

  const listEl = document.getElementById('exercise-list');

  function refresh() {
    let list = EXERCISES;
    if (selectedMuscle) list = list.filter(e =>
      e.primary_muscle === selectedMuscle || e.secondary_muscles.includes(selectedMuscle)
    );
    if (selectedEquip) list = list.filter(e => e.equipment === selectedEquip);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (MUSCLE_LABELS[e.primary_muscle] || '').toLowerCase().includes(q)
      );
    }
    listEl.innerHTML = list.length
      ? _renderExerciseItems(list)
      : `<div class="empty-state"><p class="empty-state__text">No exercises match.</p></div>`;
    _bindItems();
  }

  document.getElementById('muscle-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-muscle]');
    if (!btn) return;
    document.querySelectorAll('#muscle-filters .filter-chip').forEach(b => b.classList.remove('filter-chip--active'));
    btn.classList.add('filter-chip--active');
    selectedMuscle = btn.dataset.muscle;
    refresh();
  });

  document.getElementById('equipment-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-equip]');
    if (!btn) return;
    document.querySelectorAll('#equipment-filters .filter-chip').forEach(b => b.classList.remove('filter-chip--active'));
    btn.classList.add('filter-chip--active');
    selectedEquip = btn.dataset.equip;
    refresh();
  });

  document.getElementById('exercise-search').addEventListener('input', debounce(e => {
    searchQuery = e.target.value.trim();
    refresh();
  }, 200));

  _bindItems();
}

function _bindItems() {
  document.querySelectorAll('[data-exercise-id]').forEach(el => {
    el.addEventListener('click', () => navigate(`/exercises/${el.dataset.exerciseId}`));
  });
}

function _renderExerciseItems(exercises) {
  return exercises.map(e => `
    <div class="exercise-item" data-exercise-id="${e.id}" role="button" tabindex="0">
      <div class="exercise-item__icon">${equipmentIcon(e.equipment)}</div>
      <div class="exercise-item__info">
        <div class="exercise-item__name">${esc(e.name)}</div>
        <div class="exercise-item__meta">
          <span class="muscle-chip muscle-chip--sm">${MUSCLE_LABELS[e.primary_muscle] || e.primary_muscle}</span>
          <span class="exercise-item__equip">${EQUIPMENT_LABELS[e.equipment] || e.equipment}</span>
        </div>
      </div>
      <div class="exercise-item__arrow">›</div>
    </div>
  `).join('');
}

function _muscleGroupMap() {
  const primary = {};
  EXERCISES.forEach(e => { primary[e.primary_muscle] = true; });
  const labels = {};
  Object.keys(primary).forEach(m => { if (MUSCLE_LABELS[m]) labels[m] = MUSCLE_LABELS[m]; });
  return labels;
}

// ─── Exercise Detail ───────────────────────────────────────────────────────

export function renderExerciseDetail({ id }) {
  const exercise = EXERCISES_MAP[id];
  if (!exercise) { navigate('/exercises'); return; }

  const lastLog = Store.getLastExerciseLog(id);

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--exercise-detail">
      <header class="page-header page-header--back">
        <button class="btn-icon btn-back" id="back-btn" aria-label="Back">‹</button>
        <h1 class="page-header__title">${esc(exercise.name)}</h1>
      </header>

      <div class="ex-detail">
        <div class="ex-detail__chips">
          <div class="info-chip">
            <span class="info-chip__label">Primary</span>
            <span class="info-chip__value">${MUSCLE_LABELS[exercise.primary_muscle] || exercise.primary_muscle}</span>
          </div>
          <div class="info-chip">
            <span class="info-chip__label">Equipment</span>
            <span class="info-chip__value">${equipmentIcon(exercise.equipment)} ${EQUIPMENT_LABELS[exercise.equipment]}</span>
          </div>
          <div class="info-chip">
            <span class="info-chip__label">Pattern</span>
            <span class="info-chip__value">${PATTERN_LABELS[exercise.pattern] || exercise.pattern}</span>
          </div>
          <div class="info-chip">
            <span class="info-chip__label">Level</span>
            <span class="info-chip__value difficulty--${exercise.difficulty}">${exercise.difficulty}</span>
          </div>
        </div>

        ${exercise.secondary_muscles.length ? `
          <div class="ex-detail__section">
            <h3 class="ex-detail__section-title">Also works</h3>
            <div class="chip-row">
              ${exercise.secondary_muscles.map(m =>
                `<span class="muscle-chip">${MUSCLE_LABELS[m] || m}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}

        ${exercise.description ? `
          <div class="ex-detail__section">
            <h3 class="ex-detail__section-title">Coaching cues</h3>
            <p class="ex-detail__desc">${esc(exercise.description)}</p>
          </div>
        ` : ''}

        ${lastLog ? `
          <div class="ex-detail__section">
            <h3 class="ex-detail__section-title">Last logged</h3>
            <div class="last-log">
              ${lastLog.sets.filter(s => s.completed).map((s, i) =>
                `<div class="last-log__set">
                  <span class="last-log__num">Set ${i + 1}</span>
                  <span class="last-log__data">${s.weight}kg × ${s.reps}</span>
                </div>`
              ).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="bottom-spacer"></div>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', () => back());
}
