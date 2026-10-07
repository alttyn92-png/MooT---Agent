/**
 * MOOT SETTINGS PANEL
 *
 * Настройки:
 * - OpenAI API key
 * - язык
 * - голосовые ответы
 * - voice
 * - модели
 * - max steps
 */

import {
  getMergedSettings,
  setSetting,
  syncSettingsToChromeStorage,
} from "../../database/settings-db.js";

import {
  saveModelSettings,
} from "../../ai/model-router.js";

import {
  voiceController,
} from "../../voice/voice-controller.js";

export class MutSettingsPanel {
  constructor({
    onClose = null,
  } = {}) {
    this.onClose =
      onClose;

    this.element =
      null;

    this.visible =
      false;

    this.inputs =
      {};
  }

  render() {
    const panel =
      document.createElement(
        "section"
      );

    panel.className =
      "mut-drawer mut-settings-panel";

    panel.hidden =
      true;

    panel.innerHTML = `
      <div class="mut-drawer__header">
        <div class="mut-drawer__title">
          Настройки
        </div>

        <button
          type="button"
          class="mut-icon-button"
          data-mut-settings-close
          aria-label="Закрыть настройки"
        >
          ×
        </button>
      </div>

      <div class="mut-settings-content">

        <div class="mut-settings-group">
          <div class="mut-settings-group__title">
            OpenAI
          </div>

          <label class="mut-field">
            <span class="mut-field__label">
              API key
            </span>

            <input
              type="password"
              class="mut-field__input"
              autocomplete="off"
              placeholder="sk-..."
              data-mut-setting-api-key
            />
          </label>
        </div>

        <div class="mut-settings-group">
          <div class="mut-settings-group__title">
            Модели
          </div>

          <label class="mut-field">
            <span class="mut-field__label">
              Дешёвая модель
            </span>

            <input
              type="text"
              class="mut-field__input"
              data-mut-setting-cheap-model
            />
          </label>

          <label class="mut-field">
            <span class="mut-field__label">
              Сбалансированная модель
            </span>

            <input
              type="text"
              class="mut-field__input"
              data-mut-setting-balanced-model
            />
          </label>

          <label class="mut-field">
            <span class="mut-field__label">
              Сильная модель
            </span>

            <input
              type="text"
              class="mut-field__input"
              data-mut-setting-strong-model
            />
          </label>

          <label class="mut-field">
            <span class="mut-field__label">
              Vision модель
            </span>

            <input
              type="text"
              class="mut-field__input"
              data-mut-setting-vision-model
            />
          </label>
        </div>

        <div class="mut-settings-group">
          <div class="mut-settings-group__title">
            Голос
          </div>

          <label class="mut-switch-row">
            <span>
              Отвечать голосом
            </span>

            <input
              type="checkbox"
              data-mut-setting-auto-speak
            />
          </label>

          <label class="mut-field">
            <span class="mut-field__label">
              Голос
            </span>

            <input
              type="text"
              class="mut-field__input"
              data-mut-setting-voice
            />
          </label>
        </div>

        <div class="mut-settings-group">
          <div class="mut-settings-group__title">
            Агент
          </div>

          <label class="mut-field">
            <span class="mut-field__label">
              Максимум шагов
            </span>

            <input
              type="number"
              min="1"
              max="200"
              class="mut-field__input"
              data-mut-setting-max-steps
            />
          </label>
        </div>

        <button
          type="button"
          class="mut-primary-button"
          data-mut-settings-save
        >
          Сохранить
        </button>

        <div
          class="mut-settings-status"
          data-mut-settings-status
        ></div>
      </div>
    `;

    this.element =
      panel;

    this.inputs = {
      apiKey:
        panel.querySelector(
          "[data-mut-setting-api-key]"
        ),

      cheapModel:
        panel.querySelector(
          "[data-mut-setting-cheap-model]"
        ),

      balancedModel:
        panel.querySelector(
          "[data-mut-setting-balanced-model]"
        ),

      strongModel:
        panel.querySelector(
          "[data-mut-setting-strong-model]"
        ),

      visionModel:
        panel.querySelector(
          "[data-mut-setting-vision-model]"
        ),

      autoSpeak:
        panel.querySelector(
          "[data-mut-setting-auto-speak]"
        ),

      voice:
        panel.querySelector(
          "[data-mut-setting-voice]"
        ),

      maxSteps:
        panel.querySelector(
          "[data-mut-setting-max-steps]"
        ),

      status:
        panel.querySelector(
          "[data-mut-settings-status]"
        ),
    };

    panel
      .querySelector(
        "[data-mut-settings-close]"
      )
      ?.addEventListener(
        "click",
        () => {
          this.hide();

          if (
            typeof this.onClose ===
            "function"
          ) {
            this.onClose();
          }
        }
      );

    panel
      .querySelector(
        "[data-mut-settings-save]"
      )
      ?.addEventListener(
        "click",
        () => {
          this.save();
        }
      );

    return panel;
  }

