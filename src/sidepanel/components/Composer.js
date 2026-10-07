/**
 * MOOT COMPOSER COMPONENT
 *
 * Нижняя панель ввода сообщения.
 *
 * Отвечает за:
 * - textarea
 * - отправку
 * - Enter / Shift+Enter
 * - автоизменение высоты
 * - runtime status
 */

export class MutComposer {
  constructor({
    onSend = null,
    onInput = null,
  } = {}) {
    this.onSend =
      onSend;

    this.onInput =
      onInput;

    this.element =
      null;

    this.inputElement =
      null;

    this.sendButton =
      null;

    this.statusElement =
      null;

    this.disabled =
      false;
  }

  render() {
    const footer =
      document.createElement(
        "footer"
      );

    footer.className =
      "mut-composer";

    footer.innerHTML = `
      <div class="mut-composer__box">
        <textarea
          class="mut-input"
          rows="1"
          placeholder="Спроси или поручай задачу…"
          spellcheck="true" aria-label="Сообщение MOOT"
          data-mut-composer-input
        ></textarea>

        <div class="mut-composer__actions">
          <div
            class="mut-composer__actions-left"
            data-mut-composer-left
          ></div>

          <button
            class="mut-send-button"
            type="button"
            title="Отправить"
            aria-label="Отправить"
            data-mut-composer-send
          >
            ↑
          </button>
        </div>
      </div>

      <div
        class="mut-runtime-status"
        data-mut-composer-status
      >
        MOOT готов
      </div>
    `;

    this.element =
      footer;

    this.inputElement =
      footer.querySelector(
        "[data-mut-composer-input]"
      );

    this.sendButton =
      footer.querySelector(
        "[data-mut-composer-send]"
      );

    this.statusElement =
      footer.querySelector(
        "[data-mut-composer-status]"
      );

    this.bindEvents();

    return footer;
  }

  bindEvents() {
    this.sendButton
      ?.addEventListener(
        "click",
        () => {
          this.emitSend();
        }
      );

    this.inputElement
      ?.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key ===
              "Enter" &&
            !event.shiftKey && !event.isComposing
          ) {
            event.preventDefault();

            this.emitSend();
          }
        }
      );

    this.inputElement
      ?.addEventListener(
        "input",
        () => {
          this.autoResize();

          if (
            typeof this.onInput ===
            "function"
          ) {
            this.onInput(
              this.getValue()
            );
          }
        }
      );
  }

  emitSend() {
    if (
      this.disabled
    ) {
      return;
    }

    if (
      typeof this.onSend ===
      "function"
    ) {
      this.onSend(
        this.getValue()
      );
    }
  }

  getLeftActionsContainer() {
    return this.element
      ?.querySelector(
        "[data-mut-composer-left]"
      ) || null;
  }

  getValue() {
    return String(
      this.inputElement
        ?.value ||
      ""
    );
  }

  setValue(
    value
  ) {
    if (
      !this.inputElement
    ) {
      return;
    }

    this.inputElement.value =
      String(
        value || ""
      );

    this.autoResize();
  }

  clear() {
    this.setValue(
      ""
    );
  }

  focus() {
    queueMicrotask(
      () => {
        this.inputElement
          ?.focus();
      }
    );
  }

  setDisabled(
    disabled
  ) {
    this.disabled =
      Boolean(
        disabled
      );

    if (
      this.inputElement
    ) {
      this.inputElement.disabled =
        this.disabled;
    }

    if (
      this.sendButton
    ) {
      this.sendButton.disabled =
        this.disabled;
    }
  }

  setStatus(
    text
  ) {
    if (
      this.statusElement
    ) {
      this.statusElement.textContent =
        String(
          text || ""
        );
    }
  }

  autoResize() {
    const input =
      this.inputElement;

    if (!input) {
      return;
    }

    input.style.height =
      "auto";

    input.style.height =
      `${Math.min(
        input.scrollHeight,
        160
      )}px`;
  }

  destroy() {
    this.element?.remove();

    this.element =
      null;

    this.inputElement =
      null;

    this.sendButton =
      null;

    this.statusElement =
      null;
  }
}