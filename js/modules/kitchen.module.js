/**
 * modules/kitchen.module.js
 * ---------------------------------------------------------------
 * Vista "Cocina". Acceso: admin y cocina.
 * Muestra los platos de pedidos activos que están "pendiente" o
 * "preparando". Al marcar un plato como "listo", desaparece de
 * esta vista y queda disponible para el módulo de Despachos.
 * ---------------------------------------------------------------
 */

const ModuleKitchen = (() => {
  function renderList() {
    const container = document.getElementById("kitchen-list");
    const orders = DB.getCollection("orders");

    const pendingItems = [];
    orders.forEach((order) => {
      order.dishes.forEach((d, index) => {
        if (d.status !== CONFIG.DISH_ORDER_STATES.READY) {
          pendingItems.push({ order, dish: d, index });
        }
      });
    });

    if (pendingItems.length === 0) {
      container.innerHTML = `<p class="text-muted">No hay platos pendientes por preparar. 🎉</p>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Mesa</th><th>Plato</th><th>Cantidad</th><th>Estado</th><th>Acción</th></tr>
          </thead>
          <tbody>
            ${pendingItems
              .map(
                ({ order, dish, index }) => `
              <tr>
                <td>${Security.sanitize(Shared.tableName(order.tableId))}</td>
                <td>${Security.sanitize(Shared.dishName(dish.dishId))}</td>
                <td>${dish.quantity}</td>
                <td>${Shared.badge(Shared.DISH_STATE_LABEL[dish.status], dish.status)}</td>
                <td>
                  ${dish.status === CONFIG.DISH_ORDER_STATES.PENDING
                    ? `<button class="btn btn-sm btn-gold" data-action="advance" data-order="${order.id}" data-index="${index}">Marcar preparando</button>`
                    : `<button class="btn btn-sm btn-primary" data-action="advance" data-order="${order.id}" data-index="${index}">Marcar listo</button>`}
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll('[data-action="advance"]').forEach((btn) =>
      btn.addEventListener("click", () => advanceDish(btn.dataset.order, Number(btn.dataset.index)))
    );
  }

  function advanceDish(orderId, dishIndex) {
    const order = DB.findById("orders", orderId);
    if (!order) return;
    const dish = order.dishes[dishIndex];
    if (!dish) return;

    if (dish.status === CONFIG.DISH_ORDER_STATES.PENDING) {
      dish.status = CONFIG.DISH_ORDER_STATES.PREPARING;
    } else if (dish.status === CONFIG.DISH_ORDER_STATES.PREPARING) {
      dish.status = CONFIG.DISH_ORDER_STATES.READY;
    }
    DB.update("orders", orderId, { dishes: order.dishes });
    UI.toast("Estado del plato actualizado.", "success");
    renderList();
  }

  function render() {
    renderList();
  }

  return { render };
})();
