/**
 * MOOT TASK MEMORY
 *
 * Связывает задачи агента и историю действий.
 *
 * Здесь MOOT может:
 * - создать задачу
 * - записать шаг
 * - записать действие
 * - завершить задачу
 * - восстановить историю задачи
 */

import {
  createNewTask,
  getTask,
  setTaskStep,
  completeTask,
  failTask,
  stopTask,
  getTasksByChat,
} from "../database/tasks-db.js";

import {
  addAction,
  getActionsByTask,
} from "../database/actions-db.js";

import {
  getActiveChatId,
} from "./conversation-memory.js";

// =====================================================
// CREATE
// =====================================================

export async function startTask({
  command = "",
  chatId = null,
} = {}) {
  const resolvedChatId =
    chatId ||
    (await getActiveChatId());

  return createNewTask({
    chatId:
      resolvedChatId,

    command,
  });
}

// =====================================================
// UPDATE STEP
// =====================================================

export async function updateTaskStep(
  taskId,
  step
) {
  return setTaskStep(
    taskId,
    step
  );
}

// =====================================================
// RECORD ACTION
// =====================================================

export async function recordTaskAction({
  taskId,
  type,
  target = null,
  input = null,
  result = null,
  success = null,
} = {}) {
  if (!taskId) {
    throw new Error(
      "recordTaskAction requires taskId."
    );
  }

  return addAction({
    taskId,
    type,
    target,
    input,
    result,
    success,
  });
}

// =====================================================
// COMPLETE
// =====================================================

export async function finishTask(
  taskId,
  result = null
) {
  return completeTask(
    taskId,
    {
      status:
        "completed",

      result,
    }
  );
}

// =====================================================
// FAIL
// =====================================================

export async function markTaskFailed(
  taskId,
  error
) {
  return failTask(
    taskId,
    error
  );
}

// =====================================================
// STOP
// =====================================================

export async function markTaskStopped(
  taskId,
  reason = null
) {
  return stopTask(
    taskId,
    reason
  );
}

// =====================================================
// GET FULL TASK
// =====================================================

export async function getTaskWithActions(
  taskId
) {
  const task =
    await getTask(
      taskId
    );

  if (!task) {
    return null;
  }

  const actions =
    await getActionsByTask(
      taskId
    );

  return {
    task,
    actions,
  };
}

// =====================================================
// GET CHAT TASK HISTORY
// =====================================================

export async function getTaskHistory({
  chatId = null,
  limit = 20,
} = {}) {
  const resolvedChatId =
    chatId ||
    (await getActiveChatId());

  if (!resolvedChatId) {
    return [];
  }

  const tasks =
    await getTasksByChat(
      resolvedChatId,
      {
        direction:
          "desc",
      }
    );

  return tasks.slice(
    0,
    Math.max(
      1,
      limit
    )
  );
}

// =====================================================
// BUILD TASK CONTEXT
// =====================================================

export async function buildRecentTaskContext({
  chatId = null,
  maxTasks = 5,
  includeActions = true,
} = {}) {
  const tasks =
    await getTaskHistory({
      chatId,
      limit:
        maxTasks,
    });

  const result = [];

  for (
    const task of
    tasks
  ) {
    const item = {
      id:
        task.id,

      command:
        task.command,

      status:
        task.status,

      currentStep:
        task.currentStep,

      result:
        task.result ||
        null,

      error:
        task.error ||
        null,

      createdAt:
        task.createdAt,

      finishedAt:
        task.finishedAt,
    };

    if (
      includeActions
    ) {
      const actions =
        await getActionsByTask(
          task.id
        );

      item.actions =
        actions.slice(
          -20
        );
    }

    result.push(
      item
    );
  }

  return result;
}