  async load() {
    const settings =
      await getMergedSettings();

    const {
      apiKey,
      cheapModel,
      balancedModel,
      strongModel,
      visionModel,
      autoSpeak,
      voice,
      maxSteps,
    } =
      this.inputs;

    if (
      apiKey
    ) {
      apiKey.value =
        settings.openai
          ?.apiKey ||
        "";
    }

    if (
      cheapModel
    ) {
      cheapModel.value =
        settings.models
          ?.cheapModel ||
        "";
    }

    if (
      balancedModel
    ) {
      balancedModel.value =
        settings.models
          ?.balancedModel ||
        "";
    }

    if (
      strongModel
    ) {
      strongModel.value =
        settings.models
          ?.strongModel ||
        "";
    }

    if (
      visionModel
    ) {
      visionModel.value =
        settings.models
          ?.visionModel ||
        "";
    }

    if (
      autoSpeak
    ) {
      autoSpeak.checked =
        Boolean(
          settings.voice
            ?.autoSpeak
        );
    }

    if (
      voice
    ) {
      voice.value =
        settings.voice
          ?.voice ||
        "alloy";
    }

    if (
      maxSteps
    ) {
      maxSteps.value =
        String(
          settings.agent
            ?.maxSteps ||
          50
        );
    }
  }

  async save() {
    this.setStatus(
      "Сохраняю..."
    );

    try {
      const apiKey =
        this.inputs.apiKey
          ?.value
          .trim() ||
        "";

      const modelSettings = {
        cheapModel:
          this.inputs
            .cheapModel
            ?.value
            .trim(),

        balancedModel:
          this.inputs
            .balancedModel
            ?.value
            .trim(),

        strongModel:
          this.inputs
            .strongModel
            ?.value
            .trim(),

        visionModel:
          this.inputs
            .visionModel
            ?.value
            .trim(),
      };

      const autoSpeak =
        Boolean(
          this.inputs
            .autoSpeak
            ?.checked
        );

      const voice =
        this.inputs.voice
          ?.value
          .trim() ||
        "alloy";

      const maxSteps =
        Math.max(
          1,
          Math.min(
            200,
            Number(
              this.inputs
                .maxSteps
                ?.value ||
              50
            )
          )
        );

      await setSetting(
        "openai",
        {
          apiKey,
        }
      );

      await setSetting(
        "models",
        modelSettings
      );

      await setSetting(
        "voice",
        {
          inputEnabled:
            true,

          outputEnabled:
            autoSpeak,

          autoSpeak,

          voice,
        }
      );

      await setSetting(
        "agent",
        {
          maxSteps,

          autoExecute:
            true,

          observeAfterTool:
            true,

          delayBetweenStepsMs:
            150,
        }
      );

      await saveModelSettings(
        modelSettings
      );

      await syncSettingsToChromeStorage();

      voiceController.setAutoSpeak(
        autoSpeak
      );

      voiceController.setVoice(
        voice
      );

      this.setStatus(
        "Сохранено"
      );
    } catch (error) {
      this.setStatus(
        error?.message ||
        "Ошибка сохранения"
      );
    }
  }

  async show() {
    if (
      !this.element
    ) {
      return;
    }

    await this.load();

    this.visible =
      true;

    this.element.hidden =
      false;
  }

  hide() {
    if (
      !this.element
    ) {
      return;
    }

    this.visible =
      false;

    this.element.hidden =
      true;
  }

  toggle() {
    if (
      this.visible
    ) {
      this.hide();

      return;
    }

    this.show();
  }

  setStatus(
    text
  ) {
    if (
      this.inputs.status
    ) {
      this.inputs.status.textContent =
        String(
          text || ""
        );
    }
  }

  destroy() {
    this.element?.remove();

    this.element =
      null;

    this.inputs =
      {};

    this.visible =
      false;
  }
}