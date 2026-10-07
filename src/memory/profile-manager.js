/**
 * MOOT PROFILE MANAGER
 *
 * Управляет текстовым профилем пользователя.
 *
 * Профиль можно:
 * - получить
 * - сохранить
 * - очистить
 * - импортировать как текст
 * - экспортировать как текст
 *
 * Основное хранилище:
 * chrome.storage.local
 *
 * Дополнительно синхронизирует профиль
 * с системой памяти MOOT.
 */

import {
  importProfileText,
  buildProfileText,
  MEMORY_TYPES,
  remember,
} from "./memory-manager.js";

const STORAGE_KEY =
  "mutUserProfile";

// =====================================================
// GET PROFILE
// =====================================================

export async function getUserProfile() {
  if (
    typeof chrome ===
      "undefined" ||
    !chrome.storage?.local
  ) {
    return "";
  }

  const result =
    await chrome.storage.local.get(
      STORAGE_KEY
    );

  return typeof result[
    STORAGE_KEY
  ] === "string"
    ? result[STORAGE_KEY]
    : "";
}

// =====================================================
// SAVE PROFILE
// =====================================================

export async function saveUserProfile(
  text
) {
  const profile =
    String(
      text || ""
    ).trim();

  if (
    typeof chrome ===
      "undefined" ||
    !chrome.storage?.local
  ) {
    throw new Error(
      "Chrome storage is unavailable."
    );
  }

  await chrome.storage.local.set({
    [STORAGE_KEY]:
      profile,
  });

  return profile;
}

// =====================================================
// SAVE + IMPORT TO MEMORY
// =====================================================

export async function saveAndImportProfile(
  text
) {
  const profile =
    await saveUserProfile(
      text
    );

  const imported =
    await importProfileText(
      profile
    );

  return {
    profile,
    imported:
      imported.imported || 0,
  };
}

// =====================================================
// CLEAR
// =====================================================

export async function clearUserProfile() {
  if (
    typeof chrome ===
      "undefined" ||
    !chrome.storage?.local
  ) {
    return {
      cleared: false,
    };
  }

  await chrome.storage.local.remove(
    STORAGE_KEY
  );

  return {
    cleared: true,
  };
}

// =====================================================
// SET SINGLE PROFILE VALUE
// =====================================================

export async function setProfileValue(
  key,
  value
) {
  const safeKey =
    String(
      key || ""
    ).trim();

  if (!safeKey) {
    throw new Error(
      "Profile key is required."
    );
  }

  await remember({
    type:
      MEMORY_TYPES.PROFILE,

    key:
      safeKey,

    value,

    source:
      "user",
  });

  const text =
    await buildProfileText();

  await saveUserProfile(
    text
  );

  return {
    key:
      safeKey,

    value,
  };
}

// =====================================================
// SET PREFERENCE
// =====================================================

export async function setUserPreference(
  key,
  value
) {
  const safeKey =
    String(
      key || ""
    ).trim();

  if (!safeKey) {
    throw new Error(
      "Preference key is required."
    );
  }

  await remember({
    type:
      MEMORY_TYPES.PREFERENCE,

    key:
      safeKey,

    value,

    source:
      "user",
  });

  return {
    key:
      safeKey,

    value,
  };
}

// =====================================================
// EXPORT PROFILE
// =====================================================

export async function exportUserProfile() {
  const stored =
    await getUserProfile();

  if (stored) {
    return stored;
  }

  return buildProfileText();
}

// =====================================================
// BUILD DEFAULT TEMPLATE
// =====================================================

export function createProfileTemplate() {
  return `# MOOT USER PROFILE

Имя:

Язык общения: русский

## Обо мне

Учёба:
Работа:
Интересы:

## Предпочтения

Стиль ответов: коротко и понятно

## Инструкции для MOOT

- Учитывай этот профиль только когда он относится к задаче.
- Не повторяй информацию из профиля без необходимости.
`;
}