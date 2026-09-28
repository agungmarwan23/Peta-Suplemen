# AGENTS.md — Peta Suplemen

Baca `docs/PRD.md` dan `docs/PRD-tambahan-01.md` sebagai spesifikasi utama sebelum mengerjakan tahap apa pun. Jika keduanya bertentangan, `PRD-tambahan-01.md` yang berlaku.
Urutan pengerjaan: `docs/PROMPTS.md` (Tahap 0–4), lalu `docs/PROMPTS-tambahan.md` (Tahap 5–9). Jangan lompat ke tahap berikutnya sebelum tahap sebelumnya selesai dan disetujui pengguna. Kerjakan hanya tahap yang diminta.

## Ringkasan Proyek
Web GIS statis (tanpa server) untuk memvisualisasikan titik data penduduk/suplemen di atas peta satelit, dengan filter berjenjang Kecamatan → Desa → Sub SLS. Titik data baru dimuat setelah level Desa dipilih. Dipakai di laptop dan di HP (lapangan).

## Batasan Penting
- Tidak ada backend/API server — semua data disajikan sebagai file statis di `app/public/data/`.
- Hosting: GitHub Pages (repo publik). Perhatikan base path saat build (lihat PRD bagian 5.5).
- Data mentah asli ada di `data-pipeline/raw/` dan TIDAK boleh di-commit (lihat `.gitignore`).
- Semua path fetch di frontend memakai `import.meta.env.BASE_URL` sebagai prefix.

## Aturan Tampilan
- Mobile-first: peta harus selalu terlihat; panel/daftar/filter berada di bottom sheet dan tidak boleh menutup seluruh layar. Layout mobile dipakai bila lebar < 768px atau `pointer: coarse`.
- Warna oranye (`#f97316`) DICADANGKAN untuk posisi pengguna ("Lokasi Saya"). Jangan dipakai untuk hal lain, dan jangan memakai biru untuk posisi pengguna.
- Label dan warna kategori "metode match final" hanya dibaca dari `app/public/data/kategori.json`, tidak di-hardcode di komponen.
- Layer Leaflet/react-leaflet yang datanya berubah (mis. `<GeoJSON>`) harus diberi `key` yang berubah mengikuti data, dan fetch yang usang harus dibatalkan/diabaikan.
- Geolocation hanya bekerja di HTTPS atau localhost; lokasi pengguna tidak boleh dikirim atau disimpan.