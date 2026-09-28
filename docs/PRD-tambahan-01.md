# PRD Tambahan 01 — Peta Suplemen

**Status:** melengkapi `docs/PRD.md` (v2). Jika ada yang bertentangan, dokumen ini yang berlaku.
**Latar belakang:** aplikasi sudah berjalan dan diuji di HP. Ditemukan 4 hal: bug filter Sub SLS, kebutuhan pewarnaan kategori, tampilan mobile yang belum layak, dan kebutuhan lokasi pengguna di lapangan.

Urutan pengerjaan (lihat `docs/PROMPTS-tambahan.md`): Bug SLS → Kategori → Mobile → Lokasi → Uji akhir. Bug dibereskan lebih dulu karena kecil dan memengaruhi semua fitur lain; mobile dikerjakan sebelum lokasi agar tombol lokasi langsung ditempatkan di layout mobile yang final.

---

## 1. Perbaikan Bug: Poligon Sub SLS tidak ikut berganti

**Gejala:** setelah memilih Desa lalu Sub SLS A, semua benar. Saat Sub SLS diganti ke B (tanpa mengubah Desa), titik penduduk ikut berganti tetapi poligon batas masih milik A. Harus mereset filter Desa dulu supaya benar.

**Perilaku yang diharapkan:**
- Setiap perubahan `selectedKecamatan`, `selectedDesa`, atau `selectedSubSls` langsung memperbarui poligon, titik, dan posisi peta.
- Poligon lama hilang, poligon baru tergambar, peta `fitBounds` ke area baru, popup yang terbuka ditutup.
- Ada opsi **"Semua Sub SLS"** di dropdown Sub SLS untuk kembali ke tampilan level Desa tanpa memilih ulang Desa.
- Respons fetch yang datang terlambat tidak boleh menimpa pilihan terbaru (gunakan `AbortController` atau penanda "stale").

**Dugaan penyebab (harus diverifikasi agent, bukan diasumsikan):** komponen `<GeoJSON>` di react-leaflet tidak memperbarui layer saat prop `data` berubah, kecuali diberi `key` yang berubah; atau `useEffect` poligon tidak memasukkan `selectedSubSls` ke dependency; atau state poligon hanya direset saat Desa berubah. Bug jenis yang sama harus diaudit juga pada poligon Kecamatan dan Desa.

## 2. Kategori "Metode Match Final" (Kolom M CSV)

### 2.1 Kategori, label, dan warna

Nilai asli mengikuti isi kolom M pada CSV. Script akan mencetak seluruh nilai unik; **jika ada nilai yang berbeda dari tabel ini, data yang berlaku** dan tabel diperbarui.

| Kode | Nilai asli (perkiraan) | Label pendek | Warna |
|---|---|---|---|
| `kk` | MATCH NO KK | Match KK | Hijau `#22c55e` |
| `nl` | NAMA LENGKAP - KECAMATAN 95 - BELUM DIDATA | Nama Lengkap (Kec 95) | Ungu `#a855f7` |
| `tm` | TIDAK MATCH | Tidak Match | Merah `#ef4444` |
| `ns` | NAMA SATU - DESA 100 - BELUM DIDATA | Nama Satu (Desa 100) | Cyan `#06b6d4` |
| `lain` | nilai lain / kosong | Lainnya | Abu-abu `#9ca3af` (hanya muncul bila ada datanya) |

**Aturan warna:** oranye (`#f97316`) **dicadangkan** untuk posisi pengguna (bagian 4). Kategori tidak boleh memakai oranye atau kuning-oranye. Label lengkap (nilai asli) tetap ditampilkan di popup.

### 2.2 Perubahan pipeline data
- Kolom M (kolom ke-13, indeks 12) dibaca, dinormalisasi (trim, rapikan spasi, uppercase, samakan jenis tanda strip), lalu dipetakan ke kode.
- `penduduk/{kddesa}.json` mendapat field baru `kat` (kode kategori). Skema menjadi `{ nama, alamat, no_kk, no_hp, lat, lng, idsubsls, kat }`.
- File baru `app/public/data/kategori.json` → `[{ kode, label, label_lengkap, warna, urutan, jumlah }]`. Ini satu-satunya sumber label & warna; mengubah warna cukup mengedit file ini.
- Nilai yang tidak dikenali dipetakan ke `lain` dan dilaporkan (tidak dibuang).

