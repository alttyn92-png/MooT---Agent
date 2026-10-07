/**
 * MOOT LOGGER
 *
 * Единый логгер проекта.
 *
 * Уровни:
 * - debug
 * - info
 * - warn
 * - error
 *
 * По умолчанию пишет в console.
 * Позже можно подключить сохранение логов в IndexedDB.
 */

const LEVELS = Object.freeze({
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
});

const LEVEL_PRIORITY = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
});

export class MutLogger {
  constructor({
    scope = "MOOT",
    level = "info",
    enabled = true,
  } = {}) {
    this.scope =
      String(scope || "MOOT");

    this.level =
      LEVEL_PRIORITY[level]
        ? level
        : "info";

    this.enabled =
      Boolean(enabled);

    this.listeners =
      new Set();
  }

  // ===================================================
  // CONFIG
  // ===================================================

  setLevel(
    level
  ) {
    if (
      !LEVEL_PRIORITY[level]
    ) {
      throw new Error(
        `Unknown log level: ${level}`
      );
    }

    this.level =
      level;
  }

  setEnabled(
    enabled
  ) {
    this.enabled =
      Boolean(enabled);
  }

  child(
    scope
  ) {
    return new MutLogger({
      scope:
        `${this.scope}:${scope}`,

      level:
        this.level,

      enabled:
        this.enabled,
    });
  }

  // ===================================================
  // LEVEL METHODS
  // ===================================================

  debug(
    message,
    data = null
  ) {
    return this.log(
      LEVELS.DEBUG,
      message,
      data
    );
  }

  info(
    message,
    data = null
  ) {
    return this.log(
      LEVELS.INFO,
      message,
      data
    );
  }

  warn(
    message,
    data = null
  ) {
    return this.log(
      LEVELS.WARN,
      message,
      data
    );
  }

  error(
    message,
    data = null
  ) {
    return this.log(
      LEVELS.ERROR,
      message,
      data
    );
  }

  // ===================================================
  // CORE LOG
  // ===================================================

  log(
    level,
    message,
    data = null
  ) {
    if (
      !this.enabled
    ) {
      return null;
    }

    if (
      LEVEL_PRIORITY[level] <
      LEVEL_PRIORITY[this.level]
    ) {
      return null;
    }

    const entry = {
      level,

      scope:
        this.scope,

      message:
        normalizeMessage(
          message
        ),

      data:
        sanitizeLogData(
          data
        ),

      timestamp:
        Date.now(),
    };

    this.writeToConsole(
      entry
    );

    this.emit(
      entry
    );

    return entry;
  }

  // ===================================================
  // CONSOLE
  // ===================================================

  writeToConsole(
    entry
  ) {
    const prefix =
      `[${entry.scope}]`;

    const time =
      new Date(
        entry.timestamp
      ).toLocaleTimeString();

    const args = [
      `${time} ${prefix} ${entry.message}`,
    ];

    if (
      entry.data !== null &&
      entry.data !== undefined
    ) {
      args.push(
        entry.data
      );
    }

    switch (
      entry.level
    ) {
      case LEVELS.DEBUG:
        console.debug(
          ...args
        );
        break;

      case LEVELS.WARN:
        console.warn(
          ...args
        );
        break;

      case LEVELS.ERROR:
        console.error(
          ...args
        );
        break;

      case LEVELS.INFO:
      default:
        console.info(
          ...args
        );
        break;
    }
  }

  // ===================================================
  // SUBSCRIPTIONS
  // ===================================================

  onLog(
    listener
  ) {
    if (
      typeof listener !==
      "function"
    ) {
      return () => {};
    }

    this.listeners.add(
      listener
    );

    return () => {
      this.listeners.delete(
        listener
      );
    };
  }

  emit(
    entry
  ) {
    for (
      const listener of
      this.listeners
    ) {
      try {
        listener(
          entry
        );
      } catch {
        // Логгер не должен падать из-за listener.
      }
    }
  }
}

// =====================================================
// HELPERS
// =====================================================

function normalizeMessage(
  message
) {
  if (
    message instanceof Error
  ) {
    return (
      message.message ||
      message.name ||
      "Error"
    );
  }

  if (
    typeof message ===
    "string"
  ) {
    return message;
  }

  try {
    return JSON.stringify(
      message
    );
  } catch {
    return String(message);
  }
}

function sanitizeLogData(
  data
) {
  if (
    data === null ||
    data === undefined
  ) {
    return data;
  }

  try {
    const clone =
      JSON.parse(
        JSON.stringify(
          data
        )
      );

    removeSecrets(
      clone
    );

    return clone;
  } catch {
    return data;
  }
}

function removeSecrets(
  value,
  depth = 0
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    depth > 10
  ) {
    return;
  }

  const secretKeys = [
    "apikey",
    "api_key",
    "password",
    "passwd",
    "token",
    "authorization",
    "secret",
    "privatekey",
    "private_key",
  ];

  for (
    const [
      key,
      child,
    ] of Object.entries(
      value
    )
  ) {
    const normalizedKey =
      key
        .toLowerCase()
        .replace(
          /[^a-z0-9_]/g,
          ""
        );

    if (
      secretKeys.some(
        (secret) =>
          normalizedKey.includes(
            secret
          )
      )
    ) {
      value[key] =
        "[REDACTED]";

      continue;
    }

    if (
      typeof child ===
      "string" &&
      child.startsWith(
        "data:image/"
      ) &&
      child.length > 500
    ) {
      value[key] =
        "[IMAGE_DATA]";

      continue;
    }

    if (
      child &&
      typeof child ===
        "object"
    ) {
      removeSecrets(
        child,
        depth + 1
      );
    }
  }
}

// =====================================================
// DEFAULT LOGGER
// =====================================================

export const logger =
  new MutLogger({
    scope:
      "MOOT",

    level:
      "info",
  });

export const LOG_LEVELS =
  LEVELS;