/* ============================================================
   SAHARA — Koleksi (catalogue) page controller
   ============================================================ */
(function () {
  "use strict";

  var Store = window.SaharaStore;
  var grid = document.getElementById("perfume-grid");
  var searchInput = document.getElementById("perfume-search");
  var clearSearchBtn = document.getElementById("clear-search");
  var sortSelect = document.getElementById("sort-select");
  var resultCount = document.getElementById("result-count");
  var emptyState = document.getElementById("catalog-empty-state");
  var resetBtn = document.getElementById("reset-filter-btn");
  var pillBar = document.getElementById("category-pills");

  var state = { category: "all", query: "", sort: "populer" };
  var products = [];

  /* ---------- rendering ---------- */
  function escapeHtml(text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function cardHtml(p) {
    var fav = Store.favorites.has(p.id);
    var badge = p.badge
      ? '<span class="absolute top-2 left-2 px-1.5 py-0.5 bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest z-10">' +
        escapeHtml(p.badge) +
        "</span>"
      : "";

    return (
      '<article class="perfume-card group flex flex-col bg-surface-container-lowest border border-surface-variant transition-all duration-300 cursor-pointer" ' +
      'data-id="' + p.id + '" data-category="' + escapeHtml((p.categories || []).join(" ")) + '" data-price="' + p.price + '">' +
      '<div class="relative w-full aspect-[3/4] bg-surface-container-low overflow-hidden flex items-center justify-center p-3">' +
      badge +
      '<button data-fav="' + p.id + '" aria-label="Favorit ' + escapeHtml(p.name) + '" class="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-primary bg-surface/80 backdrop-blur-sm z-10 transition-transform active:scale-90">' +
      '<span class="material-symbols-outlined text-[16px]" style="font-variation-settings: \'FILL\' ' + (fav ? 1 : 0) + '">' + (fav ? "favorite" : "favorite_border") + "</span>" +
      "</button>" +
      '<img class="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" alt="' + escapeHtml(p.name) + '" src="' + escapeHtml(p.image) + '">' +
      '<div class="absolute bottom-1 right-2 font-label-sm text-label-sm text-secondary uppercase tracking-widest">' + escapeHtml(p.volume) + "</div>" +
      "</div>" +
      '<div class="p-3 flex flex-col justify-between flex-1 border-t border-surface-variant">' +
      "<div>" +
      '<span class="font-label-sm text-label-sm uppercase tracking-widest text-secondary block mb-1">' + escapeHtml(p.concentration) + "</span>" +
      '<h2 class="font-headline-sm text-[16px] leading-tight text-primary font-normal group-hover:underline underline-offset-4 line-clamp-2">' + escapeHtml(p.name) + "</h2>" +
      '<p class="font-body-sm text-[11px] leading-relaxed text-on-surface-variant line-clamp-2 mt-1">' + escapeHtml(p.notes) + "</p>" +
      "</div>" +
      '<div class="mt-3 pt-2 border-t border-surface-container flex items-center justify-between">' +
      '<span class="font-label-md text-label-md text-primary font-semibold">' + Store.formatIDR(p.price) + "</span>" +
      '<span class="font-label-sm text-label-sm uppercase tracking-wider text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform"><span class="hidden xs:block">Detail</span><span class="material-symbols-outlined text-[15px]">arrow_forward</span></span>' +
      "</div></div></article>"
    );
  }

  function matches(p) {
    if (state.category !== "all" && (p.categories || []).indexOf(state.category) === -1) return false;
    if (!state.query) return true;
    var haystack = [p.name, p.concentration, p.notes, p.description, p.volume, p.sku, Store.collectionLabel(p.collection)]
      .concat(p.categories || [])
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(state.query) !== -1;
  }

  function sorted(list) {
    var copy = list.slice();
    if (state.sort === "harga-tinggi") return copy.sort(function (a, b) { return b.price - a.price; });
    if (state.sort === "harga-rendah") return copy.sort(function (a, b) { return a.price - b.price; });
    if (state.sort === "populer") return copy.sort(function (a, b) { return (b.reviews || 0) - (a.reviews || 0); });
    return copy; /* terbaru — store order (newest inserted first) */
  }

  function render() {
    var visible = sorted(products.filter(matches));

    grid.innerHTML = visible.map(cardHtml).join("");

    resultCount.textContent = visible.length + (visible.length === 1 ? " Flacon" : " Flacons");

    var isEmpty = visible.length === 0;
    grid.classList.toggle("hidden", isEmpty);
    emptyState.classList.toggle("hidden", !isEmpty);
    emptyState.classList.toggle("flex", isEmpty);
  }

  /* ---------- category pills ---------- */
  function buildPills() {
    pillBar.innerHTML = Store.CATEGORIES.map(function (cat) {
      var count = cat.id === "all"
        ? products.length
        : products.filter(function (p) { return (p.categories || []).indexOf(cat.id) !== -1; }).length;
      var active = cat.id === state.category;
      var cls = active
        ? "bg-primary text-on-primary border-primary"
        : "bg-surface-container-lowest text-secondary border-surface-variant hover:border-primary";
      return (
        '<button class="filter-pill whitespace-nowrap px-3.5 py-1.5 font-label-sm text-label-sm uppercase tracking-widest border transition-all duration-200 ' +
        cls + '" data-category="' + cat.id + '">' + escapeHtml(cat.label) + " (" + count + ")</button>"
      );
    }).join("");
  }

  function setCategory(id) {
    state.category = id;
    Array.prototype.forEach.call(pillBar.children, function (btn) {
      var active = btn.dataset.category === id;
      btn.classList.toggle("bg-primary", active);
      btn.classList.toggle("text-on-primary", active);
      btn.classList.toggle("border-primary", active);
      btn.classList.toggle("bg-surface-container-lowest", !active);
      btn.classList.toggle("text-secondary", !active);
      btn.classList.toggle("border-surface-variant", !active);
    });
    render();
  }

  /* ---------- events ---------- */
  pillBar.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-pill");
    if (btn) setCategory(btn.dataset.category);
  });

  searchInput.addEventListener("input", function () {
    state.query = searchInput.value.toLowerCase().trim();
    clearSearchBtn.classList.toggle("hidden", state.query === "");
    render();
  });

  clearSearchBtn.addEventListener("click", function () {
    searchInput.value = "";
    state.query = "";
    clearSearchBtn.classList.add("hidden");
    render();
  });

  sortSelect.addEventListener("change", function () {
    state.sort = sortSelect.value;
    render();
  });

  grid.addEventListener("click", function (e) {
    var favBtn = e.target.closest("[data-fav]");
    if (favBtn) {
      var id = favBtn.dataset.fav;
      var icon = favBtn.querySelector(".material-symbols-outlined");
      Store.favorites.toggle(id).then(function (added) {
        icon.textContent = added ? "favorite" : "favorite_border";
        icon.style.fontVariationSettings = added ? "'FILL' 1" : "'FILL' 0";
      }).catch(function (err) {
        Store.showOfflineNotice(err);
      });
      return;
    }
    var card = e.target.closest(".perfume-card");
    if (card) window.location.href = "detail.html?id=" + encodeURIComponent(card.dataset.id);
  });

  resetBtn.addEventListener("click", function () {
    searchInput.value = "";
    state.query = "";
    clearSearchBtn.classList.add("hidden");
    sortSelect.value = "populer";
    state.sort = "populer";
    setCategory("all");
    buildPills();
    setCategory("all");
  });

  /* ---------- boot ---------- */
  Store.boot()
    .then(function () {
      products = Store.all().filter(function (p) { return p.status !== "draft"; });
      var heroCount = document.getElementById("hero-count");
      if (heroCount) heroCount.textContent = products.length + " Formulasi Terpilih";
      buildPills();
      render();
    })
    .catch(function (err) {
      Store.showOfflineNotice(err);
    });
})();
