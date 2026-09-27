\# Prompt Antigravity — Peta Suplemen



Kerjakan satu tahap dulu, review hasilnya, baru tempel prompt tahap berikutnya di sesi baru (atau sesi yang sama kalau context belum penuh). Setiap prompt sengaja mereferensikan `docs/PRD.md` supaya agent tidak perlu diberi ulang seluruh spesifikasi tiap kali.



\---



\## Tahap 0 — Pra-pemrosesan Data



```

Baca docs/PRD.md sebagai spesifikasi utama proyek ini terlebih dahulu.



Tugas: buat script Python untuk tahap pra-pemrosesan data di folder

`data-pipeline/scripts/`, TANPA membangun UI apa pun dulu.



1\. `split\_penduduk.py`:

&#x20;  - Baca file CSV asli (`data-pipeline/raw/penduduk.csv`) dengan pandas.

&#x20;  - Pastikan kolom yang dipakai: kode kecamatan, iddesa\_baru, idsubsls\_baru,

&#x20;    nama\_gabungan, alamat, alamat\_suplemen, no\_kk\_regsosek, hp\_responden,

&#x20;    latitude, longitude.

&#x20;  - Group by iddesa\_baru, tulis tiap kelompok sebagai file JSON terpisah di

&#x20;    app/public/data/penduduk/{kddesa}.json, isi array objek dengan field:

&#x20;    nama, alamat (gabungan alamat + alamat\_suplemen), no\_kk, no\_hp, lat, lng,

&#x20;    idsubsls.

&#x20;  - Buat juga app/public/data/filter-options.json: struktur nested

&#x20;    {kecamatan: \[...desa: \[...subsls]]} berisi kode + nama tiap level.

&#x20;  - Print ringkasan: jumlah file dihasilkan, jumlah baris per desa (untuk

&#x20;    deteksi desa dengan data sangat banyak).



2\. `process\_batas\_wilayah.py`:

&#x20;  - Baca file GeoJSON asli (`data-pipeline/raw/batas\_wilayah.geojson`)

&#x20;    dengan geopandas.

&#x20;  - Pangkas atribut, sisakan hanya: kdkec, nmkec, kddesa, nmdesa, idsubsls,

&#x20;    kdsubsls.

&#x20;  - Simplify geometri (tolerance kecil, mis. 0.0001 derajat) untuk

&#x20;    memperkecil ukuran file tanpa merusak bentuk secara signifikan.

&#x20;  - Simpan tiga level:

&#x20;    - per Sub SLS (asli) → app/public/data/batas/subsls/{kddesa}/{idsubsls}.geojson

&#x20;    - per Desa (dissolve semua subsls dalam desa) → app/public/data/batas/desa/{kddesa}.geojson

&#x20;    - per Kecamatan (dissolve semua desa) → app/public/data/batas/kecamatan/{kdkec}.geojson

&#x20;  - Print total ukuran folder app/public/data setelah selesai.



Jangan buat kode frontend/React di tahap ini. Setelah selesai, tampilkan

ringkasan jumlah file yang dihasilkan dan total ukurannya.

```



\---



\## Tahap 1 — Layout Dasar \& Peta Dummy



```

Baca docs/PRD.md untuk konteks proyek. Kita di Tahap 1: bangun kerangka

dasar aplikasi saja, BELUM ada logic filter maupun fetch data asli.



1\. Inisialisasi project React + Vite di folder app/ (kalau belum ada),

&#x20;  pasang Tailwind CSS dan react-leaflet.

2\. Buat layout: peta full-screen sebagai base, sidebar melayang (floating

&#x20;  panel) di kiri di atas peta — rounded card, shadow, gaya Tailwind.

3\. Basemap satelit (Esri World Imagery atau Google Satellite tile layer)

&#x20;  via react-leaflet.

4\. Isi sidebar dengan 5-10 data dummy (nama, alamat, no KK, no HP)

&#x20;  hardcoded di komponen — format: nama bold, lalu alamat/No KK/No Telp

&#x20;  di bawahnya.

5\. Tampilkan juga 5 marker dummy di peta dengan popup berisi info yang

&#x20;  sama saat diklik.

6\. Jangan buat dropdown filter atau logic apa pun dulu.



Setelah selesai, jalankan dev server dan tunjukkan hasil render untuk saya

cek sebelum lanjut ke tahap berikutnya.

```



\---



\## Tahap 2 — Cascading Dropdown \& Render Bersyarat (masih dummy)



