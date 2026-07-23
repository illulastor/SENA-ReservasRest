# Reserva Rest — Vinería

Sistema de gestión (reservas, mesas, pedidos, cocina y despachos) en HTML + CSS + JavaScript vanilla, con persistencia en `localStorage`. Sin frameworks ni build step: se abre directamente en el navegador o se sirve como archivos estáticos.

## 1. Cómo ejecutarlo

No requiere instalación. Basta con servir la carpeta como archivos estáticos (por CORS/módulos, evita abrir `index.html` con doble clic; usa un servidor simple):

```bash
cd reserva-rest
python3 -m http.server 8080
# abrir http://localhost:8080
```

Usuarios de prueba (se crean solos la primera vez que se abre la app):

| Usuario   | Contraseña   | Rol           |
|-----------|--------------|---------------|
| admin     | admin123     | Administrador |
| mesero    | mesero123    | Mesero        |
| cocina    | cocina123    | Cocina        |
| despacho  | despacho123  | Despacho      |

## 2. Estructura de carpetas

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

Cada archivo tiene una sola responsabilidad y un comentario de cabecera explicándola. Esto permite:
- Leer un módulo sin tener que entender el resto.
- Reemplazar una pieza (por ejemplo, cambiar `storage.js` por llamadas a una API real) sin tocar las vistas.
- Escalar agregando nuevos módulos en `js/modules/` y registrándolos en `router.js`.

## 3. Autenticación, sesión y "tokens" — cómo funciona

Como no hay backend, **no existen tokens JWT reales**; en su lugar se implementó un esquema equivalente en el cliente, explicado a continuación.

### 3.1 Contraseñas (`security.js`)
- Las contraseñas nunca se guardan en texto plano.
- Se usa `crypto.subtle.digest("SHA-256", ...)` (API nativa del navegador) para calcular el hash antes de guardarlo en `users[].passwordHash`.
- En el login, se hashea lo que el usuario escribió y se compara contra el hash guardado — la contraseña real nunca se compara ni se guarda.

### 3.2 Token de sesión (`session.js`)
Al iniciar sesión correctamente se genera un objeto:

```js
{
  username: "mesero",
  role: "mesero",
  issuedAt: 1753277200000,
  expiresAt: 1753306000000,     // ahora + 8 horas
  signature: "a3f9...            // SHA-256(username|role|issuedAt|expiresAt|PEPPER)
}
```

Este objeto se ofusca (Base64 + inversión de texto, ver `Security.obfuscate`) y se guarda en `localStorage` bajo la clave `reservaRestSession`. También se mantiene una copia en una variable en memoria (`currentSession` dentro de `session.js`) para no tener que releer `localStorage` en cada micro-operación durante la misma carga de página.

### 3.3 Por qué existe la `signature`
`localStorage` es completamente editable desde las herramientas de desarrollador del navegador. Si el token solo guardara `{ username, role }`, cualquier persona podría cambiar manualmente `"role": "mesero"` por `"role": "admin"`.

La firma se recalcula en cada verificación (`Session.verify()`) con la misma fórmula y la misma "pepper" (`CONFIG.SESSION_PEPPER`). Si alguien modifica el rol a mano, la firma guardada ya no coincide con la firma esperada, y la sesión se invalida automáticamente (logout forzado).

Como refuerzo adicional, `Session.verify()` también compara el rol del token contra el rol real que tiene ese usuario en la colección `users` de la base de datos — así se detecta incluso el caso de que alguien edite directamente el objeto `reservaRestDB`.

> **Nota honesta:** esto es una capa de defensa en profundidad para un proyecto 100% cliente, no una garantía criptográfica equivalente a una sesión validada en servidor. Cualquier persona con conocimientos avanzados que controle el propio navegador (y por tanto conozca el código fuente y el "pepper") podría, en teoría, reconstruir una firma válida. Para producción real, la verificación de sesión y roles debe vivir en un backend.

### 3.4 Verificación en cada vista
`router.js` llama a `Session.requireRole([])` al cargar `dashboard.html`, lo que dispara `Session.verify()`. Si no hay sesión válida (ausente, expirada, o con firma/rol inconsistente), se redirige a `index.html`. El menú lateral y cada vista se construyen **después** de tener el rol verificado, y cada módulo (`tables.module.js`, `users.module.js`, etc.) vuelve a comprobar `Router.session.role` antes de mostrar acciones sensibles (crear, editar, eliminar).

### 3.5 CAPTCHA
`Security.generateCaptcha()` genera una suma simple de dos números aleatorios (1–9). El formulario de login no se envía si la respuesta no coincide.

## 4. Modelo de datos (`localStorage["reservaRestDB"]`)

Un único objeto JSON con las colecciones `users`, `tables`, `reservations`, `dishes`, `orders`, `dispatches`. Todo el acceso pasa por `storage.js` (`DB.getCollection`, `DB.insert`, `DB.update`, `DB.remove`), que es la única parte del código que toca `localStorage.getItem/setItem` para datos de negocio.

## 5. Flujo de un pedido (extremo a extremo)

1. **Mesero** crea un pedido desde *Pedidos y platos*, elige mesa y platos → cada plato queda `pending`.
2. **Cocina** ve el plato en *Cocina* y lo avanza: `pending → preparing → ready`.
3. Al quedar `ready`, el plato aparece agrupado por mesa en *Despachos → Platos listos para despachar*.
4. **Despacho** crea el despacho (queda `ready` para salir), luego lo marca `in_route` y finalmente `delivered`.

## 6. Próximos pasos sugeridos (si el proyecto crece)

- Reemplazar `storage.js` por llamadas `fetch` a una API real, sin tocar el resto de los módulos.
- Mover la verificación de roles y la firma de sesión a un backend (JWT real).
- Agregar pruebas automatizadas por módulo (cada uno ya está aislado para facilitarlo).
