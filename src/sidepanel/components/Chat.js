/**
 * MOOT CHAT COMPONENT
 *
 * Отрисовывает сообщения чата.
 *
 * Поддерживает:
 * - user
 * - assistant
 * - error
 * - изображения
 * - typing indicator
 */

export class MutChatView {
  constructor() {
    this.element =
      null;

    this.typingElement =
      null;
  }

  // ===================================================
  // RENDER
  // ===================================================

  render() {
    const container =
      document.createElement(
        "main"
      );

    container.className =
      "mut-main";

    const messages =
      document.createElement(
        "div"
      );

    messages.setAttribute("role", "log");
    messages.setAttribute("aria-label", "Разговор с MOOT");
    messages.className =
      "mut-messages";

    messages.dataset.mutMessages =
      "true";

    container.appendChild(
      messages
    );

    this.element =
      messages;

    return container;
  }

  showWelcome() {
    this.element.innerHTML = `<section class="moot-welcome">
      <div class="moot-eyebrow">ТВОЙ ЛИЧНЫЙ АССИСТЕНТ</div>
      <img src="/moot-logo.svg" class="moot-hero-logo" alt="MOOT" />
      <h1>Давай сделаем<br>это вместе.</h1>
      <p>Я MOOT. Помогу разобраться,<br>найти нужное и сделать за тебя.</p>
      <button class="moot-hero-call" data-moot-start-voice type="button"><span aria-hidden="true">◉</span> Поговорить с MOOT <span aria-hidden="true">↗</span></button>
      <div class="moot-voice-hint">Один раз включи — дальше просто говори</div>
      <div class="moot-suggestions">
        <button type="button" data-moot-suggestion="Кратко объясни, что на открытой странице"><span>◫</span><div><strong>Разобраться в странице</strong><small>Выделю главное и объясню</small></div><b>↗</b></button>
        <button type="button" data-moot-suggestion="Найди в интернете "><span>⌕</span><div><strong>Найти нужное</strong><small>Поищу и сравню варианты</small></div><b>↗</b></button>
        <button type="button" data-moot-suggestion="Помоги мне с задачей: "><span>✦</span><div><strong>Поручить задачу</strong><small>Перейду от слов к действиям</small></div><b>↗</b></button>
      </div>
      <div class="moot-welcome-note">Текст, голос и действия — в одном разговоре</div>
    </section>`;
  }
  // ===================================================
  // RENDER ALL
  // ===================================================

  renderMessages(
    messages = []
  ) {
    if (
      !this.element
    ) {
      return;
    }

    this.typingElement = null;
    this.element.innerHTML =
      "";

    for (
      const message of
      messages
    ) {
      this.appendMessage(
        message,
        false
      );
    }

    if (!messages.length) this.showWelcome();
    this.scrollToBottom();
  }

  // ===================================================
  // APPEND
  // ===================================================

  appendMessage(
    message,
    scroll = true
  ) {
    if (
      !this.element
    ) {
      return null;
    }

    this.element.querySelector(".moot-welcome")?.remove();
    const node =
      createMessageElement(
        message
      );

    this.element.appendChild(
      node
    );

    if (scroll) {
      this.scrollToBottom();
    }

    return node;
  }

  // ===================================================
  // TYPING
  // ===================================================

  showTyping() {
    if (
      !this.element ||
      this.typingElement
    ) {
      return;
    }

    const wrapper =
      document.createElement(
        "div"
      );

    wrapper.className =
      "mut-message mut-message--assistant";

    wrapper.dataset.mutTyping =
      "true";

    const bubble =
      document.createElement(
        "div"
      );

    bubble.className =
      "mut-message__bubble";

    const thinking =
      document.createElement(
        "div"
      );

    thinking.className =
      "mut-thinking";

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      const dot =
        document.createElement(
          "span"
        );

      dot.className =
        "mut-thinking__dot";

      thinking.appendChild(
        dot
      );
    }

    bubble.appendChild(
      thinking
    );

    wrapper.appendChild(
      bubble
    );

    this.element.appendChild(
      wrapper
    );

    this.typingElement =
      wrapper;

    this.scrollToBottom();
  }

  hideTyping() {
    if (
      !this.typingElement
    ) {
      return;
    }

    this.typingElement.remove();

    this.typingElement =
      null;
  }

  // ===================================================
  // CLEAR
  // ===================================================

  clear() {
    if (
      this.element
    ) {
      this.element.innerHTML =
        "";
    }

    this.typingElement =
      null;
  }

  // ===================================================
  // SCROLL
  // ===================================================

  scrollToBottom() {
    if (
      !this.element
    ) {
      return;
    }

    requestAnimationFrame(
      () => {
        this.element.scrollTop =
          this.element.scrollHeight;
      }
    );
  }
}

// =====================================================
// MESSAGE ELEMENT
// =====================================================

function createMessageElement(
  message = {}
) {
  const role =
    message.role ===
      "user"
      ? "user"
      : "assistant";

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    `mut-message mut-message--${role}`;

  if (
    message.error
  ) {
    wrapper.classList.add(
      "mut-message--error"
    );
  }

  if (
    message.id
  ) {
    wrapper.dataset.messageId =
      message.id;
  }

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "mut-message__bubble";

  const content =
    document.createElement(
      "div"
    );

  content.className =
    "mut-message__text";

  content.textContent =
    String(
      message.content ||
      ""
    );

  bubble.appendChild(
    content
  );

  // ===================================================
  // IMAGES
  // ===================================================

  if (
    Array.isArray(
      message.images
    ) &&
    message.images.length
  ) {
    const imagesContainer =
      document.createElement(
        "div"
      );

    imagesContainer.className =
      "mut-message__images";

    for (
      const image of
      message.images
    ) {
      const src =
        resolveImageSource(
          image
        );

      if (!src) {
        continue;
      }

      const img =
        document.createElement(
          "img"
        );

      img.className =
        "mut-message__image";

      img.src =
        src;

      img.alt =
        image?.name ||
        "Изображение";

      img.loading =
        "lazy";

      imagesContainer.appendChild(
        img
      );
    }

    if (
      imagesContainer.children
        .length
    ) {
      bubble.appendChild(
        imagesContainer
      );
    }
  }

  wrapper.appendChild(
    bubble
  );

  return wrapper;
}

// =====================================================
// IMAGE SOURCE
// =====================================================

function resolveImageSource(
  image
) {
  if (!image) {
    return null;
  }

  if (
    typeof image ===
      "string"
  ) {
    return image;
  }

  if (
    typeof image ===
      "object"
  ) {
    return (
      image.dataUrl ||
      image.url ||
      image.image_url ||
      null
    );
  }

  return null;
}