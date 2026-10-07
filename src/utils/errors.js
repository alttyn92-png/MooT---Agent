/**
 * MOOT ERRORS
 *
 * Собственные типы ошибок проекта.
 */

export class MutError extends Error {
  constructor(
    message,
    {
      code = "MOOT_ERROR",
      cause = null,
      details = null,
      retryable = false,
    } = {}
  ) {
    super(
      message
    );

    this.name =
      "MutError";

    this.code =
      code;

    this.cause =
      cause;

    this.details =
      details;

    this.retryable =
      Boolean(
        retryable
      );

    this.timestamp =
      Date.now();
  }
}

// =====================================================
// BROWSER
// =====================================================

export class MutBrowserError extends MutError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        code:
          options.code ||
          "MOOT_BROWSER_ERROR",

        ...options,
      }
    );

    this.name =
      "MutBrowserError";
  }
}

// =====================================================
// PAGE
// =====================================================

export class MutPageError extends MutError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        code:
          options.code ||
          "MOOT_PAGE_ERROR",

        ...options,
      }
    );

    this.name =
      "MutPageError";
  }
}

// =====================================================
// TOOL
// =====================================================

export class MutToolError extends MutError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        code:
          options.code ||
          "MOOT_TOOL_ERROR",

        ...options,
      }
    );

    this.name =
      "MutToolError";
  }
}

// =====================================================
// AI
// =====================================================

export class MutAIError extends MutError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        code:
          options.code ||
          "MOOT_AI_ERROR",

        ...options,
      }
    );

    this.name =
      "MutAIError";
  }
}

// =====================================================
// DATABASE
// =====================================================

export class MutDatabaseError extends MutError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        code:
          options.code ||
          "MOOT_DATABASE_ERROR",

        ...options,
      }
    );

    this.name =
      "MutDatabaseError";
  }
}

// =====================================================
// VOICE
// =====================================================

export class MutVoiceError extends MutError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        code:
          options.code ||
          "MOOT_VOICE_ERROR",

        ...options,
      }
    );

    this.name =
      "MutVoiceError";
  }
}

// =====================================================
// VALIDATION
// =====================================================

export class MutValidationError extends MutError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        code:
          options.code ||
          "MOOT_VALIDATION_ERROR",

        ...options,
      }
    );

    this.name =
      "MutValidationError";
  }
}

// =====================================================
// TIMEOUT
// =====================================================

export class MutTimeoutError extends MutError {
  constructor(
    message = "Operation timed out.",
    options = {}
  ) {
    super(
      message,
      {
        code:
          options.code ||
          "MOOT_TIMEOUT",

        retryable:
          options.retryable !==
          false,

        ...options,
      }
    );

    this.name =
      "MutTimeoutError";
  }
}

// =====================================================
// STOP
// =====================================================

export class MutStoppedError extends MutError {
  constructor(
    message = "MOOT was stopped.",
    options = {}
  ) {
    super(
      message,
      {
        code:
          "MOOT_STOPPED",

        retryable:
          false,

        ...options,
      }
    );

    this.name =
      "MutStoppedError";
  }
}

// =====================================================
// NORMALIZE
// =====================================================

export function toMutError(
  error,
  {
    code =
      "MOOT_ERROR",

    retryable =
      false,
  } = {}
) {
  if (
    error instanceof
    MutError
  ) {
    return error;
  }

  return new MutError(
    error?.message ||
    String(
      error ||
      "Unknown MOOT error"
    ),
    {
      code,
      cause:
        error,

      retryable,
    }
  );
}

// =====================================================
// SERIALIZE
// =====================================================

export function serializeError(
  error
) {
  if (!error) {
    return null;
  }

  return {
    name:
      error.name ||
      "Error",

    message:
      error.message ||
      String(error),

    code:
      error.code ||
      null,

    retryable:
      Boolean(
        error.retryable
      ),

    details:
      error.details ||
      null,

    timestamp:
      error.timestamp ||
      Date.now(),
  };
}