/**
 * MOOT IMAGE UPLOAD
 *
 * Управляет изображениями пользователя.
 *
 * Возможности:
 * - выбрать несколько картинок
 * - превратить их в data URL
 * - хранить pending images
 * - удалить картинку до отправки
 * - отрисовать preview
 */

export class MutImageUpload {
  constructor({
    onChange = null,
  } = {}) {
    this.onChange =
      onChange;

    this.images =
      [];

    this.button =
      null;

    this.input =
      null;

    this.preview =
      null;
  }

  renderButton() {
    const wrapper =
      document.createElement(
        "div"
      );

    wrapper.className =
      "mut-image-upload";

    const input =
      document.createElement(
        "input"
      );

    input.type =
      "file";

    input.accept =
      "image/*";

    input.multiple =
      true;

    input.hidden =
      true;

    const button =
      document.createElement(
        "button"
      );

    button.className =
      "mut-composer-button";

    button.type =
      "button";

    button.title =
      "Добавить изображение";

    button.setAttribute(
      "aria-label",
      "Добавить изображение"
    );

    button.textContent =
      "＋";

    button.addEventListener(
      "click",
      () => {
        input.click();
      }
    );

    input.addEventListener(
      "change",
      async () => {
        await this.handleFiles(
          input.files
        );

        input.value =
          "";
      }
    );

    wrapper.appendChild(
      input
    );

    wrapper.appendChild(
      button
    );

    this.input =
      input;

    this.button =
      button;

    return wrapper;
  }

  renderPreview() {
    const container =
      document.createElement(
        "section"
      );

    container.className =
      "mut-attachments";

    container.hidden =
      true;

    this.preview =
      container;

    this.updatePreview();

    return container;
  }

  async handleFiles(
    fileList
  ) {
    const files =
      Array.from(
        fileList || []
      );

    for (
      const file of
      files
    ) {
      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        continue;
      }

      const dataUrl =
        await fileToDataURL(
          file
        );

      this.images.push({
        id:
          createImageId(),

        name:
          file.name,

        type:
          file.type,

        size:
          file.size,

        dataUrl,
      });
    }

    this.updatePreview();
    this.emitChange();
  }

  removeImage(
    id
  ) {
    const index =
      this.images.findIndex(
        (image) =>
          image.id === id
      );

    if (
      index === -1
    ) {
      return false;
    }

    this.images.splice(
      index,
      1
    );

    this.updatePreview();
    this.emitChange();

    return true;
  }

  getImages() {
    return this.images.map(
      (image) => ({
        ...image,
      })
    );
  }

  clear() {
    this.images =
      [];

    this.updatePreview();
    this.emitChange();
  }

  setDisabled(
    disabled
  ) {
    if (
      this.button
    ) {
      this.button.disabled =
        Boolean(
          disabled
        );
    }

    if (
      this.input
    ) {
      this.input.disabled =
        Boolean(
          disabled
        );
    }
  }

  updatePreview() {
    if (
      !this.preview
    ) {
      return;
    }

    if (
      !this.images.length
    ) {
      this.preview.innerHTML =
        "";

      this.preview.hidden =
        true;

      return;
    }

    this.preview.hidden =
      false;

    this.preview.innerHTML =
      "";

    for (
      const image of
      this.images
    ) {
      const item =
        document.createElement(
          "div"
        );

      item.className =
        "mut-attachment";

      const img =
        document.createElement(
          "img"
        );

      img.className =
        "mut-attachment__image";

      img.src =
        image.dataUrl;

      img.alt =
        image.name ||
        "";

      const remove =
        document.createElement(
          "button"
        );

      remove.type =
        "button";

      remove.className =
        "mut-attachment__remove";

      remove.textContent =
        "×";

      remove.title =
        "Удалить изображение";

      remove.setAttribute(
        "aria-label",
        "Удалить изображение"
      );

      remove.addEventListener(
        "click",
        () => {
          this.removeImage(
            image.id
          );
        }
      );

      item.appendChild(
        img
      );

      item.appendChild(
        remove
      );

      this.preview.appendChild(
        item
      );
    }
  }

  emitChange() {
    if (
      typeof this.onChange ===
      "function"
    ) {
      this.onChange(
        this.getImages()
      );
    }
  }

  destroy() {
    this.button?.remove();

    this.input?.remove();

    this.preview?.remove();

    this.button =
      null;

    this.input =
      null;

    this.preview =
      null;

    this.images =
      [];
  }
}

// =====================================================
// FILE -> DATA URL
// =====================================================

function fileToDataURL(
  file
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const reader =
        new FileReader();

      reader.onload =
        () => {
          resolve(
            reader.result
          );
        };

      reader.onerror =
        () => {
          reject(
            reader.error ||
            new Error(
              "Не удалось прочитать изображение."
            )
          );
        };

      reader.readAsDataURL(
        file
      );
    }
  );
}

// =====================================================
// ID
// =====================================================

function createImageId() {
  return [
    "img",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join("_");
}