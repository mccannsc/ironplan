import { signIn } from '../lib/auth.js';
import { navigate } from '../router.js';

export function renderLogin() {
  const view = document.getElementById('view');
  document.querySelector('.bottom-nav').style.display = 'none';

  view.innerHTML = `
    <div class="page page--login">
      <div class="login-wrap">
        <div class="login-brand">
          <div class="login-brand__icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 4v16M18 4v16M3 8h4M17 8h4M3 16h4M17 16h4"/>
            </svg>
          </div>
          <h1 class="login-brand__name">IronPlan</h1>
          <p class="login-brand__sub">Smart workout tracking</p>
        </div>

        <form class="login-form" id="login-form" novalidate>
          <div class="form-field">
            <label class="form-label" for="login-email">Email</label>
            <input
              class="form-input"
              type="email"
              id="login-email"
              name="email"
              autocomplete="email"
              inputmode="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div class="form-field">
            <label class="form-label" for="login-password">Password</label>
            <input
              class="form-input"
              type="password"
              id="login-password"
              name="password"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          <div class="login-error" id="login-error" hidden></div>

          <button class="btn btn--accent btn--full" type="submit" id="login-submit">
            Sign in
          </button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errorEl.hidden = true;

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      await signIn(email, password);
      // onAuthStateChange in app.js will handle the redirect
    } catch (err) {
      errorEl.textContent = err.message || 'Sign in failed. Check your credentials.';
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
  });
}
