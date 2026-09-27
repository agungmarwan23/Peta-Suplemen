"""
Script pra-pemrosesan data batas wilayah spasial:
- Membaca data mentah batas_wilayah.geojson dengan geopandas
- Memangkas atribut: kdkec, nmkec, kddesa, nmdesa, idsubsls, kdsubsls
- Menyederhanakan geometri (simplify tolerance 0.0001 derajat)
- Menyimpan 3 level hierarki:
    1. Sub SLS: app/public/data/batas/subsls/{kddesa}/{idsubsls}.geojson
    2. Desa: app/public/data/batas/desa/{kddesa}.geojson
    3. Kecamatan: app/public/data/batas/kecamatan/{kdkec}.geojson
- Menghitung dan menampilkan total ukuran dan jumlah file di folder app/public/data
"""

import json
import os
from pathlib import Path
import geopandas as gpd
import shapely.geometry


def get_paths():
    base_dir = Path(__file__).resolve().parent.parent.parent
    raw_dir = base_dir / "data-pipeline" / "raw"
    geojson_path = raw_dir / "batas_wilayah.geojson"
    output_dir = base_dir / "app" / "public" / "data"
    batas_dir = output_dir / "batas"
    subsls_dir = batas_dir / "subsls"
    desa_dir = batas_dir / "desa"
    kecamatan_dir = batas_dir / "kecamatan"
    return base_dir, raw_dir, geojson_path, output_dir, batas_dir, subsls_dir, desa_dir, kecamatan_dir


def round_coords(geom_dict, precision=6):
    """Membulatkan koordinat geometri ke tingkat presisi tertentu untuk memperkecil ukuran JSON."""
    if not geom_dict:
        return geom_dict
    coords = geom_dict.get("coordinates")
    if coords is None:
        return geom_dict

    def _round(c):
        if isinstance(c, (float, int)):
            return round(c, precision)
        elif isinstance(c, (list, tuple)):
            return [_round(x) for x in c]
        return c

    return {
        **geom_dict,
        "coordinates": _round(coords)
    }


def write_single_feature_geojson(file_path, properties, geometry):
    """Menulis FeatureCollection GeoJSON satu fitur secara kompak."""
    geom_mapping = shapely.geometry.mapping(geometry)
    rounded_geom = round_coords(geom_mapping, precision=6)
    
    fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": properties,
                "geometry": rounded_geom
            }
        ]
    }
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(fc, f, separators=(",", ":"), ensure_ascii=False)


def format_bytes(size_bytes):
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"


def get_dir_stats(path):
    total_size = 0
    total_files = 0
    breakdown = {}

    for root, _, files in os.walk(path):
        for f in files:
            fp = Path(root) / f
            try:
                sz = fp.stat().st_size
                total_size += sz
                total_files += 1

                rel = fp.relative_to(path)
                category = rel.parts[0] if len(rel.parts) > 1 else "root"
                if category == "batas" and len(rel.parts) > 2:
                    sub_cat = f"batas/{rel.parts[1]}"
                else:
                    sub_cat = category

                if sub_cat not in breakdown:
                    breakdown[sub_cat] = {"count": 0, "size": 0}
                breakdown[sub_cat]["count"] += 1
                breakdown[sub_cat]["size"] += sz
            except OSError:
                pass

    return total_size, total_files, breakdown


