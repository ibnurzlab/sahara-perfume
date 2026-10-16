/* ============================================================
   SAHARA — lapisan data (klien API backend)

   Semua data katalog kini berasal dari server + database SQLite.
   Pembacaan (all/get/first/has) tetap sinkron karena memakai
   cache di memori, sementara setiap perubahan mengembalikan
   Promise karena harus menunggu server.
   ============================================================ */
(function (global) {
  "use strict";

  var API = "/api";

  /* ---------- cache ---------- */
  var products = [];
  var favoriteIds = [];

  /* ---------- taksonomi (diperbarui dari server saat refresh) ---------- */
  var CATEGORIES = [
    { id: "all", label: "Semua Koleksi" },
    { id: "oud-amber", label: "Oud & Amber" },
    { id: "woody-smoky", label: "Woody & Smoky" },
    { id: "floral-noir", label: "Floral Noir" },
    { id: "citrus-mineral", label: "Citrus Mineral" },
  ];

  var COLLECTIONS = [
    { id: "desert-nocturne", label: "Desert Nocturne (Édition Privée)" },
    { id: "oasis-blanc", label: "L'Oasis Blanc" },
    { id: "nomad-heritage", label: "Nomad Heritage Monograph" },
    { id: "sol-oriental", label: "Sol Oriental Infini" },
  ];

  /* Gambar contoh saat menambah produk baru (URL publik, bukan unggahan). */
  var UPLOAD_DEMO_IMAGES = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCqZyOxGBXSoxp3dWzwBISEctlEZOeFIHKjZZQNlRm1QC1rwPX11CkIQdMu05QPimlE3tT4eM8CeMaURYQysVgmQKrVuFyf4IkP-vxSXRo-Xc5ZFsPpdtelnpQSJ5KCZ0j8A-yoRe7eBurEtLLXV6wqQRSqaNCavm2RQUm5UKqjwa0Ah3WVPmJHa-fhl26y1_uyd5pRCOKzqDIYIe6sYKv2GtWHTBdPVFnANcXTNBhwdy3Rgfh2ahy-KA",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCUrymysmXU5AwZt1SXUYte1tndn4oZ339R7PNrE99aH9ZRXcy3-vRuPW_CFJOUN8INEEkbrEkR4Wctgkjw36MW3zxpjl0GZoWD7E8Hz5qEadFNS6wvTdqbZtcI5D3jkqp5SWTK3DMGBuFBU2W0Q9oYJxUqbpzqgX54GFJ4vrJQ0CwvPUhHgMqx2gALjEPYMsdPBZwNqOmX_ExcBP5SEovW8E6SNIwThW3jjx3nYAXgPj9EEVQ-U38TeQ",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCQNbTHYMNnLMDPxxcLjGP6EH08QgfDSaBmNVHMoHfAquQ43AnB1Gzk0ncEZioM2Qfz3hsudLCWY17Ot0wikNrm7xydRw09PXa6RmwuOIONdm7PktYB6AnI4m4EPunwuFcxPm-IdAvSJrX7YDWCgCZ5pPrFY3wZNlDOlGEGhUkGCpAZqocABcWLcHIhFL5AgpeJqumfoYV6wBVzWWLN8USJZxAgrtn1Nodjdd_O18PMLVwO1TH5wjnSWA",
  ];

  /* ---------- HTTP ---------- */

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

  /* ---------- cache helpers ---------- */

  function mergeOne(product) {
    if (!product) return null;
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === product.id) {
        products[i] = product;
        return product;
      }
    }
    products.unshift(product);
    return product;
  }

  function find(id) {
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === id) return products[i];
    }
    return null;
  }

  /* ---------- API publik ---------- */

  var api = {
    CATEGORIES: CATEGORIES,
    COLLECTIONS: COLLECTIONS,
    UPLOAD_DEMO_IMAGES: UPLOAD_DEMO_IMAGES,
    storageName: "SQLite (server)",
    request: request,

    /** Ambil ulang katalog dari server. */
    refresh: function (options) {
      var includeDrafts = !!(options && options.includeDrafts);
      return request("GET", "/products" + (includeDrafts ? "?includeDrafts=1" : "")).then(function (data) {
        products = Array.isArray(data.products) ? data.products : [];

        if (Array.isArray(data.categories) && data.categories.length) {
          api.CATEGORIES = [{ id: "all", label: "Semua Koleksi" }].concat(data.categories);
        }
        if (Array.isArray(data.collections) && data.collections.length) {
          api.COLLECTIONS = data.collections;
        }
        /* Server yang menentukan label penyimpanan (SQLite lokal atau D1). */
        if (data.storageLabel) {
          api.storageName = data.storageLabel;
        }
        return products;
      });
    },

    /** Katalog + favorit sekaligus — dipakai saat halaman dibuka. */
    boot: function (options) {
      return Promise.all([api.refresh(options), api.favorites.load()]).then(function () {
        return products;
      });
    },

    all: function () {
      return products.slice();
    },

    get: function (id) {
      return find(id);
    },

    first: function () {
      return products[0] || null;
    },

    collectionLabel: function (id) {
      for (var i = 0; i < api.COLLECTIONS.length; i++) {
        if (api.COLLECTIONS[i].id === id) return api.COLLECTIONS[i].label;
      }
      return id || "Desert Nocturne";
    },

    /** Simpan produk — otomatis POST kalau baru, PUT kalau sudah ada. */
    upsert: function (product) {
      var known = api.get(product.id);
      var path = known ? "/admin/products/" + encodeURIComponent(product.id) : "/admin/products";
      return request(known ? "PUT" : "POST", path, product).then(function (data) {
        return mergeOne(data.product);
      });
    },

    updatePrice: function (id, price) {
      return request("PATCH", "/admin/products/" + encodeURIComponent(id) + "/price", { price: price })
        .then(function (data) { return mergeOne(data.product); });
    },

    remove: function (id) {
      return request("DELETE", "/admin/products/" + encodeURIComponent(id)).then(function () {
        products = products.filter(function (p) { return p.id !== id; });
        return products.slice();
      });
    },

    reset: function () {
      return request("POST", "/admin/reset").then(function (data) {
        products = Array.isArray(data.products) ? data.products : [];
        return products.slice();
      });
    },

    stats: function () {
      return request("GET", "/admin/stats");
    },

    /** Kirim data URL gambar ke server, dapatkan URL publiknya. */
    uploadImage: function (dataUrl) {
      return request("POST", "/uploads", { dataUrl: dataUrl }).then(function (data) {
        return data.url;
      });
    },

    createEmpty: function () {
      return {
        id: "",
        name: "",
        concentration: "Eau de Parfum",
        collection: "desert-nocturne",
        badge: "",
        volume: "100ml",
        price: 0,
        categories: [],
        status: "active",
        updated: "Baru saja",
        rating: 0,
        reviews: 0,
        notes: "",
        sku: "",
        description: "",
        pyramid: { top: "", heart: "", base: "" },
        image: "",
        adminImage: "",
        gallery: [],
        sizes: [],
      };
    },
  };

  /* ---------- favorit (tersimpan di server per pengunjung) ---------- */

  api.favorites = {
    load: function () {
      return request("GET", "/favorites").then(function (data) {
        favoriteIds = Array.isArray(data.favorites) ? data.favorites : [];
        return favoriteIds.slice();
      });
    },
    list: function () { return favoriteIds.slice(); },
    has: function (id) { return favoriteIds.indexOf(id) !== -1; },
    toggle: function (id) {
      return request("POST", "/favorites", { productId: id }).then(function (data) {
        favoriteIds = Array.isArray(data.favorites) ? data.favorites : [];
        return !!data.favorited;
      });
    },
  };

  /* ---------- helper tampilan ---------- */

  api.formatIDR = function (value) {
    return "Rp " + Number(value || 0).toLocaleString("id-ID");
  };

  api.parseIDR = function (text) {
    var digits = String(text == null ? "" : text).replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  };

  api.abbreviate = function (value) {
    var n = Number(value) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(2).replace(/\.00$/, "") + "M";
    if (n >= 1000) return Math.round(n / 1000) + "K";
    return String(n);
  };

  api.statusLabel = function (status) {
    if (status === "critical") return "Koleksi Terbatas";
    if (status === "draft") return "Draft Kurator";
    return "Terpajang di Galeri";
  };

  api.statusBadge = function (status) {
    if (status === "critical") return "Koleksi Khusus";
    if (status === "draft") return "Draft";
    return "Aktif";
  };

  api.query = function (name) {
    try {
      return new URLSearchParams(global.location.search).get(name);
    } catch (e) {
      return null;
    }
  };

  /** Tampilkan pesan ramah saat backend tidak dapat dihubungi. */
  api.showOfflineNotice = function (err, container) {
    var host = container || document.querySelector("main") || document.body;
    if (!host) return;
    var message = (err && err.message) || "Tidak dapat menghubungi server.";
    host.innerHTML =
      '<section class="px-margin-mobile py-space-xl text-center flex flex-col items-center gap-space-sm">' +
      '<span class="material-symbols-outlined text-[40px] text-secondary">cloud_off</span>' +
      '<h1 class="font-headline-sm text-headline-sm text-primary uppercase tracking-tight">Server Tidak Terjangkau</h1>' +
      '<p class="font-body-md text-body-md text-on-surface-variant max-w-[320px]">' + message + "</p>" +
      '<p class="font-body-sm text-body-sm text-secondary max-w-[320px]">Jalankan <code class="px-1 bg-surface-container">npm start</code> di folder proyek, lalu muat ulang halaman ini.</p>' +
      '<button type="button" class="mt-space-sm px-space-md py-3 bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider" onclick="window.location.reload()">Muat Ulang</button>' +
      "</section>";
  };

  global.SaharaStore = api;
})(window);
