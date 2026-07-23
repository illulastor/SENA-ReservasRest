/**
 * modules/tables.module.js
 * ---------------------------------------------------------------
 * Vista "Mesas". Acceso: admin (CRUD completo) y mesero (solo
 * lectura, ya lo maneja la vista de Inicio/Reservas; esta vista de
 * gestión completa queda reservada a admin según el rol en el
 * router, pero se deja la lectura disponible si un mesero entra
 * porque el router ya filtra el menú).
 * ---------------------------------------------------------------
 */

const ModuleTables = (() => {
  function nextTableName() {
    const tables = DB.getCollection("tables");
    const numbers = tables.map((t) => parseInt((t.name.match(/\d+/) || ["0"])[0], 10));
    const next = numbers.length ? Math.max(...numbers) + 1 : 1;
    return `Mesa ${next}`;
  }

  function renderTable() {
    const tbody = document.getElementById("tables-tbody");
    const tables = DB.getCollection("tables");
    const isAdmin = Router.session.role === CONFIG.ROLES.ADMIN;

    if (tables.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No hay mesas registradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = tables
      .map(
        (t) => `
      <tr>
        <td>${Security.sanitize(t.id)}</td>
        <td>${Security.sanitize(t.name)}</td>
        <td>${t.capacity}</td>
        <td>${Security.sanitize(t.zone)}</td>
        <td>${Shared.badge(Shared.TABLE_STATE_LABEL[t.state], Shared.TABLE_STATE_CSS[t.state])}</td>
        <td class="actions">
          ${isAdmin ? `
            <button class="btn btn-sm btn-outline" data-action="toggle" data-id="${t.id}">Cambiar estado</button>
            <button class="btn btn-sm btn-gold" data-action="edit" data-id="${t.id}">Editar</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${t.id}">Eliminar</button>
          ` : "—"}
        </td>
      </tr>`
      )
      .join("");

    if (!isAdmin) return;

    tbody.querySelectorAll('[data-action="toggle"]').forEach((btn) => btn.addEventListener("click", () => toggleState(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => btn.addEventListener("click", () => openForm(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => btn.addEventListener("click", () => deleteTable(btn.dataset.id)));
  }

  function toggleState(id) {
    const table = DB.findById("tables", id);
    if (!table) return;
    if (table.state === CONFIG.TABLE_STATES.RESERVED) {
      UI.toast("Esta mesa tiene una reserva activa; no se puede cambiar manualmente.", "warning");
      return;
    }
    const next = table.state === CONFIG.TABLE_STATES.AVAILABLE ? CONFIG.TABLE_STATES.OCCUPIED : CONFIG.TABLE_STATES.AVAILABLE;
    DB.update("tables", id, { state: next });
    UI.toast("Estado de la mesa actualizado.", "success");
    renderTable();
  }

  function openForm(id) {
    const isEdit = Boolean(id);
    const table = isEdit ? DB.findById("tables", id) : null;

    const { overlay } = UI.openModal(`
      <h3>${isEdit ? "Editar mesa" : "Nueva mesa"}</h3>
      <form id="table-form">
        <div class="field">
          <label for="t-name">Nombre</label>
          <input id="t-name" value="${isEdit ? Security.sanitize(table.name) : Security.sanitize(nextTableName())}" ${isEdit ? "" : "readonly"} />
        </div>
        <div class="field">
          <label for="t-capacity">Capacidad</label>
          <input id="t-capacity" type="number" min="1" max="20" value="${isEdit ? table.capacity : 4}" />
        </div>
        <div class="field">
          <label for="t-zone">Zona</label>
          <input id="t-zone" value="${isEdit ? Security.sanitize(table.zone) : "Salón principal"}" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Guardar cambios" : "Crear mesa"}</button>
        </div>
      </form>
    `);

    overlay.querySelector('[data-action="cancel"]').addEventListener("click", UI.closeModal);
    overlay.querySelector("#table-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = overlay.querySelector("#t-name").value.trim();
      const capacity = Number(overlay.querySelector("#t-capacity").value);
      const zone = overlay.querySelector("#t-zone").value.trim();

      if (!name || !zone || !capacity || capacity < 1) {
        UI.toast("Completa todos los campos correctamente.", "error");
        return;
      }

      if (isEdit) {
        DB.update("tables", id, { capacity, zone });
        UI.toast("Mesa actualizada.", "success");
      } else {
        DB.insert("tables", { id: Security.generateId(), name, capacity, zone, state: CONFIG.TABLE_STATES.AVAILABLE });
        UI.toast("Mesa creada.", "success");
      }
      UI.closeModal();
      renderTable();
    });
  }

  async function deleteTable(id) {
    const ok = await UI.confirmAction("¿Eliminar esta mesa? Esta acción no se puede deshacer.");
    if (!ok) return;
    DB.remove("tables", id);
    UI.toast("Mesa eliminada.", "success");
    renderTable();
  }

  function render() {
    const isAdmin = Router.session.role === CONFIG.ROLES.ADMIN;
    document.getElementById("tables-new-btn").classList.toggle("hidden", !isAdmin);
    renderTable();
  }

  function init() {
    document.getElementById("tables-new-btn").addEventListener("click", () => openForm(null));
  }

  return { render, init };
})();
