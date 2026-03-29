/** Generate a short unique id */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Format date as "Mon 29 Mar" */
export function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Format duration in seconds to "1h 23m" or "45m" */
export function fmtDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Today's ISO date string (YYYY-MM-DD) */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** "5 days ago", "Today", "Yesterday" */
export function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return fmtDate(dateStr);
}

/** Format weight: remove trailing zeros */
export function fmtWeight(kg) {
  if (kg === undefined || kg === null) return '—';
  const n = parseFloat(kg);
  return n % 1 === 0 ? `${n}` : n.toFixed(1);
}

/** Capitalise first letter */
export function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/** Debounce */
export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Clamp a number */
export function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

/** Escape HTML to prevent XSS */
export function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Get equipment icon emoji */
export function equipmentIcon(equipment) {
  const icons = {
    barbell:    '🏋️',
    dumbbell:   '💪',
    machine:    '⚙️',
    bodyweight: '🤸',
    cable:      '🔗',
    kettlebell: '🫙',
    smith:      '🔩',
  };
  return icons[equipment] || '•';
}

/** Get muscle group colour class */
export function muscleColor(muscle) {
  const map = {
    chest: 'muscle-chest', chest_upper: 'muscle-chest', chest_lower: 'muscle-chest',
    lats: 'muscle-back', back_upper: 'muscle-back', back_lower: 'muscle-back',
    shoulders: 'muscle-shoulders', traps: 'muscle-shoulders',
    biceps: 'muscle-arms', triceps: 'muscle-arms', forearms: 'muscle-arms',
    quads: 'muscle-legs', hamstrings: 'muscle-legs', glutes: 'muscle-legs', calves: 'muscle-legs',
    core: 'muscle-core',
  };
  return map[muscle] || 'muscle-other';
}
