/* ============================================================
   SAHARA — autentikasi admin (berbasis sesi server)

   Login diverifikasi oleh backend dan sesi disimpan pada cookie
   HttpOnly, sehingga halaman admin tidak bisa dibuka tanpa
   melewati server. Tidak ada kata sandi yang ditanam di
   JavaScript sisi klien.
   ============================================================ */
(function (global) {
  "use strict";

  var API = "/api";

  var state = {
    checked: false,
    authenticated: false,
    user: null,
  };

  function request(method, path, body) {
    var options = {
      method: method,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };
    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    return fetch(API + path, options).then(function (res) {
      return res.text().then(function (text) {
        var data = {};
        if (text) {
          try { data = JSON.parse(text); } catch (e) { data = {}; }
        }
        if (!res.ok) {
          var err = new Error(data.error || "Permintaan gagal (" + res.status + ").");
          err.status = res.status;
          throw err;
        }
        return data;
      });
    }).catch(function (err) {
      if (!err.status) {
        var offline = new Error("Tidak dapat menghubungi server. Pastikan backend berjalan (npm start).");
        offline.offline = true;
        throw offline;
      }
      throw err;
    });
  }

  /** Tanyakan status sesi ke server. */
  function me() {
    return request("GET", "/auth/me").then(function (data) {
      state.checked = true;
      state.authenticated = !!data.authenticated;
      state.user = data.user || null;
      return state;
    });
  }

  function isLoggedIn() {
    return state.authenticated;
  }

  function currentUser() {
    return state.user ? state.user.displayName : "Kurator";
  }

  function login(username, password) {
    return request("POST", "/auth/login", { username: username, password: password })
      .then(function (data) {
        state.checked = true;
        state.authenticated = true;
        state.user = data.user || null;
        return { ok: true };
      })
      .catch(function (err) {
        state.authenticated = false;
        state.user = null;
        return { ok: false, message: err.message };
      });
  }

  function logout() {
    return request("POST", "/auth/logout")
      .catch(function () { /* sesi mungkin sudah kedaluwarsa */ })
      .then(function () {
        state.authenticated = false;
        state.user = null;
      });
  }

  function loginUrl() {
    var current = global.location.pathname.split("/").pop() + global.location.search;
    return "login.html?redirect=" + encodeURIComponent(current);
  }

  function redirectToLogin() {
    global.location.replace(loginUrl());
  }

  function boardOffline(err) {
    document.documentElement.style.visibility = "";
    if (global.SaharaStore && global.SaharaStore.showOfflineNotice) {
      global.SaharaStore.showOfflineNotice(err);
    }
  }

  /** true kalau sesi masih berlaku; kalau tidak, dialihkan ke halaman masuk. */
  function guard() {
    return me()
      .then(function (s) {
        if (s.authenticated) return true;
        redirectToLogin();
        return false;
      })
      .catch(function (err) {
        boardOffline(err);
        return false;
      });
  }

  /** Sembunyikan halaman dulu supaya konten privat tidak berkedip tampil. */
  function guardOrHide() {
    document.documentElement.style.visibility = "hidden";
    return guard().then(function (ok) {
      if (ok) document.documentElement.style.visibility = "";
      return ok;
    });
  }

  global.SaharaAuth = {
    state: state,
    request: request,
    me: me,
    isLoggedIn: isLoggedIn,
    currentUser: currentUser,
    login: login,
    logout: logout,
    guard: guard,
    guardOrHide: guardOrHide,
    loginUrl: loginUrl,
  };
})(window);
