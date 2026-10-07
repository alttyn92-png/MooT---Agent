/**
 * MOOT ACTIONS DB
 *
 * Хранит историю действий агента:
 * - click
 * - type
 * - navigate
 * - open_tab
 * - screenshot
 * - и другие tool calls
 */

import {
  database,
} from "./database.js";

import {
  STORES,
  createAction,
} from "./schema.js";

// =====================================================
// CREATE ACTION
// =====================================================

export async function addAction({
  taskId,
  type,
  target = null,
  input = null,
  result = null,
  success = null,
} = {}) {
  const action =
    createAction({
      taskId,
      type,
      target,
      input,
      result,
      success,
    });

  await database.add(
    STORES.ACTIONS,
    action
  );

  return action;
}

// =====================================================
// GET ACTION
// =====================================================

export async function getAction(
  actionId
) {
  if (!actionId) {
    throw new Error(
      "getAction requires actionId."
    );
  }

  return database.get(
    STORES.ACTIONS,
    actionId
  );
}

// =====================================================
// GET BY TASK
// =====================================================

export async function getActionsByTask(
  taskId,
  {
    direction = "asc",
  } = {}
) {
  if (!taskId) {
    throw new Error(
      "getActionsByTask requires taskId."
    );
  }

  let actions =
    await database.getAllByIndex(
      STORES.ACTIONS,
      "taskId",
      taskId
    );

  actions.sort(
    (a, b) =>
      a.createdAt -
      b.createdAt
  );

  if (
    direction ===
    "desc"
  ) {
    actions.reverse();
  }

  return actions;
}

// =====================================================
// GET BY TYPE
// =====================================================

export async function getActionsByType(
  type
) {
  if (!type) {
    throw new Error(
      "getActionsByType requires type."
    );
  }

  return database.getAllByIndex(
    STORES.ACTIONS,
    "type",
    type
  );
}

// =====================================================
// UPDATE ACTION
// =====================================================

export async function updateAction(
  actionId,
  patch = {}
) {
  const action =
    await getAction(
      actionId
    );

  if (!action) {
    throw new Error(
      `Action not found: ${actionId}`
    );
  }

  const updated = {
    ...action,
    ...patch,

    id:
      action.id,
  };

  await database.put(
    STORES.ACTIONS,
    updated
  );

  return updated;
}

// =====================================================
// DELETE
// =====================================================

export async function deleteAction(
  actionId
) {
  await database.delete(
    STORES.ACTIONS,
    actionId
  );

  return {
    deleted: true,
    actionId,
  };
}

// =====================================================
// DELETE ALL TASK ACTIONS
// =====================================================

export async function deleteActionsByTask(
  taskId
) {
  const actions =
    await getActionsByTask(
      taskId
    );

  if (!actions.length) {
    return {
      deleted: 0,
      taskId,
    };
  }

  const transaction =
    await database.transaction(
      STORES.ACTIONS,
      "readwrite"
    );

  const store =
    transaction.objectStore(
      STORES.ACTIONS
    );

  for (
    const action of
    actions
  ) {
    store.delete(
      action.id
    );
  }

  await new Promise(
    (
      resolve,
      reject
    ) => {
      transaction.oncomplete =
        () => resolve();

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
      actions.length,

    taskId,
  };
}