/**
 * modules/dispatch.module.js
 * ---------------------------------------------------------------
 * Vista "Despachos". Acceso: admin y despacho.
 *
 * Flujo:
 *   1. Cocina marca platos como "listo" (kitchen.module.js).
 *   2. Aquí aparecen agrupados por mesa los platos listos que aún
 *      no fueron incluidos en ningún despacho (dish.dispatched === false).
 *   3. El usuario selecciona uno o varios y crea un despacho.
 *   4. El despacho avanza: listo para salir → en ruta → entregado.
 * ---------------------------------------------------------------
 */

const ModuleDispatch = (() => {
  function readyUndispatchedByTable() {
    const orders = DB.getCollection("orders");
    const groups = {}; // tableId -> [{orderId, dishIndex, dishId, quantity}]

    orders.forEach((order) => {
      order.dishes.forEach((d, index) => {
        if (d.status === CONFIG.DISH_ORDER_STATES.READY && !d.dispatched) {
          groups[order.tableId] = groups[order.tableId] || [];
          groups[order.tableId].push({ orderId: order.id, dishIndex: index, dishId: d.dishId, quantity: d.quantity });
        }
      });
    });
    return groups;
  }

  function renderPending() {
    const container = document.getElementById("dispatch-pending");
    const groups = readyUndispatchedByTable();
    const tableIds = Object.keys(groups);

    if (tableIds.length === 0) {
      container.innerHTML = `<p class="text-muted">No hay platos listos esperando despacho.</p>`;
      return;
    }

    container.innerHTML = tableIds
      .map((tableId) => {
        const items = groups[tableId];
        return `
        <div class="panel" style="margin-bottom:16px;">
          <div class="panel-header">
            <h4 style="margin:0;">${Security.sanitize(Shared.tableName(tableId))}</h4>
            <button class="btn btn-sm btn-primary" data-action="create-dispatch" data-table="${tableId}">Crear despacho</button>
          </div>
          <ul style="margin:0; padding-left:18px;">
            ${items.map((it) => `<li>${it.quantity}× ${Security.sanitize(Shared.dishName(it.dishId))}</li>`).join("")}
          </ul>
        </div>`;
      })
      .join("");

    container.querySelectorAll('[data-action="create-dispatch"]').forEach((btn) =>
      btn.addEventListener("click", () => createDispatch(btn.dataset.table))
    );
  }

  function createDispatch(tableId) {
    const groups = readyUndispatchedByTable();
    const items = groups[tableId] || [];
    if (items.length === 0) return;

    const orders = DB.getCollection("orders");
    items.forEach((it) => {
      const order = orders.find((o) => o.id === it.orderId);
      if (order) order.dishes[it.dishIndex].dispatched = true;
    });
    DB.setCollection("orders", orders);

    DB.insert("dispatches", {
      id: Security.generateId(),
      orderId: items[0].orderId,
      tableId,
      dishesIds: items.map((it) => it.dishId),
      items,
      status: CONFIG.DISPATCH_STATES.READY,
      createdAt: new Date().toISOString(),
      deliveredAt: null,
    });

    UI.toast("Despacho creado.", "success");
    renderPending();
    renderActive();
  }

  function renderActive() {
    const tbody = document.getElementById("dispatch-tbody");
    const dispatches = [...DB.getCollection("dispatches")].reverse();

    if (dispatches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-empty">No hay despachos registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = dispatches
      .map((d) => {
        const items = (d.items || []).map((it) => `${it.quantity}× ${Security.sanitize(Shared.dishName(it.dishId))}`).join(", ");
        let actionBtn = "";
        if (d.status === CONFIG.DISPATCH_STATES.READY) {
          actionBtn = `<button class="btn btn-sm btn-gold" data-action="advance" data-id="${d.id}">Marcar en ruta</button>`;
        } else if (d.status === CONFIG.DISPATCH_STATES.IN_ROUTE) {
          actionBtn = `<button class="btn btn-sm btn-primary" data-action="advance" data-id="${d.id}">Marcar entregado</button>`;
        } else {
          actionBtn = "—";
        }
        return `
        <tr>
          <td>${Security.sanitize(Shared.tableName(d.tableId))}</td>
          <td>${items}</td>
          <td>${Shared.badge(Shared.DISPATCH_STATE_LABEL[d.status], d.status)}</td>
          <td>${actionBtn}</td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll('[data-action="advance"]').forEach((btn) => btn.addEventListener("click", () => advanceDispatch(btn.dataset.id)));
  }

  function advanceDispatch(id) {
    const dispatch = DB.findById("dispatches", id);
    if (!dispatch) return;

    if (dispatch.status === CONFIG.DISPATCH_STATES.READY) {
      DB.update("dispatches", id, { status: CONFIG.DISPATCH_STATES.IN_ROUTE });
    } else if (dispatch.status === CONFIG.DISPATCH_STATES.IN_ROUTE) {
      DB.update("dispatches", id, { status: CONFIG.DISPATCH_STATES.DELIVERED, deliveredAt: new Date().toISOString() });
    }
    UI.toast("Estado del despacho actualizado.", "success");
    renderActive();
  }

  function render() {
    renderPending();
    renderActive();
  }

  return { render };
})();
