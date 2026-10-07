/**
 * MOOT VOICE BUTTON
 *
 * Кнопка микрофона.
 *
 * Работает с:
 * - idle
 * - listening
 * - processing
 * - error
 */

export class MutVoiceButton {
  constructor({
    onToggle = null,
  } = {}) {
    this.onToggle =
      onToggle;

    this.element =
      null;

    this.state =
      "idle";
  }

  render() {
    const button =
      document.createElement(
        "button"
      );

    button.className =
      "mut-composer-button";

    button.type =
      "button";

    button.title =
      "Голос";

    button.setAttribute(
      "aria-label",
      "Голос"
    );

    button.dataset.mutVoiceButton =
      "true";

    button.textContent =
      "🎙";

    button.addEventListener(
      "click",
      () => {
        if (
          typeof this.onToggle ===
          "function"
        ) {
          this.onToggle();
        }
      }
    );

    this.element =
      button;

    this.updateVisualState();

    return button;
  }

  setState(
    state
  ) {
    const allowed = [
      "idle",
      "listening",
      "processing",
      "error",
    ];

    this.state =
      allowed.includes(
        state
      )
        ? state
        : "idle";

    this.updateVisualState();
  }

  setRecording(
    recording
  ) {
    this.setState(
      recording
        ? "listening"
        : "idle"
    );
  }

  setDisabled(
    disabled
  ) {
    if (
      this.element
    ) {
      this.element.disabled =
        Boolean(
          disabled
        );
    }
  }

  updateVisualState() {
    if (
      !this.element
    ) {
      return;
    }

    this.element.classList.toggle(
      "is-active",
      this.state ===
        "listening"
    );

    switch (
      this.state
    ) {
      case "listening":
        this.element.textContent =
          "■";

        this.element.title =
          "Остановить запись";
        break;

      case "processing":
        this.element.textContent =
          "…";

        this.element.title =
          "Обрабатываю голос";
        break;

      case "error":
        this.element.textContent =
          "!";

        this.element.title =
          "Ошибка микрофона";
        break;

      case "idle":
      default:
        this.element.textContent =
          "🎙";

        this.element.title =
          "Голос";
        break;
    }
  }

  destroy() {
    this.element?.remove();

    this.element =
      null;
  }
}