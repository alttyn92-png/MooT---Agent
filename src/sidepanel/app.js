import { MOOT } from '../agent/mut-agent.js';
import { voiceController } from '../voice/voice-controller.js';
import { LiveConversation } from '../voice/live-conversation.js';
import { ensureActiveChat, getCurrentConversation, saveUserMessage, saveAssistantMessage } from '../memory/conversation-memory.js';
import { getUserProfile } from '../memory/profile-manager.js';
import { initializeDefaultSettings, getMergedSettings, setSetting, syncSettingsToChromeStorage } from '../database/settings-db.js';
import { MutHeader } from './components/Header.js';
import { icon } from './components/icons.js';
import { MutChatView } from './components/Chat.js';
import { MutComposer } from './components/Composer.js';
import { MutImageUpload } from './components/ImageUpload.js';
import { MutAgentStatus } from './components/AgentStatus.js';
import { MutTaskProgress } from './components/TaskProgress.js';
import { MutHistoryPanel } from './components/HistoryPanel.js';
import { MutSettingsPanel } from './components/SettingsPanel.js';

export class MutApp {
  constructor(root) {
    this.root = root;
    this.components = {};
    this.busy = false;
    this.turn = 0;
    this.voiceTurn = 0;
    this.live = new LiveConversation({
      onTranscript: text => this.acceptVoice(text),
      onSpeechStart: () => this.interruptSpeech(),
      onState: state => this.setVoiceState(state),
      onError: error => this.showError(error),
    });
  }
  async initialize() {
    await initializeDefaultSettings();
    await syncSettingsToChromeStorage();
    await ensureActiveChat();
    await MOOT.initialize();
    const profile = await getUserProfile();
    if (profile) await MOOT.setUserProfile(profile);
    await this.reloadSettings();
    this.buildInterface();
    this.bindEvents();
    this.setMonitorState((await chrome.storage.local.get('mootMonitor')).mootMonitor);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.mootMonitor) this.setMonitorState(changes.mootMonitor.newValue);
    });
    await this.loadConversation(await getCurrentConversation());
    this.updateBusyState(false);
    if (!this.settings.openai?.apiKey) this.components.composer.setStatus('Добавь API-ключ в настройках, чтобы начать');
    window.addEventListener('pagehide', () => {
      void this.live.stop(); void MOOT.stop(); void voiceController.stopSpeaking();
    });
  }
  async reloadSettings() {
    this.settings = await getMergedSettings();
    MOOT.options.maxSteps = Math.max(1, Math.min(200, Number(this.settings.agent?.maxSteps) || 50));
    voiceController.setAutoSpeak(Boolean(this.settings.voice?.autoSpeak));
    voiceController.setVoice(this.settings.voice?.voice || 'alloy');
    this.components.header?.setVoiceEnabled(voiceController.getState().autoSpeak);
    this.components.composer?.setStatus(this.settings.openai?.apiKey ? 'MOOT готов' : 'Добавь API-ключ в настройках, чтобы начать');
  }
  buildInterface() {
    const c = this.components;
    const shell = document.createElement('div');
    shell.className = 'mut-shell';
    c.header = new MutHeader({ onToggleVoice: () => this.toggleVoiceReplies(), onStop: () => this.stopEverything() });
    const header = c.header.render();
    c.header.setVoiceEnabled(voiceController.getState().autoSpeak);
    const actions = header.querySelector('.mut-header__actions');
    actions.prepend(this.button('История', 'history', async () => {
      await this.interruptTask(); await c.history.show();
    }), this.button('Настройки', 'settings', async () => {
      await this.interruptTask(); await c.settings.show();
    }));
    c.chat = new MutChatView();
    c.imageUpload = new MutImageUpload();
    c.composer = new MutComposer({ onSend: () => this.sendCurrentMessage() });
    const composer = c.composer.render();
    c.agentStatus = new MutAgentStatus();
    c.taskProgress = new MutTaskProgress({ maxSteps: MOOT.options.maxSteps });
    const runtime = document.createElement('div');
    runtime.className = 'mut-agent-runtime';
    runtime.setAttribute('role', 'status');
    runtime.append(c.agentStatus.render(), c.taskProgress.render());
    composer.prepend(runtime);
    this.monitorStrip = document.createElement('div');
    this.monitorStrip.className = 'moot-monitor-strip'; this.monitorStrip.hidden = true;
    this.monitorStrip.innerHTML = '<div><strong data-monitor-title></strong><span data-monitor-status role="status"></span></div><button type="button" aria-label="Остановить мониторинг">Стоп</button>';
    this.monitorStrip.querySelector('button').onclick = () => this.stopMonitor();
    composer.prepend(this.monitorStrip);
    c.composer.getLeftActionsContainer().append(c.imageUpload.renderButton());
    this.voiceButton = this.button('Начать голосовой разговор', 'Начать разговор', () => this.toggleMicrophone());
    this.voiceButton.className = 'moot-call-button';
    c.composer.getLeftActionsContainer().append(this.voiceButton);
    this.voiceStrip = document.createElement('div');
    this.voiceStrip.className = 'moot-voice-strip';
    this.voiceStrip.hidden = true;
    this.voiceStrip.innerHTML = '<span class="moot-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span data-voice-label role="status"></span><button type="button" aria-label="Завершить разговор">×</button>';
    this.voiceStrip.querySelector('button').onclick = () => this.endVoice();
    composer.prepend(this.voiceStrip);
    shell.append(header, c.chat.render(), c.imageUpload.renderPreview(), composer);
    this.root.replaceChildren(shell);
    c.history = new MutHistoryPanel({ onConversationChange: conversation => this.loadConversation(conversation) });
    c.settings = new MutSettingsPanel({ onClose: () => this.reloadSettings() });
    document.body.append(c.history.render(), c.settings.render());
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        c.history.hide(); c.settings.hide();
        void this.reloadSettings(); void this.stopEverything();
      }
    });
    this.root.addEventListener('click', event => {
      const suggestion = event.target.closest('[data-moot-suggestion]');
      if (suggestion) { c.composer.setValue(suggestion.dataset.mootSuggestion); c.composer.focus(); }
      if (event.target.closest('[data-moot-start-voice]')) void this.toggleMicrophone();
    });
  }
  button(label, text, onClick) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'mut-icon-button';
    button.title = label; button.setAttribute('aria-label', label); button.textContent = text;
    if (['history', 'settings'].includes(text)) button.innerHTML = icon(text);
    button.onclick = () => Promise.resolve(onClick()).catch(error => this.showError(error));
    return button;
  }
  bindEvents() {
    MOOT.on('step', ({ step, plan }) => {
      if (!this.busy) return;
      const action = ({ click: 'Нажимаю', navigate: 'Открываю страницу', type_text: 'Ввожу текст', read_page: 'Читаю страницу', scroll: 'Прокручиваю' })[plan?.tool?.name] || 'Выполняю задачу';
      this.components.agentStatus.setState('working', action);
      this.components.taskProgress.update({ step, action });
    });
    voiceController.on('speech_started', () => {
      this.components.agentStatus.setState('speaking', 'MOOT отвечает');
      this.components.header.setRunning(true);
    });
    voiceController.on('speech_ended', () => {
      this.components.agentStatus.setState(this.live.active ? 'listening' : 'idle');
      this.components.header.setRunning(this.busy || this.live.active || this.monitorState?.enabled);
    });
  }
  sendCurrentMessage() {
    if (this.busy) return this.pending;
    const text = this.components.composer.getValue().trim();
    const images = this.components.imageUpload.getImages();
    if (!text && !images.length) return;
    this.components.composer.clear(); this.components.imageUpload.clear();
    this.pending = this.sendMessage(text, images, 'text');
    return this.pending;
  }
  async sendMessage(text, images = [], source = 'text') {
    const turn = ++this.turn;
    this.updateBusyState(true);
    const c = this.components;
    c.chat.appendMessage({ role: 'user', content: text, images });
    c.chat.showTyping();
    c.agentStatus.setState('thinking', 'Думаю');
    c.taskProgress.start({ maxSteps: MOOT.options.maxSteps, action: 'Выполняю запрос' });
    try {
      await voiceController.stopSpeaking();
      await saveUserMessage({ content: text, images, source });
      if (turn !== this.turn) return;
      if (/^(стоп|остановись|отмена|хватит|stop|cancel)[.!?\s]*$/i.test(text)) await this.stopMonitor();
      const result = await MOOT.sendMessage({ text, images: images.map(image => image.dataUrl), source });
      if (turn !== this.turn) return;
      const response = result?.message || result?.text || '';
      c.chat.hideTyping();
      if (response) {
        c.chat.appendMessage({ role: 'assistant', content: response, error: result.status === 'error' });
        await saveAssistantMessage({ content: response, source });
      }
      const completed = result.status === 'completed';
      c.agentStatus.setState(completed ? 'complete' : result.status === 'stopped' ? 'stopped' : 'error', completed ? 'Готово' : response);
      c.taskProgress.hide();
      if (response && turn === this.turn && (this.live.active || voiceController.getState().autoSpeak)) await voiceController.speak(response);
    } catch (error) {
      if (turn === this.turn) this.showError(error);
    } finally {
      if (turn === this.turn) { c.chat.hideTyping(); c.taskProgress.hide(); this.updateBusyState(false); }
    }
  }
  async interruptSpeech() {
    ++this.voiceTurn;
    await this.interruptTask();
  }
  async acceptVoice(text) {
    const voiceTurn = ++this.voiceTurn;
    await this.interruptTask();
    if (!this.live.active || voiceTurn !== this.voiceTurn) return;
    if (/^(стоп|остановись|отмена|хватит|stop|cancel)[.!?\s]*$/i.test(text)) {
      await this.stopMonitor();
      this.components.composer.setStatus('Остановлено. Слушаю следующую команду'); return;
    }
    this.pending = this.sendMessage(text, [], 'voice');
    await this.pending;
  }
  async interruptTask() {
    ++this.turn;
    await MOOT.stop(); await voiceController.stopSpeaking(); await this.pending;
    this.components.chat.hideTyping(); this.components.taskProgress.hide(); this.updateBusyState(false);
  }
  async stopEverything() {
    await this.stopMonitor();
    ++this.voiceTurn; await this.live.stop(); await this.interruptTask();
    this.components.agentStatus.setState('stopped', 'Остановлено');
  }
  async toggleMicrophone() {
    if (this.live.active) return this.endVoice();
    await this.live.start();
  }
  async endVoice() { await this.live.stop(); await voiceController.stopSpeaking(); }
  async stopMonitor() {
    await chrome.runtime.sendMessage({ type: 'MONITOR_STOP' });
  }
  setMonitorState(state) {
    this.monitorState = state;
    this.monitorStrip.hidden = !state?.enabled;
    if (state?.enabled) {
      const monitors = (state.monitors || [state]).filter(item => item.enabled);
      this.monitorStrip.querySelector('[data-monitor-title]').textContent = `Мониторинг · ${monitors.length} ${monitors.length === 1 ? 'чат' : 'чата/чатов'}`;
      const labels = { waiting: 'Жду новые сообщения', thinking: 'Готовлю ответ', acting: 'Выполняю поручение', waiting_agent: 'Жду завершения текущей команды', resynced: 'История обновилась · продолжаю наблюдать', waiting_retry: 'Ожидаю восстановления' };
      const status = this.monitorStrip.querySelector('[data-monitor-status]');
      status.replaceChildren();
      for (const item of monitors) {
        const row = document.createElement('div');
        const label = document.createElement('span');
        label.textContent = `${item.config.expectedChat} · ${item.error || labels[item.status] || item.status}`;
        const stop = document.createElement('button');
        stop.type = 'button'; stop.textContent = 'Остановить';
        stop.setAttribute('aria-label', `Остановить мониторинг ${item.config.expectedChat}`);
        stop.onclick = () => chrome.runtime.sendMessage({ type: 'MONITOR_STOP', payload: { id: item.id } });
        row.append(label, stop); status.append(row);
      }
      this.monitorStrip.querySelector(':scope > button').textContent = 'Стоп все';
    }
    this.updateBusyState(this.busy);
  }
  setVoiceState(state) {
    if (!this.voiceButton) return;
    const active = state !== 'off';
    this.voiceButton.classList.toggle('is-active', active);
    this.voiceButton.setAttribute('aria-pressed', String(active));
    this.voiceButton.textContent = active ? 'Завершить' : 'Начать разговор';
    this.voiceButton.setAttribute('aria-label', active ? 'Завершить голосовой разговор' : 'Начать голосовой разговор');
    this.voiceStrip.hidden = !active; this.voiceStrip.dataset.state = state;
    this.voiceStrip.querySelector('[data-voice-label]').textContent = ({ connecting: 'Подключаю микрофон…', listening: 'Слушаю · можно говорить', hearing: 'Слышу тебя…', transcribing: 'Распознаю фразу…' })[state] || '';
    this.components.header.setRunning(this.busy || active || this.monitorState?.enabled);
    if (active && !this.busy) this.components.header.setStatus('Слушает');
  }
  async toggleVoiceReplies() {
    const enabled = voiceController.toggleAutoSpeak();
    if (!enabled) await voiceController.stopSpeaking();
    await setSetting('voice', { ...this.settings.voice, autoSpeak: enabled, outputEnabled: enabled });
    await syncSettingsToChromeStorage();
    this.components.header.setVoiceEnabled(enabled);
  }
  updateBusyState(busy) {
    this.busy = busy;
    this.root.classList.toggle('mut-app--busy', busy);
    this.components.composer?.setDisabled(busy);
    this.components.imageUpload?.setDisabled(busy);
    this.components.header?.setRunning(busy || this.live.active || voiceController.getState().speaking || this.monitorState?.enabled);
    if (!busy && this.monitorState?.enabled) this.components.header?.setStatus('Мониторинг включён');
  }
  showError(error) {
    const message = error?.message || String(error);
    this.components.chat.appendMessage({ role: 'assistant', content: message, error: true });
    this.components.agentStatus.setState('error', message);
    this.components.composer.setStatus('Не получилось. Проверь настройки и попробуй ещё раз');
  }
  async loadConversation(conversation) {
    this.components.chat.renderMessages(conversation.messages || []);
    MOOT.conversation = (conversation.messages || []).map(message => ({ ...message }));
    await MOOT.persistConversation(); this.components.composer.focus();
  }
}
