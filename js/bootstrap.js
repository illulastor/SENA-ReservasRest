/**
 * bootstrap.js
 * ---------------------------------------------------------------
 * Se ejecuta al cargar tanto index.html como dashboard.html.
 * Si es la primera vez que se abre la app (localStorage vacío),
 * siembra los datos de fábrica: 4 usuarios, 8 mesas y 8 platos.
 * ---------------------------------------------------------------
 */

async function bootstrapApp() {
  if (!DB.exists()) {
    await DB.seed();
    console.info("Reserva Rest: base de datos inicial creada (usuarios, mesas y platos demo).");
  }
}