### 2.3 Tampilan peta & daftar
- Marker default diganti `circleMarker` berwarna sesuai kategori, dengan garis tepi putih (agar terlihat di citra satelit).
- Titik yang sedang dipilih: ukuran lebih besar dan tepi lebih tebal.
- Item di daftar memiliki titik warna + label pendek kategori.

### 2.4 Filter kategori
- Berupa chips berwarna (titik warna + label pendek + jumlah). Default: **semua aktif**. Ketuk chip untuk menyembunyikan/menampilkan kategori itu; ada tombol "Semua".
- Jumlah pada chip dihitung dari data Desa/Sub SLS yang sedang aktif (sebelum filter kategori).
- Filter berlaku pada **peta dan daftar sekaligus**; header daftar menampilkan "N dari M penduduk".
- Pilihan filter kategori **tidak di-reset** saat berganti Desa/Sub SLS.
- Bila semua kategori dimatikan: tampilkan pesan kosong yang jelas, bukan layar kosong tanpa penjelasan.
- Desktop: chips di sidebar, di bawah dropdown wilayah. Mobile: baris chips yang bisa digeser horizontal di atas peta (bagian 3).

## 3. Layout Mobile

**Masalah nyata dari uji di HP:**
- Mode normal: panel menu menutupi seluruh layar sehingga titik dan daftar tidak terlihat bersamaan.
- Mode "Situs desktop": menu tidak muncul sampai HP diputar ke landscape lalu dikembalikan ke portrait.

**Prinsip:** peta harus selalu terlihat; daftar dan filter berada di panel yang bisa dibuka-tutup. Layout mobile dipakai bila lebar layar < 768px **atau** perangkat sentuh (`pointer: coarse`); desktop (≥ 768px dengan mouse) tidak berubah.

**Komponen mobile:**
1. **Peta** — tinggi `100dvh` (fallback `100vh`), tanpa scroll halaman.
2. **Navbar bawah** (±56px + safe-area) dengan 3 tab: **Peta · Filter · Daftar**.
3. **Tab Filter** — bottom sheet berisi dropdown Kecamatan/Desa/Sub SLS (`<select>` natif) dan tombol "Selesai".
4. **Tab Daftar** — bottom sheet dengan dua posisi: setengah layar (default) dan hampir penuh (±90%). Digeser lewat handle atau diketuk untuk pindah posisi. Header: "N dari M penduduk". Scroll daftar tidak boleh bentrok dengan geser sheet (geser hanya dari handle/header).
5. **Tab Peta** — sheet tertutup, peta penuh.
6. **Chips kategori** — baris horizontal di atas peta, tampil setelah Desa dipilih.
7. **Belum ada Desa terpilih** — pesan singkat "Pilih Kecamatan dan Desa untuk menampilkan data", dan tab Filter terbuka otomatis saat pertama kali.

**Saat item daftar diketuk (mobile):**
- Peta `flyTo` ke titik itu **dengan memperhitungkan area yang tertutup sheet** — titik harus berada di tengah bagian peta yang masih terlihat, bukan di balik sheet.
- Popup terbuka dengan `autoPan` yang memakai padding (tidak tertutup chips atas maupun sheet bawah).

**Detail teknis wajib:**
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- Panggil `map.invalidateSize()` setiap sheet berubah, saat `resize`, dan `orientationchange` (gunakan `ResizeObserver`).
- z-index panel/navbar/sheet harus di atas pane & kontrol Leaflet.
- `overflow: hidden` pada body, `overscroll-behavior: none`; hormati `env(safe-area-inset-*)`.
- Area sentuh ≥ 44×44px, teks ≥ 14px; popup `maxWidth` ≈ `min(280px, 80vw)`; kontrol zoom +/- disembunyikan atau dipindah agar tidak tertutup navbar.
- Layout tidak boleh bergantung pada orientasi (portrait dan landscape sama-sama benar).

**Mode "Situs desktop" di HP:** menu/navbar harus tampil **tanpa perlu diputar**. Catatan: pada mode ini browser memaksa lebar ±980px sehingga tampilan tetap terlihat kecil; itu perilaku browser, jadi pengguna disarankan memakai mode normal.

