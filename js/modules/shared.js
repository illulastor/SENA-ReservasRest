/**
 * modules/shared.js
 * ---------------------------------------------------------------
 * Funciones auxiliares usadas por varios módulos de vista
 * (mesas, reservas, pedidos, cocina, despachos, estadísticas).
 * No maneja su propia vista: solo cálculos y formateo.
 * ---------------------------------------------------------------
 */

const Shared = (() => {
  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function formatMoney(amount) {
    return `$${Number(amount || 0).toFixed(2)}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  /** Busca el pedido más reciente asociado a una mesa. */
  function latestOrderForTable(tableId) {
    const orders = DB.getCollection("orders").filter((o) => o.tableId === tableId);
    if (orders.length === 0) return null;
    return orders.reduce((latest, o) => (new Date(o.createdAt) > new Date(latest.createdAt) ? o : latest));
  }

  function dishName(dishId) {
    const dish = DB.findById("dishes", dishId);
    return dish ? dish.name : "Plato eliminado";
  }

  function dishPrice(dishId) {
    const dish = DB.findById("dishes", dishId);
    return dish ? dish.price : 0;
  }

  function tableName(tableId) {
    const table = DB.findById("tables", tableId);
    return table ? table.name : "Mesa eliminada";
  }

  function badge(text, cssState) {
    return `<span class="badge badge-${cssState}">${Security.sanitize(text)}</span>`;
  }

  const TABLE_STATE_LABEL = { available: "Disponible", reserved: "Reservada", occupied: "Ocupada" };
  const TABLE_STATE_CSS = { available: "disponible", reserved: "reservada", occupied: "ocupada" };

  const DISH_STATE_LABEL = { pending: "Pendiente", preparing: "Preparando", ready: "Listo" };
  const DISPATCH_STATE_LABEL = { ready: "Listo para salir", in_route: "En ruta", delivered: "Entregado" };

  /** Calcula el total en dinero de un pedido según sus platos y cantidades. */
  function computeOrderTotal(orderDishes) {
    return orderDishes.reduce((sum, d) => sum + dishPrice(d.dishId) * d.quantity, 0);
  }

  /**
   * Recorre reservas para marcar automáticamente como "ocupada" la
   * mesa cuya reserva ya llegó a su fecha/hora (simulación simple
   * basada en la hora local del navegador).
   */
  function applyReservationTimeIntelligence() {
    const now = new Date();
    const reservations = DB.getCollection("reservations");
    const tables = DB.getCollection("tables");
    let changed = false;

    reservations.forEach((res) => {
      const table = tables.find((t) => t.id === res.tableId);
      if (!table || table.state !== CONFIG.TABLE_STATES.RESERVED) return;
      const resDateTime = new Date(`${res.date}T${res.time}`);
      if (now >= resDateTime) {
        table.state = CONFIG.TABLE_STATES.OCCUPIED;
        changed = true;
      }
    });

    if (changed) DB.setCollection("tables", tables);
  }

  /** Ordena reservas por cercanía a su fecha/hora (las más próximas primero). */
  function sortReservationsByProximity(reservations) {
    return [...reservations].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  }

  return {
    todayISO,
    formatMoney,
    formatDate,
    latestOrderForTable,
    dishName,
    dishPrice,
    tableName,
    badge,
    TABLE_STATE_LABEL,
    TABLE_STATE_CSS,
    DISH_STATE_LABEL,
    DISPATCH_STATE_LABEL,
    computeOrderTotal,
    applyReservationTimeIntelligence,
    sortReservationsByProximity,
  };
})();
