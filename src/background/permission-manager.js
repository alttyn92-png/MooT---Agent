/**
 * MOOT PERMISSION MANAGER
 *
 * Проверяет разрешения Chrome extension.
 *
 * Важно:
 * manifest permissions выдаются Chrome,
 * и расширение не может само обойти ограничения браузера.
 */

const CORE_PERMISSIONS =
  Object.freeze([
    "sidePanel",
    "storage",
    "tabs",
    "activeTab",
    "scripting",
  ]);

const OPTIONAL_PERMISSIONS =
  Object.freeze([
    "notifications",
    "contextMenus",
    "webNavigation",
    "offscreen",
  ]);

// =====================================================
// CONTAINS
// =====================================================

export async function hasPermissions({
  permissions = [],
  origins = [],
} = {}) {
  return chrome.permissions.contains({
    permissions,
    origins,
  });
}

// =====================================================
// CORE STATUS
// =====================================================

export async function getPermissionStatus() {
  const core = {};

  for (
    const permission of
    CORE_PERMISSIONS
  ) {
    core[permission] =
      await chrome.permissions.contains({
        permissions: [
          permission,
        ],
      });
  }

  const optional = {};

  for (
    const permission of
    OPTIONAL_PERMISSIONS
  ) {
    optional[permission] =
      await chrome.permissions.contains({
        permissions: [
          permission,
        ],
      });
  }

  const allHosts =
    await chrome.permissions.contains({
      origins: [
        "http://*/*",
        "https://*/*",
      ],
    });

  return {
    core,
    optional,
    allHosts,

    ready:
      Object.values(
        core
      ).every(
        Boolean
      ) &&
      allHosts,

    checkedAt:
      Date.now(),
  };
}

// =====================================================
// REQUEST
// =====================================================

export async function requestPermissions({
  permissions = [],
  origins = [],
} = {}) {
  if (
    !permissions.length &&
    !origins.length
  ) {
    return {
      granted: true,
    };
  }

  const granted =
    await chrome.permissions.request({
      permissions,
      origins,
    });

  return {
    granted:
      Boolean(
        granted
      ),
  };
}

// =====================================================
// REMOVE OPTIONAL
// =====================================================

export async function removePermissions({
  permissions = [],
  origins = [],
} = {}) {
  if (
    !permissions.length &&
    !origins.length
  ) {
    return {
      removed: true,
    };
  }

  const removed =
    await chrome.permissions.remove({
      permissions,
      origins,
    });

  return {
    removed:
      Boolean(
        removed
      ),
  };
}

// =====================================================
// HOST CHECK
// =====================================================

export async function canAccessUrl(
  url
) {
  if (!url) {
    return false;
  }

  let parsed;

  try {
    parsed =
      new URL(
        url
      );
  } catch {
    return false;
  }

  if (
    ![
      "http:",
      "https:",
    ].includes(
      parsed.protocol
    )
  ) {
    return false;
  }

  const originPattern =
    `${parsed.protocol}//${parsed.host}/*`;

  return chrome.permissions.contains({
    origins: [
      originPattern,
    ],
  });
}

// =====================================================
// CONSTANTS
// =====================================================

export const MOOT_CORE_PERMISSIONS =
  CORE_PERMISSIONS;

export const MOOT_OPTIONAL_PERMISSIONS =
  OPTIONAL_PERMISSIONS;