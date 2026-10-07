/**
 * MOOT HEADER COMPONENT
 *
 * Верхняя панель MOOT.
 *
 * Отвечает за:
 * - логотип
 * - статус
 * - голосовой режим
 * - кнопку Stop
 */

import { icon } from './icons.js';

export class MutHeader {
  constructor({
    onToggleVoice = null,
    onStop = null,
  } = {}) {
    this.onToggleVoice =
      onToggleVoice;

    this.onStop =
      onStop;

    this.element =
      null;

    this.statusElement =
      null;

    this.voiceButton =
      null;

    this.stopButton =
      null;
  }

  // ===================================================
  // RENDER
  // ===================================================

  render() {
    const header =
      document.createElement(
        "header"
      );

    header.className =
      "mut-header";

    header.innerHTML = `
      <div class="mut-brand">
        <img class="mut-brand__logo" src="/moot-logo.svg" alt="" />

        <div class="mut-brand__text">
          <div class="mut-brand__name">
            MOOT
          </div>

          <div
            class="mut-brand__status"
            data-mut-header-status
          >
            Готов
          </div>
        </div>
      </div>

      <div class="mut-header__actions">
        <button
          class="mut-icon-button"
          type="button"
          data-mut-voice-toggle
          title="Голосовые ответы"
          aria-label="Голосовые ответы"
        >
          ${icon('muted')}
        </button>

        <button
          class="mut-icon-button mut-icon-button--danger"
          type="button"
          data-mut-stop
          title="Остановить MOOT"
          aria-label="Остановить MOOT"
          disabled
        >
          ${icon('stop')}
        </button>
      </div>
    `;

    this.element =
      header;

    this.statusElement =
      header.querySelector(
        "[data-mut-header-status]"
      );

    this.voiceButton =
      header.querySelector(
        "[data-mut-voice-toggle]"
      );

    this.stopButton =
      header.querySelector(
        "[data-mut-stop]"
      );

    this.bindEvents();

    return header;
  }

  // ===================================================
  // EVENTS
  // ===================================================

  bindEvents() {
    this.voiceButton
      ?.addEventListener(
        "click",
        () => {
          if (
            typeof this.onToggleVoice ===
            "function"
          ) {
            this.onToggleVoice();
          }
        }
      );

    this.stopButton
      ?.addEventListener(
        "click",
        () => {
          if (
            typeof this.onStop ===
            "function"
          ) {
            this.onStop();
          }
        }
      );
  }

  // ===================================================
  // STATUS
  // ===================================================

  setStatus(
    text
  ) {
    if (
      this.statusElement
    ) {
      this.statusElement.textContent =
        String(
          text ||
          ""
        );
    }
  }

  // ===================================================
  // RUNNING
  // ===================================================

  setRunning(
    running
  ) {
    const active =
      Boolean(running);

    if (
      this.stopButton
    ) {
      this.stopButton.disabled =
        !active;
    }

    this.setStatus(
      active
        ? "Работает"
        : "Готов"
    );
  }

  // ===================================================
  // VOICE
  // ===================================================

  setVoiceEnabled(
    enabled
  ) {
    if (
      !this.voiceButton
    ) {
      return;
    }

    this.voiceButton.classList.toggle(
      "is-active",
      Boolean(enabled)
    );
    this.voiceButton.innerHTML = icon(enabled ? 'volume' : 'muted');
    this.voiceButton.setAttribute('aria-pressed', String(Boolean(enabled)));

    this.voiceButton.title =
      enabled
        ? "Голосовые ответы включены"
        : "Голосовые ответы выключены";
  }

  // ===================================================
  // DESTROY
  // ===================================================

  destroy() {
    this.element?.remove();

    this.element =
      null;

    this.statusElement =
      null;

    this.voiceButton =
      null;

    this.stopButton =
      null;
  }
}
