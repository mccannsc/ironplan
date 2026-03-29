/**
 * IronPlan – App entry point
 */

import { onRoute, navigate, initRouter } from './router.js';
import { Store } from './store.js';
import { getUser, signOut, onAuthChange } from './lib/auth.js';
import { renderLogin } from './views/login.js';
import { renderDashboard } from './views/dashboard.js';
import { renderWorkouts, renderWorkoutBuilder, renderWorkoutDetail } from './views/workouts.js';
import { renderSession } from './views/session.js';
import { renderExercises, renderExerciseDetail } from './views/exercises.js';
import { renderPlan } from './views/plan.js';
import { renderSummary } from './views/summary.js';

// ─── Routes ────────────────────────────────────────────────────────────────

onRoute('/', () => renderDashboard());
onRoute('/workouts', () => renderWorkouts());
onRoute('/workouts/new', () => renderWorkoutBuilder());
onRoute('/workouts/:id/edit', ({ id }) => renderWorkoutBuilder({ id }));
onRoute('/workouts/:id/plan', ({ id }) => renderPlan({ id }));
onRoute('/workouts/:id', ({ id }) => renderWorkoutDetail({ id }));
onRoute('/session/:workoutId', ({ workoutId }) => renderSession({ workoutId }));
onRoute('/exercises', () => renderExercises());
onRoute('/exercises/:id', ({ id }) => renderExerciseDetail({ id }));
onRoute('/summary', () => renderSummary());

// ─── Nav ───────────────────────────────────────────────────────────────────

function updateNav() {
  const path = window.location.hash.slice(1) || '/';
  document.querySelectorAll('[data-nav]').forEach(item => {
    const target = item.dataset.nav;
    const active =
      (target === '/' && path === '/') ||
      (target !== '/' && path.startsWith(target));
    item.classList.toggle('nav-item--active', active);
  });
}

window.addEventListener('hashchange', updateNav);

function showNav() {
  document.querySelector('.bottom-nav').style.display = '';
}

function hideNav() {
  document.querySelector('.bottom-nav').style.display = 'none';
}

// ─── Boot ──────────────────────────────────────────────────────────────────

let _routerStarted = false;

function _startRouter() {
  if (_routerStarted) {
    navigate('/');
    return;
  }
  _routerStarted = true;
  updateNav();
  initRouter();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Wire up nav buttons
  document.querySelectorAll('[data-nav]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.nav));
  });

  window.addEventListener('beforeunload', e => {
    if (Store.getState().activeSession) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Check initial auth state before starting router
  const user = await getUser();

  if (user) {
    await Store.init(user.id);
    showNav();
    _startRouter();
  } else {
    hideNav();
    renderLogin();
  }

  // Listen for future auth changes (sign in / sign out)
  onAuthChange(async (newUser) => {
    if (newUser) {
      await Store.init(newUser.id);
      showNav();
      _startRouter();
    } else {
      Store.clearAll();
      hideNav();
      renderLogin();
    }
  });
});

// ─── Logout (called from dashboard) ─────────────────────────────────────────

export async function logout() {
  await signOut();
  // onAuthChange handles cleanup + redirect
}
