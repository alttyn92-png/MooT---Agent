/**
 * MOOT CONVERSATION MEMORY
 *
 * Управляет историей сообщений.
 *
 * Использует IndexedDB.
 *
 * Поддерживает:
 * - текущий чат
 * - создание нового чата
 * - сохранение сообщений
 * - загрузку истории
 * - переключение чатов
 */

import {
  createNewChat,
  getChat,
  getChats,
  renameChat,
  deleteChat,
} from "../database/chats-db.js";

import {
  addMessage,
  getMessagesByChat,
  deleteMessagesByChat,
} from "../database/messages-db.js";

const ACTIVE_CHAT_KEY =
  "mutActiveChatId";

// =====================================================
// GET ACTIVE CHAT ID
// =====================================================

export async function getActiveChatId() {
  if (
    typeof chrome ===
      "undefined" ||
    !chrome.storage?.local
  ) {
    return null;
  }

  const result =
    await chrome.storage.local.get(
      ACTIVE_CHAT_KEY
    );

  return (
    result[
      ACTIVE_CHAT_KEY
    ] || null
  );
}

// =====================================================
// SET ACTIVE CHAT
// =====================================================

export async function setActiveChatId(
  chatId
) {
  if (
    typeof chrome ===
      "undefined" ||
    !chrome.storage?.local
  ) {
    return chatId;
  }

  await chrome.storage.local.set({
    [ACTIVE_CHAT_KEY]:
      chatId,
  });

  return chatId;
}

// =====================================================
// ENSURE ACTIVE CHAT
// =====================================================

export async function ensureActiveChat() {
  const activeId =
    await getActiveChatId();

  if (activeId) {
    const existing =
      await getChat(
        activeId
      );

    if (existing) {
      return existing;
    }
  }

  const chat =
    await createNewChat({
      title:
        "Новый чат",
    });

  await setActiveChatId(
    chat.id
  );

  return chat;
}

// =====================================================
// CREATE CHAT
// =====================================================

export async function createConversation(
  title = "Новый чат"
) {
  const chat =
    await createNewChat({
      title,
    });

  await setActiveChatId(
    chat.id
  );

  return chat;
}

// =====================================================
// SWITCH CHAT
// =====================================================

export async function switchConversation(
  chatId
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

  await setActiveChatId(
    chatId
  );

  return {
    chat,

    messages:
      await getMessagesByChat(
        chatId
      ),
  };
}

// =====================================================
// SAVE USER MESSAGE
// =====================================================

export async function saveUserMessage({
  content,
  images = [],
  source = "text",
} = {}) {
  const chat =
    await ensureActiveChat();

  const message =
    await addMessage({
      chatId:
        chat.id,

      role:
        "user",

      content:
        content || "",

      images,

      source,
    });

  await autoTitleChat(
    chat,
    content
  );

  return message;
}

// =====================================================
// SAVE ASSISTANT MESSAGE
// =====================================================

export async function saveAssistantMessage({
  content,
  source = "text",
} = {}) {
  const chat =
    await ensureActiveChat();

  return addMessage({
    chatId:
      chat.id,

    role:
      "assistant",

    content:
      content || "",

    source,
  });
}

// =====================================================
// GET CURRENT CONVERSATION
// =====================================================

export async function getCurrentConversation() {
  const chat =
    await ensureActiveChat();

  const messages =
    await getMessagesByChat(
      chat.id
    );

  return {
    chat,
    messages,
  };
}

// =====================================================
// GET ALL CONVERSATIONS
// =====================================================

export async function getConversationList() {
  return getChats({
    direction:
      "desc",
  });
}

// =====================================================
// RENAME CURRENT CHAT
// =====================================================

export async function renameCurrentConversation(
  title
) {
  const chat =
    await ensureActiveChat();

  return renameChat(
    chat.id,
    title
  );
}

// =====================================================
// DELETE CONVERSATION
// =====================================================

export async function removeConversation(
  chatId
) {
  await deleteMessagesByChat(
    chatId
  );

  await deleteChat(
    chatId
  );

  const active =
    await getActiveChatId();

  if (
    active === chatId
  ) {
    const remaining =
      await getConversationList();

    if (
      remaining.length
    ) {
      await setActiveChatId(
        remaining[0].id
      );
    } else {
      const fresh =
        await createConversation();

      await setActiveChatId(
        fresh.id
      );
    }
  }

  return {
    deleted: true,
    chatId,
  };
}

// =====================================================
// CLEAR CURRENT CHAT
// =====================================================

export async function clearCurrentConversation() {
  const chat =
    await ensureActiveChat();

  const result =
    await deleteMessagesByChat(
      chat.id
    );

  return {
    chatId:
      chat.id,

    deleted:
      result.deleted,
  };
}

// =====================================================
// BUILD MODEL HISTORY
// =====================================================

export async function buildConversationContext({
  maxMessages = 30,
} = {}) {
  const {
    messages,
  } =
    await getCurrentConversation();

  return messages
    .slice(
      -Math.max(
        1,
        maxMessages
      )
    )
    .map(
      (message) => ({
        role:
          message.role,

        content:
          message.content,

        createdAt:
          message.createdAt,
      })
    );
}

// =====================================================
// AUTO TITLE
// =====================================================

async function autoTitleChat(
  chat,
  content
) {
  if (
    !chat ||
    chat.title !==
      "Новый чат"
  ) {
    return;
  }

  const text =
    String(
      content || ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (!text) {
    return;
  }

  const title =
    text.length > 45
      ? text.slice(
          0,
          45
        ) + "…"
      : text;

  try {
    await renameChat(
      chat.id,
      title
    );
  } catch {
    // Не критично.
  }
}