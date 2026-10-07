/**
 * MOOT MEMORY MANAGER
 *
 * Управляет долговременной памятью MOOT.
 *
 * Типы памяти:
 * - profile
 * - preference
 * - fact
 * - instruction
 * - project
 * - general
 *
 * Память хранится локально в IndexedDB.
 */

import {
  database,
} from "../database/database.js";

import {
  STORES,
  createMemory,
} from "../database/schema.js";

// =====================================================
// MEMORY TYPES
// =====================================================

export const MEMORY_TYPES =
  Object.freeze({
    PROFILE:
      "profile",

    PREFERENCE:
      "preference",

    FACT:
      "fact",

    INSTRUCTION:
      "instruction",

    PROJECT:
      "project",

    GENERAL:
      "general",
  });

// =====================================================
// ADD MEMORY
// =====================================================

export async function addMemory({
  type =
    MEMORY_TYPES.GENERAL,

  key = null,

  value = null,

  source = "user",
} = {}) {
  const memory =
    createMemory({
      type,
      key,
      value,
      source,
    });

  await database.add(
    STORES.MEMORIES,
    memory
  );

  return memory;
}

// =====================================================
// GET MEMORY
// =====================================================

export async function getMemory(
  memoryId
) {
  if (!memoryId) {
    throw new Error(
      "getMemory requires memoryId."
    );
  }

  return database.get(
    STORES.MEMORIES,
    memoryId
  );
}

// =====================================================
// GET ALL MEMORIES
// =====================================================

export async function getAllMemories({
  direction = "desc",
} = {}) {
  return database.getAllSorted(
    STORES.MEMORIES,
    "updatedAt",
    direction
  );
}

// =====================================================
// GET BY TYPE
// =====================================================

export async function getMemoriesByType(
  type
) {
  return database.getAllByIndex(
    STORES.MEMORIES,
    "type",
    type
  );
}

// =====================================================
// FIND BY KEY
// =====================================================

export async function findMemoryByKey(
  key
) {
  if (!key) {
    return null;
  }

  const memories =
    await getAllMemories();

  const normalized =
    normalizeKey(
      key
    );

  return (
    memories.find(
      (memory) =>
        normalizeKey(
          memory.key
        ) ===
        normalized
    ) ||
    null
  );
}

// =====================================================
// UPSERT BY KEY
// =====================================================

export async function remember({
  type =
    MEMORY_TYPES.GENERAL,

  key,

  value,

  source = "user",
} = {}) {
  if (!key) {
    return addMemory({
      type,
      key: null,
      value,
      source,
    });
  }

  const existing =
    await findMemoryByKey(
      key
    );

  if (!existing) {
    return addMemory({
      type,
      key,
      value,
      source,
    });
  }

  const updated = {
    ...existing,

    type:
      type ||
      existing.type,

    value,

    source,

    updatedAt:
      Date.now(),
  };

  await database.put(
    STORES.MEMORIES,
    updated
  );

  return updated;
}

// =====================================================
// UPDATE
// =====================================================

export async function updateMemory(
  memoryId,
  patch = {}
) {
  const memory =
    await getMemory(
      memoryId
    );

  if (!memory) {
    throw new Error(
      `Memory not found: ${memoryId}`
    );
  }

  const updated = {
    ...memory,
    ...patch,

    id:
      memory.id,

    updatedAt:
      Date.now(),
  };

  await database.put(
    STORES.MEMORIES,
    updated
  );

  return updated;
}

// =====================================================
// DELETE
// =====================================================

export async function deleteMemory(
  memoryId
) {
  await database.delete(
    STORES.MEMORIES,
    memoryId
  );

  return {
    deleted: true,
    memoryId,
  };
}

// =====================================================
// CLEAR ALL
// =====================================================

export async function clearAllMemories() {
  await database.clear(
    STORES.MEMORIES
  );

  return {
    cleared: true,
  };
}

// =====================================================
// BUILD MEMORY CONTEXT
// =====================================================

export async function buildMemoryContext({
  includeTypes = null,
  maxItems = 100,
} = {}) {
  let memories =
    await getAllMemories({
      direction: "asc",
    });

  if (
    Array.isArray(
      includeTypes
    ) &&
    includeTypes.length
  ) {
    memories =
      memories.filter(
        (memory) =>
          includeTypes.includes(
            memory.type
          )
      );
  }

  memories =
    memories.slice(
      -Math.max(
        1,
        maxItems
      )
    );

  if (!memories.length) {
    return "";
  }

  const grouped =
    groupByType(
      memories
    );

  const sections = [];

  for (
    const [
      type,
      items,
    ] of Object.entries(
      grouped
    )
  ) {
    const lines =
      items.map(
        (memory) => {
          const key =
            memory.key
              ? `${memory.key}: `
              : "";

          return `- ${key}${formatValue(
            memory.value
          )}`;
        }
      );

    sections.push(
      [
        type.toUpperCase(),
        ...lines,
      ].join("\n")
    );
  }

  return sections
    .join("\n\n")
    .trim();
}

// =====================================================
// PROFILE AS TEXT
// =====================================================

export async function buildProfileText() {
  const profile =
    await getMemoriesByType(
      MEMORY_TYPES.PROFILE
    );

  const preferences =
    await getMemoriesByType(
      MEMORY_TYPES.PREFERENCE
    );

  const instructions =
    await getMemoriesByType(
      MEMORY_TYPES.INSTRUCTION
    );

  const all = [
    ...profile,
    ...preferences,
    ...instructions,
  ];

  if (!all.length) {
    return "";
  }

  return all
    .map(
      (memory) => {
        const key =
          memory.key
            ? `${memory.key}: `
            : "";

        return `${key}${formatValue(
          memory.value
        )}`;
      }
    )
    .join("\n");
}

// =====================================================
// IMPORT TEXT PROFILE
// =====================================================

export async function importProfileText(
  text
) {
  const content =
    String(
      text || ""
    ).trim();

  if (!content) {
    return {
      imported: 0,
    };
  }

  const lines =
    content
      .split(/\r?\n/)
      .map(
        (line) =>
          line.trim()
      )
      .filter(Boolean);

  let imported = 0;

  for (
    const line of
    lines
  ) {
    if (
      line.startsWith(
        "#"
      )
    ) {
      continue;
    }

    const separator =
      line.indexOf(":");

    if (
      separator > 0
    ) {
      const key =
        line
          .slice(
            0,
            separator
          )
          .trim();

      const value =
        line
          .slice(
            separator + 1
          )
          .trim();

      if (
        key &&
        value
      ) {
        await remember({
          type:
            MEMORY_TYPES.PROFILE,

          key,
          value,

          source:
            "profile_file",
        });

        imported += 1;
      }

      continue;
    }

    await addMemory({
      type:
        MEMORY_TYPES.PROFILE,

      value:
        line,

      source:
        "profile_file",
    });

    imported += 1;
  }

  return {
    imported,
  };
}

// =====================================================
// HELPERS
// =====================================================

function normalizeKey(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

function groupByType(
  memories
) {
  const groups = {};

  for (
    const memory of
    memories
  ) {
    const type =
      memory.type ||
      MEMORY_TYPES.GENERAL;

    if (!groups[type]) {
      groups[type] = [];
    }

    groups[type].push(
      memory
    );
  }

  return groups;
}

function formatValue(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  try {
    return JSON.stringify(
      value
    );
  } catch {
    return String(value);
  }
}