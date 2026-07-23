/**
 * modules/users.module.js
 * ---------------------------------------------------------------
 * Vista "Usuarios". Acceso: admin.
 *   - CRUD de usuarios (crear, editar nombre/contraseña, eliminar).
 *   - Cambiar la contraseña de un usuario exige que el admin
 *     confirme SU PROPIA contraseña actual antes de aplicar el
 *     cambio (verificación adicional contra acciones accidentales
 *     o realizadas por alguien que dejó la sesión abierta).
 *   - Botón para restablecer todos los datos a los valores demo.
 * ---------------------------------------------------------------
 */

const ModuleUsers = (() => {
  const roleLabels = { admin: "Administrador", mesero: "Mesero", cocina: "Cocina", despacho: "Despacho" };

  function renderTable() {
    const tbody = document.getElementById("users-tbody");
    const users = DB.getCollection("users");

    tbody.innerHTML = users
      .map(
        (u) => `
      <tr>
        <td>${Security.sanitize(u.username)}</td>
        <td>${Security.sanitize(roleLabels[u.role] || u.role)}</td>
        <td class="actions">
          <button class="btn btn-sm btn-gold" data-action="edit" data-id="${u.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${u.id}">Eliminar</button>
        </td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll('[data-action="edit"]').forEach((btn) => btn.addEventListener("click", () => openEditForm(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => btn.addEventListener("click", () => deleteUser(btn.dataset.id)));
  }

  function openCreateForm() {
    const { overlay } = UI.openModal(`
      <h3>Nuevo usuario</h3>
      <form id="user-form">
        <div class="field">
          <label for="u-username">Nombre de usuario</label>
          <input id="u-username" />
        </div>
        <div class="field">
          <label for="u-role">Rol</label>
          <select id="u-role">
            <option value="admin">Administrador</option>
            <option value="mesero">Mesero</option>
            <option value="cocina">Cocina</option>
            <option value="despacho">Despacho</option>
          </select>
        </div>
        <div class="field">
          <label for="u-password">Contraseña</label>
          <input id="u-password" type="password" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Crear usuario</button>
        </div>
      </form>
    `);

    overlay.querySelector('[data-action="cancel"]').addEventListener("click", UI.closeModal);
    overlay.querySelector("#user-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = overlay.querySelector("#u-username").value.trim();
      const role = overlay.querySelector("#u-role").value;
      const password = overlay.querySelector("#u-password").value;

      if (!username || !password || password.length < 4) {
        UI.toast("Usuario y contraseña (mínimo 4 caracteres) son obligatorios.", "error");
        return;
      }
      const exists = DB.getCollection("users").some((u) => u.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        UI.toast("Ese nombre de usuario ya existe.", "error");
        return;
      }

      const passwordHash = await Security.sha256(password);
      DB.insert("users", { id: Security.generateId(), username, role, passwordHash });
      UI.toast("Usuario creado.", "success");
      UI.closeModal();
      renderTable();
    });
  }

  function openEditForm(id) {
    const user = DB.findById("users", id);
    if (!user) return;

    const { overlay } = UI.openModal(`
      <h3>Editar usuario</h3>
      <form id="edit-user-form">
        <div class="field">
          <label for="eu-username">Nombre de usuario</label>
          <input id="eu-username" value="${Security.sanitize(user.username)}" />
        </div>
        <div class="field">
          <label for="eu-role">Rol</label>
          <select id="eu-role">
            <option value="admin" ${user.role === "admin" ? "selected" : ""}>Administrador</option>
            <option value="mesero" ${user.role === "mesero" ? "selected" : ""}>Mesero</option>
            <option value="cocina" ${user.role === "cocina" ? "selected" : ""}>Cocina</option>
            <option value="despacho" ${user.role === "despacho" ? "selected" : ""}>Despacho</option>
          </select>
        </div>

        <hr style="border:none;border-top:1px dashed var(--color-crema-oscuro); margin: 16px 0;" />
        <p class="text-muted" style="font-size:var(--fs-xs);">Para cambiar la contraseña, completa los tres campos. Déjalos vacíos si no deseas cambiarla.</p>

        <div class="field">
          <label for="eu-admin-password">Tu contraseña actual (administrador)</label>
          <input id="eu-admin-password" type="password" />
        </div>
        <div class="field">
          <label for="eu-new-password">Nueva contraseña del usuario</label>
          <input id="eu-new-password" type="password" />
        </div>
        <div class="field">
          <label for="eu-repeat-password">Repetir nueva contraseña</label>
          <input id="eu-repeat-password" type="password" />
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-action="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar cambios</button>
        </div>
      </form>
    `);

    overlay.querySelector('[data-action="cancel"]').addEventListener("click", UI.closeModal);
    overlay.querySelector("#edit-user-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = overlay.querySelector("#eu-username").value.trim();
      const role = overlay.querySelector("#eu-role").value;
      const adminPassword = overlay.querySelector("#eu-admin-password").value;
      const newPassword = overlay.querySelector("#eu-new-password").value;
      const repeatPassword = overlay.querySelector("#eu-repeat-password").value;

      if (!username) {
        UI.toast("El nombre de usuario no puede estar vacío.", "error");
        return;
      }

      const patch = { username, role };
      const wantsPasswordChange = adminPassword || newPassword || repeatPassword;

      if (wantsPasswordChange) {
        if (!adminPassword || !newPassword || !repeatPassword) {
          UI.toast("Para cambiar la contraseña completa los tres campos.", "error");
          return;
        }
        if (newPassword !== repeatPassword) {
          UI.toast("La nueva contraseña y su repetición no coinciden.", "error");
          return;
        }
        if (newPassword.length < 4) {
          UI.toast("La nueva contraseña debe tener al menos 4 caracteres.", "error");
          return;
        }

        // Verificar la contraseña ACTUAL del administrador logueado
        const adminUser = DB.getCollection("users").find((u) => u.username === Router.session.username);
        const adminHash = await Security.sha256(adminPassword);
        if (!adminUser || adminUser.passwordHash !== adminHash) {
          UI.toast("Tu contraseña de administrador no es correcta.", "error");
          return;
        }

        patch.passwordHash = await Security.sha256(newPassword);
      }

      DB.update("users", id, patch);
      UI.toast("Usuario actualizado.", "success");
      UI.closeModal();
      renderTable();
    });
  }

  async function deleteUser(id) {
    const user = DB.findById("users", id);
    if (user && user.username === Router.session.username) {
      UI.toast("No puedes eliminar tu propio usuario mientras tienes la sesión activa.", "warning");
      return;
    }
    const ok = await UI.confirmAction("¿Eliminar este usuario?");
    if (!ok) return;
    DB.remove("users", id);
    UI.toast("Usuario eliminado.", "success");
    renderTable();
  }

  async function resetDemoData() {
    const ok = await UI.confirmAction(
      "Esto eliminará TODOS los datos actuales (usuarios, mesas, reservas, platos, pedidos y despachos) y los reemplazará por los datos de fábrica. ¿Continuar?"
    );
    if (!ok) return;
    await DB.resetToDemo();
    UI.toast("Datos restablecidos a los valores demo. Vuelve a iniciar sesión.", "success");
    Session.destroy();
    setTimeout(() => (window.location.href = "index.html"), 1200);
  }

  function render() {
    renderTable();
  }

  function init() {
    document.getElementById("users-new-btn").addEventListener("click", openCreateForm);
    document.getElementById("users-reset-btn").addEventListener("click", resetDemoData);
  }

  return { render, init };
})();
