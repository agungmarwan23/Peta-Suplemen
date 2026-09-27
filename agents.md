# AGENTS.md — Peta Suplemen

Baca `docs/PRD.md` sebagai spesifikasi utama sebelum mengerjakan tahap apa pun di proyek ini.
Urutan pengerjaan mengikuti `docs/PROMPTS.md` (Tahap 0–4) — jangan lompat ke tahap berikutnya sebelum tahap sebelumnya selesai dan disetujui pengguna.

## Ringkasan Proyek
Web GIS statis (tanpa server) untuk memvisualisasikan titik data penduduk/suplemen di atas peta satelit, dengan filter berjenjang Kecamatan → Desa → Sub SLS. Titik data baru dimuat setelah level Desa dipilih.

## Batasan Penting
- Tidak ada backend/API server — semua data disajikan sebagai file statis di `app/public/data/`.
- Hosting: GitHub Pages (repo publik). Perhatikan base path saat build (lihat PRD bagian 5.5).
- Data mentah asli ada di `data-pipeline/raw/` dan TIDAK boleh di-commit (lihat `.gitignore`).
- Semua path fetch di frontend memakai `import.meta.env.BASE_URL` sebagai prefix.