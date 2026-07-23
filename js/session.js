/**
 * session.js
 * ---------------------------------------------------------------
 * Maneja la sesión del usuario logueado: creación de un "token" de
 * sesión firmado, su verificación en cada carga de vista, y el
 * control de acceso por rol.
 *
 * Por qué existe la "firma":
 * El objeto de sesión (usuario + rol) se guarda en localStorage
 * para sobrevivir recargas de página. Pero localStorage es editable
 * a mano por cualquier persona desde las DevTools. Si solo
 * guardáramos { username, role }, alguien podría cambiar
 * "role": "mesero" por "role": "admin" y listo.
 *
 * Para evitar eso, el token incluye una firma = SHA-256(username +
 * role + issuedAt + expiresAt + PEPPER). Como el atacante no conoce
 * el PEPPER, no puede recalcular una firma válida si modifica el
 * rol a mano. En verifySession() se recalcula la firma esperada y
 * se compara: si no coincide, la sesión se considera inválida.
 *
 * Además, el rol del token se contrasta contra el rol real que
 * tiene ese usuario en la colección `users` de la base de datos,
 * para detectar manipulaciones incluso más sofisticadas.
 * ---------------------------------------------------------------
 */

const Session = (() => {
  // Variable en memoria: evita tener que releer/verificar localStorage
  // en cada micro-operación dentro de la misma carga de página.
  let currentSession = null;

  async function _sign(username, role, issuedAt, expiresAt) {
    return Security.sha256(`${username}|${role}|${issuedAt}|${expiresAt}|${CONFIG.SESSION_PEPPER}`);
  }

  /**
   * Crea una sesión nueva tras un login exitoso y la persiste
   * ofuscada en localStorage.
   */
  async function create(user) {
    const issuedAt = Date.now();
    const expiresAt = issuedAt + CONFIG.SESSION_DURATION_MS;
    const signature = await _sign(user.username, user.role, issuedAt, expiresAt);

    const token = {
      username: user.username,
      role: user.role,
      issuedAt,
      expiresAt,
      signature,
    };

    localStorage.setItem(CONFIG.SESSION_KEY, Security.obfuscate(JSON.stringify(token)));
    currentSession = token;
    return token;
  }

  function _readRawToken() {
    const raw = localStorage.getItem(CONFIG.SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(Security.deobfuscate(raw));
    } catch (e) {
      return null;
    }
  }

  /**
   * Verifica la sesión activa. Debe llamarse en CADA carga de
   * página/vista antes de mostrar contenido protegido.
   * @returns {Promise<object|null>} el token si es válido, si no null.
   */
  async function verify() {
    const token = _readRawToken();
    if (!token || !token.username || !token.role || !token.signature) {
      currentSession = null;
      return null;
    }

    // 1) Expiración
    if (Date.now() > token.expiresAt) {
      destroy();
      return null;
    }

    // 2) Integridad: recalcular firma esperada
    const expectedSignature = await _sign(token.username, token.role, token.issuedAt, token.expiresAt);
    if (expectedSignature !== token.signature) {
      console.warn("Firma de sesión inválida: posible manipulación de localStorage.");
      destroy();
      return null;
    }

    // 3) Coherencia con la base de datos real de usuarios
    const dbUser = DB.getCollection("users").find((u) => u.username === token.username);
    if (!dbUser || dbUser.role !== token.role) {
      console.warn("El rol de la sesión no coincide con la base de datos: sesión invalidada.");
      destroy();
      return null;
    }

    currentSession = token;
    return token;
  }

  function get() {
    return currentSession;
  }

  function destroy() {
    localStorage.removeItem(CONFIG.SESSION_KEY);
    currentSession = null;
  }

  /**
   * Protege una vista/página: si no hay sesión válida, redirige al
   * login. Si se pasan roles permitidos y el usuario no cumple,
   * redirige al dashboard con un aviso (no revela contenido).
   * @param {string[]} [allowedRoles] roles permitidos, vacío = cualquiera logueado
   */
  async function requireRole(allowedRoles = []) {
    const token = await verify();
    if (!token) {
      window.location.href = "index.html";
      return null;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(token.role)) {
      return null; // el llamador decide qué mostrar (ej. ocultar módulo)
    }
    return token;
  }

  return { create, verify, get, destroy, requireRole };
})();
