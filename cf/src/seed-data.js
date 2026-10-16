/* ============================================================
   SAHARA — data contoh katalog untuk backend Cloudflare
   DIHASILKAN OTOMATIS dari backend/db/seed-data.js
   Jangan disunting manual; jalankan scripts/generate-seed-migration.js
   ============================================================ */

export const CATEGORIES = [
  {
    "id": "oud-amber",
    "label": "Oud & Amber"
  },
  {
    "id": "woody-smoky",
    "label": "Woody & Smoky"
  },
  {
    "id": "floral-noir",
    "label": "Floral Noir"
  },
  {
    "id": "citrus-mineral",
    "label": "Citrus Mineral"
  }
];

export const COLLECTIONS = [
  {
    "id": "desert-nocturne",
    "label": "Desert Nocturne (Édition Privée)"
  },
  {
    "id": "oasis-blanc",
    "label": "L'Oasis Blanc"
  },
  {
    "id": "nomad-heritage",
    "label": "Nomad Heritage Monograph"
  },
  {
    "id": "sol-oriental",
    "label": "Sol Oriental Infini"
  }
];

/** Salinan baru setiap pemanggilan supaya pemanggil bebas mengubahnya. */
export function seedProducts() {
  return JSON.parse(JSON.stringify(SEED_PRODUCTS));
}

