"""
Script pra-pemrosesan data penduduk:
- Membaca data mentah penduduk.csv
- Memfilter dan membersihkan data
- Menambahkan field `kat` (kode kategori) dari kolom metode_match_final
- Memecah data per desa menjadi app/public/data/penduduk/{kddesa}.json
- Menghasilkan app/public/data/kategori.json
- Menghasilkan app/public/data/filter-options.json
- Menampilkan ringkasan data per desa
"""

import json
import math
import re
from pathlib import Path

import pandas as pd


# =============================================================================
# KONFIGURASI KATEGORI
# Edit bagian ini untuk mengubah label, warna, atau urutan tampilan.
# CATATAN: oranye (#f97316) DICADANGKAN untuk posisi pengguna – jangan pakai.
# =============================================================================
KATEGORI_CONFIG = [
    {
        "kode": "kk",
        "label": "Match KK",
        "label_lengkap": "MATCH NO KK",
        "warna": "#22c55e",   # hijau
        "urutan": 1,
        "_match": {"MATCH NO KK"},
    },
    {
        "kode": "nl",
        "label": "Nama Lengkap (Kec 95)",
        "label_lengkap": "NAMA LENGKAP - KECAMATAN 95 - BELUM DIDATA",
        "warna": "#a855f7",   # ungu
        "urutan": 2,
        "_match": {"NAMA LENGKAP - KECAMATAN 95 - BELUM DIDATA"},
    },
    {
        "kode": "tm",
        "label": "Tidak Match",
        "label_lengkap": "TIDAK MATCH",
        "warna": "#ef4444",   # merah
        "urutan": 3,
        "_match": {"TIDAK MATCH"},
    },
    {
        "kode": "ns",
        "label": "Nama Satu (Desa 100)",
        "label_lengkap": "NAMA SATU - DESA 100 - BELUM DIDATA",
        "warna": "#06b6d4",   # cyan
        "urutan": 4,
        "_match": {"NAMA SATU - DESA 100 - BELUM DIDATA"},
    },
    {
        "kode": "lain",
        "label": "Lainnya",
        "label_lengkap": "",   # diisi dinamis dari nilai CSV yang tidak dikenal
        "warna": "#9ca3af",   # abu-abu
        "urutan": 5,
        "_match": set(),
    },
]

# Buat lookup: nilai_norm -> kode
_LOOKUP: dict = {}
for _cat in KATEGORI_CONFIG:
    for _val in _cat["_match"]:
        _LOOKUP[_val] = _cat["kode"]
_LOOKUP[""] = "lain"   # NaN / kosong -> lain


# =============================================================================
# FUNGSI BANTU
# =============================================================================

def get_paths():
    base_dir = Path(__file__).resolve().parent.parent.parent
    raw_dir = base_dir / "data-pipeline" / "raw"
    csv_path = raw_dir / "penduduk.csv"
    geojson_path = raw_dir / "batas_wilayah.geojson"
    output_dir = base_dir / "app" / "public" / "data"
    penduduk_dir = output_dir / "penduduk"
    filter_options_path = output_dir / "filter-options.json"
    kategori_path = output_dir / "kategori.json"
    return (
        base_dir, raw_dir, csv_path, geojson_path,
        output_dir, penduduk_dir, filter_options_path, kategori_path,
    )


def normalize_match(val) -> str:
    """
    Normalisasi nilai metode_match_final:
    - NaN / kosong  -> ''
    - strip whitespace di tepi
    - rapikan spasi ganda menjadi satu spasi
    - uppercase
    - ganti en-dash (u2013) dan em-dash (u2014) dengan tanda strip biasa (-)
    """
    if pd.isna(val):
        return ""
    s = str(val).strip()
    s = re.sub(r" +", " ", s)
    s = s.upper()
    s = re.sub(r"[\u2013\u2014]", "-", s)
    return s


def map_to_kode(norm_val: str) -> str:
    return _LOOKUP.get(norm_val, "lain")


def clean_coord(val):
    if pd.isna(val):
        return None
    val_str = str(val).strip().strip("'\"").strip()
    if not val_str or val_str.lower() in ("nan", "none", "null", ""):
        return None
    try:
        coord = float(val_str)
        if math.isnan(coord) or math.isinf(coord):
            return None
        return round(coord, 6)
    except (ValueError, TypeError):
        return None


