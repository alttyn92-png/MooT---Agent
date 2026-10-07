import { isControllableTab } from './tab-manager.js';

const connections = new Map();
const contentFiles = [
  'src/content/page-reader.js', 'src/content/dom-scanner.js',
  'src/content/element-finder.js', 'src/content/page-overlay.js',
  'src/content/editor.js', 'src/content/action-executor.js', 'src/content/page-observer.js',
  'src/content/messenger.js',
  'src/content/chat-monitor.js',
  'src/content/content-script.js',
];

export function isMissingReceiver(error) {
  return /Receiving end does not exist|Could not establish connection/i.test(error?.message || '');
}

async function ping(tabId) {
  const result = await chrome.tabs.sendMessage(tabId, { type: 'PING_PAGE', source: 'mut-background' }, { frameId: 0 });
  if (result?.type !== 'PONG_PAGE') throw new Error('MOOT получил некорректный ответ от страницы.');
  return result;
}

export function ensurePageConnection(tabId) {
  if (connections.has(tabId)) return connections.get(tabId);
  const pending = connect(tabId).finally(() => connections.delete(tabId));
  connections.set(tabId, pending);
  return pending;
}

async function connect(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!isControllableTab(tab)) {
    throw new Error('На этой странице браузер запрещает управление. Открой обычный сайт и повтори команду.');
  }
  try { return await ping(tabId); }
  catch (error) { if (!isMissingReceiver(error)) throw error; }

  // Tabs opened before installation/reload have no content-script listener.
  // Install in the isolated world, in dependency order, without reloading the site.
  try {
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: contentFiles });
    return await ping(tabId);
  } catch (error) {
    throw new Error(`Не удалось подключить MOOT к странице. Проверь доступ расширения к этому сайту или обнови вкладку. ${error?.message || error}`);
  }
}

export async function sendPageCommand(tabId, command) {
  await ensurePageConnection(tabId);
  try {
    return await chrome.tabs.sendMessage(tabId, { ...command, source: 'mut-background' }, { frameId: 0 });
  } catch (error) {
    // Only retry when there was no receiver. A closed port can mean that a click
    // already navigated the page; replaying that action could execute it twice.
    if (!isMissingReceiver(error)) throw error;
    await ensurePageConnection(tabId);
    return chrome.tabs.sendMessage(tabId, { ...command, source: 'mut-background' }, { frameId: 0 });
  }
}
