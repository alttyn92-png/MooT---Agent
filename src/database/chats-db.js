/**
 * MOOT CHATS DB
 *
 * Работа с чатами:
 * - создать чат
 * - получить чат
 * - список чатов
 * - переименовать
 * - обновить время
 * - удалить
 */

import {
  database,
} from "./database.js";

import {
  STORES,
  createChat,
} from "./schema.js";

// =====================================================
// CREATE
// =====================================================

export async function createNewChat({
  title = "Новый чат",
} = {}) {
  const chat =
    createChat({
      title,
    });

  await database.add(
    STORES.CHATS,
    chat
  );

  return chat;
}

// =====================================================
// GET ONE
// =====================================================

export async function getChat(
  chatId
) {
  if (!chatId) {
    throw new Error(
      "getChat requires chatId."
    );
  }

  return database.get(
    STORES.CHATS,
    chatId
  );
}

// =====================================================
// GET ALL
// =====================================================

export async function getChats({
  direction = "desc",
} = {}) {
  return database.getAllSorted(
    STORES.CHATS,
    "updatedAt",
    direction
  );
}

// =====================================================
// UPDATE
// =====================================================

export async function updateChat(
  chatId,
  patch = {}
) {
  const chat =
    await getChat(
      chatId
    );

  if (!chat) {
    throw new Error(
      `Chat not found: ${chatId}`
    );
  }

  const updated = {
    ...chat,
    ...patch,

    id:
      chat.id,

    updatedAt:
      Date.now(),
  };

  await database.put(
    STORES.CHATS,
    updated
  );

  return updated;
}

// =====================================================
// RENAME
// =====================================================

export async function renameChat(
  chatId,
  title
) {
  const safeTitle =
    String(
      title || ""
    ).trim();

  if (!safeTitle) {
    throw new Error(
      "Chat title cannot be empty."
    );
  }

  return updateChat(
    chatId,
    {
      title:
        safeTitle,
    }
  );
}

// =====================================================
// TOUCH
// =====================================================

export async function touchChat(
  chatId
) {
  return updateChat(
    chatId,
    {}
  );
}

// =====================================================
// DELETE
// =====================================================

export async function deleteChat(
  chatId
) {
  if (!chatId) {
    throw new Error(
      "deleteChat requires chatId."
    );
  }

  await database.delete(
    STORES.CHATS,
    chatId
  );

  return {
    deleted: true,
    chatId,
  };
}

// =====================================================
// EXISTS
// =====================================================

export async function chatExists(
  chatId
) {
  const chat =
    await getChat(
      chatId
    );

  return Boolean(chat);
}