def main():
    base_dir, raw_dir, geojson_path, output_dir, batas_dir, subsls_dir, desa_dir, kecamatan_dir = get_paths()

    print("=" * 60)
    print("PRA-PEMROSESAN BATAS WILAYAH (process_batas_wilayah.py)")
    print("=" * 60)

    if not geojson_path.exists():
        raise FileNotFoundError(f"File batas wilayah tidak ditemukan: {geojson_path}")

    # Buat direktori output
    subsls_dir.mkdir(parents=True, exist_ok=True)
    desa_dir.mkdir(parents=True, exist_ok=True)
    kecamatan_dir.mkdir(parents=True, exist_ok=True)

    print(f"Membaca file GeoJSON mentah: {geojson_path}")
    gdf = gpd.read_file(geojson_path)
    total_raw_features = len(gdf)
    raw_size = geojson_path.stat().st_size
    print(f"Total fitur mentah: {total_raw_features:,} fitur ({format_bytes(raw_size)})")

    # Pastikan kode wilayah terstandardisasi dengan panjang penuh
    # kdkec: 7 digit (1403 + kdkec atau idsubsls[:7])
    # kddesa: 10 digit (1403 + kdkec + kddesa atau idsubsls[:10])
    print("Menstandarkan kode wilayah dan memangkas atribut...")
    gdf["kdkec"] = gdf["idsubsls"].astype(str).str[:7]
    gdf["kddesa"] = gdf["idsubsls"].astype(str).str[:10]
    gdf["kdsubsls"] = gdf["kdsubsls"].astype(str)
    gdf["idsubsls"] = gdf["idsubsls"].astype(str)
    gdf["nmkec"] = gdf["nmkec"].astype(str).str.strip()
    gdf["nmdesa"] = gdf["nmdesa"].astype(str).str.strip()

    # Pangkas atribut: kdkec, nmkec, kddesa, nmdesa, idsubsls, kdsubsls, geometry
    keep_cols = ["kdkec", "nmkec", "kddesa", "nmdesa", "idsubsls", "kdsubsls", "geometry"]
    gdf = gdf[keep_cols]

    # Simplify geometri (tolerance 0.0001 derajat ~ 11 meter)
    print("Menyederhanakan geometri (simplify tolerance = 0.0001 derajat)...")
    gdf["geometry"] = gdf.geometry.simplify(0.0001, preserve_topology=True)

    # LEVEL 1: Sub SLS
    print("\n--- LEVEL 1: Sub SLS ---")
    # Dissolve per idsubsls untuk menggabungkan subsls yang memiliki multipart polygon
    print("Menggabungkan multipart subsls...")
    gdf_subsls = gdf.dissolve(
        by=["kdkec", "nmkec", "kddesa", "nmdesa", "idsubsls", "kdsubsls"],
        as_index=False
    )
    print(f"Menyimpan {len(gdf_subsls):,} file GeoJSON Sub SLS...")

    # Cache direktori per desa agar tidak mkdir berulang
    created_desa_dirs = set()
    subsls_count = 0
    for _, row in gdf_subsls.iterrows():
        kddesa = row["kddesa"]
        idsubsls = row["idsubsls"]
        desa_folder = subsls_dir / kddesa
        if kddesa not in created_desa_dirs:
            desa_folder.mkdir(parents=True, exist_ok=True)
            created_desa_dirs.add(kddesa)

        props = {
            "kdkec": row["kdkec"],
            "nmkec": row["nmkec"],
            "kddesa": row["kddesa"],
            "nmdesa": row["nmdesa"],
            "idsubsls": row["idsubsls"],
            "kdsubsls": row["kdsubsls"]
        }
        out_path = desa_folder / f"{idsubsls}.geojson"
        write_single_feature_geojson(out_path, props, row["geometry"])
        subsls_count += 1

    print(f"Selesai menyimpan {subsls_count:,} file Sub SLS di {len(created_desa_dirs)} folder desa.")

    # LEVEL 2: Desa (Dissolve semua subsls dalam satu desa)
    print("\n--- LEVEL 2: Desa ---")
    print("Melakukan dissolve geometri per desa...")
    gdf_desa = gdf_subsls.dissolve(
        by=["kdkec", "nmkec", "kddesa", "nmdesa"],
        as_index=False
    )
    # Simplify ulang batas luar desa
    gdf_desa["geometry"] = gdf_desa.geometry.simplify(0.0001, preserve_topology=True)

    print(f"Menyimpan {len(gdf_desa):,} file GeoJSON Desa...")
    desa_count = 0
    for _, row in gdf_desa.iterrows():
        kddesa = row["kddesa"]
        props = {
            "kdkec": row["kdkec"],
            "nmkec": row["nmkec"],
            "kddesa": row["kddesa"],
            "nmdesa": row["nmdesa"]
        }
        out_path = desa_dir / f"{kddesa}.geojson"
        write_single_feature_geojson(out_path, props, row["geometry"])
        desa_count += 1

    print(f"Selesai menyimpan {desa_count:,} file batas Desa.")

    # LEVEL 3: Kecamatan (Dissolve semua desa dalam satu kecamatan)
    print("\n--- LEVEL 3: Kecamatan ---")
    print("Melakukan dissolve geometri per kecamatan...")
    gdf_kec = gdf_desa.dissolve(
        by=["kdkec", "nmkec"],
        as_index=False
    )
    # Simplify ulang batas luar kecamatan
    gdf_kec["geometry"] = gdf_kec.geometry.simplify(0.0001, preserve_topology=True)

    print(f"Menyimpan {len(gdf_kec):,} file GeoJSON Kecamatan...")
    kec_count = 0
    for _, row in gdf_kec.iterrows():
        kdkec = row["kdkec"]
        props = {
            "kdkec": row["kdkec"],
            "nmkec": row["nmkec"]
        }
        out_path = kecamatan_dir / f"{kdkec}.geojson"
        write_single_feature_geojson(out_path, props, row["geometry"])
        kec_count += 1

    print(f"Selesai menyimpan {kec_count:,} file batas Kecamatan.")

    # Hitung total ukuran dan jumlah file di folder app/public/data
    total_size, total_files, breakdown = get_dir_stats(output_dir)

    print("\n" + "=" * 60)
    print("RINGKASAN TOTAL FOLDER app/public/data:")
    print("=" * 60)
    print(f"Total file: {total_files:,} file")
    print(f"Total ukuran: {format_bytes(total_size)} ({total_size:,} bytes)")
    print("\nRincian per kategori:")
    for cat, stat in sorted(breakdown.items()):
        print(f"  - {cat:<18}: {stat['count']:>5,} file | {format_bytes(stat['size']):>10}")

    print("=" * 60)
    print("Pra-pemrosesan batas wilayah selesai dengan sukses!")


if __name__ == "__main__":
    main()
