/**
 * config.js
 * ---------------------------------------------------------------
 * Constantes de toda la aplicación y datos "semilla" que se cargan
 * la primera vez que se abre el sistema (localStorage vacío).
 *
 * No contiene lógica de negocio: solo valores. Cualquier otro
 * módulo puede leer de aquí, pero este archivo no debe importar
 * (usar) a nadie más.
 * ---------------------------------------------------------------
 */

const CONFIG = {
  // Clave única bajo la que se guarda TODO el "objeto base de datos"
  DB_KEY: "reservaRestDB",

  // Clave de la sesión activa (ver session.js)
  SESSION_KEY: "reservaRestSession",

  // "Pimienta" (pepper) usada solo para dificultar la lectura directa
  // de la firma de sesión en el cliente. NOTA: en una app real esta
  // verificación de integridad se hace en el servidor; aquí es una
  // capa adicional de defensa, no una garantía criptográfica, porque
  // todo el código corre en el navegador del usuario.
  SESSION_PEPPER: "reserva-rest-vineria-2026",

  // Duración de la sesión en milisegundos (8 horas)
  SESSION_DURATION_MS: 8 * 60 * 60 * 1000,

  ROLES: {
    ADMIN: "admin",
    MESERO: "mesero",
    COCINA: "cocina",
    DESPACHO: "despacho",
  },

  TABLE_STATES: {
    AVAILABLE: "available",
    RESERVED: "reserved",
    OCCUPIED: "occupied",
  },

  DISH_ORDER_STATES: {
    PENDING: "pending",
    PREPARING: "preparing",
    READY: "ready",
  },

  DISPATCH_STATES: {
    READY: "ready",
    IN_ROUTE: "in_route",
    DELIVERED: "delivered",
  },
};

/**
 * Estructura inicial de la base de datos (localStorage).
 * IMPORTANTE: los passwordHash reales se calculan de forma asíncrona
 * en bootstrap.js con SubtleCrypto (SHA-256) la primera vez que se
 * ejecuta la app, porque hashear requiere await y este archivo debe
 * mantenerse como datos planos.
 */
function buildSeedData() {
  return {
    users: [
      { id: "1", username: "admin", passwordPlainSeed: "admin123", passwordHash: null, role: CONFIG.ROLES.ADMIN },
      { id: "2", username: "mesero", passwordPlainSeed: "mesero123", passwordHash: null, role: CONFIG.ROLES.MESERO },
      { id: "3", username: "cocina", passwordPlainSeed: "cocina123", passwordHash: null, role: CONFIG.ROLES.COCINA },
      { id: "4", username: "despacho", passwordPlainSeed: "despacho123", passwordHash: null, role: CONFIG.ROLES.DESPACHO },
    ],
    tables: Array.from({ length: 8 }, (_, i) => ({
      id: String(i + 1),
      name: `Mesa ${i + 1}`,
      capacity: [2, 4, 4, 6, 2, 4, 8, 4][i],
      zone: ["Terraza", "Salón principal", "Salón principal", "Bodega", "Terraza", "Barra", "Salón VIP", "Salón principal"][i],
      state: CONFIG.TABLE_STATES.AVAILABLE,
    })),
    reservations: [],
    dishes: [
      { id: "1", name: "Vino Tinto Reserva", description: "Copa de vino tinto de la casa, cuerpo medio.", price: 15.5, image: "" },
      { id: "2", name: "Vino Blanco Sauvignon", description: "Copa de vino blanco fresco y afrutado.", price: 14.0, image: "" },
      { id: "3", name: "Tabla de Quesos", description: "Selección de quesos curados con miel y nueces.", price: 22.0, image: "" },
      { id: "4", name: "Jamón Ibérico", description: "Finas lonchas de jamón ibérico de bellota.", price: 26.0, image: "" },
      { id: "5", name: "Croquetas de Jamón", description: "6 unidades, cremosas, receta de la casa.", price: 9.5, image: "" },
      { id: "6", name: "Pulpo a la Brasa", description: "Pulpo a la brasa con puré de papa y pimentón.", price: 24.0, image: "" },
      { id: "7", name: "Risotto de Hongos", description: "Risotto cremoso con hongos silvestres.", price: 18.0, image: "" },
      { id: "8", name: "Tarta de Queso al Vino", description: "Postre de la casa con reducción de vino tinto.", price: 8.5, image: "" },
    ],
    orders: [],
    dispatches: [],
  };
}
