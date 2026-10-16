/* ============================================================
   SAHARA — Product detail controller
   Reads ?id=<productId> and hydrates the detail screen.
   ============================================================ */
(function () {
  "use strict";

  var Store = window.SaharaStore;
  var root = document.getElementById("detail-root");
  var id = Store.query("id");

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderEmpty(message) {
    root.innerHTML =
      '<div class="px-margin-mobile py-space-xl text-center"><p class="font-body-md text-body-md text-secondary">' +
      esc(message || "Katalog masih kosong.") +
      '</p><a href="index.html" class="inline-block mt-space-md px-space-md py-3 bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider">Kembali ke Koleksi</a></div>';
  }

  /* ---------- boot ---------- */
  Store.boot()
    .then(function () {
      /* Kalau id diminta secara eksplisit tetapi tidak ada (mis. sudah diarsipkan
         atau masih draft), tampilkan keadaan kosong — jangan pindah diam-diam
         ke produk lain. Tanpa id, tampilkan produk pertama. */
      var product = id ? Store.get(id) : Store.first();
      if (!product) {
        renderEmpty(id ? "Parfum ini belum tersedia di galeri publik." : "Katalog masih kosong.");
        return;
      }
      render(product);
    })
    .catch(function (err) {
      Store.showOfflineNotice(err, root);
    });

  function render(product) {
    /* ---------- static text ---------- */
    document.title = "SAHARA — " + product.name;
    document.getElementById("detail-collection").textContent = "Koleksi " + Store.collectionLabel(product.collection);
    document.getElementById("detail-title").textContent = product.name;
    document.getElementById("detail-subtitle").textContent =
      product.concentration + " — " + (product.volume || "100ml") + " Natural Spray";
    document.getElementById("detail-badge").textContent = product.concentration;
    document.getElementById("detail-description").textContent = product.description || product.notes || "";

    var rating = document.getElementById("detail-rating");
    var reviews = document.getElementById("detail-reviews");
    if (rating) rating.textContent = (product.rating || 0).toFixed(1);
    if (reviews) reviews.textContent = "(" + (product.reviews || 0) + ")";

    var py = product.pyramid || {};
    document.getElementById("note-top").textContent = py.top || "—";
    document.getElementById("note-heart").textContent = py.heart || "—";
    document.getElementById("note-base").textContent = py.base || "—";

    /* ---------- gallery ---------- */
    var slides = (product.gallery && product.gallery.length ? product.gallery : [product.image]).filter(Boolean).slice(0, 4);
    if (!slides.length) slides = [""];

    var slider = document.getElementById("gallery-slider");
    var dotsWrap = document.getElementById("gallery-dots");
    var counter = document.getElementById("gallery-counter");

    slider.innerHTML = slides
      .map(function (src) {
        return '<div class="w-full h-full flex-shrink-0 relative"><img class="w-full h-full object-cover" alt="' + esc(product.name) + '" src="' + esc(src) + '"></div>';
      })
      .join("");

    dotsWrap.innerHTML = slides
      .map(function (_, i) {
        return '<button aria-label="Foto ' + (i + 1) + '" class="gallery-dot h-1 rounded-full ' +
          (i === 0 ? "w-6 bg-primary" : "w-2 bg-outline-variant") + '" data-slide="' + i + '"></button>';
      })
      .join("");

    var totalSlides = slides.length;
    var currentSlide = 0;

    function setSlide(index) {
      currentSlide = ((index % totalSlides) + totalSlides) % totalSlides;
      slider.style.transform = "translateX(-" + currentSlide * 100 + "%)";
      counter.textContent = currentSlide + 1 + " / " + totalSlides;
      Array.prototype.forEach.call(dotsWrap.children, function (dot, i) {
        dot.classList.toggle("w-6", i === currentSlide);
        dot.classList.toggle("bg-primary", i === currentSlide);
        dot.classList.toggle("w-2", i !== currentSlide);
        dot.classList.toggle("bg-outline-variant", i !== currentSlide);
      });
    }

    dotsWrap.addEventListener("click", function (e) {
      var dot = e.target.closest("[data-slide]");
      if (dot) setSlide(Number(dot.dataset.slide));
    });

    /* basic touch swipe */
    var startX = null;
    slider.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 40) setSlide(currentSlide + (delta < 0 ? 1 : -1));
      startX = null;
    });

    setSlide(0);

    /* ---------- size selector ---------- */
    var sizes = (product.sizes && product.sizes.length)
      ? product.sizes
      : [{ volume: product.volume, label: (product.volume || "100ml") + " Flacon", sub: "Signature", price: product.price, desc: "" }];
    var sizeWrap = document.getElementById("size-options");
    var activeSize = sizes[sizes.length - 1];

    sizeWrap.innerHTML = sizes
      .map(function (s) {
        var isActive = s === activeSize;
        return (
          '<button type="button" class="size-option text-left p-3.5 bg-surface-container-low flex flex-col gap-1' + (isActive ? " active" : "") + '" ' +
          'data-price="' + s.price + '" data-label="' + esc(s.label) + '">' +
          '<div class="flex items-center justify-between">' +
          '<span class="size-name font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">' + esc(s.label) + "</span>" +
          '<span class="size-sub text-[11px] font-label-sm text-secondary uppercase">' + esc(s.sub || "") + "</span>" +
          "</div>" +
          '<span class="size-price font-headline-sm text-headline-sm text-on-surface font-light mt-1">' + Store.formatIDR(s.price) + "</span>" +
          '<p class="size-desc font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug text-left">' + esc(s.desc || "") + "</p>" +
          "</button>"
        );
      })
      .join("");

    /* paint the initially active size (defaults to the signature flacon) */
    document.getElementById("price-display").textContent = Store.formatIDR(activeSize.price);

    function selectSize(btn) {
      Array.prototype.forEach.call(sizeWrap.children, function (option) {
        var isActive = option === btn;
        option.classList.toggle("active", isActive);
        option.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      document.getElementById("price-display").textContent = Store.formatIDR(btn.dataset.price);
      showToast("Varian " + btn.dataset.label + " dipilih");
    }

    sizeWrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".size-option");
      if (btn) selectSize(btn);
    });

    /* ---------- wishlist ---------- */
    var wishlistIcon = document.getElementById("wishlist-icon");

    function paintWishlist(saved) {
      wishlistIcon.textContent = saved ? "bookmark" : "bookmark_border";
      wishlistIcon.style.fontVariationSettings = saved ? "'FILL' 1" : "'FILL' 0";
    }
    paintWishlist(Store.favorites.has(product.id));

    document.getElementById("wishlist-btn").addEventListener("click", function () {
      Store.favorites.toggle(product.id)
        .then(function (added) {
          paintWishlist(added);
          showToast(added ? "Tersimpan di Arsip Pribadi" : "Dihapus dari Arsip Pribadi");
        })
        .catch(function (err) {
          showToast(err.message);
        });
    });

    /* ---------- accordion ---------- */
    Array.prototype.forEach.call(document.querySelectorAll("[data-accordion]"), function (btn) {
      btn.addEventListener("click", function () {
        var panel = document.getElementById(btn.dataset.accordion);
        var icon = document.getElementById(btn.dataset.icon);
        var isHidden = panel.classList.contains("hidden");
        panel.classList.toggle("hidden", !isHidden);
        icon.classList.toggle("rotate-180", isHidden);
      });
    });

    /* ---------- toast ---------- */
    var toast = document.getElementById("toast");
    var toastText = document.getElementById("toast-text");
    var toastTimer;

    function showToast(message) {
      toastText.textContent = message;
      toast.classList.remove("opacity-0", "pointer-events-none");
      toast.classList.add("opacity-100");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toast.classList.remove("opacity-100");
        toast.classList.add("opacity-0", "pointer-events-none");
      }, 2200);
    }

    document.getElementById("concierge-btn").addEventListener("click", function () {
      showToast("Menghubungkan ke Concierge Sahara...");
    });
  }
})();
