/**
 * History page – workout log review, edit and duplicate.
 */

import { Store } from '../store.js';
import { navigate, back } from '../router.js';
import { uid, fmtDate, fmtWeight, fmtDuration, timeAgo, today, esc } from '../utils.js';
import { EXERCISES_MAP, MUSCLE_LABELS } from '../data/exercises.js?v=6';
import { toast } from '../components/toast.js';

// ─── History Page ─────────────────────────────────────────────────────────────

let _historyOffset = 20;

export function renderHistory() {
  _historyOffset = 20;
  const { workoutLogs, workouts } = Store.getState();
  const bwLogs = Store.getBodyweightLogs();

  const now = new Date();
  function toDate(str) { return new Date(str + 'T00:00:00'); }
  function logsInPeriod(days) {
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);
    return workoutLogs.filter(l => l.completed && toDate(l.date) >= cutoff).length;
  }

  const completedLogs = workoutLogs
    .filter(l => l.completed)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Volume last 30 days
  const cutoff30 = new Date(now); cutoff30.setDate(now.getDate() - 30);
  const logs30 = workoutLogs.filter(l => l.completed && toDate(l.date) >= cutoff30);
  const volume30 = Math.round(logs30.reduce((t, log) =>
    t + log.exercises.reduce((et, ex) =>
      et + ex.sets.filter(s => s.completed).reduce((st, s) => st + s.weight * s.reps, 0)
    , 0)
  , 0));

  // Avg per week (12-week rolling)
  const cutoff12w = new Date(now); cutoff12w.setDate(now.getDate() - 84);
  const logs12w = workoutLogs.filter(l => l.completed && toDate(l.date) >= cutoff12w);
  const avgPerWeek = (logs12w.length / 12).toFixed(1);

  const latestBW = bwLogs[0] || null;

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--history">
      <header class="page-header">
        <div class="page-header__inner">
          <h1 class="page-header__title">History</h1>
        </div>
      </header>

      <!-- Workout counts -->
      <section class="section">
        <h2 class="section__title">Workout Counts</h2>
        <div class="count-grid">
          ${_countCell('7 days',  logsInPeriod(7))}
          ${_countCell('30 days', logsInPeriod(30))}
          ${_countCell('3 months', logsInPeriod(91))}
          ${_countCell('6 months', logsInPeriod(182))}
          ${_countCell('12 months', logsInPeriod(365))}
        </div>
      </section>

      <!-- Training metrics -->
      <section class="section">
        <h2 class="section__title">Metrics</h2>
        <div class="metrics-row">
          <div class="metric-item">
            <div class="metric-item__value">${volume30 >= 1000 ? (volume30 / 1000).toFixed(1) + 'k' : volume30}</div>
            <div class="metric-item__label">Volume 30d</div>
          </div>
          <div class="metric-item">
            <div class="metric-item__value">${avgPerWeek}</div>
            <div class="metric-item__label">Avg / week</div>
          </div>
          <div class="metric-item">
            <div class="metric-item__value">${completedLogs.length}</div>
            <div class="metric-item__label">Total</div>
          </div>
        </div>
      </section>

      <!-- Bodyweight -->
      <section class="section">
        <h2 class="section__title">Bodyweight</h2>
        <div class="bw-log-form">
          <input type="number" id="bw-hist-weight" class="bw-input" placeholder="${latestBW ? latestBW.weight : '70'}" min="20" max="300" step="0.1" />
          <span class="bw-log-form__unit">kg</span>
          <input type="date" id="bw-hist-date" class="bw-date-input" value="${today()}" max="${today()}" />
          <button class="btn btn--ghost btn--sm" id="bw-hist-save">Log</button>
        </div>
        ${bwLogs.length === 0
          ? `<p class="empty-text">Log your bodyweight to start tracking changes</p>`
          : `<div class="bw-trend">${bwLogs.slice(0, 8).map((b, i, arr) => {
              const prev = arr[i + 1];
              const delta = prev != null ? parseFloat((b.weight - prev.weight).toFixed(1)) : null;
              const sign = delta > 0 ? '+' : '';
              const cls = delta > 0 ? 'up' : delta < 0 ? 'down' : '';
              return `
                <div class="bw-trend-row">
                  <span class="bw-trend-row__date">${fmtDate(b.date)}</span>
                  <span class="bw-trend-row__weight">${b.weight}kg</span>
                  ${delta !== null ? `<span class="bw-trend-row__delta bw-trend-row__delta--${cls}">${sign}${delta}kg</span>` : '<span class="bw-trend-row__delta"></span>'}
                </div>`;
            }).join('')}</div>`
        }
      </section>

      <!-- Workout history list -->
      <section class="section">
        <div class="section__header">
          <h2 class="section__title">Sessions</h2>
        </div>
        ${completedLogs.length === 0
          ? `<div class="empty-state">
               <div class="empty-state__icon">📋</div>
               <p class="empty-state__text">Your completed workouts will appear here</p>
             </div>`
          : `<div class="hist-log-list" id="hist-log-list">
               ${completedLogs.slice(0, _historyOffset).map(l => _historyLogItem(l, workouts)).join('')}
             </div>
             ${completedLogs.length > _historyOffset
               ? `<button class="btn btn--ghost btn--sm btn--full hist-load-more" id="hist-load-more">Load more</button>`
               : ''
             }`
        }
      </section>

      <div class="bottom-spacer"></div>
    </div>
  `;

  // Bodyweight save
  document.getElementById('bw-hist-save')?.addEventListener('click', async () => {
    const weight = parseFloat(document.getElementById('bw-hist-weight')?.value);
    const date = document.getElementById('bw-hist-date')?.value || today();
    if (!weight || weight <= 0) { toast('Enter a valid weight', 'error'); return; }
    await Store.addBodyweight(weight, date);
    toast('Weight logged', 'success');
    renderHistory();
  });

  // Edit / duplicate buttons
  _bindHistoryListEvents();

  // Load more
  document.getElementById('hist-load-more')?.addEventListener('click', () => {
    _loadMoreLogs(completedLogs, workouts);
  });
}

function _bindHistoryListEvents() {
  document.querySelectorAll('[data-edit-log]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      navigate(`/history/${btn.dataset.editLog}/edit`);
    });
  });
  document.querySelectorAll('[data-dup-log]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      navigate(`/history/${btn.dataset.dupLog}/duplicate`);
    });
  });
}

function _loadMoreLogs(allLogs, workouts) {
  const list = document.getElementById('hist-log-list');
  if (!list) return;
  const batch = allLogs.slice(_historyOffset, _historyOffset + 20);
  batch.forEach(l => {
    list.insertAdjacentHTML('beforeend', _historyLogItem(l, workouts));
  });
  _historyOffset += 20;
  _bindHistoryListEvents();
  if (_historyOffset >= allLogs.length) {
    document.getElementById('hist-load-more')?.remove();
  }
}

function _countCell(label, count) {
  return `
    <div class="count-cell">
      <div class="count-cell__value">${count}</div>
      <div class="count-cell__label">${label}</div>
    </div>
  `;
}

function _historyLogItem(log, workouts) {
  const workout = workouts.find(w => w.id === log.workout_id);
  const name = workout?.name || 'Workout';
  const totalSets = log.exercises.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0);
  const totalVolume = Math.round(log.exercises.reduce((t, ex) =>
    t + ex.sets.filter(s => s.completed).reduce((sum, s) => sum + s.weight * s.reps, 0)
  , 0));
  const duration = log.completed_at && log.started_at
    ? fmtDuration(Math.floor((new Date(log.completed_at) - new Date(log.started_at)) / 1000))
    : null;
  const fmtVol = v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v);

  return `
    <div class="hist-log-item">
      <div class="hist-log-item__main">
        <div class="hist-log-item__name">${esc(name)}</div>
        <div class="hist-log-item__date">${fmtDate(log.date)}</div>
        <div class="hist-log-item__meta">
          ${totalSets} sets${totalVolume > 0 ? ` · ${fmtVol(totalVolume)}kg` : ''}${duration ? ` · ${duration}` : ''}
        </div>
        <div class="hist-log-item__ago">${timeAgo(log.date)}</div>
      </div>
      <div class="hist-log-item__actions">
        <button class="btn btn--ghost btn--xs" data-edit-log="${log.id}">Edit</button>
        <button class="btn btn--ghost btn--xs" data-dup-log="${log.id}">Dup</button>
      </div>
    </div>
  `;
}

// ─── Edit Past Workout ────────────────────────────────────────────────────────

export function renderEditLog({ logId }) {
  const { workoutLogs, workouts } = Store.getState();
  const log = workoutLogs.find(l => l.id === logId);
  if (!log) { navigate('/history'); return; }
  const workout = workouts.find(w => w.id === log.workout_id);
  if (!workout) { navigate('/history'); return; }

  _renderLogEditor({ log: JSON.parse(JSON.stringify(log)), workout, mode: 'edit' });
}

// ─── Duplicate Workout ────────────────────────────────────────────────────────

export function renderDuplicateLog({ logId }) {
  const { workoutLogs, workouts } = Store.getState();
  const source = workoutLogs.find(l => l.id === logId);
  if (!source) { navigate('/history'); return; }
  const workout = workouts.find(w => w.id === source.workout_id);
  if (!workout) { navigate('/history'); return; }

  const newLog = {
    ...JSON.parse(JSON.stringify(source)),
    id: uid(),
    date: today(),
    started_at: null,
    completed_at: null,
    completed: true,
  };

  _renderLogEditor({ log: newLog, workout, mode: 'duplicate' });
}

// ─── Shared editor ────────────────────────────────────────────────────────────

function _renderLogEditor({ log, workout, mode }) {
  const isEdit = mode === 'edit';
  const title = isEdit ? 'Edit Workout' : 'Log Workout';
  const origDate = log.date;

  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="page page--log-editor">
      <header class="page-header page-header--back">
        <button class="btn-icon btn-back" id="editor-back">‹</button>
        <h1 class="page-header__title">${esc(title)}</h1>
        <button class="btn btn--accent btn--sm" id="editor-save">Save</button>
      </header>

      <div class="editor-meta">
        <div class="editor-meta__workout">${esc(workout.name)}</div>
        <div class="editor-date-row">
          <label class="editor-date-row__label">Date</label>
          <input type="date" id="editor-date" class="session-date-input" value="${log.date}" max="${today()}" />
        </div>
        <div class="editor-seq-warn" id="editor-seq-warn" style="display:none">
          ⚠ This will affect your workout sequence
        </div>
      </div>

      <div class="editor-body" id="editor-body">
        ${log.exercises.map((exLog, i) => _editorExBlock(exLog, workout, i)).join('')}
      </div>

      <div class="bottom-spacer"></div>
    </div>
  `;

  document.getElementById('editor-back').addEventListener('click', () => back());

  // Date change
  document.getElementById('editor-date')?.addEventListener('change', e => {
    const newDate = e.target.value;
    const t = today();
    if (!newDate || newDate > t) { e.target.value = log.date; return; }
    log.date = newDate;
    const warn = document.getElementById('editor-seq-warn');
    if (warn) warn.style.display = newDate !== origDate ? '' : 'none';

    // Duplicate warning: same workout on same date?
    if (!isEdit) {
      const { workoutLogs } = Store.getState();
      const clash = workoutLogs.some(l =>
        l.id !== log.id && l.workout_id === log.workout_id && l.date === newDate && l.completed
      );
      if (clash) toast('You already logged this workout on this date', 'warning');
    }
  });

  // Bind editor events
  _bindEditorEvents(log, workout);

  // Save
  document.getElementById('editor-save').addEventListener('click', () => {
    // Collect current values from inputs
    _syncEditorToLog(log);

    if (isEdit) {
      Store.updateWorkoutLog(log.id, { date: log.date, exercises: log.exercises });
      toast('Workout updated', 'success');
    } else {
      // Check for date clash on new log
      const { workoutLogs } = Store.getState();
      const clash = workoutLogs.some(l =>
        l.workout_id === log.workout_id && l.date === log.date && l.completed
      );
      if (clash && !confirm('You already logged this workout on this date. Save anyway?')) return;

      Store.addWorkoutLog(log);
      toast('Workout logged', 'success');
    }

    navigate('/history');
  });
}

