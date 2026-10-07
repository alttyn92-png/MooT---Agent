/**
 * MOOT DATABASE
 *
 * Универсальная обёртка над IndexedDB.
 *
 * Поддерживает:
 * - open
 * - get
 * - getAll
 * - put
 * - add
 * - delete
 * - clear
 * - count
 * - getByIndex
 * - getAllByIndex
 */

import {
  DB_NAME,
  DB_VERSION,
  STORE_DEFINITIONS,
} from "./schema.js";

// =====================================================
// DATABASE CLASS
// =====================================================

export class MutDatabase {
  constructor() {
    this.db =
      null;

    this.openPromise =
      null;
  }

  // ===================================================
  // OPEN
  // ===================================================

  async open() {
    if (this.db) {
      return this.db;
    }

    if (this.openPromise) {
      return this.openPromise;
    }

    this.openPromise =
      new Promise(
        (
          resolve,
          reject
        ) => {
          const request =
            indexedDB.open(
              DB_NAME,
              DB_VERSION
            );

          request.onupgradeneeded =
            (event) => {
              const db =
                event.target
                  .result;

              upgradeDatabase(
                db
              );
            };

          request.onsuccess =
            () => {
              this.db =
                request.result;

              this.db.onversionchange =
                () => {
                  this.db.close();
                  this.db =
                    null;
                };

              resolve(
                this.db
              );
            };

          request.onerror =
            () => {
              this.openPromise =
                null;

              reject(
                request.error ||
                  new Error(
                    "Failed to open MOOT database."
                  )
              );
            };

          request.onblocked =
            () => {
              console.warn(
                "[MOOT DB] Database upgrade blocked by another open tab."
              );
            };
        }
      );

    try {
      return await this.openPromise;
    } finally {
      this.openPromise =
        null;
    }
  }

  // ===================================================
  // TRANSACTION
  // ===================================================

  async transaction(
    storeNames,
    mode = "readonly"
  ) {
    const db =
      await this.open();

    const names =
      Array.isArray(
        storeNames
      )
        ? storeNames
        : [storeNames];

    return db.transaction(
      names,
      mode
    );
  }

  // ===================================================
  // GET
  // ===================================================

  async get(
    storeName,
    key
  ) {
    const transaction =
      await this.transaction(
        storeName,
        "readonly"
      );

    const store =
      transaction.objectStore(
        storeName
      );

    return requestToPromise(
      store.get(key)
    );
  }

  // ===================================================
  // GET ALL
  // ===================================================

  async getAll(
    storeName
  ) {
    const transaction =
      await this.transaction(
        storeName,
        "readonly"
      );

    const store =
      transaction.objectStore(
        storeName
      );

    return requestToPromise(
      store.getAll()
    );
  }

  // ===================================================
  // PUT
  // ===================================================

  async put(
    storeName,
    value
  ) {
    const transaction =
      await this.transaction(
        storeName,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        storeName
      );

    const request =
      store.put(
        value
      );

    await requestToPromise(
      request
    );

    await transactionToPromise(
      transaction
    );

    return value;
  }

  // ===================================================
  // ADD
  // ===================================================

  async add(
    storeName,
    value
  ) {
    const transaction =
      await this.transaction(
        storeName,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        storeName
      );

    const request =
      store.add(
        value
      );

    await requestToPromise(
      request
    );

    await transactionToPromise(
      transaction
    );

    return value;
  }

  // ===================================================
  // DELETE
  // ===================================================

  async delete(
    storeName,
    key
  ) {
    const transaction =
      await this.transaction(
        storeName,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        storeName
      );

    await requestToPromise(
      store.delete(
        key
      )
    );

    await transactionToPromise(
      transaction
    );

    return true;
  }

  // ===================================================
  // CLEAR
  // ===================================================

  async clear(
    storeName
  ) {
    const transaction =
      await this.transaction(
        storeName,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        storeName
      );

    await requestToPromise(
      store.clear()
    );

    await transactionToPromise(
      transaction
    );

    return true;
  }

  // ===================================================
  // COUNT
  // ===================================================

  async count(
    storeName
  ) {
    const transaction =
      await this.transaction(
        storeName,
        "readonly"
      );

    const store =
      transaction.objectStore(
        storeName
      );

    return requestToPromise(
      store.count()
    );
  }

