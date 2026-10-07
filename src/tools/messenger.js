const pendingSends = new Map();
async function dispatch(args, tabId) {
  const response = await chrome.runtime.sendMessage({ type: 'SEND_TO_PAGE', payload: { tabId, command: { type: 'MESSENGER', args } } });
  if (!response?.success || response.response?.success === false) throw new Error(response?.error || response?.response?.error || 'Мессенджер не ответил.');
  return response.response.messenger;
}
export async function messengerTool(args) {
  if (args.action !== 'send') return dispatch(args);
  const { mutState } = await chrome.storage.local.get('mutState');
  if (!mutState?.currentTaskId || mutState.stopRequested) throw new Error('Задача остановлена. Сообщение не отправлено.');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const identity = JSON.stringify([mutState.currentTaskId, tab?.id, args.expectedChat, args.text]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  const key = 'moot-send-' + [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('');
  if (pendingSends.has(key)) return pendingSends.get(key);
  const work = (async () => {
    const cached = (await chrome.storage.session.get(key))[key];
    if (cached) return { ...cached, duplicatePrevented: true };
    await dispatch({ ...args, action: 'validate_send' }, tab.id);
    const state = (await chrome.storage.local.get('mutState')).mutState;
    if (state?.stopRequested || state?.currentTaskId !== mutState.currentTaskId) throw new Error('Задача остановлена. Сообщение не отправлено.');
    const uncertain = { status: 'unconfirmed', verified: false, sent: null, note: 'Эта отправка уже начата. Проверь переписку; автоматически повторять её нельзя.' };
    await chrome.storage.session.set({ [key]: uncertain });
    try {
      const result = await dispatch(args, tab.id);
      await chrome.storage.session.set({ [key]: result });
      return result;
    } catch (error) { return { ...uncertain, error: error.message }; }
  })().finally(() => pendingSends.delete(key));
  pendingSends.set(key, work);
  return work;
}