```

Baca docs/PRD.md untuk konteks. Lanjut ke Tahap 2: bangun UI filter

berjenjang dan aturan render bersyaratnya — masih pakai data dummy,

BELUM fetch dari file JSON asli.



1\. Tambahkan 3 dropdown di atas sidebar: Kecamatan, Desa (disabled sampai

&#x20;  Kecamatan dipilih), Sub SLS (disabled sampai Desa dipilih, opsional).

2\. Isi opsi tiap dropdown dengan data dummy hardcoded dulu (di Tahap 3

&#x20;  akan diganti fetch filter-options.json asli).

3\. State: selectedKecamatan, selectedDesa, selectedSubSls di komponen

&#x20;  utama.

4\. Aturan render bersyarat:

&#x20;  - Hanya Kecamatan dipilih (Desa masih kosong): peta hanya menampilkan

&#x20;    outline polygon kecamatan (dummy); sidebar \& titik dikosongkan.

&#x20;  - Desa dipilih: sidebar \& marker (dummy) muncul, polygon desa (dummy)

&#x20;    tergambar, peta fitBounds ke area itu.

&#x20;  - Sub SLS juga dipilih: peta zoom lebih dekat ke area itu (masih

&#x20;    dummy).

5\. Reset berjenjang: ganti Kecamatan → Desa \& Sub SLS otomatis kereset

&#x20;  kosong.



Setelah selesai, jelaskan alur state-nya secara singkat dan tunjukkan

hasil render untuk saya cek.

```



\---



\## Tahap 3 — Integrasi Data Nyata \& Interaksi Sidebar



```

Baca docs/PRD.md. Sekarang Tahap 3: ganti semua data dummy dengan fetch

nyata ke file statis hasil Tahap 0 di folder public/data/.



1\. Saat aplikasi dimuat, fetch data/filter-options.json sekali untuk

&#x20;  mengisi seluruh dropdown — jangan fetch ulang tiap dropdown berubah.

2\. Ganti polygon dummy: saat selectedKecamatan berubah, fetch

&#x20;  data/batas/kecamatan/{kdkec}.geojson; saat selectedDesa berubah, fetch

&#x20;  data/batas/desa/{kddesa}.geojson; kalau selectedSubSls dipilih, fetch

&#x20;  juga data/batas/subsls/{kddesa}/{idsubsls}.geojson.

3\. Ganti titik dummy: pakai useEffect yang memantau selectedDesa — begitu

&#x20;  terisi, fetch data/penduduk/{kddesa}.json dan render sebagai marker +

&#x20;  isi sidebar. Kalau selectedDesa kosong, kosongkan sidebar \& marker

&#x20;  (jangan fetch apa pun).

4\. Interaksi sidebar: klik nama → peta flyTo koordinat orang itu dan buka

&#x20;  popup markernya.

5\. Kalau satu file desa berisi lebih dari ±500 baris, gunakan

&#x20;  react-window untuk virtualisasi list sidebar.

6\. Perhatikan base path: karena akan di-deploy ke GitHub Pages di bawah

&#x20;  subpath repo, pastikan semua path fetch pakai

&#x20;  import.meta.env.BASE\_URL sebagai prefix, jangan hardcode "/data/...".



Setelah selesai, coba beberapa kombinasi filter dan laporkan kalau ada

desa dengan jumlah titik sangat besar yang perlu perhatian khusus.

```



\---



\## Tahap 4 — Build \& Deploy ke GitHub Pages



```

Baca docs/PRD.md. Tahap 4: siapkan build \& deployment ke GitHub Pages.



1\. Set base di vite.config.js sesuai nama repo GitHub (mis.

&#x20;  "/peta-suplemen/").

2\. Buat GitHub Actions workflow (.github/workflows/deploy.yml) yang

&#x20;  otomatis build (npm run build) dan deploy folder dist/ ke branch

&#x20;  gh-pages setiap push ke branch utama.

3\. Pastikan folder app/public/data (hasil Tahap 0) ikut ter-copy ke

&#x20;  dist/ saat build — verifikasi isinya setelah build lokal.

4\. Tambahkan .gitignore untuk data-pipeline/raw/ (data sumber mentah)

&#x20;  supaya tidak ikut ter-commit.

5\. Setelah workflow jalan, laporkan URL GitHub Pages yang dihasilkan dan

&#x20;  pastikan tidak ada broken fetch (404) di console akibat base path

&#x20;  yang salah.

```

