/**
 * MOOT TASK PROGRESS
 *
 * Показывает ход выполнения задачи:
 *
 * - номер текущего шага
 * - название действия
 * - статус
 * - прогресс
 *
 * Не раскрывает внутреннее reasoning модели.
 * Показывает только короткий понятный статус.
 */

export class MutTaskProgress {
  constructor({
    maxSteps = 50,
  } = {}) {
    this.element = null;

    this.stepElement = null;
    this.actionElement = null;
    this.barElement = null;
    this.barFillElement = null;

    this.maxSteps =
      maxSteps;

    this.currentStep =
      0;

    this.action =
      "";

    this.visible =
      false;
  }

  render() {
    const container =
      document.createElement(
        "section"
      );

    container.className =
      "mut-task-progress";

    container.hidden =
      true;

    container.innerHTML = `
      <div class="mut-task-progress__top">
        <span
          class="mut-task-progress__step"
          data-mut-progress-step
        >
          Шаг 0
        </span>

        <span
          class="mut-task-progress__action"
          data-mut-progress-action
        ></span>
      </div>

      <div
        class="mut-task-progress__bar"
        data-mut-progress-bar
      >
        <div
          class="mut-task-progress__fill"
          data-mut-progress-fill
        ></div>
      </div>
    `;

    this.element =
      container;

    this.stepElement =
      container.querySelector(
        "[data-mut-progress-step]"
      );

    this.actionElement =
      container.querySelector(
        "[data-mut-progress-action]"
      );

    this.barElement =
      container.querySelector(
        "[data-mut-progress-bar]"
      );

    this.barFillElement =
      container.querySelector(
        "[data-mut-progress-fill]"
      );

    this.updateVisual();

    return container;
  }

  start({
    maxSteps = null,
    action = "",
  } = {}) {
    if (
      Number.isFinite(
        maxSteps
      )
    ) {
      this.maxSteps =
        Math.max(
          1,
          Math.floor(
            maxSteps
          )
        );
    }

    this.currentStep =
      0;

    this.action =
      String(
        action || ""
      );

    this.visible =
      true;

    this.updateVisual();
  }

  update({
    step = null,
    action = null,
  } = {}) {
    if (
      Number.isFinite(
        step
      )
    ) {
      this.currentStep =
        Math.max(
          0,
          Math.floor(
            step
          )
        );
    }

    if (
      action !== null &&
      action !== undefined
    ) {
      this.action =
        String(
          action
        );
    }

    this.visible =
      true;

    this.updateVisual();
  }

  complete(
    text = "Готово"
  ) {
    this.action =
      String(
        text || "Готово"
      );

    this.visible =
      true;

    if (
      this.maxSteps > 0 &&
      this.currentStep === 0
    ) {
      this.currentStep =
        1;
    }

    this.updateVisual();

    setTimeout(
      () => {
        this.hide();
      },
      1200
    );
  }

  fail(
    text = "Ошибка"
  ) {
    this.action =
      String(
        text || "Ошибка"
      );

    this.visible =
      true;

    this.updateVisual();
  }

  hide() {
    this.visible =
      false;

    if (
      this.element
    ) {
      this.element.hidden =
        true;
    }
  }

  reset() {
    this.currentStep =
      0;

    this.action =
      "";

    this.visible =
      false;

    this.updateVisual();
  }

  updateVisual() {
    if (
      !this.element
    ) {
      return;
    }

    this.element.hidden =
      !this.visible;

    if (
      this.stepElement
    ) {
      this.stepElement.textContent =
        `Шаг ${this.currentStep}`;
    }

    if (
      this.actionElement
    ) {
      this.actionElement.textContent =
        this.action;
    }

    const progress =
      this.maxSteps > 0
        ? Math.min(
            1,
            this.currentStep /
              this.maxSteps
          )
        : 0;

    if (
      this.barFillElement
    ) {
      this.barFillElement.style.width =
        `${Math.round(
          progress * 100
        )}%`;
    }
  }

  destroy() {
    this.element?.remove();

    this.element = null;
    this.stepElement = null;
    this.actionElement = null;
    this.barElement = null;
    this.barFillElement = null;
  }
}