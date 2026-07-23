/**
 * modules/orders.module.js
 * ---------------------------------------------------------------
 * Vista "Pedidos y platos". Acceso: admin y mesero.
 *   - Sección de pedidos: crear pedidos por mesa, ver estado de
 *     cada plato (pendiente/preparando/listo) y el total.
 *   - Sección de platos (solo admin): CRUD del catálogo de platos.
 * ---------------------------------------------------------------
 */

const ModuleOrders = (() => {
  // ---------- Pedidos ----------
  function renderOrders() {
    const tbody = document.getElementById("orders-tbody");
    const orders = DB.getCollection("orders");

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-empty">No hay pedidos registrados. Crea uno con "Nuevo pedido".</td></tr>`;
      return;
    }

    tbody.innerHTML = [...orders]
      .reverse()
      .map((o) => {
        const items = o.dishes
          .map(
            (d) => `<span class="qty-chip">${d.quantity}× ${Security.sanitize(Shared.dishName(d.dishId))} ${Shared.badge(Shared.DISH_STATE_LABEL[d.status], d.status)}</span>`
          )
          .join(" ");
        return `
        <tr>
          <td>${Security.sanitize(Shared.tableName(o.tableId))}</td>
          <td>${items}</td>
          <td>${Shared.formatMoney(o.total)}</td>
          <td class="actions">
            <button class="btn btn-sm btn-danger" data-action="delete-order" data-id="${o.id}">Eliminar</button>
          </td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll('[data-action="delete-order"]').forEach((btn) =>
      btn.addEventListener("click", () => deleteOrder(btn.dataset.id))
    );
  }

  async function deleteOrder(id) {
    const ok = await UI.confirmAction("¿Eliminar este pedido?");
    if (!ok) return;
    DB.remove("orders", id);
    UI.toast("Pedido eliminado.", "success");
    renderOrders();
  }

  function openOrderForm() {
    const tables = DB.getCollection("tables");
    const dishes = DB.getCollection("dishes");

    const { overlay } = UI.openModal(`
      <h3>Nuevo pedido</h3>
      <form id="order-form">
        <div class="field">
          <label for="o-table">Mesa</label>
          <select id="o-table">
            ${tables.map((t) => `<option value="${t.id}">${Security.sanitize(t.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Platos</label>
          <div id="o-dishes-list">
            ${dishes
              .map(
                (d) => `
              <div class="qty-chip" style="justify-content:space-between; width:100%; margin-bottom:6px;">
                <span>${Security.sanitize(d.name)} — ${Shared.formatMoney(d.price)}</span>
                <input type="number" min="0" max="30" value="0" data-dish-id="${d.id}" style="width:70px;" />
              </div>`
              )
              .join("")}
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Crear pedido</button>
        </div>
      </form>
    `);

    overlay.querySelector('[data-action="cancel"]').addEventListener("click", UI.closeModal);
    overlay.querySelector("#order-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const tableId = overlay.querySelector("#o-table").value;
      const inputs = overlay.querySelectorAll("[data-dish-id]");
      const chosen = [];
      inputs.forEach((input) => {
        const qty = Number(input.value);
        if (qty > 0) {
          chosen.push({ dishId: input.dataset.dishId, quantity: qty, status: CONFIG.DISH_ORDER_STATES.PENDING, dispatched: false });
        }
      });

      if (chosen.length === 0) {
        UI.toast("Selecciona al menos un plato con cantidad mayor a 0.", "error");
        return;
      }

      const total = Shared.computeOrderTotal(chosen);
      DB.insert("orders", {
        id: Security.generateId(),
        tableId,
        dishes: chosen,
        total,
        createdAt: new Date().toISOString(),
      });
      DB.update("tables", tableId, { state: CONFIG.TABLE_STATES.OCCUPIED });

      UI.toast("Pedido creado.", "success");
      UI.closeModal();
      renderOrders();
    });
  }

  // ---------- Platos (catálogo, solo admin) ----------
  function renderDishes() {
    const tbody = document.getElementById("dishes-tbody");
    const dishes = DB.getCollection("dishes");
    const isAdmin = Router.session.role === CONFIG.ROLES.ADMIN;

    tbody.innerHTML = dishes
      .map(
        (d) => `
      <tr>
        <td>${Security.sanitize(d.name)}</td>
        <td>${Security.sanitize(d.description)}</td>
        <td>${Shared.formatMoney(d.price)}</td>
        <td class="actions">
          ${isAdmin ? `
            <button class="btn btn-sm btn-gold" data-action="edit-dish" data-id="${d.id}">Editar</button>
            <button class="btn btn-sm btn-danger" data-action="delete-dish" data-id="${d.id}">Eliminar</button>
          ` : "—"}
        </td>
      </tr>`
      )
      .join("");

    if (!isAdmin) return;
    tbody.querySelectorAll('[data-action="edit-dish"]').forEach((btn) => btn.addEventListener("click", () => openDishForm(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="delete-dish"]').forEach((btn) => btn.addEventListener("click", () => deleteDish(btn.dataset.id)));
  }

  function openDishForm(id) {
    const isEdit = Boolean(id);
    const dish = isEdit ? DB.findById("dishes", id) : null;

    const { overlay } = UI.openModal(`
      <h3>${isEdit ? "Editar plato" : "Nuevo plato"}</h3>
      <form id="dish-form">
        <div class="field">
          <label for="d-name">Nombre</label>
          <input id="d-name" value="${isEdit ? Security.sanitize(dish.name) : ""}" />
        </div>
        <div class="field">
          <label for="d-desc">Descripción</label>
          <textarea id="d-desc" rows="2">${isEdit ? Security.sanitize(dish.description) : ""}</textarea>
        </div>
        <div class="field">
          <label for="d-price">Precio</label>
          <input id="d-price" type="number" min="0" step="0.5" value="${isEdit ? dish.price : ""}" />
        </div>
        <div class="field">
          <label for="d-image">Imagen (URL, opcional)</label>
          <input id="d-image" value="${isEdit ? Security.sanitize(dish.image || "") : ""}" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Guardar cambios" : "Crear plato"}</button>
        </div>
      </form>
    `);

    overlay.querySelector('[data-action="cancel"]').addEventListener("click", UI.closeModal);
    overlay.querySelector("#dish-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = overlay.querySelector("#d-name").value.trim();
      const description = overlay.querySelector("#d-desc").value.trim();
      const price = Number(overlay.querySelector("#d-price").value);
      const image = overlay.querySelector("#d-image").value.trim();

      if (!name || !description || !price || price <= 0) {
        UI.toast("Completa nombre, descripción y un precio válido.", "error");
        return;
      }

      if (isEdit) {
        DB.update("dishes", id, { name, description, price, image });
        UI.toast("Plato actualizado.", "success");
      } else {
        DB.insert("dishes", { id: Security.generateId(), name, description, price, image });
        UI.toast("Plato creado.", "success");
      }
      UI.closeModal();
      renderDishes();
    });
  }

  async function deleteDish(id) {
    const ok = await UI.confirmAction("¿Eliminar este plato del catálogo?");
    if (!ok) return;
    DB.remove("dishes", id);
    UI.toast("Plato eliminado.", "success");
    renderDishes();
  }

  function render() {
    const isAdmin = Router.session.role === CONFIG.ROLES.ADMIN;
    document.getElementById("dishes-new-btn").classList.toggle("hidden", !isAdmin);
    renderOrders();
    renderDishes();
  }

  function init() {
    document.getElementById("orders-new-btn").addEventListener("click", openOrderForm);
    document.getElementById("dishes-new-btn").addEventListener("click", () => openDishForm(null));
  }

  return { render, init };
})();
