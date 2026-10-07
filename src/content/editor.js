(() => {
  'use strict';
  const normalize = text => String(text ?? '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/[\u200b\ufeff]/g, '');
  function read(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return normalize(element.value);
    return normalize(element.innerText || '').replace(/\n$/, '');
  }
  async function write(element, text, { replace = true } = {}) {
    if (!element?.isConnected || element.disabled || element.readOnly || element.getAttribute('aria-disabled') === 'true' || element.getAttribute('aria-readonly') === 'true') {
      throw new Error('Поле недоступно для ввода. Обнови снимок страницы.');
    }
    const editable = element.isContentEditable;
    if (!editable && !(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) throw new Error('Выбранный элемент не является полем ввода.');
    const value = normalize(text);
    const expected = (replace ? '' : read(element)) + value;
    element.focus({ preventScroll: true });
    if (editable) {
      // Browser editing preserves rich-editor structure and undo history.
      // Replacing textContent breaks editors such as Slate and Lexical.
      const range = document.createRange();
      range.selectNodeContents(element);
      if (!replace) range.collapse(false);
      const selection = getSelection();
      selection.removeAllRanges(); selection.addRange(range);
      let changed = false;
      if (!value) changed = document.execCommand('delete', false);
      else {
        const lines = value.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (i) changed = document.execCommand('insertLineBreak', false) || changed;
          if (lines[i]) changed = document.execCommand('insertText', false, lines[i]) || changed;
        }
      }
      if (!changed && read(element) !== expected) throw new Error('Редактор не принял ввод. Текст не отправлен.');
    } else {
      const before = new InputEvent('beforeinput', { bubbles: true, cancelable: true, composed: true, inputType: 'insertText', data: value });
      if (!element.dispatchEvent(before)) throw new Error('Страница отклонила ввод.');
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, expected);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: value }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await new Promise(resolve => setTimeout(resolve, 120));
    if (!element.isConnected || read(element) !== expected) throw new Error('Поле изменилось или текст не сохранился. Повтори чтение страницы перед вводом.');
    return { verified: true, textLength: expected.length };
  }
  window.MOOTEditor = { read, write, normalize };
})();
