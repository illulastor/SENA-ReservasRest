/**
 * modules/dashboard.module.js
 * ---------------------------------------------------------------
 * Vista "Inicio": tarjetas de estadísticas (según rol), grilla
 * visual de mesas y tabla de reservas activas.
 * Acceso: todos los roles (el contenido varía).
 * ---------------------------------------------------------------
 */

const ModuleDashboard = (() => {
  function computeStats(role) {
    const today = Shared.todayISO();
    const reservations = DB.getCollection("reservations");
    const tables = DB.getCollection("tables");
    const orders = DB.getCollection("orders");
    const dispatches = DB.getCollection("dispatches");
    const users = DB.getCollection("users");

    const reservasHoy = reservations.filter((r) => r.date === today).length;
    const mesasOcupadas = tables.filter((t) => t.state === CONFIG.TABLE_STATES.OCCUPIED).length;
    const platosPendientes = orders.reduce(
      (sum, o) => sum + o.dishes.filter((d) => d.status === CONFIG.DISH_ORDER_STATES.PENDING).length,
      0
    );
    const platosPreparando = orders.reduce(
      (sum, o) => sum + o.dishes.filter((d) => d.status === CONFIG.DISH_ORDER_STATES.PREPARING).length,
      0
    );
    const despachosActivos = dispatches.filter((d) => d.status !== CONFIG.DISPATCH_STATES.DELIVERED).length;
    const entregasHoy = dispatches.filter(
      (d) => d.status === CONFIG.DISPATCH_STATES.DELIVERED && (d.deliveredAt || "").slice(0, 10) === today
    ).length;
    const ingresosHoy = orders
      .filter((o) => (o.createdAt || "").slice(0, 10) === today)
      .reduce((sum, o) => sum + o.total, 0);

    const byRole = {
      admin: [
        { label: "Reservas del día", value: reservasHoy },
        { label: "Platos pendientes", value: platosPendientes },
        { label: "Despachos activos", value: despachosActivos },
        { label: "Mesas ocupadas", value: `${mesasOcupadas}/${tables.length}` },
        { label: "Usuarios totales", value: users.length },
        { label: "Ingresos del día (estimado)", value: Shared.formatMoney(ingresosHoy) },
      ],
      mesero: [
        { label: "Reservas del día", value: reservasHoy },
        { label: "Mesas ocupadas", value: `${mesasOcupadas}/${tables.length}` },
        { label: "Pedidos activos", value: orders.length },
      ],
      cocina: [
        { label: "Platos pendientes", value: platosPendientes },
        { label: "Platos en preparación", value: platosPreparando },
      ],
      despacho: [
        { label: "Despachos activos", value: despachosActivos },
        { label: "Entregas del día", value: entregasHoy },
      ],
    };

    return byRole[role] || [];
  }

  function renderStats(role) {
    const grid = document.getElementById("stats-grid");
    grid.innerHTML = computeStats(role)
      .map(
        (s) => `
      <div class="stat-card">
        <div class="stat-value">${Security.sanitize(s.value)}</div>
        <div class="stat-label">${Security.sanitize(s.label)}</div>
      </div>`
      )
      .join("");
  }

  function renderTablesGrid() {
    const grid = document.getElementById("home-tables-grid");
    const tables = DB.getCollection("tables");
    grid.innerHTML = tables
      .map((t) => {
        const cssState = { available: "available", reserved: "reserved", occupied: "occupied" }[t.state];
        return `
        <button class="table-tile state-${cssState}" data-table-id="${t.id}">
          <span>${Security.sanitize(t.name)}</span>
          <small>${Shared.TABLE_STATE_LABEL[t.state]}</small>
        </button>`;
      })
      .join("");

    grid.querySelectorAll(".table-tile").forEach((btn) => {
      btn.addEventListener("click", () => showTableInfo(btn.dataset.tableId));
    });
  }

  function showTableInfo(tableId) {
    const table = DB.findById("tables", tableId);
    if (!table) return;
    const order = Shared.latestOrderForTable(tableId);
    const reservation = DB.getCollection("reservations").find((r) => r.tableId === tableId);

    let extra = "";
    if (reservation) {
      extra += `<p><strong>Reserva:</strong> ${Security.sanitize(reservation.clientName)} · ${Shared.formatDate(reservation.date)} ${Security.sanitize(reservation.time)} · ${reservation.people} personas</p>`;
    }
    if (order) {
      const items = order.dishes.map((d) => `${d.quantity}× ${Security.sanitize(Shared.dishName(d.dishId))}`).join(", ");
      extra += `<p><strong>Pedido actual:</strong> ${items} — Total: ${Shared.formatMoney(order.total)}</p>`;
    }
    if (!extra) extra = "<p class='text-muted'>Sin reservas ni pedidos asociados actualmente.</p>";

    UI.openModal(`
      <h3>${Security.sanitize(table.name)}</h3>
      <p><strong>Zona:</strong> ${Security.sanitize(table.zone)} · <strong>Capacidad:</strong> ${table.capacity} personas</p>
      <p><strong>Estado:</strong> ${Shared.badge(Shared.TABLE_STATE_LABEL[table.state], Shared.TABLE_STATE_CSS[table.state])}</p>
      ${extra}
      <div class="modal-actions">
        <button class="btn btn-outline" data-action="close">Cerrar</button>
      </div>
    `).overlay.querySelector('[data-action="close"]').addEventListener("click", UI.closeModal);
  }

  function renderReservationsTable() {
    const tbody = document.getElementById("home-reservations-tbody");
    const reservations = Shared.sortReservationsByProximity(DB.getCollection("reservations"));

    if (reservations.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No hay reservas registradas todavía.</td></tr>`;
      return;
    }

    tbody.innerHTML = reservations
      .slice(0, 10)
      .map((r) => {
        const order = Shared.latestOrderForTable(r.tableId);
        const platos = order ? order.dishes.map((d) => `${d.quantity}× ${Security.sanitize(Shared.dishName(d.dishId))}`).join(", ") : "—";
        const precio = order ? Shared.formatMoney(order.total) : "—";
        return `
        <tr>
          <td>${Security.sanitize(r.clientName)}</td>
          <td>${Security.sanitize(Shared.tableName(r.tableId))}</td>
          <td>${Shared.formatDate(r.date)} ${Security.sanitize(r.time)}</td>
          <td>${r.people}</td>
          <td>${platos}</td>
          <td>${precio}</td>
        </tr>`;
      })
      .join("");
  }

  function render(session) {
    Shared.applyReservationTimeIntelligence();
    renderStats(session.role);
    renderTablesGrid();
    renderReservationsTable();
  }

  return { render };
})();