def format_alamat(row) -> str:
    alamat = str(row["alamat"]).strip() if pd.notna(row["alamat"]) else ""
    suplemen = str(row["alamat_suplemen"]).strip() if pd.notna(row["alamat_suplemen"]) else ""
    alamat = " ".join(alamat.split())
    suplemen = " ".join(suplemen.split())
    if alamat and suplemen:
        if alamat.upper() == suplemen.upper():
            return alamat
        return f"{alamat}, {suplemen}"
    return alamat or suplemen or ""


def build_filter_options(df_valid, geojson_path):
    """
    Membangun filter-options.json dengan struktur:
    [{ kdkec, nmkec, desa: [{ kddesa, nmdesa, subsls: [{ idsubsls, kdsubsls, nmsls }] }] }]
    Mengutamakan batas_wilayah.geojson jika ada agar semua wilayah administratif tercakup lengkap.
    """
    if geojson_path.exists():
        print("Membangun filter-options.json dari master batas_wilayah.geojson...")
        import geopandas as gpd
        gdf = gpd.read_file(geojson_path)
        gdf["kdkec"] = gdf["idsubsls"].str[:7]
        gdf["kddesa"] = gdf["idsubsls"].str[:10]
        gdf["kdsubsls"] = gdf["kdsubsls"].astype(str)
        gdf["idsubsls"] = gdf["idsubsls"].astype(str)
        gdf["nmkec"] = gdf["nmkec"].astype(str).str.strip()
        gdf["nmdesa"] = gdf["nmdesa"].astype(str).str.strip()
        gdf["nmsls"] = gdf["nmsls"].astype(str).str.strip()

        unique_subsls = gdf[
            ["kdkec", "nmkec", "kddesa", "nmdesa", "idsubsls", "kdsubsls", "nmsls"]
        ].drop_duplicates()

        filter_tree = []
        for (kdkec, nmkec), group_kec in unique_subsls.groupby(["kdkec", "nmkec"], sort=True):
            desa_list = []
            for (kddesa, nmdesa), group_desa in group_kec.groupby(
                ["kddesa", "nmdesa"], sort=True
            ):
                subsls_list = []
                for _, r in group_desa.sort_values("idsubsls").iterrows():
                    subsls_list.append({
                        "idsubsls": r["idsubsls"],
                        "kdsubsls": r["kdsubsls"],
                        "nmsls": r["nmsls"],
                    })
                desa_list.append({
                    "kddesa": kddesa,
                    "nmdesa": nmdesa,
                    "subsls": subsls_list,
                })
            filter_tree.append({"kdkec": kdkec, "nmkec": nmkec, "desa": desa_list})
        return filter_tree

    else:
        print("Membangun filter-options.json dari penduduk.csv...")
        desa_info = {}
        for _, row in df_valid.iterrows():
            d = row["iddesa_baru"]
            if d not in desa_info:
                desa_info[d] = {
                    "kdkec": d[:7],
                    "nmkec": str(row["nmkec"]).strip() if pd.notna(row["nmkec"]) else None,
                    "nmdesa": str(row["nmkec.1"]).strip() if pd.notna(row["nmkec.1"]) else None,
                }
            else:
                if not desa_info[d]["nmkec"] and pd.notna(row["nmkec"]):
                    desa_info[d]["nmkec"] = str(row["nmkec"]).strip()
                if not desa_info[d]["nmdesa"] and pd.notna(row["nmkec.1"]):
                    desa_info[d]["nmdesa"] = str(row["nmkec.1"]).strip()

        subsls_info = {}
        for _, row in df_valid.iterrows():
            s = row["idsubsls_baru"]
            if pd.notna(s) and s not in subsls_info:
                nm = str(row["sls_nama"]).strip() if pd.notna(row["sls_nama"]) else ""
                subsls_info[s] = nm

        tree = {}
        for d, info in desa_info.items():
            kec_code = info["kdkec"]
            kec_name = info["nmkec"] or f"Kecamatan {kec_code}"
            desa_name = info["nmdesa"] or f"Desa {d}"
            if kec_code not in tree:
                tree[kec_code] = {"kdkec": kec_code, "nmkec": kec_name, "desa_map": {}}
            if d not in tree[kec_code]["desa_map"]:
                tree[kec_code]["desa_map"][d] = {
                    "kddesa": d,
                    "nmdesa": desa_name,
                    "subsls_map": {},
                }

        for _, row in df_valid.iterrows():
            d = row["iddesa_baru"]
            s = row["idsubsls_baru"]
            if pd.notna(s):
                kec_code = d[:7]
                kdsubsls = s[-2:]
                nmsls = subsls_info.get(s, "")
                tree[kec_code]["desa_map"][d]["subsls_map"][s] = {
                    "idsubsls": s,
                    "kdsubsls": kdsubsls,
                    "nmsls": nmsls,
                }

        filter_tree = []
        for kec_code in sorted(tree.keys()):
            kec_obj = tree[kec_code]
            desa_list = []
            for d_code in sorted(kec_obj["desa_map"].keys()):
                desa_obj = kec_obj["desa_map"][d_code]
                sub_list = sorted(
                    list(desa_obj["subsls_map"].values()), key=lambda x: x["idsubsls"]
                )
                desa_list.append({
                    "kddesa": desa_obj["kddesa"],
                    "nmdesa": desa_obj["nmdesa"],
                    "subsls": sub_list,
                })
            filter_tree.append({
                "kdkec": kec_obj["kdkec"],
                "nmkec": kec_obj["nmkec"],
                "desa": desa_list,
            })
        return filter_tree


