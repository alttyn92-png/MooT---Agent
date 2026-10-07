/**
 * MOOT HISTORY PANEL
 *
 * Панель истории чатов.
 *
 * Возможности:
 * - показать список чатов
 * - переключиться на чат
 * - создать новый чат
 * - удалить чат
 * - закрыть панель
 */

import {
  getCurrentConversation,
  getConversationList,
  createConversation,
  switchConversation,
  removeConversation,
} from "../../memory/conversation-memory.js";

export class MutHistoryPanel {
  constructor({
    onClose = null,
    onConversationChange = null,
  } = {}) {
    this.onClose =
      onClose;

    this.onConversationChange =
      onConversationChange;

    this.element =
      null;

    this.listElement =
      null;

    this.visible =
      false;
  }

  render() {
    const panel =
      document.createElement(
        "section"
      );

    panel.className =
      "mut-drawer mut-history-panel";

    panel.hidden =
      true;

    panel.innerHTML = `
      <div class="mut-drawer__header">
        <div class="mut-drawer__title">
          История
        </div>

        <button
          type="button"
          class="mut-icon-button"
          data-mut-history-close
          aria-label="Закрыть историю"
        >
          ×
        </button>
      </div>

      <div class="mut-drawer__actions">
        <button
          type="button"
          class="mut-primary-button"
          data-mut-new-chat
        >
          + Новый чат
        </button>
      </div>

      <div
        class="mut-history-list"
        data-mut-history-list
      ></div>
    `;

    this.element =
      panel;

    this.listElement =
      panel.querySelector(
        "[data-mut-history-list]"
      );

    panel
      .querySelector(
        "[data-mut-history-close]"
      )
      ?.addEventListener(
        "click",
        () => {
          this.hide();

          if (
            typeof this.onClose ===
            "function"
          ) {
            this.onClose();
          }
        }
      );

    panel
      .querySelector(
        "[data-mut-new-chat]"
      )
      ?.addEventListener(
        "click",
        async () => {
          const chat =
            await createConversation(
              "Новый чат"
            );

          await this.refresh();

          if (
            typeof this.onConversationChange ===
            "function"
          ) {
            await this.onConversationChange({
              chat,
              messages: [],
            });
          }

          this.hide();
        }
      );

    return panel;
  }

  async refresh() {
    if (
      !this.listElement
    ) {
      return;
    }

    const chats =
      await getConversationList();

    this.listElement.innerHTML =
      "";

    if (
      !chats.length
    ) {
      this.listElement.innerHTML = `
        <div class="mut-empty-state">
          Пока нет чатов
        </div>
      `;

      return;
    }

    for (
      const chat of
      chats
    ) {
      const item =
        document.createElement(
          "div"
        );

      item.className =
        "mut-history-item";

      item.innerHTML = `
        <button
          type="button"
          class="mut-history-item__main"
          data-mut-chat-open
        >
          <div class="mut-history-item__title"></div>

          <div class="mut-history-item__date"></div>
        </button>

        <button
          type="button"
          class="mut-history-item__delete"
          data-mut-chat-delete
          aria-label="Удалить чат"
          title="Удалить чат"
        >
          ×
        </button>
      `;

      item
        .querySelector(
          ".mut-history-item__title"
        )
        .textContent =
          chat.title ||
          "Новый чат";

      item
        .querySelector(
          ".mut-history-item__date"
        )
        .textContent =
          formatDate(
            chat.updatedAt ||
            chat.createdAt
          );

      item
        .querySelector(
          "[data-mut-chat-open]"
        )
        ?.addEventListener(
          "click",
          async () => {
            const conversation =
              await switchConversation(
                chat.id
              );

            if (
              typeof this.onConversationChange ===
              "function"
            ) {
              await this.onConversationChange(
                conversation
              );
            }

            this.hide();
          }
        );

      item
        .querySelector(
          "[data-mut-chat-delete]"
        )
        ?.addEventListener(
          "click",
          async (
            event
          ) => {
            event.stopPropagation();

            await removeConversation(
              chat.id
            );

            await this.refresh();
            await this.onConversationChange?.(await getCurrentConversation());
          }
        );

      this.listElement.appendChild(
        item
      );
    }
  }

  async show() {
    if (
      !this.element
    ) {
      return;
    }

    await this.refresh();

    this.visible =
      true;

    this.element.hidden =
      false;
  }

  hide() {
    if (
      !this.element
    ) {
      return;
    }

    this.visible =
      false;

    this.element.hidden =
      true;
  }

  toggle() {
    if (
      this.visible
    ) {
      this.hide();

      return;
    }

    this.show();
  }

  destroy() {
    this.element?.remove();

    this.element =
      null;

    this.listElement =
      null;

    this.visible =
      false;
  }
}

// =====================================================
// DATE
// =====================================================

function formatDate(
  timestamp
) {
  if (!timestamp) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      "ru-RU",
      {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
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