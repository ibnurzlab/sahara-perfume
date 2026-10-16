/* ============================================================
   SAHARA — Create / edit perfume controller
   Menyimpan ke backend; gambar diunggah dan disimpan di server.
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
    var editId = Store.query("id");

    /* ---------- element refs ---------- */
    var form = document.getElementById("perfumeForm");
    var progress = document.getElementById("formProgress");
    var imageInput = document.getElementById("imageInput");
    var previewGrid = document.getElementById("previewGrid");
    var mediaCounter = document.getElementById("mediaCounter");
    var nameInput = document.getElementById("perfumeName");
    var collectionSelect = document.getElementById("collectionSelect");
    var badgeInput = document.getElementById("badgeInput");
    var categoryChips = document.getElementById("categoryChips");
    var volumeGroup = document.getElementById("volumeGroup");
    var priceRegular = document.getElementById("priceRegular");
    var skuCode = document.getElementById("skuCode");
    var narrativeInput = document.getElementById("narrativeText");
    var counterLabel = document.getElementById("charCounter");
    var noteTop = document.getElementById("noteTopInput");
    var noteHeart = document.getElementById("noteHeartInput");
    var noteBase = document.getElementById("noteBaseInput");
    var statusGroup = document.getElementById("statusGroup");
    var toastEl = document.getElementById("toastNotification");
    var toastMsg = document.getElementById("toastMessage");

    /* ---------- toast ---------- */
    var toastTimer;
    function triggerToast(message) {
      toastMsg.textContent = message;
      toastEl.classList.remove("opacity-0", "pointer-events-none");
      toastEl.classList.add("opacity-100");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toastEl.classList.remove("opacity-100");
        toastEl.classList.add("opacity-0", "pointer-events-none");
      }, 2500);
    }

    /* ---------- muat data lalu hydrate formulir ---------- */
    Store.refresh({ includeDrafts: true })
      .then(function () {
        var product = editId ? Store.get(editId) : null;
        var isEdit = !!product;
        if (!isEdit) product = Store.createEmpty();
        hydrate(product, isEdit);
      })
      .catch(function (err) {
        Store.showOfflineNotice(err);
      });

    function hydrate(product, isEdit) {
      var selectedCategories = (product.categories || []).slice();
      var selectedVolume = product.volume || "100ml";
      var selectedStatus = product.status === "draft" ? "draft" : "live";
      var images = (product.gallery && product.gallery.length ? product.gallery.slice(0, 5) : []);

      /* ---------- header / mode ---------- */
      document.getElementById("pageTitle").textContent = isEdit ? "Kelola Parfum" : "Upload Parfum Baru";
      document.getElementById("pageSubtitle").textContent = isEdit ? product.name : "Tambah Parfum Baru";
      document.getElementById("publishLabel").textContent = isEdit ? "Simpan Perubahan" : "Publikasikan Produk";

      /* ---------- collections ---------- */
      collectionSelect.innerHTML = Store.COLLECTIONS.map(function (c) {
        return '<option value="' + c.id + '"' + (c.id === product.collection ? " selected" : "") + ">" + c.label + "</option>";
      }).join("");

      /* ---------- category chips ---------- */
      function paintCategories() {
        Array.prototype.forEach.call(categoryChips.children, function (chip) {
          var on = selectedCategories.indexOf(chip.dataset.category) !== -1;
          chip.classList.toggle("bg-primary", on);
          chip.classList.toggle("text-on-primary", on);
          chip.classList.toggle("border-primary", on);
          chip.classList.toggle("bg-surface-container-low", !on);
          chip.classList.toggle("text-secondary", !on);
          chip.classList.toggle("border-transparent", !on);
        });
      }

      categoryChips.innerHTML = Store.CATEGORIES.filter(function (c) { return c.id !== "all"; })
        .map(function (c) {
          return '<button type="button" class="cat-chip px-3 py-1.5 border font-label-sm text-label-sm uppercase tracking-wider transition-all" data-category="' + c.id + '">' + c.label + "</button>";
        })
        .join("");

      categoryChips.addEventListener("click", function (e) {
        var chip = e.target.closest(".cat-chip");
        if (!chip) return;
        var id = chip.dataset.category;
        var idx = selectedCategories.indexOf(id);
        if (idx === -1) selectedCategories.push(id);
        else selectedCategories.splice(idx, 1);
        paintCategories();
      });
      paintCategories();

      /* ---------- volume ---------- */
      function paintVolume() {
        Array.prototype.forEach.call(volumeGroup.children, function (btn) {
          var on = btn.dataset.volume === selectedVolume;
          btn.classList.toggle("bg-primary", on);
          btn.classList.toggle("text-on-primary", on);
          btn.classList.toggle("shadow-sm", on);
          btn.classList.toggle("bg-surface-container-low", !on);
          btn.classList.toggle("text-on-surface", !on);
          var sub = btn.querySelector("span:last-child");
          if (sub) {
            sub.classList.toggle("text-on-primary-container", on);
            sub.classList.toggle("text-secondary", !on);
          }
          btn.setAttribute("aria-pressed", on ? "true" : "false");
        });
      }
      volumeGroup.addEventListener("click", function (e) {
        var btn = e.target.closest(".vol-btn");
        if (!btn) return;
        selectedVolume = btn.dataset.volume;
        paintVolume();
        syncProgress();
      });
      paintVolume();

      /* ---------- status ---------- */
      function paintStatus() {
        Array.prototype.forEach.call(statusGroup.children, function (card) {
          var on = card.dataset.status === selectedStatus;
          card.classList.toggle("bg-primary", on);
          card.classList.toggle("text-on-primary", on);
          card.classList.toggle("shadow-sm", on);
          card.classList.toggle("bg-surface-container-low", !on);
          card.classList.toggle("text-on-surface", !on);
          var radio = card.querySelector('input[type="radio"]');
          if (radio) radio.checked = on;
          var dot = card.querySelector("span.rounded-full");
          if (dot) dot.className = on ? "w-3 h-3 rounded-full bg-on-primary" : "w-3 h-3 rounded-full bg-surface-variant";
          var icon = card.querySelector(".material-symbols-outlined");
          if (icon) icon.classList.toggle("text-secondary", !on);
        });
      }
      statusGroup.addEventListener("click", function (e) {
        var card = e.target.closest(".status-toggle");
        if (!card) return;
        selectedStatus = card.dataset.status;
        paintStatus();
      });
      paintStatus();

      /* ---------- image previews ---------- */
      function paintPreviews() {
        previewGrid.innerHTML = images
          .map(function (src, i) {
            var badgeClass = i === 0
              ? "bg-primary text-on-primary"
              : "bg-surface-container-high text-on-surface-variant";
            return (
              '<div class="relative group aspect-[3/4] bg-surface-container overflow-hidden" data-src="' + i + '">' +
              '<img class="w-full h-full object-cover" alt="Pratinjau ' + (i + 1) + '" src="' + src + '">' +
              '<div class="absolute top-1.5 left-1.5 ' + badgeClass + ' font-label-sm text-label-sm uppercase px-1.5 py-0.5 tracking-wider shadow-sm">' +
              (i === 0 ? "Utama" : "Foto") + "</div>" +
              '<button type="button" data-remove="' + i + '" aria-label="Hapus foto" class="absolute top-1.5 right-1.5 w-6 h-6 bg-surface/90 text-primary flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">' +
              '<span class="material-symbols-outlined text-[14px]">close</span></button></div>'
            );
          })
          .join("");
        mediaCounter.textContent = images.length + "/5 Terisi";
        syncProgress();
      }

      previewGrid.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-remove]");
        if (!btn) return;
        images.splice(Number(btn.dataset.remove), 1);
        paintPreviews();
      });

      /** Kompres berkas menjadi JPEG kecil sebelum dikirim ke server. */
      function fileToThumbnail(file) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () {
            var img = new Image();
            img.onload = function () {
              try {
                var maxW = 720;
                var scale = Math.min(1, maxW / img.width);
                var canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.72));
              } catch (err) {
                resolve(reader.result);
              }
            };
            img.onerror = function () { resolve(null); };
            img.src = reader.result;
          };
          reader.onerror = function () { resolve(null); };
          reader.readAsDataURL(file);
        });
      }

      imageInput.addEventListener("change", function () {
        var files = Array.prototype.slice.call(imageInput.files || []);
        var room = Math.max(0, 5 - images.length);
        var slice = files.slice(0, room);
        if (!slice.length) { imageInput.value = ""; return; }

        mediaCounter.textContent = "Mengunggah...";

        Promise.all(slice.map(fileToThumbnail))
          .then(function (thumbs) {
            var ready = thumbs.filter(Boolean);
            return Promise.all(ready.map(function (dataUrl) {
              return Store.uploadImage(dataUrl).then(function (url) { return url; });
            }));
          })
          .then(function (urls) {
            urls.forEach(function (url) { images.push(url); });
            paintPreviews();
            imageInput.value = "";
            if (urls.length) triggerToast(urls.length + " foto tersimpan di server.");
          })
          .catch(function (err) {
            paintPreviews();
            imageInput.value = "";
            triggerToast(err.message || "Gagal mengunggah foto.");
          });
      });

      /* ---------- narrative counter ---------- */
      function syncCounter() {
        counterLabel.textContent = narrativeInput.value.length + " / 500 Karakter";
      }
      narrativeInput.addEventListener("input", syncCounter);

      /* ---------- progress ---------- */
      function syncProgress() {
        var checks = [
          images.length > 0,
          nameInput.value.trim() !== "",
          selectedCategories.length > 0,
          Store.parseIDR(priceRegular.value) > 0,
          narrativeInput.value.trim() !== "",
          noteTop.value.trim() !== "" || noteHeart.value.trim() !== "" || noteBase.value.trim() !== "",
        ];
        var filled = checks.filter(Boolean).length;
        progress.style.width = Math.max(Math.round((filled / checks.length) * 100), 5) + "%";
      }

      form.addEventListener("input", syncProgress);

      /* ---------- hydrate fields ---------- */
      nameInput.value = product.name || "";
      badgeInput.value = product.badge || "";
      priceRegular.value = product.price ? Number(product.price).toLocaleString("id-ID") : "";
      skuCode.value = product.sku || "";
      narrativeInput.value = product.description || "";
      noteTop.value = (product.pyramid && product.pyramid.top) || "";
      noteHeart.value = (product.pyramid && product.pyramid.heart) || "";
      noteBase.value = (product.pyramid && product.pyramid.base) || "";
      if (!images.length) images = isEdit ? [] : Store.UPLOAD_DEMO_IMAGES.slice();
      paintPreviews();
      syncCounter();
      syncProgress();

      priceRegular.addEventListener("input", function () {
        var value = Store.parseIDR(priceRegular.value);
        priceRegular.value = value ? value.toLocaleString("id-ID") : "";
        syncProgress();
      });

      /* ---------- save ---------- */
      function collect(status) {
        var price = Store.parseIDR(priceRegular.value);
        var name = nameInput.value.trim() || "Parfum Tanpa Nama";
        var volume = selectedVolume;

        var sizes = [
          {
            volume: "50ml",
            label: "50ml Nomade",
            sub: "Travel Size",
            price: Math.round((price * 0.67) / 50000) * 50000,
            desc: "Konsentrasi Extrait 24%. Sempurna untuk mobilitas dan layering aromatik.",
          },
          {
            volume: volume,
            label: volume + " Flacon",
            sub: "Signature",
            price: price,
            desc: "Konsentrasi Extrait 28%. Botol kaca obsidian berbobot dengan penutup magnetik.",
          },
        ];

        var gallery = images.slice(0, 4);
        return {
          id: product.id,
          name: name,
          concentration: product.concentration || "Eau de Parfum",
          collection: collectionSelect.value,
          badge: badgeInput.value.trim(),
          volume: volume,
          price: price,
          categories: selectedCategories.slice(),
          status: status,
          updated: "Baru saja",
          rating: product.rating || 0,
          reviews: product.reviews || 0,
          notes: [noteTop.value.trim(), noteHeart.value.trim(), noteBase.value.trim()].filter(Boolean).join(" / ") || product.notes || "",
          sku: skuCode.value.trim().toUpperCase(),
          description: narrativeInput.value.trim(),
          pyramid: {
            top: noteTop.value.trim(),
            heart: noteHeart.value.trim(),
            base: noteBase.value.trim(),
          },
          image: gallery[0] || product.image || "",
          adminImage: gallery[0] || product.adminImage || product.image || "",
          gallery: gallery,
          sizes: sizes,
        };
      }

      function persist(status, message, redirect) {
        if (!nameInput.value.trim()) {
          triggerToast("Nama parfum belum diisi.");
          nameInput.focus();
          return;
        }
        Store.upsert(collect(status))
          .then(function (saved) {
            product = saved;
            triggerToast(message);
            setTimeout(function () { window.location.href = redirect || "admin.html"; }, 1100);
          })
          .catch(function (err) {
            triggerToast(err.message || "Gagal menyimpan produk.");
          });
      }

      document.getElementById("publishBtn").addEventListener("click", function () {
        persist("active", isEdit ? "Perubahan tersimpan & dipublikasikan!" : "Katalog parfum berhasil dipublikasikan!");
      });

      document.getElementById("saveDraftBtn").addEventListener("click", function () {
        persist("draft", "Draft katalog parfum tersimpan.");
      });

      document.getElementById("secondaryDraftBtn").addEventListener("click", function () {
        persist("draft", "Draft berhasil diperbarui.");
      });

      document.getElementById("previewBtn").addEventListener("click", function () {
        if (!nameInput.value.trim()) {
          triggerToast("Nama parfum belum diisi.");
          nameInput.focus();
          return;
        }
        Store.upsert(collect(selectedStatus === "draft" ? "draft" : "active"))
          .then(function (saved) {
            product = saved;
            triggerToast("Membuka pratinjau editorial...");
            setTimeout(function () { window.location.href = "detail.html?id=" + encodeURIComponent(saved.id); }, 900);
          })
          .catch(function (err) {
            triggerToast(err.message || "Gagal membuka pratinjau.");
          });
      });

      document.getElementById("cancelBtn").addEventListener("click", function () {
        window.location.href = "admin.html";
      });
    }
  }
})();
