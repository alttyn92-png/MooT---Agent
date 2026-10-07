/**
 * MOOT TASK LOOP
 *
 * Основной цикл:
 *
 * decide
 * ↓
 * execute
 * ↓
 * observe
 * ↓
 * decide
 */

import {
  PLAN_TYPES,
  parseModelDecision,
  validatePlan,
} from "./planner.js";

import {
  executeToolCallSafe,
} from "./executor.js";

const DEFAULT_OPTIONS = {
  maxSteps: 50,
  delayBetweenStepsMs: 150,
  maxConsecutiveErrors: 5,
};

export class MutTaskLoop {
  constructor(
    options = {}
  ) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    this.running =
      false;

    this.stopRequested =
      false;

    this.currentStep =
      0;

    this.currentTask =
      null;

    this.history =
      [];

    this.consecutiveErrors =
      0;

    this.callbacks = {
      onProgress:
        options.onProgress,

      onStep:
        options.onStep,

      onTool:
        options.onTool,

      onComplete:
        options.onComplete,

      onError:
        options.onError,
    };
  }

  // ===================================================
  // RUN
  // ===================================================

  async run({
    taskId,
    userMessage,
    decide,
    initialContext = null,
  } = {}) {
    if (
      this.running
    ) {
      throw new Error(
        "Task loop is already running."
      );
    }

    if (
      typeof decide !==
      "function"
    ) {
      throw new Error(
        "Task loop requires decide function."
      );
    }

    this.running =
      true;

    this.stopRequested =
      false;

    this.currentStep =
      0;

    this.history =
      [];

    this.consecutiveErrors =
      0;

    this.currentTask = {
      id:
        taskId ||
        createTaskId(),

      userMessage,

      status:
        "running",

      startedAt:
        Date.now(),
    };

    let context = {
      initialContext,
      history:
        this.history,
    };

    await this.emit(
      "onProgress",
      {
        type:
          "task_started",

        task:
          this.currentTask,
      }
    );

    while (
      this.running &&
      !this.stopRequested
    ) {
      if (
        this.currentStep >=
        this.options.maxSteps
      ) {
        return this.finish({
          status:
            "max_steps",

          message:
            "MOOT достиг максимального количества шагов.",
        });
      }

      this.currentStep +=
        1;

      let modelOutput;

      try {
        modelOutput =
          await decide({
            ...context,

            step:
              this.currentStep,

            history:
              this.history,

            stopRequested:
              this.stopRequested,
          });
      } catch (error) {
        if (this.stopRequested) break;
        if ([400, 401, 403, 404, 429].includes(error.status) || /API key/i.test(error.message)) {
          return this.finish({ status: 'error', message: error.message });
        }
        if (
          await this.handleError(
            "decision_error",
            error
          )
        ) {
          return this.finish({
            status:
              "error",

            message:
              "MOOT не смог продолжить задачу.",
          });
        }

        continue;
      }

      if (this.stopRequested) break;
      const plan =
        parseModelDecision(
          modelOutput
        );

      const validation =
        validatePlan(
          plan
        );

      if (
        !validation.valid
      ) {
        if (
          await this.handleError(
            "invalid_plan",
            new Error(
              validation.error
            )
          )
        ) {
          return this.finish({
            status:
              "error",

            message:
              "MOOT получил некорректный план.",
          });
        }

        continue;
      }

      await this.emit(
        "onStep",
        {
          step:
            this.currentStep,

          plan,
        }
      );

      if (
        plan.type ===
        PLAN_TYPES.COMPLETE
      ) {
        return this.finish({
          status:
            "completed",

          message:
            plan.message ||
            "Готово.",
        });
      }

      if (
        plan.type ===
        PLAN_TYPES.STOP
      ) {
        return this.finish({
          status:
            "stopped",

          message:
            plan.message ||
            "Остановлено.",
        });
      }

      if (
        plan.type ===
        PLAN_TYPES.MESSAGE
      ) {
        this.history.push({
          type:
            "message",

          step:
            this.currentStep,

          message:
            plan.message,

          timestamp:
            Date.now(),
        });

        this.consecutiveErrors =
          0;

        if (
          !plan.continue
        ) {
          return this.finish({
            status:
              "completed",

            message:
              plan.message,
          });
        }

        continue;
      }

      if (
        plan.type ===
        PLAN_TYPES.ERROR
      ) {
        if (
          await this.handleError(
            "planner_error",
            new Error(
              plan.error
            )
          )
        ) {
          return this.finish({
            status:
              "error",

            message:
              "MOOT не смог построить план.",
          });
        }

        continue;
      }

      if (
        plan.type ===
        PLAN_TYPES.TOOL
      ) {
        const toolCall = {
          name:
            plan.tool.name,

          arguments:
            plan.tool.arguments ||
            {},
        };

        await this.emit(
          "onTool",
          {
            phase:
              "start",

            step:
              this.currentStep,

            tool:
              toolCall,
          }
        );

        if (this.stopRequested) break;
        const result =
          await executeToolCallSafe(
            toolCall
          );

        this.history.push({
          type:
            "tool_result",

          step:
            this.currentStep,

          tool:
            toolCall,

          result,

          timestamp:
            Date.now(),
        });

        await this.emit(
          "onTool",
          {
            phase:
              "end",

            step:
              this.currentStep,

            tool:
              toolCall,

            result,
          }
        );

        if (
          !result.ok
        ) {
          this.consecutiveErrors +=
            1;

          await this.emit(
            "onError",
            {
              type:
                "tool_error",

              step:
                this.currentStep,

              tool:
                toolCall,

              error:
                result.error,
            }
          );

          if (
            this.consecutiveErrors >=
            this.options
              .maxConsecutiveErrors
          ) {
            return this.finish({
              status:
                "error",

              message:
                "MOOT остановился из-за повторяющихся ошибок.",
            });
          }
        } else {
          this.consecutiveErrors =
            0;
        }

        context = {
          ...context,

          lastToolCall:
            toolCall,

          lastToolResult:
            result,

          history:
            this.history,
        };

        await sleep(
          this.options
            .delayBetweenStepsMs
        );
      }
    }

    return this.finish({
      status:
        "stopped",

      message:
        "Остановлено.",
    });
  }

  // ===================================================
  // ERROR
  // ===================================================

  async handleError(
    type,
    error
  ) {
    this.consecutiveErrors +=
      1;

    const entry = {
      type,

      step:
        this.currentStep,

      error:
        error?.message ||
        String(error),

      timestamp:
        Date.now(),
    };

    this.history.push(
      entry
    );

    await this.emit(
      "onError",
      entry
    );

    return (
      this.consecutiveErrors >=
      this.options
        .maxConsecutiveErrors
    );
  }

  // ===================================================
  // STOP
  // ===================================================

  requestStop() {
    this.stopRequested =
      true;

    this.running =
      false;
  }

  // ===================================================
  // FINISH
  // ===================================================

  async finish({
    status,
    message = "",
  }) {
    this.running =
      false;

    if (
      this.currentTask
    ) {
      this.currentTask.status =
        status;

      this.currentTask.finishedAt =
        Date.now();
    }

    const result = {
      task:
        this.currentTask,

      status,

      message,

      steps:
        this.currentStep,

      history:
        [...this.history],

      finishedAt:
        Date.now(),
    };

    await this.emit(
      "onComplete",
      result
    );

    return result;
  }

  async emit(
    callback,
    payload
  ) {
    const fn =
      this.callbacks[
        callback
      ];

    if (
      typeof fn !==
      "function"
    ) {
      return;
    }

    try {
      await fn(
        payload
      );
    } catch {
      // callback must not break loop
    }
  }

  getState() {
    return {
      running:
        this.running,

      stopRequested:
        this.stopRequested,

      currentStep:
        this.currentStep,

      currentTask:
        this.currentTask,

      consecutiveErrors:
        this.consecutiveErrors,

      historyLength:
        this.history.length,
    };
  }
}

export function createTaskLoop(
  options = {}
) {
  return new MutTaskLoop(
    options
  );
}

function sleep(
  ms
) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        Math.max(
          0,
          Number(ms) ||
          0
        )
      )
  );
}

function createTaskId() {
  return [
    "task",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join("_");
}