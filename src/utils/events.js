/**
 * MOOT EVENT BUS
 *
 * Общая система событий внутри расширения.
 *
 * Использование:
 *
 * events.on("task:start", callback)
 * events.emit("task:start", data)
 */

export class MutEventBus {
  constructor() {
    this.listeners =
      new Map();

    this.onceListeners =
      new Map();
  }

  // ===================================================
  // ON
  // ===================================================

  on(
    event,
    listener
  ) {
    if (
      !event ||
      typeof listener !==
        "function"
    ) {
      return () => {};
    }

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

    return () => {
      this.off(
        event,
        listener
      );
    };
  }

  // ===================================================
  // ONCE
  // ===================================================

  once(
    event,
    listener
  ) {
    if (
      !event ||
      typeof listener !==
        "function"
    ) {
      return () => {};
    }

    if (
      !this.onceListeners.has(
        event
      )
    ) {
      this.onceListeners.set(
        event,
        new Set()
      );
    }

    this.onceListeners
      .get(event)
      .add(listener);

    return () => {
      this.onceListeners
        .get(event)
        ?.delete(
          listener
        );
    };
  }

  // ===================================================
  // OFF
  // ===================================================

  off(
    event,
    listener
  ) {
    let removed =
      false;

    if (
      this.listeners.has(
        event
      )
    ) {
      removed =
        this.listeners
          .get(event)
          .delete(
            listener
          ) ||
        removed;
    }

    if (
      this.onceListeners.has(
        event
      )
    ) {
      removed =
        this.onceListeners
          .get(event)
          .delete(
            listener
          ) ||
        removed;
    }

    return removed;
  }

  // ===================================================
  // EMIT
  // ===================================================

  async emit(
    event,
    payload = undefined
  ) {
    const regular =
      this.listeners.has(
        event
      )
        ? [
            ...this.listeners.get(
              event
            ),
          ]
        : [];

    const once =
      this.onceListeners.has(
        event
      )
        ? [
            ...this.onceListeners.get(
              event
            ),
          ]
        : [];

    if (
      once.length
    ) {
      this.onceListeners.delete(
        event
      );
    }

    const all = [
      ...regular,
      ...once,
    ];

    const results = [];

    for (
      const listener of
      all
    ) {
      try {
        results.push(
          await listener(
            payload
          )
        );
      } catch (error) {
        results.push({
          error:
            error?.message ||
            String(error),
        });
      }
    }

    return results;
  }

  // ===================================================
  // WAIT FOR
  // ===================================================

  waitFor(
    event,
    {
      timeout = null,
      predicate = null,
    } = {}
  ) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        let timer =
          null;

        const unsubscribe =
          this.on(
            event,
            (payload) => {
              if (
                typeof predicate ===
                  "function" &&
                !predicate(
                  payload
                )
              ) {
                return;
              }

              if (timer) {
                clearTimeout(
                  timer
                );
              }

              unsubscribe();

              resolve(
                payload
              );
            }
          );

        if (
          Number.isFinite(
            timeout
          ) &&
          timeout > 0
        ) {
          timer =
            setTimeout(
              () => {
                unsubscribe();

                reject(
                  new Error(
                    `Timeout waiting for event "${event}".`
                  )
                );
              },
              timeout
            );
        }
      }
    );
  }

  // ===================================================
  // REMOVE
  // ===================================================

  removeAllListeners(
    event = null
  ) {
    if (event) {
      this.listeners.delete(
        event
      );

      this.onceListeners.delete(
        event
      );

      return;
    }

    this.listeners.clear();
    this.onceListeners.clear();
  }

  // ===================================================
  // COUNTS
  // ===================================================

  listenerCount(
    event
  ) {
    return (
      (
        this.listeners.get(
          event
        )?.size ||
        0
      ) +
      (
        this.onceListeners.get(
          event
        )?.size ||
        0
      )
    );
  }
}

// =====================================================
// EVENT NAMES
// =====================================================

export const MOOT_EVENTS =
  Object.freeze({
    APP_READY:
      "app:ready",

    MESSAGE_SENT:
      "message:sent",

    MESSAGE_RECEIVED:
      "message:received",

    TASK_STARTED:
      "task:started",

    TASK_STEP:
      "task:step",

    TASK_COMPLETE:
      "task:complete",

    TASK_ERROR:
      "task:error",

    TASK_STOPPED:
      "task:stopped",

    VOICE_STARTED:
      "voice:started",

    VOICE_STOPPED:
      "voice:stopped",

    PAGE_CHANGED:
      "page:changed",

    SETTINGS_CHANGED:
      "settings:changed",
  });

// =====================================================
// DEFAULT INSTANCE
// =====================================================

export const events =
  new MutEventBus();