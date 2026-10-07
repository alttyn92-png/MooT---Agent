// Read the previous single-chat format without losing its queue or journal.
export function monitorEntries(state) {
  return state?.monitors || (state?.id ? [state] : []);
}

export function monitorCollection(monitors) {
  const live = monitors.filter(item => item.enabled);
  const first = live[0] || monitors[0];
  return { ...first, version: 2, enabled: live.length > 0, status: live.length ? first.status : 'stopped', monitors };
}
