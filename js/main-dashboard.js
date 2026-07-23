/**
 * main-dashboard.js
 * ---------------------------------------------------------------
 * Punto de entrada de dashboard.html. Orquesta el arranque:
 *   1. Siembra datos si es la primera vez.
 *   2. Engancha los listeners únicos de cada módulo (botones
 *      "Nuevo..." que existen una sola vez en el DOM).
 *   3. Inicia el router, que verifica la sesión y pinta la vista.
 * ---------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", async () => {
  await bootstrapApp();

  // Listeners que solo deben registrarse una vez (no en cada render)
  ModuleTables.init();
  ModuleReservations.init();
  ModuleOrders.init();
  ModuleUsers.init();

  await Router.init();
});
