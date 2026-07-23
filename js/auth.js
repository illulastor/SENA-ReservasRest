/**
 * auth.js
 * ---------------------------------------------------------------
 * Lógica exclusiva de index.html (pantalla de login):
 *   1. Valida usuario y contraseña.
 *   2. Verifica que el reCAPTCHA de Google esté completado.
 *   3. Hashea la contraseña ingresada y la compara contra el hash
 *      guardado del usuario.
 *   4. Si todo es correcto, crea la sesión y redirige al dashboard.
 * ---------------------------------------------------------------
 */

(function () {

  function showFormError(message) {
    const box = document.getElementById("login-error");
    box.textContent = message;
    box.classList.add("show");
  }

  function hideFormError() {
    const box = document.getElementById("login-error");
    box.classList.remove("show");
    box.textContent = "";
  }

  function setFieldInvalid(fieldId, invalid) {
    const input = document.getElementById(fieldId);

    if (!input) return;

    const field = input.closest(".field");

    if (!field) return;

    field.classList.toggle("invalid", invalid);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    hideFormError();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    // Token generado por Google reCAPTCHA
    const captchaResponse = grecaptcha.getResponse();
    let valid = true;
    // Usuario
    if (!username) {
      setFieldInvalid("username", true);
      valid = false;
    } else {
      setFieldInvalid("username", false);
    }
    // Contraseña
    if (!password) {
      setFieldInvalid("password", true);
      valid = false;
    } else {
      setFieldInvalid("password", false);
    }
    // Validar reCAPTCHA
    if (!captchaResponse) {
      showFormError("Completa la verificación de Google reCAPTCHA.");
      valid = false;
    }
    if (!valid) {
      return;
    }
    const submitBtn = document.getElementById("login-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando...";
    try {
      const user = DB.getCollection("users").find(
        (u) => u.username === username
      );
      const passwordHash = await Security.sha256(password);
      if (!user || user.passwordHash !== passwordHash) {
        showFormError("Usuario o contraseña incorrectos.");
        grecaptcha.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = "Ingresar";
        return;
      }
      await Session.create(user);
      UI.toast(`Bienvenido, ${user.username}`, "success");
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      showFormError("Ocurrió un error al iniciar sesión.");
      grecaptcha.reset();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Ingresar";
    }
  }
  async function init() {
    await bootstrapApp();
    // Si ya existe una sesión válida
    const existing = await Session.verify();
    if (existing) {
      window.location.href = "dashboard.html";
      return;
    }
    document
      .getElementById("login-form")
      .addEventListener("submit", handleSubmit);
  }
  document.addEventListener("DOMContentLoaded", init);
})();