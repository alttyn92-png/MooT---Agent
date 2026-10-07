/**
 * MOOT TASKS DB
 *
 * Работа с задачами агента:
 * - создать задачу
 * - получить задачу
 * - обновить статус
 * - обновить текущий шаг
 * - завершить
 * - записать ошибку
 * - получить задачи чата
 */

import {
  database,
} from "./database.js";

import {
  STORES,
  createTask,
} from "./schema.js";

// =====================================================
// CREATE
// =====================================================

export async function createNewTask({
  chatId = null,
  command = "",
} = {}) {
  const task =
    createTask({
      chatId,
      command,
      status:
        "running",
    });

  await database.add(
    STORES.TASKS,
    task
  );

  return task;
}

// =====================================================
// GET
// =====================================================

export async function getTask(
  taskId
) {
  if (!taskId) {
    throw new Error(
      "getTask requires taskId."
    );
  }

  return database.get(
    STORES.TASKS,
    taskId
  );
}

// =====================================================
// UPDATE
// =====================================================

export async function updateTask(
  taskId,
  patch = {}
) {
  const task =
    await getTask(
      taskId
    );

  if (!task) {
    throw new Error(
      `Task not found: ${taskId}`
    );
  }

  const updated = {
    ...task,
    ...patch,

    id:
      task.id,

    updatedAt:
      Date.now(),
  };

  await database.put(
    STORES.TASKS,
    updated
  );

  return updated;
}

// =====================================================
// STEP
// =====================================================

export async function setTaskStep(
  taskId,
  currentStep
) {
  return updateTask(
    taskId,
    {
      currentStep:
        Number(
          currentStep
        ) || 0,
    }
  );
}

// =====================================================
// STATUS
// =====================================================

export async function setTaskStatus(
  taskId,
  status
) {
  return updateTask(
    taskId,
    {
      status,
    }
  );
}

// =====================================================
// COMPLETE
// =====================================================

export async function completeTask(
  taskId,
  {
    status = "completed",
    result = null,
  } = {}
) {
  return updateTask(
    taskId,
    {
      status,

      result,

      finishedAt:
        Date.now(),

      error:
        null,
    }
  );
}

// =====================================================
// FAIL
// =====================================================

export async function failTask(
  taskId,
  error
) {
  return updateTask(
    taskId,
    {
      status:
        "error",

      error:
        error?.message ||
        String(
          error || ""
        ),

      finishedAt:
        Date.now(),
    }
  );
}

// =====================================================
// STOP
// =====================================================

export async function stopTask(
  taskId,
  reason = null
) {
  return updateTask(
    taskId,
    {
      status:
        "stopped",

      stopReason:
        reason,

      finishedAt:
        Date.now(),
    }
  );
}

// =====================================================
// GET BY CHAT
// =====================================================

export async function getTasksByChat(
  chatId,
  {
    direction = "desc",
  } = {}
) {
  if (!chatId) {
    throw new Error(
      "getTasksByChat requires chatId."
    );
  }

  let tasks =
    await database.getAllByIndex(
      STORES.TASKS,
      "chatId",
      chatId
    );

  tasks.sort(
    (a, b) =>
      a.createdAt -
      b.createdAt
  );

  if (
    direction ===
    "desc"
  ) {
    tasks.reverse();
  }

  return tasks;
}

// =====================================================
// GET BY STATUS
// =====================================================

export async function getTasksByStatus(
  status
) {
  return database.getAllByIndex(
    STORES.TASKS,
    "status",
    status
  );
}

// =====================================================
// DELETE
// =====================================================

export async function deleteTask(
  taskId
) {
  await database.delete(
    STORES.TASKS,
    taskId
  );

  return {
    deleted: true,
    taskId,
  };
}