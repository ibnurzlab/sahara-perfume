/* ============================================================
   SAHARA — Admin login controller
   Kredensial diverifikasi oleh backend; tidak ada kata sandi
   yang disimpan di sisi klien.
   ============================================================ */
(function () {
  "use strict";

  var Auth = window.SaharaAuth;
  var form = document.getElementById("login-form");
  var userInput = document.getElementById("login-user");
  var passInput = document.getElementById("login-password");
  var errorBox = document.getElementById("login-error");
  var errorText = document.getElementById("login-error-text");
  var toggleBtn = document.getElementById("toggle-password");
  var submitBtn = document.getElementById("login-submit");
  var submitLabel = document.getElementById("login-submit-label");

  function target() {
    var raw = new URLSearchParams(window.location.search).get("redirect");
    if (!raw) return "admin.html";
    /* only allow same-folder html targets */
    if (/^[\w.-]+\.html(\?.*)?$/.test(raw)) return raw;
    return "admin.html";
  }

  /* Kalau sesi masih berlaku, langsung lanjut ke tujuan. */
  Auth.me()
    .then(function (state) {
      if (state.authenticated) window.location.replace(target());
    })
    .catch(function () {
      /* server tidak terjangkau — biarkan formulir tampil */
    });

  function showError(message) {
    errorText.textContent = message;
    errorBox.classList.remove("hidden");
    errorBox.classList.add("flex");
  }

  function clearError() {
    errorBox.classList.add("hidden");
    errorBox.classList.remove("flex");
  }

  toggleBtn.addEventListener("click", function () {
    var isPassword = passInput.type === "password";
    passInput.type = isPassword ? "text" : "password";
    document.getElementById("toggle-password-icon").textContent = isPassword ? "visibility_off" : "visibility";
    toggleBtn.setAttribute("aria-label", isPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();

    submitBtn.disabled = true;
    submitLabel.textContent = "Memverifikasi...";

    Auth.login(userInput.value, passInput.value).then(function (result) {
      if (!result.ok) {
        showError(result.message);
        submitBtn.disabled = false;
        submitLabel.textContent = "Masuk ke Ruang Kurasi";
        passInput.value = "";
        passInput.focus();
        return;
      }

      submitLabel.textContent = "Membuka ruang kurasi...";
      window.location.href = target();
    });
  });
})();
