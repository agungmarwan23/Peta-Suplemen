# Peta Suplemen

Aplikasi visualisasi sebaran data suplemen penduduk berbasis peta interaktif.

---

## Menjalankan Secara Lokal (HTTP)

```bash
cd app
npm install
npm run dev
```

Buka: http://localhost:5173/Peta-Suplemen/

---

## Fitur "Lokasi Saya" — Catatan HTTPS

> **Geolocation API hanya berfungsi di HTTPS atau `localhost`.**

| Kondisi | Geolocation |
|---|---|
| `http://localhost:5173` | ✅ Berfungsi |
| `https://agungmarwan23.github.io/Peta-Suplemen/` | ✅ Berfungsi |
| `http://192.168.x.x:5173` (IP lokal tanpa HTTPS) | ❌ Tidak berfungsi |

### Opsi 1 — Uji Langsung di GitHub Pages (Direkomendasikan)

Deploy ke GitHub Pages sudah otomatis via workflow di `.github/workflows/deploy.yml`. Buka aplikasi lewat URL GitHub Pages — geolocation akan langsung berfungsi karena sudah HTTPS.

### Opsi 2 — Dev Server HTTPS di LAN dengan Plugin Basic SSL

Gunakan ini bila perlu menguji fitur Lokasi Saya di HP melalui IP jaringan lokal.

**1. Plugin sudah terinstall.** Jika belum:
```bash
cd app
npm install -D @vitejs/plugin-basic-ssl@^1.2.0
```

**2. Jalankan dev server dengan HTTPS:**
```bash
# Windows PowerShell
$env:HTTPS="true"; npm run dev -- --host

# Linux / macOS / Git Bash
HTTPS=true npm run dev -- --host
```

Server akan berjalan di `https://localhost:5173` dan `https://192.168.x.x:5173`.

**3. Di HP:**
- Buka `https://192.168.x.x:5173/Peta-Suplemen/`
- Browser akan menampilkan peringatan sertifikat tidak tepercaya (self-signed) — ketuk **"Advanced"** → **"Proceed anyway"**
- Setelah itu fitur Lokasi Saya akan berfungsi normal

> **Catatan:** Peringatan sertifikat adalah normal untuk sertifikat self-signed di dev. Di produksi (GitHub Pages), tidak ada peringatan karena menggunakan sertifikat resmi.

---

## Stack Teknologi

- **Frontend:** React 18, Vite 5, Tailwind CSS 3
- **Peta:** Leaflet 1.9, React-Leaflet 4
- **Deploy:** GitHub Pages via GitHub Actions

---

## Struktur Proyek

```
app/                    # Kode frontend (React + Vite)
  public/data/          # Data JSON (penduduk, batas wilayah, kategori)
  src/App.jsx           # Komponen utama aplikasi
data-pipeline/          # Skrip Python untuk memproses data
  scripts/              # split_penduduk.py, dll.
  raw/                  # Data mentah (CSV)
docs/                   # Dokumentasi proyek (PRD, dll.)
```

---

## Privasi

Semua pemrosesan data dilakukan di browser pengguna. Tidak ada data (termasuk data lokasi pengguna) yang dikirim atau disimpan di server mana pun.
