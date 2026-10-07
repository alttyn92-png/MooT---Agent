export async function monitorTool({ action, ...payload }) {
  const type = ({ start: 'MONITOR_START', status: 'MONITOR_STATUS', stop: 'MONITOR_STOP' })[action];
  if (!type) throw new Error('Unknown monitor action');
  const response = await chrome.runtime.sendMessage({ type, payload });
  if (!response?.success) throw new Error(response?.error || 'Мониторинг не ответил.');
  return response.monitor;
}
