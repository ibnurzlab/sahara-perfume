/* ============================================================
   SAHARA — Admin panel controller
   Semua data diambil dari backend; setiap perubahan menulis ke
   database lalu memuat ulang daftar dari server.
   ============================================================ */
(function () {
  "use strict";

  window.SaharaAuth.guardOrHide().then(function (allowed) {
    if (!allowed) return;
    try {
      init();
    } catch (err) {
      window.SaharaStore.showOfflineNotice(err);
    }
  });

  function init() {
    var Store = window.SaharaStore;
    var Auth = window.SaharaAuth;

    var listEl = document.getElementById("product-list");
    var tabs = document.querySelectorAll(".filter-tab");
    var emptyState = document.getElementById("admin-empty-state");
    var modal = document.getElementById("quick-edit-sheet");
    var priceInput = document.getElementById("quick-price-input");
    var toast = document.getElementById("toast");
    var toastMsg = document.getElementById("toast-msg");

    var filter = "all";
    var editTargetId = null;

    function esc(t) {
      return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    /* ---------- toast ---------- */
    var toastTimer;
    function showToast(message) {
      toastMsg.textContent = message;
      toast.classList.remove("opacity-0");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.add("opacity-0"); }, 2400);
    }

    function fail(err) {
      showToast(err.message || "Terjadi kesalahan.");
    }

    /* ---------- rendering ---------- */
    function cardHtml(p) {
      return (
        '<article class="product-card bg-surface-container-lowest p-space-sm rounded-lg shadow-sm flex flex-col gap-space-xs" data-id="' + p.id + '" data-status="' + p.status + '">' +
        '<div class="flex gap-space-sm">' +
        '<div class="w-20 h-24 bg-surface-container rounded overflow-hidden shrink-0 relative">' +
        '<img class="w-full h-full object-cover" alt="' + esc(p.name) + '" src="' + esc(p.adminImage || p.image) + '">' +
        '<span class="absolute top-1 left-1 bg-primary text-on-primary font-label-sm text-[8px] px-1 py-0.5 rounded uppercase">' + esc(p.volume) + "</span>" +
        "</div>" +
        '<div class="flex flex-col justify-between flex-1 min-w-0">' +
        '<div class="flex items-start justify-between gap-1">' +
        '<div class="min-w-0">' +
        '<span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest block truncate">' + esc(p.concentration) + "</span>" +
        '<h3 class="font-headline-sm text-headline-sm text-on-surface truncate">' + esc(p.name) + "</h3>" +
        "</div>" +
        '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm shrink-0">' +
        '<span class="w-1.5 h-1.5 rounded-full bg-primary"></span> ' + esc(Store.statusBadge(p.status)) + "</span>" +
        "</div>" +
        '<div class="flex items-baseline justify-between mt-1">' +
        '<div class="cursor-pointer group flex items-center gap-1 quick-price-edit" data-id="' + p.id + '">' +
        '<span class="font-body-md text-body-md font-semibold text-on-surface" id="price-display-' + p.id + '">' + Store.formatIDR(p.price) + "</span>" +
        '<span class="material-symbols-outlined text-[14px] text-secondary opacity-60 group-hover:opacity-100">edit</span>' +
        "</div>" +
        '<span class="font-body-sm text-body-sm text-secondary">Status: <strong class="text-on-surface font-semibold">' + esc(Store.statusLabel(p.status)) + "</strong></span>" +
        "</div></div></div>" +
        '<div class="flex items-center justify-between pt-space-xs bg-surface-container-low px-space-sm py-1.5 rounded">' +
        '<span class="font-label-sm text-label-sm text-secondary flex items-center gap-1">' +
        '<span class="material-symbols-outlined text-[14px]">history</span> ' + esc(p.updated || "Stabil") + "</span>" +
        '<div class="flex items-center gap-1">' +
        '<button class="action-edit h-7 px-2.5 bg-surface-container-lowest text-on-surface rounded font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-transform" data-id="' + p.id + '">' +
        '<span class="material-symbols-outlined text-[14px]">tune</span> Kelola</button>' +
        '<button class="action-delete w-7 h-7 bg-surface-container-lowest text-secondary hover:text-error rounded flex items-center justify-center active:scale-95 transition-transform" data-id="' + p.id + '" data-name="' + esc(p.name) + '">' +
        '<span class="material-symbols-outlined text-[14px]">delete</span></button>' +
        "</div></div></article>"
      );
    }

    function renderList() {
      var all = Store.all();
      var visible = all.filter(function (p) {
        if (filter === "all") return true;
        return p.status === filter;
      });

      listEl.innerHTML = visible.map(cardHtml).join("");
      emptyState.classList.toggle("hidden", visible.length !== 0);
      emptyState.classList.toggle("flex", visible.length === 0);

      /* tab counters */
      Array.prototype.forEach.call(tabs, function (t) {
        var counts = { all: all.length, critical: 0, draft: 0 };
        all.forEach(function (p) { if (counts[p.status] != null) counts[p.status]++; });
        var labels = { all: "Semua Produk", critical: "Edisi Terbatas", draft: "Draft" };
        t.textContent = labels[t.dataset.filter] + " (" + counts[t.dataset.filter] + ")";
      });

      document.getElementById("storage-mode").textContent = Store.storageName;
    }

    function renderStats() {
      return Store.stats().then(function (s) {
        document.getElementById("stat-variants").textContent = s.variants;
        document.getElementById("stat-average").textContent = Store.abbreviate(s.average);
        document.getElementById("stat-editions").textContent = s.editions;
      });
    }

    /** Muat ulang daftar dari server, lalu gambar ulang layar. */
    function reload() {
      return Store.refresh({ includeDrafts: true })
        .then(function () {
          renderList();
          return renderStats();
        })
        .catch(fail);
    }

    /* ---------- tabs ---------- */
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener("click", function () {
        Array.prototype.forEach.call(tabs, function (t) {
          t.classList.remove("bg-primary", "text-on-primary");
          t.classList.add("bg-surface-container-high", "text-on-surface-variant");
        });
        tab.classList.add("bg-primary", "text-on-primary");
        tab.classList.remove("bg-surface-container-high", "text-on-surface-variant");
        filter = tab.dataset.filter;
        renderList();
      });
    });

    /* ---------- list interactions ---------- */
    listEl.addEventListener("click", function (e) {
      var priceTrigger = e.target.closest(".quick-price-edit");
      if (priceTrigger) {
        editTargetId = priceTrigger.dataset.id;
        var p = Store.get(editTargetId);
        priceInput.value = p ? p.price : "";
        modal.classList.add("flex");
        modal.classList.remove("hidden");
        priceInput.focus();
        priceInput.select();
        return;
      }

      var del = e.target.closest(".action-delete");
      if (del) {
        e.stopPropagation();
        var card = del.closest(".product-card");
        var name = del.dataset.name;
        if (card) card.classList.add("scale-95", "opacity-30", "transition-all");
        Store.remove(del.dataset.id)
          .then(function () {
            showToast(name + " Diarsipkan");
            return reload();
          })
          .catch(function (err) {
            if (card) card.classList.remove("scale-95", "opacity-30");
            fail(err);
          });
        return;
      }

      var kelola = e.target.closest(".action-edit");
      if (kelola) {
        e.stopPropagation();
        showToast("Membuka Drawer Konfigurasi...");
        setTimeout(function () { window.location.href = "upload.html?id=" + encodeURIComponent(kelola.dataset.id); }, 450);
      }
    });

    /* ---------- modal ---------- */
    function hideModal() {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }

    document.getElementById("close-modal-btn").addEventListener("click", hideModal);
    document.getElementById("cancel-modal-btn").addEventListener("click", hideModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) hideModal(); });

    document.getElementById("save-price-btn").addEventListener("click", function () {
      if (!editTargetId) return;
      var value = Store.parseIDR(priceInput.value);
      if (!value) { showToast("Nominal tidak valid"); return; }
      var id = editTargetId;
      hideModal();
      Store.updatePrice(id, value)
        .then(function () {
          showToast("Harga Berhasil Diperbarui");
          return reload();
        })
        .catch(fail);
    });

    /* ---------- header actions ---------- */
    document.getElementById("btn-create-product").addEventListener("click", function () {
      showToast("Mengalihkan ke Studio Kurasi Flacon...");
      setTimeout(function () { window.location.href = "upload.html"; }, 450);
    });

    document.getElementById("reset-catalogue-btn").addEventListener("click", function () {
      if (!window.confirm("Kembalikan katalog ke data contoh? Semua perubahan akan dihapus.")) return;
      Store.reset()
        .then(function () {
          filter = "all";
          showToast("Katalog direset ke data contoh");
          return reload();
        })
        .catch(fail);
    });

    document.getElementById("logout-btn").addEventListener("click", function () {
      Auth.logout().then(function () {
        window.location.href = "login.html";
      });
    });

    document.getElementById("current-user").textContent = Auth.currentUser();

    /* ---------- boot ---------- */
    reload();
  }
})();
