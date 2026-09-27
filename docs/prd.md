# PRD — Peta Suplemen (Web GIS Data Suplemen Penduduk)
**Versi 2** — direvisi untuk arsitektur *tanpa server* (static hosting di GitHub Pages)

---

## 1. Deskripsi Umum & Tujuan

Membangun Web GIS untuk memvisualisasikan sebaran titik data suplemen (penduduk/keluarga) di atas peta satelit. Karena tidak ada server yang bisa dijalankan, aplikasi ini dibangun sebagai **static site murni** — seluruh "backend" digantikan oleh file data statis yang sudah dipra-proses dan disusun berjenjang mengikuti struktur wilayah.

Untuk menjaga performa dari volume data yang besar, sistem menerapkan **penyaringan hierarkis bersyarat**: titik koordinat dan daftar penduduk di sidebar baru dimuat setelah pengguna memfilter minimal hingga tingkat **Desa**.

## 2. Ruang Lingkup Pengguna & Data

- Target pengguna: maksimal ±50 orang, seluruhnya pengguna internal kantor.
- Volume data: ±25.000 baris titik koordinat penduduk, ±5.000 baris idsubsls untuk batas wilayah.
- Hosting: GitHub Pages, repo publik (batas GitHub Free).

> **Catatan privasi (penting, sudah disepakati untuk saat ini):** data memuat nama, alamat, No KK, dan No HP. GitHub Pages di akun Free hanya bisa dijalankan dari repo publik, artinya URL aplikasi tetap bisa diakses siapa pun yang memegang link, walau tidak diiklankan/di-index. Ini diterima untuk saat ini karena cakupan pengguna internal. **Kalau nanti cakupan pengguna berubah** (dibagikan ke pihak luar, jumlah user bertambah signifikan, dsb.), evaluasi ulang kebutuhan proteksi akses (password gate, atau pindah ke hosting dengan access control).

## 3. Kebutuhan Data

### 3.1 Sumber data mentah (input pra-pemrosesan, tidak diakses langsung oleh aplikasi)

**Data titik penduduk (CSV, ±5MB, ±25.000 baris):**
| Kategori | Kolom |
|---|---|
| Filter/Hierarki | Kode Kec (Kecamatan), `iddesa_baru` (Desa), `idsubsls_baru` (Sub SLS) |
| Info detail | `nama_gabungan`, `alamat` & `alamat_suplemen`, `no_kk_regsosek`, `hp_responden` |
| Spasial | `latitude`, `longitude` |

**Data batas wilayah (GeoJSON/Shapefile, ±7MB, ±5.000 baris idsubsls):**
| Kategori | Atribut |
|---|---|
| Kunci | `kdkec`/`nmkec`, `kddesa`/`nmdesa`, `idsubsls`/`kdsubsls` |

Granularitas asli GeoJSON ini diasumsikan di level Sub SLS (paling detail). Batas Desa dan Kecamatan **diturunkan** dari sini lewat proses *dissolve* (union poligon Sub SLS dalam satu Desa/Kecamatan), bukan dari file terpisah.

### 3.2 Struktur data hasil pra-pemrosesan (menggantikan kebutuhan backend API)

Ini adalah "kontrak data" yang dipakai frontend — setiap file statis di bawah ini menggantikan satu endpoint API yang tadinya direncanakan.

```
app/public/data/
├── filter-options.json          # gabungan seluruh Kecamatan → Desa → Sub SLS (kode + nama)
├── penduduk/
│   └── {kddesa}.json            # array penduduk milik satu desa
└── batas/
    ├── kecamatan/{kdkec}.geojson    # poligon hasil dissolve, per kecamatan
    ├── desa/{kddesa}.geojson        # poligon hasil dissolve, per desa
    └── subsls/{kddesa}/{idsubsls}.geojson   # poligon asli per sub SLS
```

Skema tiap file:
- `filter-options.json` → `[{ kdkec, nmkec, desa: [{ kddesa, nmdesa, subsls: [{ idsubsls, kdsubsls }] }] }]`
- `penduduk/{kddesa}.json` → `[{ nama, alamat, no_kk, no_hp, lat, lng, idsubsls }]`
- File `.geojson` → FeatureCollection standar, atribut dipangkas hanya `kdkec, nmkec, kddesa, nmdesa, idsubsls, kdsubsls`, geometri disederhanakan (simplify) untuk memperkecil ukuran.

Estimasi ukuran: dengan ±25.000 titik terbagi ke ratusan file desa, tiap file `penduduk/{kddesa}.json` biasanya jauh di bawah 100KB. GeoJSON setelah dipangkas atribut + disederhanakan geometrinya akan jauh lebih kecil dari 7MB aslinya — ukuran pasti dikonfirmasi saat Tahap 0 (lihat `docs/PROMPTS.md`).

## 4. Spesifikasi Fitur Utama

**Cascading Dropdown Filter:**
- 3 tingkat: Kecamatan → Desa → Sub SLS (opsional).
- Dropdown Desa aktif setelah Kecamatan dipilih; Sub SLS aktif setelah Desa dipilih.
- Seluruh opsi dropdown diisi dari satu file `filter-options.json` yang di-fetch sekali di awal — tidak ada request tambahan tiap dropdown berubah.

**Conditional Rendering:**
- Level Kecamatan saja: peta hanya menampilkan poligon batas kecamatan; titik & sidebar disembunyikan/dikosongkan.
- Level Desa (ambang minimum): baru saat ini titik koordinat & sidebar dimuat (fetch `penduduk/{kddesa}.json`), plus poligon desa ditampilkan dan peta `fitBounds` ke area itu.
- Level Sub SLS (opsional): peta zoom lebih dekat ke poligon sub SLS tersebut; data penduduk tetap dari file desa yang sama, difilter di sisi klien berdasarkan `idsubsls`.

