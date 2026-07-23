/**
 * modules/reservations.module.js
 * ---------------------------------------------------------------
 * Vista "Reservas". Acceso: admin y mesero.
 * Muestra tabla + grid de tarjetas ordenado por proximidad de
 * fecha/hora. Al crear una reserva, la mesa elegida pasa a estado
 * "reservada".
 * ---------------------------------------------------------------
 */

const ModuleReservations = (() => {
  function availableOrOwnTables(currentTableId) {
    return DB.getCollection("tables").filter(
      (t) => t.state === CONFIG.TABLE_STATES.AVAILABLE || t.id === currentTableId
    );
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  function validatePhone(phone) {
    return /^[0-9+\-\s()]{6,20}$/.test(phone);
  }

  function renderGrid() {
    const container = document.getElementById("reservations-grid");
    const reservations = Shared.sortReservationsByProximity(DB.getCollection("reservations"));

    if (reservations.length === 0) {
      container.innerHTML = `<p class="text-muted">No hay reservas registradas. Crea la primera con el botón "Nueva reserva".</p>`;
      return;
    }

    container.innerHTML = reservations
      .map(
        (r) => `
      <article class="reservation-card">
        <h4>${Security.sanitize(r.clientName)}</h4>
        <div class="meta">📅 ${Shared.formatDate(r.date)} · 🕗 ${Security.sanitize(r.time)}</div>
        <div class="meta">🍽️ ${Security.sanitize(Shared.tableName(r.tableId))} · 👥 ${r.people} personas</div>
        <div class="meta">📞 ${Security.sanitize(r.phone)} · ✉️ ${Security.sanitize(r.email)}</div>
        ${r.description ? `<div class="meta">📝 ${Security.sanitize(r.description)}</div>` : ""}
        <div class="card-actions">
          <button class="btn btn-sm btn-gold" data-action="edit" data-id="${r.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${r.id}">Eliminar</button>
        </div>
      </article>`
      )
      .join("");

    container.querySelectorAll('[data-action="edit"]').forEach((btn) => btn.addEventListener("click", () => openForm(btn.dataset.id)));
    container.querySelectorAll('[data-action="delete"]').forEach((btn) => btn.addEventListener("click", () => deleteReservation(btn.dataset.id)));
  }

  function openForm(id) {
    const isEdit = Boolean(id);
    const res = isEdit ? DB.findById("reservations", id) : null;
    const tables = availableOrOwnTables(isEdit ? res.tableId : null);

    const { overlay } = UI.openModal(`
      <h3>${isEdit ? "Editar reserva" : "Nueva reserva"}</h3>
      <form id="res-form">
        <div class="field">
          <label for="r-client">Cliente</label>
          <input id="r-client" value="${isEdit ? Security.sanitize(res.clientName) : ""}" />
        </div>
        <div class="field">
          <label for="r-phone">Teléfono</label>
          <input id="r-phone" value="${isEdit ? Security.sanitize(res.phone) : ""}" />
        </div>
        <div class="field">
          <label for="r-email">Correo</label>
          <input id="r-email" type="email" value="${isEdit ? Security.sanitize(res.email) : ""}" />
        </div>
        <div class="field">
          <label for="r-table">Mesa</label>
          <select id="r-table">
            ${tables.map((t) => `<option value="${t.id}" ${isEdit && res.tableId === t.id ? "selected" : ""}>${Security.sanitize(t.name)} (${t.capacity} pers. · ${Security.sanitize(t.zone)})</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="r-date">Fecha</label>
          <input id="r-date" type="date" value="${isEdit ? res.date : Shared.todayISO()}" />
        </div>
        <div class="field">
          <label for="r-time">Hora</label>
          <input id="r-time" type="time" value="${isEdit ? res.time : "20:00"}" />
        </div>
        <div class="field">
          <label for="r-people">Personas</label>
          <input id="r-people" type="number" min="1" max="30" value="${isEdit ? res.people : 2}" />
        </div>
        <div class="field">
          <label for="r-desc">Descripción (opcional)</label>
          <textarea id="r-desc" rows="2">${isEdit ? Security.sanitize(res.description || "") : ""}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Guardar cambios" : "Crear reserva"}</button>
        </div>
      </form>
    `);

    overlay.querySelector('[data-action="cancel"]').addEventListener("click", UI.closeModal);
    overlay.querySelector("#res-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const clientName = overlay.querySelector("#r-client").value.trim();
      const phone = overlay.querySelector("#r-phone").value.trim();
      const email = overlay.querySelector("#r-email").value.trim();
      const tableId = overlay.querySelector("#r-table").value;
      const date = overlay.querySelector("#r-date").value;
      const time = overlay.querySelector("#r-time").value;
      const people = Number(overlay.querySelector("#r-people").value);
      const description = overlay.querySelector("#r-desc").value.trim();

      if (!clientName || !phone || !email || !tableId || !date || !time || !people) {
        UI.toast("Completa todos los campos obligatorios.", "error");
        return;
      }
      if (!validateEmail(email)) {
        UI.toast("El correo ingresado no es válido.", "error");
        return;
      }
      if (!validatePhone(phone)) {
        UI.toast("El teléfono ingresado no es válido.", "error");
        return;
      }

      if (isEdit) {
        // Si cambió de mesa, liberar la anterior y reservar la nueva
        if (res.tableId !== tableId) {
          DB.update("tables", res.tableId, { state: CONFIG.TABLE_STATES.AVAILABLE });
          DB.update("tables", tableId, { state: CONFIG.TABLE_STATES.RESERVED });
        }
        DB.update("reservations", id, { clientName, phone, email, tableId, date, time, people, description });
        UI.toast("Reserva actualizada.", "success");
      } else {
        DB.insert("reservations", {
          id: Security.generateId(),
          clientName,
          phone,
          email,
          tableId,
          date,
          time,
          people,
          description,
        });
        DB.update("tables", tableId, { state: CONFIG.TABLE_STATES.RESERVED });
        UI.toast("Reserva creada.", "success");
      }

      UI.closeModal();
      renderGrid();
    });
  }

  async function deleteReservation(id) {
    const ok = await UI.confirmAction("¿Eliminar esta reserva? La mesa asociada volverá a estar disponible.");
    if (!ok) return;
    const res = DB.findById("reservations", id);
    if (res) DB.update("tables", res.tableId, { state: CONFIG.TABLE_STATES.AVAILABLE });
    DB.remove("reservations", id);
    UI.toast("Reserva eliminada.", "success");
    renderGrid();
  }

  function render() {
    Shared.applyReservationTimeIntelligence();
    renderGrid();
  }

  function init() {
    document.getElementById("reservations-new-btn").addEventListener("click", () => openForm(null));
  }

  return { render, init };
})();
