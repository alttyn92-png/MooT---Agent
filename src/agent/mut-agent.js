/**
 * MOOT AGENT
 *
 * Центральное ядро MOOT.
 */

import {
  openAI,
} from "../ai/openai-client.js";

import {
  buildAgentContext,
  compactConversation,
} from "./context-builder.js";

import {
  buildPlannerInstruction,
} from "./planner.js";

import {
  getFunctionToolsSchema,
} from "./tool-registry.js";

import {
  createTaskLoop,
} from "./task-loop.js";

import {
  observer,
} from "./observer.js";

const DEFAULT_CONFIG = {
  maxSteps: 50,
  maxHistoryMessages: 30,
  observeAfterTool: true,
};

export class MutAgent {
  constructor(
    options = {}
  ) {
    this.options = {
      ...DEFAULT_CONFIG,
      ...options,
    };

    this.conversation =
      [];

    this.userProfile =
      "";

    this.currentTaskLoop =
      null;

    this.currentTaskId =
      null;

    this.lastObservation =
      null;

    this.running =
      false;

    this.listeners =
      new Map();
  }

  // ===================================================
  // INIT
  // ===================================================

  async initialize() {
    await this.loadUserProfile();
    await this.loadConversation();

    return {
      ready: true,
    };
  }

  // ===================================================
  // MESSAGE
  // ===================================================

  async sendMessage({
    text = "",
    images = [],
    source = "text",
  } = {}) {
    const userText =
      String(
        text || ""
      ).trim();

    if (
      !userText &&
      !images.length
    ) {
      throw new Error(
        "Message is empty."
      );
    }

    if (
      isStopCommand(
        userText
      )
    ) {
      await this.stop();

      return {
        status:
          "stopped",

        message:
          "Остановлено.",
      };
    }

    if (this.running) throw new Error("MOOT ещё выполняет задачу.");
    const userMessage = {
      id:
        createId(
          "msg"
        ),

      role:
        "user",

      content:
        userText,

      images,

      source,

      createdAt:
        Date.now(),
    };

    this.conversation.push(
      userMessage
    );

    await this.persistConversation();

    await this.emit(
      "message",
      userMessage
    );

    return this.runTask({
      userMessage:
        userText,

      images,
    });
  }

  // ===================================================
  // RUN TASK
  // ===================================================

  async runTask({
    userMessage,
    images = [],
  }) {
    if (
      this.running
    ) {
      throw new Error(
        "MOOT is already busy."
      );
    }

    this.running = true;
    this.abortController = new AbortController();

    this.currentTaskId =
      createId(
        "task"
      );

    await this.updateAgentState({
      running: true,

      stopRequested:
        false,

      currentTaskId:
        this.currentTaskId,

      currentStep:
        0,
    });

    try {
      this.lastObservation =
        await observer
          .observe()
          .catch(
            () => null
          );

      if (this.abortController.signal.aborted) return { status: "stopped", message: "Остановлено." };
      this.currentTaskLoop =
        createTaskLoop({
          maxSteps:
            this.options
              .maxSteps,

          onProgress:
            (
              event
            ) =>
              this.emit(
                "progress",
                event
              ),

          onStep:
            async (
              event
            ) => {
              await this.updateAgentState({
                currentStep:
                  event.step,
              });

              await this.emit(
                "step",
                event
              );
            },

          onTool:
            (
              event
            ) =>
              this.emit(
                "tool",
                event
              ),

          onError:
            (
              event
            ) =>
              this.emit(
                "error",
                event
              ),
        });

      const result =
        await this.currentTaskLoop.run({
          taskId:
            this.currentTaskId,

          userMessage,

          initialContext:
            this.lastObservation,

          decide:
            (
              context
            ) =>
              this.decideNextStep({
                userMessage,
                images,
                loopContext:
                  context,
              }),
        });

      if (
        result.message
      ) {
        const last =
          this.conversation[
            this.conversation
              .length -
            1
          ];

        if (
          last?.role !==
            "assistant" ||
          last.content !==
            result.message
        ) {
          await this.addAssistantMessage(
            result.message
          );
        }
      }

      await this.updateAgentState({
        running:
          false,

        currentTaskId:
          null,

        lastTaskStatus:
          result.status,
      });

      await this.emit(
        "task_complete",
        result
      );

      return result;
    } finally {
      await this.updateAgentState({ running: false, currentTaskId: null });
      this.running =
        false;

      this.currentTaskLoop =
        null;

      this.currentTaskId =
        null;
    }
  }

