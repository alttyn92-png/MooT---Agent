/**
 * MOOT STOP BUTTON
 *
 * Отдельная аварийная кнопка остановки.
 *
 * Нужна для мгновенного прекращения:
 * - agent loop
 * - voice playback
 * - текущей задачи
 *
 * Не спрашивает подтверждение.
 */

export class MutStopButton {
  constructor({
    onStop = null,
  } = {}) {
    this.onStop =
      onStop;

    this.element =
      null;

    this.enabled =
      false;

    this.stopping =
      false;
  }

  render() {
    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "mut-stop-button";

    button.disabled =
      true;

    button.title =
      "Остановить MOOT";

    button.setAttribute(
      "aria-label",
      "Остановить MOOT"
    );

    button.innerHTML = `
      <span
        class="mut-stop-button__icon"
      >
        ■
      </span>

      <span
        class="mut-stop-button__text"
      >
        Stop
      </span>
    `;

    button.addEventListener(
      "click",
      async () => {
        if (
          !this.enabled ||
          this.stopping
        ) {
          return;
        }

        this.stopping =
          true;

        this.updateVisual();

        try {
          if (
            typeof this.onStop ===
            "function"
          ) {
            await this.onStop();
          }
        } finally {
          this.stopping =
            false;

          this.setEnabled(
            false
          );
        }
      }
    );

    this.element =
      button;

    this.updateVisual();

    return button;
  }

  setEnabled(
    enabled
  ) {
    this.enabled =
      Boolean(
        enabled
      );

    this.updateVisual();
  }

  updateVisual() {
    if (
      !this.element
    ) {
      return;
    }

    this.element.disabled =
      !this.enabled ||
      this.stopping;

    this.element.classList.toggle(
      "is-active",
      this.enabled
    );

    this.element.classList.toggle(
      "is-stopping",
      this.stopping
    );

    const text =
      this.element.querySelector(
        ".mut-stop-button__text"
      );

    if (text) {
      text.textContent =
        this.stopping
          ? "Stopping..."
          : "Stop";
    }
  }

  destroy() {
    this.element?.remove();

    this.element =
      null;
  }
}