/**
 * MOOT DATABASE SCHEMA
 *
 * Описывает локальную IndexedDB базу.
 *
 * Таблицы:
 *
 * chats
 * messages
 * tasks
 * actions
 * settings
 * memories
 */

export const DB_NAME =
  "mut_database";

export const DB_VERSION =
  1;

export const STORES =
  Object.freeze({
    CHATS:
      "chats",

    MESSAGES:
      "messages",

    TASKS:
      "tasks",

    ACTIONS:
      "actions",

    SETTINGS:
      "settings",

    MEMORIES:
      "memories",
  });

// =====================================================
// STORE DEFINITIONS
// =====================================================

export const STORE_DEFINITIONS =
  Object.freeze({
    [STORES.CHATS]: {
      keyPath:
        "id",

      autoIncrement:
        false,

      indexes: [
        {
          name:
            "createdAt",

          keyPath:
            "createdAt",

          options: {
            unique: false,
          },
        },

        {
          name:
            "updatedAt",

          keyPath:
            "updatedAt",

          options: {
            unique: false,
          },
        },
      ],
    },

    [STORES.MESSAGES]: {
      keyPath:
        "id",

      autoIncrement:
        false,

      indexes: [
        {
          name:
            "chatId",

          keyPath:
            "chatId",

          options: {
            unique: false,
          },
        },

        {
          name:
            "createdAt",

          keyPath:
            "createdAt",

          options: {
            unique: false,
          },
        },

        {
          name:
            "role",

          keyPath:
            "role",

          options: {
            unique: false,
          },
        },
      ],
    },

    [STORES.TASKS]: {
      keyPath:
        "id",

      autoIncrement:
        false,

      indexes: [
        {
          name:
            "chatId",

          keyPath:
            "chatId",

          options: {
            unique: false,
          },
        },

        {
          name:
            "status",

          keyPath:
            "status",

          options: {
            unique: false,
          },
        },

        {
          name:
            "createdAt",

          keyPath:
            "createdAt",

          options: {
            unique: false,
          },
        },
      ],
    },

    [STORES.ACTIONS]: {
      keyPath:
        "id",

      autoIncrement:
        false,

      indexes: [
        {
          name:
            "taskId",

          keyPath:
            "taskId",

          options: {
            unique: false,
          },
        },

        {
          name:
            "type",

          keyPath:
            "type",

          options: {
            unique: false,
          },
        },

        {
          name:
            "createdAt",

          keyPath:
            "createdAt",

          options: {
            unique: false,
          },
        },
      ],
    },

    [STORES.SETTINGS]: {
      keyPath:
        "key",

      autoIncrement:
        false,

      indexes: [],
    },

    [STORES.MEMORIES]: {
      keyPath:
        "id",

      autoIncrement:
        false,

      indexes: [
        {
          name:
            "type",

          keyPath:
            "type",

          options: {
            unique: false,
          },
        },

        {
          name:
            "createdAt",

          keyPath:
            "createdAt",

          options: {
            unique: false,
          },
        },

        {
          name:
            "updatedAt",

          keyPath:
            "updatedAt",

          options: {
            unique: false,
          },
        },
      ],
    },
  });

// =====================================================
// ENTITY FACTORIES
// =====================================================

export function createChat({
  id = null,
  title = "Новый чат",
} = {}) {
  const now =
    Date.now();

  return {
    id:
      id ||
      createId(
        "chat"
      ),

    title:
      String(
        title ||
        "Новый чат"
      ),

    createdAt:
      now,

    updatedAt:
      now,
  };
}

export function createMessage({
  id = null,
  chatId,
  role,
  content = "",
  images = [],
  source = "text",
} = {}) {
  if (!chatId) {
    throw new Error(
      "Message requires chatId."
    );
  }

  if (!role) {
    throw new Error(
      "Message requires role."
    );
  }

  return {
    id:
      id ||
      createId(
        "msg"
      ),

    chatId,

    role,

    content:
      String(
        content || ""
      ),

    images:
      Array.isArray(
        images
      )
        ? images
        : [],

    source,

    createdAt:
      Date.now(),
  };
}

export function createTask({
  id = null,
  chatId = null,
  command = "",
  status = "running",
} = {}) {
  const now =
    Date.now();

  return {
    id:
      id ||
      createId(
        "task"
      ),

    chatId,

    command:
      String(
        command || ""
      ),

    status,

    currentStep:
      0,

    createdAt:
      now,

    updatedAt:
      now,

    finishedAt:
      null,

    error:
      null,
  };
}

export function createAction({
  id = null,
  taskId,
  type,
  target = null,
  input = null,
  result = null,
  success = null,
} = {}) {
  if (!taskId) {
    throw new Error(
      "Action requires taskId."
    );
  }

  if (!type) {
    throw new Error(
      "Action requires type."
    );
  }

  return {
    id:
      id ||
      createId(
        "action"
      ),

    taskId,

    type,

    target,

    input,

    result,

    success,

    createdAt:
      Date.now(),
  };
}

export function createMemory({
  id = null,
  type = "general",
  key = null,
  value = null,
  source = "user",
} = {}) {
  const now =
    Date.now();

  return {
    id:
      id ||
      createId(
        "memory"
      ),

    type,

    key,

    value,

    source,

    createdAt:
      now,

    updatedAt:
      now,
  };
}

// =====================================================
// ID
// =====================================================

export function createId(
  prefix = "item"
) {
  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 10),
  ].join("_");
}