# =============================================================================
# MAIN
# =============================================================================

def main():
    (
        base_dir, raw_dir, csv_path, geojson_path,
        output_dir, penduduk_dir, filter_options_path, kategori_path,
    ) = get_paths()

    print("=" * 60)
    print("PRA-PEMROSESAN DATA PENDUDUK (split_penduduk.py)")
    print("=" * 60)

    if not csv_path.exists():
        raise FileNotFoundError(f"File sumber tidak ditemukan: {csv_path}")

    print(f"Membaca file: {csv_path}")
    df = pd.read_csv(csv_path, dtype=str)
    total_raw_rows = len(df)
    print(f"Total baris mentah: {total_raw_rows:,}")

    # --- Audit kolom metode_match_final ---
    match_col = "metode_match_final"
    if match_col not in df.columns:
        raise ValueError(
            f"Kolom '{match_col}' tidak ditemukan! "
            f"Kolom tersedia: {list(df.columns)}"
        )
    print(f"\nKolom kategori: [{match_col}]")

    df["_norm"] = df[match_col].apply(normalize_match)
    df["kat"] = df["_norm"].apply(map_to_kode)

    norm_counts = df["_norm"].value_counts(dropna=False).to_dict()
    known_norms = set(_LOOKUP.keys())
    unknown_vals = [v for v in norm_counts if v not in known_norms and v != ""]

    print("\n=== NILAI UNIK metode_match_final -> KODE ===")
    print(f"  {'Nilai (setelah normalisasi)':<50} {'Kode':<6} {'Jumlah':>7}")
    print("  " + "-" * 65)
    for norm_val, cnt in sorted(norm_counts.items(), key=lambda x: -x[1]):
        kode = map_to_kode(norm_val)
        label = repr(norm_val) if norm_val else "(kosong/NaN)"
        print(f"  {label:<50} {kode:<6} {cnt:>7,}")

    if unknown_vals:
        print()
        print("  PERHATIAN - nilai tidak dikenal (dipetakan ke 'lain'):")
        for v in unknown_vals:
            print(f"    - {repr(v)}  ({norm_counts[v]:,} baris)")

    # --- Buat direktori output ---
    penduduk_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    # --- Filter baris valid ---
    df_valid = df[
        df["iddesa_baru"].notna() & (df["iddesa_baru"].str.strip() != "")
    ].copy()
    df_valid["iddesa_baru"] = df_valid["iddesa_baru"].str.strip()
    skipped_rows = total_raw_rows - len(df_valid)
    if skipped_rows > 0:
        print(f"\nDilewati {skipped_rows:,} baris tanpa iddesa_baru yang valid.")

    # --- Bersihkan kolom ---
    print("\nMemproses atribut dan koordinat...")
    df_valid["nama"] = df_valid["nama_gabungan"].fillna("").astype(str).str.strip()
    df_valid["alamat_clean"] = df_valid.apply(format_alamat, axis=1)
    df_valid["no_kk"] = (
        df_valid["no_kk_regsosek"]
        .fillna("").astype(str).str.strip()
        .str.replace(r"\.0$", "", regex=True)
    )
    df_valid["no_hp"] = (
        df_valid["hp_responden"]
        .fillna("").astype(str).str.strip()
        .str.replace(r"\.0$", "", regex=True)
    )
    df_valid["lat"] = df_valid["latitude"].apply(clean_coord)
    df_valid["lng"] = df_valid["longitude"].apply(clean_coord)
    df_valid["idsubsls"] = (
        df_valid["idsubsls_baru"]
        .fillna("").astype(str).str.strip()
        .str.replace(r"\.0$", "", regex=True)
    )

    # --- Tulis JSON per desa ---
    print("\nMenulis file JSON per desa...")
    desa_counts: dict = {}
    kat_grand_counts: dict = {cat["kode"]: 0 for cat in KATEGORI_CONFIG}

    for kddesa, group in df_valid.groupby("iddesa_baru"):
        records = []
        for idx, (_, row) in enumerate(group.iterrows()):
            lat_val = row["lat"]
            lng_val = row["lng"]
            lat_clean = (
                None
                if (
                    pd.isna(lat_val)
                    or (
                        isinstance(lat_val, float)
                        and (math.isnan(lat_val) or math.isinf(lat_val))
                    )
                )
                else float(lat_val)
            )
            lng_clean = (
                None
                if (
                    pd.isna(lng_val)
                    or (
                        isinstance(lng_val, float)
                        and (math.isnan(lng_val) or math.isinf(lng_val))
                    )
                )
                else float(lng_val)
            )

            kat = str(row["kat"])
            kat_grand_counts[kat] = kat_grand_counts.get(kat, 0) + 1

            records.append({
                "id": f"{kddesa}_{idx + 1}",
                "nama": row["nama"],
                "alamat": row["alamat_clean"],
                "no_kk": row["no_kk"],
                "no_hp": row["no_hp"],
                "lat": lat_clean,
                "lng": lng_clean,
                "idsubsls": row["idsubsls"],
                "kat": kat,
            })

        out_file = penduduk_dir / f"{kddesa}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(records, f, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
        desa_counts[kddesa] = len(records)

    # --- Tulis kategori.json ---
    print("\nMembuat file kategori.json...")
    lain_raw = [v for v in df["_norm"].unique() if v != "" and v not in known_norms]
    kategori_out = []
    for cat in KATEGORI_CONFIG:
        entry = {
            "kode": cat["kode"],
            "label": cat["label"],
            "label_lengkap": cat["label_lengkap"],
            "warna": cat["warna"],
            "urutan": cat["urutan"],
            "jumlah": kat_grand_counts.get(cat["kode"], 0),
        }
        if cat["kode"] == "lain" and lain_raw:
            entry["label_lengkap"] = "; ".join(lain_raw)
        kategori_out.append(entry)
    kategori_out.sort(key=lambda x: x["urutan"])

    with open(kategori_path, "w", encoding="utf-8") as f:
        json.dump(kategori_out, f, indent=2, ensure_ascii=False)
    print(f"File kategori.json tersimpan di: {kategori_path}")

    # --- Tulis filter-options.json ---
    print("\nMembuat file filter-options.json...")
    filter_tree = build_filter_options(df_valid, geojson_path)
    with open(filter_options_path, "w", encoding="utf-8") as f:
        json.dump(filter_tree, f, separators=(",", ":"), ensure_ascii=False)
    print(f"File filter-options.json tersimpan di: {filter_options_path}")

    # --- Ringkasan ---
    total_files = len(desa_counts)
    total_processed = sum(desa_counts.values())
    sorted_counts = sorted(desa_counts.items(), key=lambda x: x[1], reverse=True)

    print("\n" + "=" * 60)
    print("RINGKASAN HASIL:")
    print("=" * 60)
    print(f"Jumlah file desa dihasilkan: {total_files:,}")
    print(f"Total baris data diproses  : {total_processed:,}")
    print(f"Rata-rata baris per desa   : {total_processed / total_files:.1f}")

    print("\n-- Distribusi kategori (seluruh dataset) --")
    print(f"  {'Kode':<6} {'Label':<26} {'Jumlah':>7}  {'%':>6}")
    print("  " + "-" * 48)
    for cat in sorted(KATEGORI_CONFIG, key=lambda x: x["urutan"]):
        jml = kat_grand_counts.get(cat["kode"], 0)
        pct = jml / total_processed * 100 if total_processed else 0
        print(f"  {cat['kode']:<6} {cat['label']:<26} {jml:>7,}  {pct:>5.1f}%")

    over_500 = [x for x in sorted_counts if x[1] > 500]
    print(f"\nDesa dengan data > 500 baris ({len(over_500)} desa, perlu virtualisasi):")
    for kddesa, count in over_500:
        print(f"  - Desa {kddesa}: {count:,} baris")

    print(f"\nTop 10 desa dengan data terbanyak:")
    for kddesa, count in sorted_counts[:10]:
        print(f"  - Desa {kddesa}: {count:,} baris")

    print(f"\nTop 5 desa dengan data tersedikit:")
    for kddesa, count in sorted_counts[-5:]:
        print(f"  - Desa {kddesa}: {count:,} baris")

    print("=" * 60)
    print("Pra-pemrosesan data penduduk selesai dengan sukses!")


if __name__ == "__main__":
    main()