function _editorExBlock(exLog, workout, exIdx) {
  const ei = workout.exercises.find(e => e.id === exLog.exercise_instance_id);
  const effectiveExId = exLog.substituted_exercise_id || exLog.exercise_id;
  const ex = EXERCISES_MAP[effectiveExId];
  const displayName = ex?.name || (ei ? `Exercise ${exIdx + 1}` : `Exercise ${exIdx + 1}`);

  // For editor, show all sets (completed = true for new logs from duplicate)
  const sets = exLog.sets.filter(s => s.completed || !exLog.sets.some(s2 => s2.completed));

  return `
    <div class="editor-ex-block" id="editor-ex-${exIdx}">
      <div class="editor-ex-header">
        <span class="editor-ex-num">${exIdx + 1}</span>
        <span class="editor-ex-name">${esc(displayName)}</span>
        ${ex ? `<span class="muscle-chip muscle-chip--sm">${MUSCLE_LABELS[ex.primary_muscle] || ex.primary_muscle}</span>` : ''}
      </div>
      <div class="editor-sets" id="editor-sets-${exIdx}">
        <div class="editor-sets-header">
          <span>Set</span><span>Weight (kg)</span><span>Reps</span><span></span>
        </div>
        ${sets.map((s, sIdx) => _editorSetRow(s, exIdx, sIdx)).join('')}
      </div>
      <button class="btn btn--ghost btn--xs editor-add-set" data-editor-add data-ex="${exIdx}">+ Set</button>
    </div>
  `;
}