  // ===================================================
  // DECISION
  // ===================================================

  async decideNextStep({
    userMessage,
    images,
    loopContext,
  }) {
    const state =
      await this.getAgentState();

    if (
      state
        ?.stopRequested
    ) {
      return {
        stop: true,

        message:
          "Остановлено.",
      };
    }

    if (
      this.options
        .observeAfterTool &&
      loopContext
        ?.lastToolCall
    ) {
      this.lastObservation =
        await observer
          .observe()
          .catch(
            () =>
              this.lastObservation
          );
    }

    const history =
      compactConversation(
        this.conversation,
        {
          maxMessages:
            this.options
              .maxHistoryMessages,
        }
      );

    const context =
      await buildAgentContext({
        userMessage,

        userProfile:
          this.userProfile,

        conversation:
          history,

        browserState:
          this.lastObservation
            ?.activeTab
            ? {
                activeTab:
                  this.lastObservation
                    .activeTab,

                tabs:
                  this.lastObservation
                    .tabs,
              }
            : null,

        pageState:
          this.lastObservation,

        taskState: {
          id:
            this.currentTaskId,

          step:
            loopContext.step,

          lastToolCall:
            loopContext
              .lastToolCall ||
            null,

          lastToolResult:
            sanitizeToolResult(
              loopContext
                .lastToolResult
            ),

          recentHistory: sanitizeToolResult(loopContext.history?.slice(-10) || []),
        },
      });

    const tools =
      getFunctionToolsSchema();

    const response =
      await openAI.decide({
        userMessage,

        systemPrompt: [
          context.systemPrompt,
          buildPlannerInstruction(),
        ].join(
          "\n\n"
        ),

        conversation:
          history,

        tools,

        browserContext: null,
      signal: this.abortController?.signal,

        taskState: null,

        step:
          loopContext.step,

        consecutiveErrors:
          this.currentTaskLoop
            ?.consecutiveErrors ||
          0,

        images:
          loopContext.step ===
          1
            ? images
            : [],
      });

    if (this.abortController?.signal.aborted) return { stop: true, message: "Остановлено." };
    if (
      response
        .toolCalls
        ?.length
    ) {
      const call =
        response.toolCalls[0];

      return {
        tool: {
          name:
            call.name,

          arguments:
            call.arguments ||
            {},
        },

        continue: true,

        message:
          response.text ||
          "",
      };
    }

    const text =
      String(
        response.text ||
        ""
      ).trim();

    const structured =
      tryParseJSON(
        text
      );

    if (
      structured
    ) {
      return structured;
    }

    if (
      text
    ) {
      await this.addAssistantMessage(
        text
      );

      return {
        message:
          text,

        continue:
          false,
      };
    }

    return {
      message:
        "Не удалось получить ответ.",

      continue:
        false,
    };
  }

  // ===================================================
  // ASSISTANT MESSAGE
  // ===================================================

  async addAssistantMessage(
    text
  ) {
    const content =
      String(
        text || ""
      ).trim();

    if (!content) {
      return;
    }

    const message = {
      id:
        createId(
          "msg"
        ),

      role:
        "assistant",

      content,

      createdAt:
        Date.now(),
    };

    this.conversation.push(
      message
    );

    await this.persistConversation();

    await this.emit(
      "message",
      message
    );
  }

  // ===================================================
  // STOP
  // ===================================================

  async stop() {
    this.abortController?.abort();
    this.currentTaskLoop
      ?.requestStop();

    await this.updateAgentState({
      running:
        false,

      stopRequested:
        true,

      currentTaskId:
        null,
    });

    try {
      await chrome.runtime.sendMessage({
        type:
          "STOP_MOOT",
      });
    } catch {
      // ignore
    }

    await this.emit(
      "stopped",
      {
        timestamp:
          Date.now(),
      }
    );

    return {
      stopped:
        true,
    };
  }

  // ===================================================
  // PROFILE
  // ===================================================

  async loadUserProfile() {
    const result =
      await chrome.storage.local.get(
        "mutUserProfile"
      );

    this.userProfile =
      typeof result
        .mutUserProfile ===
        "string"
        ? result
            .mutUserProfile
        : "";

    return this.userProfile;
  }

