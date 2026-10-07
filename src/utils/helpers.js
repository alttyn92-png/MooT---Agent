/**
 * MOOT HELPERS
 *
 * Общие вспомогательные функции проекта.
 */

// =====================================================
// SLEEP
// =====================================================

export function sleep(
  ms = 0
) {
  const delay =
    Number.isFinite(ms)
      ? Math.max(
          0,
          ms
        )
      : 0;

  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        delay
      )
  );
}

// =====================================================
// CLAMP
// =====================================================

export function clamp(
  value,
  min,
  max
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return min;
  }

  return Math.min(
    max,
    Math.max(
      min,
      number
    )
  );
}

// =====================================================
// ID
// =====================================================

export function createId(
  prefix = "mut"
) {
  if (
    globalThis.crypto
      ?.randomUUID
  ) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 10),
  ].join("_");
}

// =====================================================
// SAFE JSON
// =====================================================

export function safeStringify(
  value,
  space = 0
) {
  try {
    return JSON.stringify(
      value,
      null,
      space
    );
  } catch {
    return String(value);
  }
}

export function safeParseJSON(
  value,
  fallback = null
) {
  if (
    typeof value !==
      "string"
  ) {
    return fallback;
  }

  try {
    return JSON.parse(
      value
    );
  } catch {
    return fallback;
  }
}

// =====================================================
// DEEP CLONE
// =====================================================

export function deepClone(
  value
) {
  if (
    typeof structuredClone ===
      "function"
  ) {
    try {
      return structuredClone(
        value
      );
    } catch {
      // fallback ниже
    }
  }

  try {
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  } catch {
    return value;
  }
}

// =====================================================
// DEEP MERGE
// =====================================================

export function deepMerge(
  target,
  source
) {
  const result =
    deepClone(
      target
    ) || {};

  if (
    !source ||
    typeof source !==
      "object"
  ) {
    return result;
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
      !Array.isArray(
        value
      )
    ) {
      result[key] =
        deepMerge(
          result[key] || {},
          value
        );
    } else {
      result[key] =
        deepClone(
          value
        );
    }
  }

  return result;
}

// =====================================================
// DEBOUNCE
// =====================================================

export function debounce(
  fn,
  delay = 200
) {
  let timer =
    null;

  return function (
    ...args
  ) {
    if (timer) {
      clearTimeout(
        timer
      );
    }

    timer =
      setTimeout(
        () => {
          fn.apply(
            this,
            args
          );
        },
        delay
      );
  };
}

// =====================================================
// THROTTLE
// =====================================================

export function throttle(
  fn,
  interval = 200
) {
  let lastCall =
    0;

  let timer =
    null;

  return function (
    ...args
  ) {
    const now =
      Date.now();

    const remaining =
      interval -
      (
        now -
        lastCall
      );

    if (
      remaining <= 0
    ) {
      if (timer) {
        clearTimeout(
          timer
        );

        timer =
          null;
      }

      lastCall =
        now;

      fn.apply(
        this,
        args
      );

      return;
    }

    if (!timer) {
      timer =
        setTimeout(
          () => {
            lastCall =
              Date.now();

            timer =
              null;

            fn.apply(
              this,
              args
            );
          },
          remaining
        );
    }
  };
}

// =====================================================
// TEXT
// =====================================================

export function normalizeText(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

export function truncate(
  value,
  maxLength = 1000
) {
  const text =
    String(
      value ?? ""
    );

  if (
    text.length <=
    maxLength
  ) {
    return text;
  }

  return (
    text.slice(
      0,
      Math.max(
        0,
        maxLength - 1
      )
    ) + "…"
  );
}

// =====================================================
// DATE
// =====================================================

export function formatDateTime(
  timestamp,
  locale = "ru-RU"
) {
  if (!timestamp) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      locale,
      {
        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      new Date(
        timestamp
      )
    );
  } catch {
    return "";
  }
}

// =====================================================
// URL
// =====================================================

export function isHttpUrl(
  value
) {
  try {
    const url =
      new URL(
        value
      );

    return (
      url.protocol ===
        "http:" ||
      url.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
}

export function normalizeUrl(
  value
) {
  const text =
    String(
      value || ""
    ).trim();

  if (!text) {
    return null;
  }

  if (
    isHttpUrl(
      text
    )
  ) {
    return text;
  }

  if (
    !text.includes(
      " "
    ) &&
    text.includes(
      "."
    )
  ) {
    const candidate =
      `https://${text}`;

    if (
      isHttpUrl(
        candidate
      )
    ) {
      return candidate;
    }
  }

  return null;
}

// =====================================================
// FILE
// =====================================================

export function fileToDataURL(
  file
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      if (
        !(file instanceof File)
      ) {
        reject(
          new Error(
            "fileToDataURL requires File."
          )
        );

        return;
      }

      const reader =
        new FileReader();

      reader.onload =
        () =>
          resolve(
            reader.result
          );

      reader.onerror =
        () =>
          reject(
            reader.error ||
            new Error(
              "Failed to read file."
            )
          );

      reader.readAsDataURL(
        file
      );
    }
  );
}

// =====================================================
// ERROR
// =====================================================

export function normalizeError(
  error
) {
  if (
    error instanceof Error
  ) {
    return {
      name:
        error.name,

      message:
        error.message,

      stack:
        error.stack ||
        null,
    };
  }

  return {
    name:
      "Error",

    message:
      String(
        error ||
        "Unknown error"
      ),

    stack:
      null,
  };
}