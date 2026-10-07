/**
 * MOOT SIDEPANEL ENTRY
 *
 * Точка входа боковой панели.
 */

import {
  MutApp,
} from "./app.js";

// =====================================================
// BOOT
// =====================================================

async function boot() {
  const root =
    document.getElementById(
      "app"
    );

  if (!root) {
    throw new Error(
      "MOOT root element #app was not found."
    );
  }

  const app =
    new MutApp(root);

  window.MOOTApp =
    app;

  try {
    await app.initialize();
  } catch (error) {
    console.error(
      "[MOOT UI] Initialization failed:",
      error
    );

    root.innerHTML = `
      <div class="mut-fatal-error">
        <div class="mut-fatal-error__logo">
          M
        </div>

        <h1>
          MOOT не запустился
        </h1>

        <p>
          ${
            escapeHTML(
              error?.message ||
              String(error)
            )
          }
        </p>

        <button
          id="mut-reload-button"
          type="button"
        >
          Перезапустить
        </button>
      </div>
    `;

    document
      .getElementById(
        "mut-reload-button"
      )
      ?.addEventListener(
        "click",
        () => {
          location.reload();
        }
      );
  }
}

// =====================================================
// ESCAPE
// =====================================================

function escapeHTML(
  value
) {
  return String(
    value || ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

// =====================================================
// START
// =====================================================

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    boot,
    {
      once: true,
    }
  );
} else {
  boot();
}