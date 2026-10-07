/**
 * MOOT AGENT STATUS
 *
 * Показывает текущее состояние MOOT:
 * - готов
 * - работает
 * - слушает
 * - думает
 * - выполняет действие
 * - ошибка
 * - остановлен
 */

export class MutAgentStatus {
  constructor() {
    this.element = null;
    this.dotElement = null;
    this.textElement = null;
    this.detailElement = null;

    this.state = "idle";
    this.detail = "";
  }

  render() {
    const container =
      document.createElement(
        "div"
      );

    container.className =
      "mut-agent-status";

    container.innerHTML = `
      <div class="mut-agent-status__main">
        <span
          class="mut-agent-status__dot"
          data-mut-status-dot
        ></span>

        <span
          class="mut-agent-status__text"
          data-mut-status-text
        >
          Готов
        </span>
      </div>

      <div
        class="mut-agent-status__detail"
        data-mut-status-detail
        hidden
      ></div>
    `;

    this.element =
      container;

    this.dotElement =
      container.querySelector(
        "[data-mut-status-dot]"
      );

    this.textElement =
      container.querySelector(
        "[data-mut-status-text]"
      );

    this.detailElement =
      container.querySelector(
        "[data-mut-status-detail]"
      );

    this.updateVisual();

    return container;
  }

  setState(
    state,
    detail = ""
  ) {
    const allowed = [
      "idle",
      "thinking",
      "working",
      "listening",
      "speaking",
      "error",
      "stopped",
      "complete",
    ];

    this.state =
      allowed.includes(
        state
      )
        ? state
        : "idle";

    this.detail =
      String(
        detail || ""
      );

    this.updateVisual();
  }

  setDetail(
    detail
  ) {
    this.detail =
      String(
        detail || ""
      );

    this.updateVisual();
  }

  updateVisual() {
    if (
      !this.element
    ) {
      return;
    }

    this.element.dataset.state =
      this.state;

    const labels = {
      idle:
        "Готов",

      thinking:
        "Думаю",

      working:
        "Работаю",

      listening:
        "Слушаю",

      speaking:
        "Говорю",

      error:
        "Ошибка",

      stopped:
        "Остановлен",

      complete:
        "Готово",
    };

    if (
      this.textElement
    ) {
      this.textElement.textContent =
        labels[this.state] ||
        "Готов";
    }

    if (
      this.detailElement
    ) {
      if (
        this.detail
      ) {
        this.detailElement.hidden =
          false;

        this.detailElement.textContent =
          this.detail;
      } else {
        this.detailElement.hidden =
          true;

        this.detailElement.textContent =
          "";
      }
    }
  }

  destroy() {
    this.element?.remove();

    this.element = null;
    this.dotElement = null;
    this.textElement = null;
    this.detailElement = null;
  }
}