const SEED_PRODUCTS = [
  {
    "id": "p1",
    "name": "Dune Noire",
    "concentration": "Eau de Parfum",
    "collection": "desert-nocturne",
    "badge": "Terlaris",
    "volume": "100ml",
    "price": 2450000,
    "categories": [
      "oud-amber",
      "woody-smoky"
    ],
    "status": "active",
    "updated": "Update 2j lalu",
    "rating": 4.9,
    "reviews": 128,
    "notes": "Black Amber / Smoked Cedar / Pink Pepper",
    "sku": "SHR-DN-100",
    "description": "Terinspirasi dari heningnya malam gurun pasir Sahara. Dune Noire memadukan kehangatan amber pekat dengan sentuhan kayu berasap yang memikat dan bertahan anggun lebih dari 14 jam pada kulit.",
    "pyramid": {
      "top": "Smoked Bergamot, Pink Peppercorn, Wild Saffron",
      "heart": "Black Iris, French Labdanum, Oud Wood",
      "base": "Madagascar Amber, Birch Tar, Dark Musk"
    },
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuCPgKNKrL3Zc6WIlsHLDz2WWVI9kE3ELcWW1VUpSB2fl261sqSj7MxvrMsOD_e3nddKEUIf_Hg-svhkj7TfeDib7b4bZyAqifRAnvhkeE8Q5hcfxQae3BkiRVJPAfdunTFj__N7oyB3cca_uATioWC1bGgmUFDb21HldCGtV8yt-6DVl_bhmi_Ax2j0b8wB3qqigzm246_RmzBpSUu4fmxMlsGcfKwiWE7763wK5PLaBombtzvwPi0ZNw",
    "adminImage": "https://lh3.googleusercontent.com/aida-public/AB6AXuCsooi7QbBA-C3n2to4u-aPxI6SmFuSIAM0Qy2cV1NZnYZvYIkznIiVyZJnr3Fco6_GZwGPYSRb6SqJamS7MeFk66O-UBtcxvDIkbqd7zqmoRpI-Gqx6ATkbQc0QjUc4HIn3KnobcR2XH5vbi54J5Q7DCp5vI44cINMivKdnpp2NRRwAo2CKRiaQoHSPF4G0XxbnDUWGexUiAGfPJppNLTIa6r40bb0xd9G_LAgveckcd0g2LNvHdLKqQ",
    "gallery": [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAJLkL6ib8YZfh58mvp2nDbW4MzBO4sDDsMI-C3e745g5R2_ZT8KfgirmCMW7GInerr7ZpvFKaJTA0kxUyhkf-HiWnIGXC5DRh3XDv2WGdsOlKYJAtI46B5Lna6iq134H7hTrIIkC3jy7WgPgbMgm5Xq_XvJXRkqlZvugXTU-Jrk5TMo0sX9P0objJq9fMMsIbJb0bDuc7YY9XpPnYLg2lymWu7g3nvUGLQN5KSztYY8U0vwugCm429_Q",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCtoOA-RankkC5PkbBGw9clZ7LBneF-0wdDM7QWPFWHUGojWzxLRKUauxLg8eaAKbBgEhUApCn6EmNR2YO6RXxVa3P3Z2k0mt-NJK22Eyu0wc-JbMQyo93_yCGTXAlovH9P1qxzvqu8RwmnSr8p5AoMsqNKh8qxSIhj-wxuYo2KfPA0iHKX_fI6oW5S4IoKx6XvLdVIx9wnYuZYEd4yud7G5PSp72J3nPpPv2eI_GvohUSfULpzrZVDDA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDC73G01flCqwT6Q-_cJg9hlVjvM45s8bg_H8kYd_SAI1mNhXGYvvsF8ObG35GryVs6vl1r3KehuM07GpCA-y_OB3Tq6hfMqlMYl2_UEhsVuWNGEs_8_EYNXcFATogdSM3YUG3RqUc0mqPOMI_vbH1yXzIfLK1gKFO4X28ycXhKmS_iobA4GkQb2MAM4dI1Z-JaOs8SSc82yHjV43GxOVpMFxve7qoZnu1uLm9FPFlFx1SYyj-DL-I0RA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBD06dKDFqrGT6FPmyOYBKSySKUOc7BtOb2AREJ2tEM3eky3jV9VXUfjOfMM32MgcUOSrWI20W9BE_nEl2CoXBgFgm2zB2FbhmIG27cg_tbKOJuvwDpB518ZUhZ4zv4lWcBsrxL9yc7R7h4i0B4KHq4QUbXoBHVnQOFi3q8AE8yI5fgqgypxTea4u98iGtIq9QH0Ls3n-hu_o2PzjIyZk41h4Nifw49KwDkjmRlAFB3TFergd09ehePsQ"
    ],
    "sizes": [
      {
        "volume": "50ml",
        "label": "50ml Nomade",
        "sub": "Travel Size",
        "price": 1650000,
        "desc": "Konsentrasi Extrait 24%. Sempurna untuk mobilitas dan layering aromatik."
      },
      {
        "volume": "100ml",
        "label": "100ml Flacon",
        "sub": "Signature",
        "price": 2450000,
        "desc": "Konsentrasi Extrait 28%. Botol kaca obsidian berbobot dengan penutup magnetik."
      }
    ]
  },
  {
    "id": "p2",
    "name": "Sable Blanc",
    "concentration": "Extrait de Parfum",
    "collection": "oasis-blanc",
    "badge": "Signature",
    "volume": "100ml",
    "price": 2850000,
    "categories": [
      "oud-amber"
    ],
    "status": "active",
    "updated": "Stabil",
    "rating": 4.8,
    "reviews": 96,
    "notes": "White Oud / Iris Pallida / Bergamot",
    "sku": "SHR-SB-100",
    "description": "Sebuah monograf tentang cahaya. Sable Blanc membuka dengan kejernihan bergamot lalu turun perlahan ke iris pallida yang pucat dan oud putih yang lembut, meninggalkan jejak sehalus pasir yang tersapu angin.",
    "pyramid": {
      "top": "Calabrian Bergamot, White Pepper, Aldehydes",
      "heart": "Iris Pallida, Orange Blossom, Cashmeran",
      "base": "White Oud, Sandalwood, Soft Amber"
    },
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuDt_nWwhbeCUcApU9sE7zkM7QJ6ZgX7ndP-0YWFhfmIUwka5wUTytGvEskRSTwfg8M03BOVWSUfY2IISavan5OF2ZG0ZyCXnRwKvsMl2aq5nViSQvkCReqeRUGUHoM4oeEglyRZ3Vky6N6r4uZah8J72PwOQhU0QgTF68OFILp2ecJlu0I3cwtNVCQ49rhGxzZ4lE58Q7IHYCiMxXqNEV--OtjSs5JXlBKktzkeLy9I8y4VhvLVOk_5Lg",
    "adminImage": "https://lh3.googleusercontent.com/aida-public/AB6AXuCYQhtbGNWhwb7kPYT9phqioRKRLzfKzmu-XLIqcvIvXBY-Eg3STXaqjQiknK6D9aCxIRcwZlMVFImbCurnRgy68xh8YXo0oQRyndKcg1TzU9T96HBUcFCg6CbOXXLaWYyMprpdUek6mJcC60br8mGhVrsLTZiC8Qnx5jJ-dG68b1Ad-2NECnE6ODo-0j8A07Da9v4Pe8Uj7cDXbDd2_5Gk_CMpV9i1fHZDb8lK3v3dGwtIjDjtL-S2oA",
    "gallery": [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDt_nWwhbeCUcApU9sE7zkM7QJ6ZgX7ndP-0YWFhfmIUwka5wUTytGvEskRSTwfg8M03BOVWSUfY2IISavan5OF2ZG0ZyCXnRwKvsMl2aq5nViSQvkCReqeRUGUHoM4oeEglyRZ3Vky6N6r4uZah8J72PwOQhU0QgTF68OFILp2ecJlu0I3cwtNVCQ49rhGxzZ4lE58Q7IHYCiMxXqNEV--OtjSs5JXlBKktzkeLy9I8y4VhvLVOk_5Lg",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCtoOA-RankkC5PkbBGw9clZ7LBneF-0wdDM7QWPFWHUGojWzxLRKUauxLg8eaAKbBgEhUApCn6EmNR2YO6RXxVa3P3Z2k0mt-NJK22Eyu0wc-JbMQyo93_yCGTXAlovH9P1qxzvqu8RwmnSr8p5AoMsqNKh8qxSIhj-wxuYo2KfPA0iHKX_fI6oW5S4IoKx6XvLdVIx9wnYuZYEd4yud7G5PSp72J3nPpPv2eI_GvohUSfULpzrZVDDA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDC73G01flCqwT6Q-_cJg9hlVjvM45s8bg_H8kYd_SAI1mNhXGYvvsF8ObG35GryVs6vl1r3KehuM07GpCA-y_OB3Tq6hfMqlMYl2_UEhsVuWNGEs_8_EYNXcFATogdSM3YUG3RqUc0mqPOMI_vbH1yXzIfLK1gKFO4X28ycXhKmS_iobA4GkQb2MAM4dI1Z-JaOs8SSc82yHjV43GxOVpMFxve7qoZnu1uLm9FPFlFx1SYyj-DL-I0RA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBD06dKDFqrGT6FPmyOYBKSySKUOc7BtOb2AREJ2tEM3eky3jV9VXUfjOfMM32MgcUOSrWI20W9BE_nEl2CoXBgFgm2zB2FbhmIG27cg_tbKOJuvwDpB518ZUhZ4zv4lWcBsrxL9yc7R7h4i0B4KHq4QUbXoBHVnQOFi3q8AE8yI5fgqgypxTea4u98iGtIq9QH0Ls3n-hu_o2PzjIyZk41h4Nifw49KwDkjmRlAFB3TFergd09ehePsQ"
    ],
    "sizes": [
      {
        "volume": "50ml",
        "label": "50ml Nomade",
        "sub": "Travel Size",
        "price": 1900000,
        "desc": "Konsentrasi Extrait 24%. Sempurna untuk mobilitas dan layering aromatik."
      },
      {
        "volume": "100ml",
        "label": "100ml Flacon",
        "sub": "Signature",
        "price": 2850000,
        "desc": "Konsentrasi Extrait 28%. Botol kaca obsidian berbobot dengan penutup magnetik."
      }
    ]
  },
  {
    "id": "p3",
    "name": "Oasis Mystique",
    "concentration": "Pure Attar",
    "collection": "sol-oriental",
    "badge": "Edisi Terbatas",
    "volume": "50ml",
    "price": 3200000,
    "categories": [
      "floral-noir",
      "woody-smoky"
    ],
    "status": "critical",
    "updated": "Arsip Terkurasi",
    "rating": 5,
    "reviews": 41,
    "notes": "Damask Rose / Frankincense / Leather",
    "sku": "SHR-OM-050",
    "description": "Attar murni yang diracik dari mawar Damaskus dan dupa frankincense. Paduan floral gelap dengan kulit yang hangat, disimpan dalam flacon amber berukir tangan dan diproduksi dalam jumlah sangat terbatas.",
    "pyramid": {
      "top": "Damask Rose, Saffron, Bergamot",
      "heart": "Omani Frankincense, Jasmine Sambac, Clove",
      "base": "Leather, Agarwood, Ambergris"
    },
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuCdxvYkdNaxbQat86C_D0GiAZ85gpjbit1Qf5Oz8krxRvF0J7EJaOKq3AB91tV2ffDxHDA_nRczR_ny5dj2gJ_NKN9fv_ijckLyZ4acQYnN9ujkia9pDVhFjp0_4q5sJS81utgUjPLbWzyzaa3Zi-Bmu-2d7jkpaFKZdUGjzzkjKALfo9p4XjhtUmmlu5oGLRWyjRj00w1oTdMNl24Jx-RNTPtuYN6hTXoRJM8G3HRTYSn4GK8HZLV1zg",
    "adminImage": "https://lh3.googleusercontent.com/aida-public/AB6AXuBE2v6P_0dzVjYuItKyvKzZkDurcr-AlvNUiMteHJOWmjkpmU5f2GEqihC0prYsflETfoul1v4Ciu4EjcsMy5Rn83E6HC1AtuAufWPRcKViVl14OU4ig5WVd2NCYLkZ5QzPVHSoQ1t9GMQrsWH_ausF-A4E5J08hAM5-yji1JZsyFjKn87xuxDLTIAV-SYstjUHHepuPmJmD_SZYWlnSVmWB0B_poZEDtYjB2v4HFdrJfJb4GjVgNmksg",
    "gallery": [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCdxvYkdNaxbQat86C_D0GiAZ85gpjbit1Qf5Oz8krxRvF0J7EJaOKq3AB91tV2ffDxHDA_nRczR_ny5dj2gJ_NKN9fv_ijckLyZ4acQYnN9ujkia9pDVhFjp0_4q5sJS81utgUjPLbWzyzaa3Zi-Bmu-2d7jkpaFKZdUGjzzkjKALfo9p4XjhtUmmlu5oGLRWyjRj00w1oTdMNl24Jx-RNTPtuYN6hTXoRJM8G3HRTYSn4GK8HZLV1zg",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCtoOA-RankkC5PkbBGw9clZ7LBneF-0wdDM7QWPFWHUGojWzxLRKUauxLg8eaAKbBgEhUApCn6EmNR2YO6RXxVa3P3Z2k0mt-NJK22Eyu0wc-JbMQyo93_yCGTXAlovH9P1qxzvqu8RwmnSr8p5AoMsqNKh8qxSIhj-wxuYo2KfPA0iHKX_fI6oW5S4IoKx6XvLdVIx9wnYuZYEd4yud7G5PSp72J3nPpPv2eI_GvohUSfULpzrZVDDA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDC73G01flCqwT6Q-_cJg9hlVjvM45s8bg_H8kYd_SAI1mNhXGYvvsF8ObG35GryVs6vl1r3KehuM07GpCA-y_OB3Tq6hfMqlMYl2_UEhsVuWNGEs_8_EYNXcFATogdSM3YUG3RqUc0mqPOMI_vbH1yXzIfLK1gKFO4X28ycXhKmS_iobA4GkQb2MAM4dI1Z-JaOs8SSc82yHjV43GxOVpMFxve7qoZnu1uLm9FPFlFx1SYyj-DL-I0RA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBD06dKDFqrGT6FPmyOYBKSySKUOc7BtOb2AREJ2tEM3eky3jV9VXUfjOfMM32MgcUOSrWI20W9BE_nEl2CoXBgFgm2zB2FbhmIG27cg_tbKOJuvwDpB518ZUhZ4zv4lWcBsrxL9yc7R7h4i0B4KHq4QUbXoBHVnQOFi3q8AE8yI5fgqgypxTea4u98iGtIq9QH0Ls3n-hu_o2PzjIyZk41h4Nifw49KwDkjmRlAFB3TFergd09ehePsQ"
    ],
    "sizes": [
      {
        "volume": "50ml",
        "label": "50ml Nomade",
        "sub": "Travel Size",
        "price": 2150000,
        "desc": "Konsentrasi Extrait 24%. Sempurna untuk mobilitas dan layering aromatik."
      },
      {
        "volume": "50ml",
        "label": "50ml Flacon",
        "sub": "Signature",
        "price": 3200000,
        "desc": "Konsentrasi Extrait 28%. Botol kaca obsidian berbobot dengan penutup magnetik."
      }
    ]
  },
  {
    "id": "p4",
    "name": "Nomade Minéral",
    "concentration": "Cologne Intense",
    "collection": "nomad-heritage",
    "badge": "",
    "volume": "100ml",
    "price": 2100000,
    "categories": [
      "citrus-mineral",
      "woody-smoky"
    ],
    "status": "active",
    "updated": "Terinventarisir",
    "rating": 4.7,
    "reviews": 73,
    "notes": "Vetiver / Sea Salt / Cardamom",
    "sku": "SHR-NM-100",
    "description": "Cologne intens untuk pengembara. Garam laut dan cardamom berpadu dengan vetiver kering, menciptakan aroma mineral yang bersih, tajam, dan tahan lama di iklim panas.",
    "pyramid": {
      "top": "Cardamom, Sea Salt, Grapefruit Peel",
      "heart": "Vetiver, Geranium, Mineral Accord",
      "base": "Driftwood, Grey Amber, White Musk"
    },
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuCzOWeZqdfZdav-VFhtZICdDQr4ll7VqALSBft03Ri0ItnseC-ktxLtEiOmO-FVfG3bFqCKUh1zv90I2u4urxh8ddNIgY6v5gak0sgCgYba_rzDEn7_62wROEhSvSmar0ChnlMcdIxpgSA2bGUX4Qm1qG5PsEt68jReJxTvjWomkIsszRPYxOo7ccRsL2y9_40zpxTjJ7Net81xYYlpuuSCRXy4hoHBItJGqlpudbrmEGh93EJBIPubYQ",
    "adminImage": "https://lh3.googleusercontent.com/aida-public/AB6AXuCOqpuglxmT2kKW1tydxsI978qaFlkYtk6LBcDqFysLIqolASMYLur3lcutTMkHRTJRUbCIj1e8Q3Vft2WwP-KCgng1oPIzTu158uSD25aPxxwPqSk8Jq2pFtcQKOWDG0oswRGH9aTrsUOypsO1u8fZDEFIhpfVUCLkhVxG4xlBOYrKfhwybzM5PzAvquNlVtgtLJtKTbZnJQb7QYRZd_HSYHOqe_RTzq8u40sQtPUZ3AG48f8wd-4g7Q",
    "gallery": [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCzOWeZqdfZdav-VFhtZICdDQr4ll7VqALSBft03Ri0ItnseC-ktxLtEiOmO-FVfG3bFqCKUh1zv90I2u4urxh8ddNIgY6v5gak0sgCgYba_rzDEn7_62wROEhSvSmar0ChnlMcdIxpgSA2bGUX4Qm1qG5PsEt68jReJxTvjWomkIsszRPYxOo7ccRsL2y9_40zpxTjJ7Net81xYYlpuuSCRXy4hoHBItJGqlpudbrmEGh93EJBIPubYQ",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCtoOA-RankkC5PkbBGw9clZ7LBneF-0wdDM7QWPFWHUGojWzxLRKUauxLg8eaAKbBgEhUApCn6EmNR2YO6RXxVa3P3Z2k0mt-NJK22Eyu0wc-JbMQyo93_yCGTXAlovH9P1qxzvqu8RwmnSr8p5AoMsqNKh8qxSIhj-wxuYo2KfPA0iHKX_fI6oW5S4IoKx6XvLdVIx9wnYuZYEd4yud7G5PSp72J3nPpPv2eI_GvohUSfULpzrZVDDA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDC73G01flCqwT6Q-_cJg9hlVjvM45s8bg_H8kYd_SAI1mNhXGYvvsF8ObG35GryVs6vl1r3KehuM07GpCA-y_OB3Tq6hfMqlMYl2_UEhsVuWNGEs_8_EYNXcFATogdSM3YUG3RqUc0mqPOMI_vbH1yXzIfLK1gKFO4X28ycXhKmS_iobA4GkQb2MAM4dI1Z-JaOs8SSc82yHjV43GxOVpMFxve7qoZnu1uLm9FPFlFx1SYyj-DL-I0RA",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBD06dKDFqrGT6FPmyOYBKSySKUOc7BtOb2AREJ2tEM3eky3jV9VXUfjOfMM32MgcUOSrWI20W9BE_nEl2CoXBgFgm2zB2FbhmIG27cg_tbKOJuvwDpB518ZUhZ4zv4lWcBsrxL9yc7R7h4i0B4KHq4QUbXoBHVnQOFi3q8AE8yI5fgqgypxTea4u98iGtIq9QH0Ls3n-hu_o2PzjIyZk41h4Nifw49KwDkjmRlAFB3TFergd09ehePsQ"
    ],
    "sizes": [
      {
        "volume": "50ml",
        "label": "50ml Nomade",
        "sub": "Travel Size",
        "price": 1400000,
        "desc": "Konsentrasi Extrait 24%. Sempurna untuk mobilitas dan layering aromatik."
      },
      {
        "volume": "100ml",
        "label": "100ml Flacon",
        "sub": "Signature",
        "price": 2100000,
        "desc": "Konsentrasi Extrait 28%. Botol kaca obsidian berbobot dengan penutup magnetik."
      }
    ]
  }
];
