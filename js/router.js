/**
 * router.js
 * ---------------------------------------------------------------
 * Controla la navegación dentro de dashboard.html (que es una SPA):
 *   - Define qué vistas existen y qué roles pueden verlas.
 *   - Construye el menú lateral dinámicamente según el rol de la
 *     sesión activa.
 *   - Muestra/oculta las vistas (<section class="view">) y llama al
 *     render() del módulo correspondiente cada vez que se navega.
 *   - Vuelve a verificar la sesión/rol antes de activar cada vista,
 *     como defensa adicional a que solo se arme el menú correcto.
 * ---------------------------------------------------------------
 */

const Router = (() => {
  const R = CONFIG.ROLES;

  // Definición central de vistas: id, etiqueta, icono, roles permitidos
  // y el módulo que sabe renderizarlas.
  const VIEWS = [
    {
      id: "inicio",
      label: "Inicio",
      roles: [R.ADMIN, R.MESERO, R.COCINA, R.DESPACHO],
      icon: iconHome,
      module: () => ModuleDashboard,
    },
    {
      id: "mesas",
      label: "Mesas",
      roles: [R.ADMIN, R.MESERO],
      icon: iconTable,
      module: () => ModuleTables,
    },
    {
      id: "reservas",
      label: "Reservas",
      roles: [R.ADMIN, R.MESERO],
      icon: iconCalendar,
      module: () => ModuleReservations,
    },
    {
      id: "pedidos",
      label: "Pedidos y platos",
      roles: [R.ADMIN, R.MESERO],
      icon: iconOrder,
      module: () => ModuleOrders,
    },
    {
      id: "cocina",
      label: "Cocina",
      roles: [R.ADMIN, R.COCINA],
      icon: iconKitchen,
      module: () => ModuleKitchen,
    },
    {
      id: "despacho",
      label: "Despachos",
      roles: [R.ADMIN, R.DESPACHO],
      icon: iconTruck,
      module: () => ModuleDispatch,
    },
    {
      id: "usuarios",
      label: "Usuarios",
      roles: [R.ADMIN],
      icon: iconUsers,
      module: () => ModuleUsers,
    },
  ];

  let session = null;

  function viewsForRole(role) {
    return VIEWS.filter((v) => v.roles.includes(role));
  }

  function buildSidebar() {
    const nav = document.getElementById("nav-list");
    nav.innerHTML = "";
    viewsForRole(session.role).forEach((view, index) => {
      const btn = document.createElement("button");
      btn.className = "nav-link" + (index === 0 ? " active" : "");
      btn.dataset.view = view.id;
  btn.innerHTML = `${view.icon()}<span>${Security.sanitize(view.label)}</span>`;
      btn.addEventListener("click", () => navigate(view.id));
      nav.appendChild(btn);
    });
  }

  function buildTopbar() {
    document.getElementById("current-username").textContent = session.username;
    document.getElementById("current-role").textContent = roleLabel(session.role);
  }

  function roleLabel(role) {
    return { admin: "Administrador", mesero: "Mesero", cocina: "Cocina", despacho: "Despacho" }[role] || role;
  }

  function navigate(viewId) {
    const view = VIEWS.find((v) => v.id === viewId);
    if (!view || !view.roles.includes(session.role)) {
      UI.toast("No tienes permiso para acceder a esa sección.", "error");
      return;
    }

    // Activar botón de menú
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewId);
    });

    // Mostrar sección correspondiente
    document.querySelectorAll(".view").forEach((section) => {
      section.classList.toggle("active", section.id === `view-${viewId}`);
    });

    document.getElementById("view-title").textContent = view.label;

    const mod = view.module();
    if (mod && typeof mod.render === "function") {
      mod.render(session);
    }

    // En móvil, cerrar el sidebar tras navegar
    document.getElementById("app-shell").classList.remove("sidebar-open");
  }

  function setupSidebarToggle() {
    const shell = document.getElementById("app-shell");
    const toggleBtn = document.getElementById("sidebar-toggle");
    const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

    toggleBtn.addEventListener("click", () => {
      if (isMobile()) {
        shell.classList.toggle("sidebar-open");
      } else {
        shell.classList.toggle("sidebar-collapsed");
      }
    });

    const scrim = document.getElementById("sidebar-scrim");
    if (scrim) {
      scrim.addEventListener("click", () => shell.classList.remove("sidebar-open"));
    }
  }

  function setupLogout() {
    document.getElementById("logout-btn").addEventListener("click", () => {
      Session.destroy();
      window.location.href = "index.html";
    });
  }

  /**
   * Punto de entrada: verifica sesión, arma el menú según rol y
   * navega a la vista inicial.
   */
  async function init() {
    const verified = await Session.requireRole([]); // cualquier usuario logueado
    if (!verified) return; // requireRole ya redirige a index.html
    session = verified;

    buildSidebar();
    buildTopbar();
    setupSidebarToggle();
    setupLogout();

    const first = viewsForRole(session.role)[0];
    navigate(first ? first.id : "inicio");
  }

  return { init, navigate, get session() { return session; } };
})();

/* --- Iconos SVG inline (sin dependencias externas) --- */
function iconHome() {
  return '<svg viewBox="0 0 24 24" fill="none"><path d="M4 11.5 12 5l8 6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
}
function iconTable() {
  return '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="4" rx="1" stroke="currentColor" stroke-width="1.6"/><path d="M6 11v7M18 11v7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
}
function iconCalendar() {
  return '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
}
function iconOrder() {
  return '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h12l-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 8h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
}
function iconKitchen() {
  return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
}
function iconTruck() {
  return '<svg viewBox="0 0 24 24" fill="none"><path d="M3 7h11v9H3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 11h4l3 3v2h-7v-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.6" stroke="currentColor" stroke-width="1.4"/><circle cx="17" cy="18" r="1.6" stroke="currentColor" stroke-width="1.4"/></svg>';
}
function iconUsers() {
  return '<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M15 4.5c1.7.4 3 1.9 3 3.5s-1.3 3.1-3 3.5M17 15c2.4.3 4 1.8 4 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
}