  // ===================================================
  // GET BY INDEX
  // ===================================================

  async getByIndex(
    storeName,
    indexName,
    value
  ) {
    const transaction =
      await this.transaction(
        storeName,
        "readonly"
      );

    const store =
      transaction.objectStore(
        storeName
      );

    const index =
      store.index(
        indexName
      );

    return requestToPromise(
      index.get(
        value
      )
    );
  }

  // ===================================================
  // GET ALL BY INDEX
  // ===================================================

  async getAllByIndex(
    storeName,
    indexName,
    value
  ) {
    const transaction =
      await this.transaction(
        storeName,
        "readonly"
      );

    const store =
      transaction.objectStore(
        storeName
      );

    const index =
      store.index(
        indexName
      );

    return requestToPromise(
      index.getAll(
        value
      )
    );
  }

  // ===================================================
  // GET ALL SORTED
  // ===================================================

  async getAllSorted(
    storeName,
    field,
    direction = "desc"
  ) {
    const items =
      await this.getAll(
        storeName
      );

    const multiplier =
      direction ===
      "asc"
        ? 1
        : -1;

    return items.sort(
      (a, b) => {
        const av =
          a?.[field] ?? 0;

        const bv =
          b?.[field] ?? 0;

        if (
          av === bv
        ) {
          return 0;
        }

        return av >
          bv
          ? multiplier
          : -multiplier;
      }
    );
  }

  // ===================================================
  // UPSERT MANY
  // ===================================================

  async putMany(
    storeName,
    values = []
  ) {
    if (
      !Array.isArray(values)
    ) {
      throw new Error(
        "putMany requires an array."
      );
    }

    const transaction =
      await this.transaction(
        storeName,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        storeName
      );

    for (
      const value of
      values
    ) {
      store.put(
        value
      );
    }

    await transactionToPromise(
      transaction
    );

    return values;
  }

  // ===================================================
  // CLOSE
  // ===================================================

  close() {
    if (
      this.db
    ) {
      this.db.close();
      this.db =
        null;
    }
  }

  // ===================================================
  // DELETE DATABASE
  // ===================================================

  async destroy() {
    this.close();

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const request =
          indexedDB.deleteDatabase(
            DB_NAME
          );

        request.onsuccess =
          () => {
            resolve(true);
          };

        request.onerror =
          () => {
            reject(
              request.error ||
                new Error(
                  "Failed to delete MOOT database."
                )
            );
          };

        request.onblocked =
          () => {
            console.warn(
              "[MOOT DB] Delete blocked by an open connection."
            );
          };
      }
    );
  }
}

// =====================================================
// UPGRADE
// =====================================================

function upgradeDatabase(
  db
) {
  for (
    const [
      storeName,
      definition,
    ] of Object.entries(
      STORE_DEFINITIONS
    )
  ) {
    let store;

    if (
      !db.objectStoreNames.contains(
        storeName
      )
    ) {
      store =
        db.createObjectStore(
          storeName,
          {
            keyPath:
              definition.keyPath,

            autoIncrement:
              definition.autoIncrement,
          }
        );
    } else {
      // При версии 1 этот блок обычно не понадобится.
      // Оставлен для будущих миграций.
      continue;
    }

    for (
      const indexDefinition of
      definition.indexes
    ) {
      store.createIndex(
        indexDefinition.name,
        indexDefinition.keyPath,
        indexDefinition.options
      );
    }
  }
}

// =====================================================
// REQUEST -> PROMISE
// =====================================================

function requestToPromise(
  request
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };

      request.onerror =
        () => {
          reject(
            request.error ||
              new Error(
                "IndexedDB request failed."
              )
          );
        };
    }
  );
}

// =====================================================
// TRANSACTION -> PROMISE
// =====================================================

function transactionToPromise(
  transaction
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      transaction.oncomplete =
        () => {
          resolve(true);
        };

      transaction.onerror =
        () => {
          reject(
            transaction.error ||
              new Error(
                "IndexedDB transaction failed."
              )
          );
        };

      transaction.onabort =
        () => {
          reject(
            transaction.error ||
              new Error(
                "IndexedDB transaction aborted."
              )
          );
        };
    }
  );
}

// =====================================================
// DEFAULT INSTANCE
// =====================================================

export const database =
  new MutDatabase();