/**
 * MOOT SETTINGS DB
 *
 * Хранит долговременные настройки MOOT.
 *
 * Для быстрых расширенческих настроек
 * также используется chrome.storage.local,
 * но IndexedDB остаётся основной
 * нормальной базой конфигурации.
 */

import {
  database,
} from "./database.js";

import {
  STORES,
} from "./schema.js";

// =====================================================
// DEFAULT SETTINGS
// =====================================================

export const DEFAULT_SETTINGS =
  Object.freeze({
    language:
      "ru",

    theme:
      "dark",

    voice: {
      inputEnabled:
        true,

      outputEnabled:
        false,

      autoSpeak:
        false,

      voice:
        null,
    },

    agent: {
      maxSteps:
        50,

      autoExecute:
        true,

      observeAfterTool:
        true,

      delayBetweenStepsMs:
        150,
    },

    models: {
      cheapModel:
        "gpt-5.6-luna",

      balancedModel:
        "gpt-5.6-terra",

      strongModel:
        "gpt-5.6-sol",

      visionModel:
        "gpt-5.6-luna",
    },

    openai: {
      apiKey:
        "",
    },

    ui: {
      showTaskProgress:
        true,

      showToolActivity:
        true,

      compactMessages:
        false,
    },
  });

// =====================================================
// GET SETTING
// =====================================================

export async function getSetting(
  key,
  fallback = null
) {
  if (!key) {
    throw new Error(
      "getSetting requires key."
    );
  }

  const record =
    await database.get(
      STORES.SETTINGS,
      key
    );

  if (!record) {
    return fallback;
  }

  return record.value;
}

// =====================================================
// SET SETTING
// =====================================================

export async function setSetting(
  key,
  value
) {
  if (!key) {
    throw new Error(
      "setSetting requires key."
    );
  }

  const record = {
    key,
    value,
    updatedAt:
      Date.now(),
  };

  await database.put(
    STORES.SETTINGS,
    record
  );

  return value;
}

// =====================================================
// DELETE SETTING
// =====================================================

export async function deleteSetting(
  key
) {
  if (!key) {
    throw new Error(
      "deleteSetting requires key."
    );
  }

  await database.delete(
    STORES.SETTINGS,
    key
  );

  return {
    deleted: true,
    key,
  };
}

// =====================================================
// GET ALL SETTINGS
// =====================================================

export async function getAllSettings() {
  const records =
    await database.getAll(
      STORES.SETTINGS
    );

  const result = {};

  for (
    const record of
    records
  ) {
    result[record.key] =
      record.value;
  }

  return result;
}

// =====================================================
// SAVE SETTINGS OBJECT
// =====================================================

export async function saveSettings(
  settings = {}
) {
  if (
    !settings ||
    typeof settings !==
      "object"
  ) {
    throw new Error(
      "saveSettings requires object."
    );
  }

  const entries =
    Object.entries(
      settings
    );

  for (
    const [
      key,
      value,
    ] of entries
  ) {
    await setSetting(
      key,
      value
    );
  }

  return settings;
}

// =====================================================
// GET MERGED SETTINGS
// =====================================================

export async function getMergedSettings() {
  const stored =
    await getAllSettings();

  return deepMerge(
    structuredCloneSafe(
      DEFAULT_SETTINGS
    ),
    stored
  );
}

// =====================================================
// INITIALIZE DEFAULTS
// =====================================================

export async function initializeDefaultSettings() {
  const existing =
    await getAllSettings();

  const merged =
    deepMerge(
      structuredCloneSafe(
        DEFAULT_SETTINGS
      ),
      existing
    );

  for (
    const [
      key,
      value,
    ] of Object.entries(
      merged
    )
  ) {
    if (
      existing[key] ===
      undefined
    ) {
      await setSetting(
        key,
        value
      );
    }
  }

  return merged;
}

// =====================================================
// SYNC WITH CHROME STORAGE
// =====================================================

export async function syncSettingsToChromeStorage() {
  const settings =
    await getMergedSettings();

  if (
    typeof chrome !==
      "undefined" &&
    chrome.storage?.local
  ) {
    const result =
      await chrome.storage.local.get(
        "mutSettings"
      );

    const current =
      result.mutSettings ||
      {};

    await chrome.storage.local.set({
      mutSettings:
        deepMerge(
          current,
          settings
        ),
    });
  }

  return settings;
}

// =====================================================
// HELPERS
// =====================================================

function deepMerge(
  target,
  source
) {
  if (
    !source ||
    typeof source !==
      "object"
  ) {
    return target;
  }

  for (
    const [
      key,
      value,
    ] of Object.entries(
      source
    )
  ) {
    if (
      value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
    ) {
      if (
        !target[key] ||
        typeof target[key] !==
          "object" ||
        Array.isArray(
          target[key]
        )
      ) {
        target[key] = {};
      }

      deepMerge(
        target[key],
        value
      );
    } else {
      target[key] =
        value;
    }
  }

  return target;
}

function structuredCloneSafe(
  value
) {
  if (
    typeof structuredClone ===
      "function"
  ) {
    return structuredClone(
      value
    );
  }

  return JSON.parse(
    JSON.stringify(
      value
    )
  );
}