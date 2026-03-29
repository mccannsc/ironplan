/**
 * Modal component.
 * Usage:
 *   openModal({ title, body, onClose })
 *   closeModal()
 */

let _overlay = null;

function _getOverlay() {
  if (!_overlay) _overlay = document.getElementById('modal-overlay');
  return _overlay;
}

export function openModal({ title = '', body = '', onClose = null, classes = '' } = {}) {
  const overlay = _getOverlay();
  if (!overlay) return;

  overlay.innerHTML = `
    <div class="modal ${classes}" role="dialog" aria-modal="true">
      <div class="modal__header">
        <h2 class="modal__title">${title}</h2>
        <button class="modal__close btn-icon" aria-label="Close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal__body">${body}</div>
    </div>
  `;

  overlay.classList.add('modal-overlay--visible');

  const close = () => {
    overlay.classList.remove('modal-overlay--visible');
    setTimeout(() => { overlay.innerHTML = ''; }, 300);
    onClose?.();
  };

  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  }, { once: true });

  // Return close fn so callers can close programmatically
  return close;
}

export function closeModal() {
  const overlay = _getOverlay();
  if (!overlay) return;
  overlay.classList.remove('modal-overlay--visible');
  setTimeout(() => { overlay.innerHTML = ''; }, 300);
}