function _editorSetRow(s, exIdx, sIdx) {
  return `
    <div class="editor-set-row" id="editor-set-${exIdx}-${sIdx}">
      <span class="editor-set-num">${sIdx + 1}</span>
      <input type="number" class="editor-input" data-ew data-ex="${exIdx}" data-set="${sIdx}"
        value="${s.weight}" min="0" max="500" step="2.5" />
      <input type="number" class="editor-input" data-er data-ex="${exIdx}" data-set="${sIdx}"
        value="${s.reps}" min="1" max="100" />
      <button class="btn-icon btn-icon--danger btn-icon--sm" data-editor-rem data-ex="${exIdx}" data-set="${sIdx}">✕</button>
    </div>
  `;
}

function _syncEditorToLog(log) {
  // Read all current input values back into log object
  log.exercises.forEach((exLog, exIdx) => {
    const activeSets = exLog.sets.filter(s => s.completed || !exLog.sets.some(s2 => s2.completed));
    activeSets.forEach((s, sIdx) => {
      const wInput = document.querySelector(`[data-ew][data-ex="${exIdx}"][data-set="${sIdx}"]`);
      const rInput = document.querySelector(`[data-er][data-ex="${exIdx}"][data-set="${sIdx}"]`);
      if (wInput) s.weight = Math.max(0, parseFloat(wInput.value) || 0);
      if (rInput) s.reps   = Math.max(1, parseInt(rInput.value)   || 1);
      s.completed = true;
    });
  });
}

