/**
 * ui.js
 * ---------------------------------------------------------------
 * Helpers de interfaz reutilizables en todo el dashboard:
 * notificaciones tipo "toast" y un sistema simple de modales
 * (confirmación y contenido HTML arbitrario ya sanitizado por el
 * módulo que lo invoca).
 * ---------------------------------------------------------------
 */

const UI = (() => {
  function _ensureToastContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Muestra una notificación no intrusiva.
   * @param {string} message texto ya en lenguaje natural (se inserta con textContent, no requiere sanitize previo)
   * @param {"success"|"error"|"info"|"warning"} type
   */
  function toast(message, type = "info", duration = 3500) {
    const container = _ensureToastContainer();
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.setAttribute("role", "status");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  function _closeModal() {
    const overlay = document.getElementById("modal-overlay");
    if (overlay) overlay.remove();
  }

  /**
   * Abre un modal con contenido HTML controlado por el llamador.
   * El HTML pasado debe construirse usando Security.sanitize() para
   * cualquier valor dinámico que provenga de datos de usuario.
   * @returns {{overlay: HTMLElement, close: Function}}
   */
  function openModal(innerHtml) {
    _closeModal();
    const overlay = document.createElement("div");
    overlay.id = "modal-overlay";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${innerHtml}</div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) _closeModal();
    });
    document.body.appendChild(overlay);
    return { overlay, close: _closeModal };
  }

  /**
   * Modal de confirmación para acciones destructivas.
   * @param {string} message
   * @returns {Promise<boolean>}
   */
  function confirmAction(message) {
    return new Promise((resolve) => {
      const { overlay } = openModal(`
        <h3>Confirmar acción</h3>
        <p>${Security.sanitize(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" data-action="cancel">Cancelar</button>
          <button class="btn btn-danger" data-action="confirm">Confirmar</button>
        </div>
      `);
      overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => {
        _closeModal();
        resolve(false);
      });
      overlay.querySelector('[data-action="confirm"]').addEventListener("click", () => {
        _closeModal();
        resolve(true);
      });
    });
  }

  return { toast, openModal, closeModal: _closeModal, confirmAction };
})();
