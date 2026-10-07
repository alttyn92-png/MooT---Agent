/**
 * MOOT MESSAGES DB
 *
 * Работа с сообщениями:
 * - создать сообщение
 * - получить сообщение
 * - получить сообщения чата
 * - удалить сообщение
 * - удалить сообщения чата
 */

import {
  database,
} from "./database.js";

import {
  STORES,
  createMessage,
} from "./schema.js";

import {
  touchChat,
} from "./chats-db.js";

// =====================================================
// CREATE MESSAGE
// =====================================================

export async function addMessage({
  chatId,
  role,
  content = "",
  images = [],
  source = "text",
} = {}) {
  const message =
    createMessage({
      chatId,
      role,
      content,
      images,
      source,
    });

  await database.add(
    STORES.MESSAGES,
    message
  );

  try {
    await touchChat(
      chatId
    );
  } catch {
    // Не ломаем сохранение сообщения,
    // если чат по какой-то причине не найден.
  }

  return message;
}

// =====================================================
// GET MESSAGE
// =====================================================

export async function getMessage(
  messageId
) {
  if (!messageId) {
    throw new Error(
      "getMessage requires messageId."
    );
  }

  return database.get(
    STORES.MESSAGES,
    messageId
  );
}

// =====================================================
// GET CHAT MESSAGES
// =====================================================

export async function getMessagesByChat(
  chatId,
  {
    direction = "asc",
    limit = null,
  } = {}
) {
  if (!chatId) {
    throw new Error(
      "getMessagesByChat requires chatId."
    );
  }

  let messages =
    await database.getAllByIndex(
      STORES.MESSAGES,
      "chatId",
      chatId
    );

  messages =
    messages.sort(
      (a, b) =>
        a.createdAt -
        b.createdAt
    );

  if (
    direction ===
    "desc"
  ) {
    messages.reverse();
  }

  if (
    Number.isFinite(limit)
  ) {
    messages =
      messages.slice(
        0,
        Math.max(
          0,
          Math.floor(limit)
        )
      );
  }

  return messages;
}

// =====================================================
// DELETE ONE
// =====================================================

export async function deleteMessage(
  messageId
) {
  if (!messageId) {
    throw new Error(
      "deleteMessage requires messageId."
    );
  }

  await database.delete(
    STORES.MESSAGES,
    messageId
  );

  return {
    deleted: true,
    messageId,
  };
}

// =====================================================
// DELETE CHAT MESSAGES
// =====================================================

export async function deleteMessagesByChat(
  chatId
) {
  const messages =
    await getMessagesByChat(
      chatId
    );

  if (!messages.length) {
    return {
      deleted: 0,
      chatId,
    };
  }

  const transaction =
    await database.transaction(
      STORES.MESSAGES,
      "readwrite"
    );

  const store =
    transaction.objectStore(
      STORES.MESSAGES
    );

  for (
    const message of
    messages
  ) {
    store.delete(
      message.id
    );
  }

  await new Promise(
    (
      resolve,
      reject
    ) => {
      transaction.oncomplete =
        () =>
          resolve();

      transaction.onerror =
        () =>
          reject(
            transaction.error
          );

      transaction.onabort =
        () =>
          reject(
            transaction.error
          );
    }
  );

  return {
    deleted:
      messages.length,

    chatId,
  };
}

// =====================================================
// COUNT CHAT MESSAGES
// =====================================================

export async function countMessagesByChat(
  chatId
) {
  const messages =
    await getMessagesByChat(
      chatId
    );

  return messages.length;
}