function _bindEditorEvents(log, workout) {
  const body = document.getElementById('editor-body');
  if (!body) return;

  body.addEventListener('click', e => {
    // Add set
    const addBtn = e.target.closest('[data-editor-add]');
    if (addBtn) {
      const exIdx = parseInt(addBtn.dataset.ex);
      const exLog = log.exercises[exIdx];
      const last = exLog.sets[exLog.sets.length - 1];
      exLog.sets.push({
        set_number: exLog.sets.length + 1,
        weight: last?.weight ?? 0,
        reps: last?.reps ?? 8,
        completed: true,
      });
      _refreshEditorExBlock(log, workout, exIdx);
      return;
    }

    // Remove set
    const remBtn = e.target.closest('[data-editor-rem]');
    if (remBtn) {
      const exIdx = parseInt(remBtn.dataset.ex);
      const sIdx  = parseInt(remBtn.dataset.set);
      const exLog = log.exercises[exIdx];
      if (exLog.sets.length > 1) {
        // Sync current inputs first before splicing
        _syncEditorToLog(log);
        exLog.sets.splice(sIdx, 1);
        exLog.sets.forEach((s, i) => { s.set_number = i + 1; });
        _refreshEditorExBlock(log, workout, exIdx);
      }
      return;
    }
  });
}

function _refreshEditorExBlock(log, workout, exIdx) {
  const el = document.getElementById(`editor-ex-${exIdx}`);
  if (!el) return;
  const exLog = log.exercises[exIdx];
  const sets = exLog.sets.filter(s => s.completed || !exLog.sets.some(s2 => s2.completed));
  const container = document.getElementById(`editor-sets-${exIdx}`);
  if (container) {
    container.innerHTML = `
      <div class="editor-sets-header"><span>Set</span><span>Weight (kg)</span><span>Reps</span><span></span></div>
      ${sets.map((s, sIdx) => _editorSetRow(s, exIdx, sIdx)).join('')}
    `;
  }
}