**Interactive Sidebar List:**
- Panel melayang di kiri, daftar penduduk sesuai wilayah terfilter (minimal level Desa).
- Format: Nama (bold), lalu Alamat, No KK, No Telp di bawahnya.
- Klik nama → peta `flyTo` ke koordinat orang tersebut + buka popup marker-nya.
- Kalau satu desa memuat >±500 baris, gunakan `react-window` untuk virtualisasi list.

**Peta Interaktif:**
- Basemap satelit (Esri World Imagery / Google Satellite tile layer).
- Marker per titik penduduk, popup info lengkap saat diklik langsung dari peta.

## 5. Arsitektur Sistem

### 5.1 Prinsip utama

Tidak ada backend/API server. GitHub Pages hanya melayani file statis, jadi seluruh "backend" digantikan oleh **file JSON/GeoJSON yang sudah dipra-proses dan dipecah berjenjang** (lihat 3.2). Frontend cukup melakukan `fetch()` langsung ke path file yang sesuai — ini sekaligus otomatis menegakkan aturan "data baru muncul di level Desa", karena secara fisik file per-titik memang tidak ada sebelum Desa dipilih.

### 5.2 Data Pipeline (dijalankan lokal/offline, bukan bagian dari aplikasi yang di-deploy)

- Tech: Python (`pandas`, `geopandas`), dijalankan sekali di awal dan diulang bila data sumber berubah.
- Tugas: split CSV per `kddesa` → JSON; pangkas atribut & simplify geometri GeoJSON; dissolve poligon per Desa & Kecamatan; generate `filter-options.json`.
- Detail langkah ada di `docs/PROMPTS.md` (Tahap 0).

### 5.3 Frontend

- Tech: React (Vite), Tailwind CSS, React-Leaflet.
- State: `selectedKecamatan`, `selectedDesa`, `selectedSubSls` di komponen utama.
- `useEffect` memantau `selectedDesa` → fetch data penduduk & poligon terkait saat berubah; kosongkan saat `selectedDesa` null.
- Semua path fetch memakai prefix `import.meta.env.BASE_URL` (bukan hardcode `/data/...`) agar tetap benar setelah di-deploy ke subpath GitHub Pages.

### 5.4 Struktur Folder Proyek

```
Peta Suplemen/
├── AGENTS.md
├── docs/
│   ├── PRD.md
│   └── PROMPTS.md
├── data-pipeline/
│   ├── raw/                  # CSV & GeoJSON asli — DI-GITIGNORE, tidak di-commit
│   └── scripts/
│       ├── split_penduduk.py
│       └── process_batas_wilayah.py
└── app/                      # project Vite + React — ini yang di-deploy
    ├── public/data/          # hasil Tahap 0 (lihat 3.2)
    └── src/
```

### 5.5 Deployment (GitHub Pages)

- `vite.config.js` → set `base: '/<nama-repo>/'`.
- GitHub Actions workflow (`.github/workflows/deploy.yml`) → build otomatis (`npm run build`) & deploy `dist/` ke branch `gh-pages` setiap push ke branch utama.
- `data-pipeline/raw/` masuk `.gitignore` — yang di-commit hanya hasil olahan di `app/public/data`.

## 6. State Management & Alur Interaksi (ringkas)

1. App dimuat → fetch `filter-options.json` sekali → isi dropdown Kecamatan.
2. Pilih Kecamatan → fetch `batas/kecamatan/{kdkec}.geojson` → gambar poligon; isi dropdown Desa dari data yang sudah ada di memori (tidak fetch ulang).
3. Pilih Desa → fetch `batas/desa/{kddesa}.geojson` + `penduduk/{kddesa}.json` → gambar poligon desa, isi sidebar & marker, `fitBounds` ke area desa.
4. (Opsional) Pilih Sub SLS → fetch `batas/subsls/{kddesa}/{idsubsls}.geojson` → zoom lebih dekat; filter data penduduk yang sudah ada di memori berdasarkan `idsubsls` (tidak fetch ulang).
5. Klik nama di sidebar → `flyTo` koordinat + buka popup.
6. Ganti Kecamatan → reset Desa & Sub SLS beserta seluruh state turunannya.

## 7. Rencana Tahapan Pengembangan

Dikerjakan iteratif, satu tahap disetujui dulu sebelum lanjut ke tahap berikutnya. Prompt siap-pakai untuk tiap tahap ada di `docs/PROMPTS.md`:

- **Tahap 0** — Pra-pemrosesan data (script Python, belum ada UI).
- **Tahap 1** — Layout dasar + peta & sidebar dengan data dummy.
- **Tahap 2** — Cascading dropdown + logic render bersyarat (masih data dummy).
- **Tahap 3** — Integrasi fetch data statis nyata hasil Tahap 0 + interaksi sidebar.
- **Tahap 4** — Build & deploy ke GitHub Pages.

## 8. Catatan Keamanan & Privasi Data

- Data yang dipublikasikan (nama, alamat, No KK, No HP) bersifat publik secara teknis begitu ada di GitHub Pages, meski ditujukan untuk pengguna internal. Jangan bagikan link di luar kebutuhan.
- Jangan commit `data-pipeline/raw/` — cukup hasil olahan di `app/public/data` yang masuk repo.
- Kalau suatu saat cakupan pengguna berubah, pertimbangkan menambah proteksi akses (mis. Cloudflare Access di depan GitHub Pages, atau pindah ke hosting yang mendukung password) sebelum memperluas distribusi link.