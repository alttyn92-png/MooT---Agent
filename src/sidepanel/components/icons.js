// One consistent 24px grid; inherits the button color in every state.
const paths = {
  settings: '<path d="m9.5 3-.6 2.2-1.6.9-2.2-.6L2.6 9.8l1.6 1.6v1.8L2.6 15l2.5 4.3 2.2-.6 1.6.9.6 2.2h5l.6-2.2 1.6-.9 2.2.6 2.5-4.3-1.6-1.7v-1.8l1.6-1.7-2.5-4.3-2.2.6-1.6-.9-.6-2.2z"/><circle cx="12" cy="12.4" r="3.1"/>',
  volume: '<path d="M11 4 6 8H3v8h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M11 4 6 8H3v8h3l5 4z"/><path d="m16 9 6 6m0-6-6 6"/>',
  history: '<path d="M3 11a9 9 0 1 1 2.7 7.4M3 4v7h7"/><path d="M12 7v5l3 2"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
};
export function icon(name) {
  return `<svg class="moot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || ''}</svg>`;
}
