/**
 * MOOT FORMS TOOL
 *
 * Высокоуровневая работа с формами.
 *
 * Умеет:
 * - прочитать формы
 * - заполнить поля
 * - выбрать select
 * - поставить checkbox/radio
 * - нажать submit
 *
 * Не читает парольные значения обратно.
 */

import {
  getFormsTool,
} from "./read-page.js";

import {
  typeTool,
  clearTool,
} from "./type.js";

import {
  selectOptionTool,
  checkTool,
  uncheckTool,
} from "./select.js";

import {
  clickTool,
} from "./click.js";

// =====================================================
// READ FORMS
// =====================================================

export async function readFormsTool() {
  return getFormsTool();
}

// =====================================================
// FILL FIELD
// =====================================================

export async function fillFieldTool({
  target,
  value,
  replace = true,
  humanLike = false,
} = {}) {
  if (!target) {
    throw new Error(
      "fillFieldTool requires target."
    );
  }

  return typeTool({
    target,
    text:
      value ?? "",
    replace,
    humanLike,
  });
}

// =====================================================
// CLEAR FIELD
// =====================================================

export async function clearFieldTool({
  target,
} = {}) {
  return clearTool({
    target,
  });
}

// =====================================================
// SELECT FIELD
// =====================================================

export async function selectFieldTool({
  target,
  value,
} = {}) {
  return selectOptionTool({
    target,
    value,
  });
}

// =====================================================
// TOGGLE FIELD
// =====================================================

export async function setBooleanFieldTool({
  target,
  checked = true,
} = {}) {
  return checked
    ? checkTool({
        target,
      })
    : uncheckTool({
        target,
      });
}

// =====================================================
// SUBMIT FORM
// =====================================================

export async function submitFormTool({
  target = null,
  submitText = null,
} = {}) {
  if (target) {
    return clickTool({
      target,
    });
  }

  if (submitText) {
    return clickTool({
      target: {
        text:
          submitText,
      },
    });
  }

  const forms =
    await getFormsTool();

  for (
    const form of
    forms
  ) {
    const submit =
      form.fields?.find(
        (field) =>
          field.type ===
            "submit" ||
          field.text
            ?.toLowerCase()
            .includes(
              "submit"
            ) ||
          field.text
            ?.toLowerCase()
            .includes(
              "отправ"
            ) ||
          field.text
            ?.toLowerCase()
            .includes(
              "продолж"
            )
      );

    if (
      submit?.selector
    ) {
      return clickTool({
        target: {
          selector:
            submit.selector,
        },
      });
    }
  }

  throw new Error(
    "Submit control was not found."
  );
}

// =====================================================
// FILL MANY FIELDS
// =====================================================

export async function fillFormTool({
  fields = [],
  submit = false,
  submitTarget = null,
} = {}) {
  if (
    !Array.isArray(
      fields
    )
  ) {
    throw new Error(
      "fillFormTool requires fields array."
    );
  }

  const results = [];

  for (
    const field of
    fields
  ) {
    if (
      !field ||
      typeof field !==
        "object"
    ) {
      continue;
    }

    const {
      target,
      value,
      kind = "text",
    } = field;

    if (!target) {
      continue;
    }

    try {
      let result;

      switch (kind) {
        case "select":
          result =
            await selectFieldTool({
              target,
              value,
            });
          break;

        case "checkbox":
        case "radio":
          result =
            await setBooleanFieldTool({
              target,
              checked:
                Boolean(
                  value
                ),
            });
          break;

        case "text":
        default:
          result =
            await fillFieldTool({
              target,
              value,
              replace:
                field.replace !==
                false,

              humanLike:
                Boolean(
                  field.humanLike
                ),
            });
          break;
      }

      results.push({
        ok: true,
        field,
        result,
      });
    } catch (error) {
      results.push({
        ok: false,
        field,
        error:
          error?.message ||
          String(error),
      });

      if (
        field.required !==
        false
      ) {
        break;
      }
    }
  }

  let submitResult =
    null;

  if (submit) {
    submitResult =
      await submitFormTool({
        target:
          submitTarget,
      });
  }

  return {
    fields:
      results,

    submit:
      submitResult,
  };
}