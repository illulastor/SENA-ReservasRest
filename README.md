# Reserva Rest — Vinería


| Usuario   | Contraseña   | Rol           |
|-----------|--------------|---------------|
| admin     | admin123     | Administrador |
| mesero    | mesero123    | Mesero        |
| cocina    | cocina123    | Cocina        |
| despacho  | despacho123  | Despacho      |


```
reserva-rest/
├── index.html                  Pantalla de login
├── dashboard.html               SPA principal (todas las vistas)
├── css/
│   ├── variables.css            Tokens de diseño (colores, tipografía, espaciado)
│   ├── base.css                 Reset + estilos base (botones, formularios)
│   ├── components.css           Toasts, modales, tablas, badges, tarjetas, grilla de mesas
│   ├── login.css                Estilos exclusivos del login
│   └── dashboard.css            Layout del panel (sidebar, topbar, vistas)
└── js/
    ├── config.js                 Constantes globales y datos semilla (seed)
    ├── security.js                Hashing SHA-256, ofuscación, CAPTCHA, sanitización XSS
    ├── storage.js                 Única puerta de acceso a localStorage (el "modelo")
    ├── session.js                 Creación/verificación del token de sesión y control de roles
    ├── ui.js                      Toasts y sistema de modales reutilizable
    ├── bootstrap.js               Siembra la base de datos la primera vez
    ├── auth.js                    Lógica exclusiva del login (index.html)
    ├── router.js                  Navegación SPA del dashboard + menú dinámico por rol
    ├── main-dashboard.js           Punto de entrada de dashboard.html
    └── modules/
        ├── shared.js               Helpers comunes (fechas, dinero, badges, etc.)
        ├── dashboard.module.js     Vista "Inicio": estadísticas, mesas, reservas activas
        ├── tables.module.js        Vista "Mesas" (CRUD, admin)
        ├── reservations.module.js  Vista "Reservas" (CRUD, admin + mesero)
        ├── orders.module.js        Vista "Pedidos y platos"
        ├── kitchen.module.js       Vista "Cocina"
        ├── dispatch.module.js      Vista "Despachos"
        └── users.module.js         Vista "Usuarios" + restablecer datos demo
```

