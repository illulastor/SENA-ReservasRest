/**
 * storage.js
 * ---------------------------------------------------------------
 * Única puerta de entrada a localStorage para los datos de negocio
 * (usuarios, mesas, reservas, platos, pedidos, despachos).
 *
 * Todo el resto de la aplicación (módulos de vistas, router, auth)
 * debe leer/escribir datos a través de este objeto `DB`, nunca
 * llamando a localStorage directamente. Esto permite:
 *   - Centralizar el objeto reservaRestDB en una sola clave.
 *   - Cambiar el mecanismo de persistencia en el futuro sin tocar
 *     el resto del código.
 * ---------------------------------------------------------------
 */

const DB = (() => {
  /** Lee el objeto completo desde localStorage. */
  function readAll() {
    const raw = localStorage.getItem(CONFIG.DB_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("reservaRestDB corrupto, no se pudo parsear.", e);
      return null;
    }
  }

  /** Escribe el objeto completo a localStorage. */
  function writeAll(data) {
    localStorage.setItem(CONFIG.DB_KEY, JSON.stringify(data));
  }

  /** true si ya existe una base de datos inicializada. */
  function exists() {
    return readAll() !== null;
  }

  /**
   * Inicializa la base de datos con los datos semilla, hasheando
   * las contraseñas por defecto. Se ejecuta una sola vez.
   */
  async function seed() {
    const data = buildSeedData();
    for (const user of data.users) {
      user.passwordHash = await Security.sha256(user.passwordPlainSeed);
      delete user.passwordPlainSeed; // nunca se guarda la contraseña en texto plano
    }
    writeAll(data);
    return data;
  }

  /** Reinicia completamente los datos a los valores de fábrica. */
  async function resetToDemo() {
    return seed();
  }

  // ---- Helpers genéricos de colección ----
  function getCollection(name) {
    const data = readAll();
    return data ? data[name] || [] : [];
  }

  function setCollection(name, items) {
    const data = readAll();
    if (!data) return;
    data[name] = items;
    writeAll(data);
  }

  function findById(name, id) {
    return getCollection(name).find((item) => item.id === id) || null;
  }

  function insert(name, item) {
    const items = getCollection(name);
    items.push(item);
    setCollection(name, items);
    return item;
  }

  function update(name, id, patch) {
    const items = getCollection(name);
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch };
    setCollection(name, items);
    return items[idx];
  }

  function remove(name, id) {
    const items = getCollection(name);
    const filtered = items.filter((item) => item.id !== id);
    setCollection(name, filtered);
    return filtered.length !== items.length;
  }

  return {
    readAll,
    writeAll,
    exists,
    seed,
    resetToDemo,
    getCollection,
    setCollection,
    findById,
    insert,
    update,
    remove,
  };
})();