## 4. Fitur "Lokasi Saya"

- Tombol melayang (ikon target, ≥ 48px) di kanan-bawah peta, berada di atas navbar pada mobile.
- Diketuk → meminta izin lokasi → `watchPosition` dengan `enableHighAccuracy: true`. Setelah lokasi pertama didapat, peta terbang ke lokasi pengguna (sekali saja).
- **Tampilan:** titik **oranye** `#f97316` (±14px, tepi putih tebal, efek pulse halus) dan lingkaran akurasi oranye transparan. Berada di pane yang lebih tinggi daripada marker penduduk. **Tidak memakai biru.**
- **Status tombol:** nonaktif → mencari (spinner) → aktif (oranye). Saat aktif, ketuk tombol = pusatkan kembali ke lokasi. Tersedia cara mematikan (`clearWatch`) agar hemat baterai.
- **Jarak ke target:** bila lokasi aktif dan ada penduduk terpilih, tampilkan garis putus-putus oranye dari pengguna ke target, dan jarak ("±240 m" / "±1,3 km") di popup serta item daftar terpilih; ikut berubah saat posisi bergerak.
- **Error (pesan Bahasa Indonesia):** izin ditolak (sertakan petunjuk mengaktifkan izin lokasi), posisi tidak tersedia, timeout, browser tidak mendukung.
- **HTTPS:** geolocation hanya bekerja di HTTPS atau `localhost`. GitHub Pages sudah HTTPS. Jika menguji di HP lewat IP jaringan lokal (`http://192.168...`), fitur ini tidak akan jalan — gunakan `@vitejs/plugin-basic-ssl` untuk dev server atau uji langsung di GitHub Pages.
- **Privasi:** posisi hanya diproses di browser; tidak dikirim atau disimpan ke mana pun.

## 5. Struktur file yang bertambah/berubah

```
app/public/data/kategori.json          # baru (dibuat pipeline)
app/public/data/penduduk/{kddesa}.json # bertambah field `kat`
```

## 6. Kriteria Penerimaan (checklist uji akhir)

**Bug filter**
- [ ] Desa → SLS A → SLS B → SLS C: poligon & titik selalu sesuai pilihan terakhir, peta berpindah ke area baru.
- [ ] "Semua Sub SLS" mengembalikan tampilan level Desa tanpa memilih ulang Desa.
- [ ] Ganti Desa (kecamatan sama) lalu pilih SLS: tidak ada sisa poligon lama.
- [ ] Ganti Kecamatan: semua reset. Ganti SLS berkali-kali dengan cepat: hasil akhir sesuai pilihan terakhir.

**Kategori**
- [ ] Setiap titik berwarna sesuai kategori; tidak ada marker biru default tersisa.
- [ ] Default semua kategori tampil; mematikan satu kategori menyembunyikannya di peta **dan** daftar; jumlah "N dari M" benar.
- [ ] Filter kategori tidak ter-reset saat ganti Desa/SLS. Semua dimatikan → pesan kosong yang jelas.

**Mobile**
- [ ] 390×844, 360×640, dan landscape 844×390: peta selalu terlihat, tidak ada panel yang menutup seluruh layar.
- [ ] Ketuk item daftar → titik terlihat di area peta yang tidak tertutup sheet, popup tidak terpotong.
- [ ] Mode "Situs desktop" di HP: menu tampil tanpa perlu rotate.
- [ ] Tidak ada scroll halaman yang mengganggu; sentuhan pada handle tidak bentrok dengan scroll daftar.

**Lokasi**
- [ ] Titik oranye + lingkaran akurasi muncul, berpindah saat lokasi berubah (uji lewat DevTools Sensors).
- [ ] Jarak & garis ke target tampil dan ter-update; izin ditolak menampilkan petunjuk yang jelas.
- [ ] Uji di HP sungguhan lewat GitHub Pages (Android Chrome dan/atau iOS Safari).

**Umum**
- [ ] `npm run build` bersih, tidak ada 404 di console setelah deploy, fitur desktop lama tetap normal.

## 7. Di luar cakupan saat ini (ide untuk nanti)
- Urutkan daftar berdasarkan jarak terdekat dari posisi pengguna.
- Tombol "Buka navigasi" ke Google Maps untuk target terpilih.
- Mode offline/PWA.