  async setUserProfile(
    profile
  ) {
    this.userProfile =
      String(
        profile || ""
      );

    await chrome.storage.local.set({
      mutUserProfile:
        this.userProfile,
    });

    return this.userProfile;
  }

  // ===================================================
  // CONVERSATION
  // ===================================================

  async loadConversation() {
    const result =
      await chrome.storage.local.get(
        "mutConversation"
      );

    this.conversation =
      Array.isArray(
        result
          .mutConversation
      )
        ? result
            .mutConversation
        : [];

    return this.conversation;
  }

  async persistConversation() {
    if (
      this.conversation
        .length >
      500
    ) {
      this.conversation =
        this.conversation.slice(
          -500
        );
    }

    await chrome.storage.local.set({
      mutConversation:
        this.conversation,
    });
  }

  async clearConversation() {
    this.conversation =
      [];

    await this.persistConversation();

    await this.emit(
      "conversation_cleared",
      {}
    );
  }

  // ===================================================
  // STATE
  // ===================================================

  async getAgentState() {
    const result =
      await chrome.storage.local.get(
        "mutState"
      );

    return (
      result.mutState ||
      null
    );
  }

  async updateAgentState(
    patch
  ) {
    const result =
      await chrome.storage.local.get(
        "mutState"
      );

    const next = {
      ...(result.mutState ||
        {}),

      ...patch,

      updatedAt:
        Date.now(),
    };

    await chrome.storage.local.set({
      mutState:
        next,
    });

    await this.emit(
      "state",
      next
    );

    return next;
  }

  // ===================================================
  // EVENTS
  // ===================================================

  on(
    event,
    listener
  ) {
    if (
      !this.listeners.has(
        event
      )
    ) {
      this.listeners.set(
        event,
        new Set()
      );
    }

    this.listeners
      .get(event)
      .add(listener);

    return () =>
      this.off(
        event,
        listener
      );
  }

  off(
    event,
    listener
  ) {
    return (
      this.listeners
        .get(event)
        ?.delete(
          listener
        ) ||
      false
    );
  }

  async emit(
    event,
    payload
  ) {
    for (
      const listener of
      this.listeners.get(
        event
      ) ||
      []
    ) {
      try {
        await listener(
          payload
        );
      } catch {
        // ignore
      }
    }
  }

  getState() {
    return {
      running:
        this.running,

      currentTaskId:
        this.currentTaskId,

      conversationLength:
        this.conversation
          .length,

      hasUserProfile:
        Boolean(
          this.userProfile
        ),

      lastObservation:
        this.lastObservation,

      taskLoop:
        this.currentTaskLoop
          ?.getState() ||
        null,
    };
  }
}

export const MOOT =
  new MutAgent();

// =====================================================
// HELPERS
// =====================================================

function createId(
  prefix
) {
  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join("_");
}

function isStopCommand(
  text
) {
  return [
    "стоп",
    "остановись",
    "останови",
    "отмена",
    "stop",
    "cancel",
  ].includes(
    String(
      text || ""
    )
      .trim()
      .toLowerCase()
  );
}

function tryParseJSON(
  value
) {
  if (
    !value ||
    !String(value)
      .trim()
      .startsWith(
        "{"
      )
  ) {
    return null;
  }

  try {
    return JSON.parse(
      value
    );
  } catch {
    return null;
  }
}

function sanitizeToolResult(
  value
) {
  if (!value) {
    return null;
  }

  let clone;

  try {
    clone =
      JSON.parse(
        JSON.stringify(
          value
        )
      );
  } catch {
    return value;
  }

  removeLargeData(
    clone
  );

  return clone;
}

function removeLargeData(
  value,
  depth = 0
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    depth > 10
  ) {
    return;
  }

  for (
    const [
      key,
      child,
    ] of Object.entries(
      value
    )
  ) {
    if (
      typeof child ===
        "string" &&
      child.startsWith(
        "data:image/"
      )
    ) {
      value[key] =
        "[SCREENSHOT_REMOVED]";
    } else if (
      child &&
      typeof child ===
        "object"
    ) {
      removeLargeData(
        child,
        depth + 1
      );
    }
  }
}