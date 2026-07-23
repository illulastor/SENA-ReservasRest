/**
 * security.js
 * ---------------------------------------------------------------
 * Todo lo relacionado a criptografía/seguridad del lado del
 * cliente vive aquí:
 *   - Hashing de contraseñas (SubtleCrypto / SHA-256)
 *   - Ofuscación reversible simple (btoa/atob) para no guardar
 *     datos sensibles como texto plano legible a simple vista
 *   - Generación y verificación de CAPTCHA matemático
 *   - Sanitización de texto para prevenir XSS al insertar datos
 *     del usuario en el DOM
 *
 * ADVERTENCIA HONESTA:
 * Como toda la app corre 100% en el navegador y persiste en
 * localStorage, esto NO es seguridad "real" de servidor: cualquier
 * persona con acceso a las herramientas de desarrollador puede leer
 * localStorage. Estas medidas cumplen el objetivo pedagógico del
 * proyecto (no guardar contraseñas en texto plano, dificultar
 * lectura casual, evitar inyección de HTML) pero no reemplazan un
 * backend con autenticación real.
 * ---------------------------------------------------------------
 */

const Security = (() => {
  /**
   * Calcula SHA-256 de un string usando la API nativa SubtleCrypto.
   * @param {string} text
   * @returns {Promise<string>} hash en hexadecimal
   */
  async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Ofusca un string para que no sea directamente legible en
   * localStorage. No es cifrado fuerte, es Base64 + volteo simple.
   */
  function obfuscate(text) {
    try {
      const reversed = text.split("").reverse().join("");
      return btoa(unescape(encodeURIComponent(reversed)));
    } catch (e) {
      return btoa(unescape(encodeURIComponent(text)));
    }
  }

  function deobfuscate(obfuscated) {
    try {
      const reversed = decodeURIComponent(escape(atob(obfuscated)));
      return reversed.split("").reverse().join("");
    } catch (e) {
      return "";
    }
  }

  /**
   * Genera una operación matemática simple para el CAPTCHA del login.
   * @returns {{a:number, b:number, operator:string, answer:number, label:string}}
   */
  function generateCaptcha() {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const useSum = Math.random() > 0.5;
    const answer = useSum ? a + b : a + b; // suma siempre (simple y sin negativos)
    return {
      a,
      b,
      operator: "+",
      answer,
      label: `¿Cuánto es ${a} + ${b}?`,
    };
  }

  /**
   * Convierte texto con posible HTML en texto plano seguro para
   * insertarse en el DOM. Se debe usar en TODO lugar donde se
   * muestren datos que vinieron de un formulario o de localStorage.
   */
  function sanitize(text) {
    if (text === null || text === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  }

  /**
   * Genera un identificador único simple (suficiente para IDs locales).
   */
  function generateId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  return { sha256, obfuscate, deobfuscate, generateCaptcha, sanitize, generateId };
})();
