import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { FixedSizeList as List } from "react-window"
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import {
  MapPin, Phone, CreditCard, Home, Users, Layers,
  ChevronDown, ChevronUp, Filter, Info, RotateCcw, Navigation,
  Lock, Eye, EyeOff, Map, Check, X, Crosshair, Loader2, WifiOff,
} from "lucide-react"

// Fallback minimal bila kategori.json belum termuat
const KAT_FALLBACK = { kode: "lain", label: "Lainnya", label_lengkap: "", warna: "#9ca3af" }

// Warna oranye khusus Lokasi Saya (JANGAN dipakai di kategori)
const LOC_COLOR = "#f97316"

// ── Format jarak ──────────────────────────────────────────────────────────
function formatJarak(meter) {
  if (meter < 1000) return `±${Math.round(meter)} m`
  return `±${(meter / 1000).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
}

// ── Toast Snackbar ────────────────────────────────────────────────────────
function Toast({ message, type = "error", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 8000)
    return () => clearTimeout(t)
  }, [onClose])

  const bg = type === "error" ? "bg-rose-950/95 border-rose-700/60" : "bg-amber-950/95 border-amber-700/60"
  const text = type === "error" ? "text-rose-200" : "text-amber-200"

  return (
    <div className={`fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[2000] ${bg} border backdrop-blur-md rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom duration-300`}>
      <WifiOff className={`w-5 h-5 mt-0.5 shrink-0 ${type === "error" ? "text-rose-400" : "text-amber-400"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${text}`}>Lokasi Tidak Tersedia</p>
        <p className={`text-xs mt-0.5 leading-relaxed ${text} opacity-80`}>{message}</p>
      </div>
      <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-white transition-colors p-0.5 -mt-0.5">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── UserLocationLayer ─────────────────────────────────────────────────────
// Merender titik lokasi pengguna + lingkaran akurasi di dalam MapContainer.
function UserLocationLayer({ userPos }) {
  const map = useMap()

  // Buat pane khusus sekali saja supaya z-index lebih tinggi dari marker penduduk
  useEffect(() => {
    if (!map.getPane("userLocationPane")) {
      map.createPane("userLocationPane")
      map.getPane("userLocationPane").style.zIndex = "650"
    }
  }, [map])

  if (!userPos) return null

  const { lat, lng, accuracy } = userPos

  return (
    <>
      {/* Lingkaran akurasi */}
      <CircleMarker
        key={`acc-${lat}-${lng}`}
        center={[lat, lng]}
        radius={0}
        pathOptions={{
          color: LOC_COLOR,
          weight: 1.5,
          fillColor: LOC_COLOR,
          fillOpacity: 0.12,
          opacity: 0.5,
        }}
        pane="userLocationPane"
      />
      {/* Lingkaran akurasi (L.circle pakai meter, bukan pixel) dibuat via ref */}
      <AccuracyCircle lat={lat} lng={lng} accuracy={accuracy} />

      {/* Titik posisi pengguna */}
      <CircleMarker
        key={`loc-${lat}-${lng}`}
        center={[lat, lng]}
        radius={10}
        pathOptions={{
          color: "#ffffff",
          weight: 3,
          fillColor: LOC_COLOR,
          fillOpacity: 1,
          opacity: 1,
        }}
        pane="userLocationPane"
      />
    </>
  )
}

// Komponen L.circle (radius dalam meter) untuk lingkaran akurasi
function AccuracyCircle({ lat, lng, accuracy }) {
  const map = useMap()
  const circleRef = useRef(null)

  useEffect(() => {
    if (!map.getPane("userLocationPane")) return
    if (circleRef.current) {
      map.removeLayer(circleRef.current)
    }
    const circle = L.circle([lat, lng], {
      radius: Math.max(accuracy || 0, 10),
      color: LOC_COLOR,
      weight: 1.5,
      fillColor: LOC_COLOR,
      fillOpacity: 0.12,
      opacity: 0.4,
      pane: "userLocationPane",
    }).addTo(map)
    circleRef.current = circle
    return () => {
      if (circleRef.current) map.removeLayer(circleRef.current)
    }
  }, [map, lat, lng, accuracy])

  return null
}

// ── LokasiSayaButton ──────────────────────────────────────────────────────
// Props: status ("idle"|"searching"|"active"), onActivate, onCenter, onStop
function LokasiSayaButton({ status, onActivate, onCenter, onStop, isMobile }) {
  // Posisi: Desktop → kanan bawah peta; Mobile → di atas navbar (bottom-16)
  const bottomClass = isMobile ? "bottom-16" : "bottom-6"

  return (
    <div className={`absolute right-4 ${bottomClass} z-[1015] flex flex-col items-end gap-2`}>
      {/* Tombol utama */}
      <button
        onClick={() => {
          if (status === "idle") onActivate()
          else onCenter()
        }}
        title={status === "idle" ? "Aktifkan Lokasi Saya" : status === "searching" ? "Mencari lokasi…" : "Pusatkan ke lokasi saya"}
        className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all active:scale-90 border-2 ${
          status === "active"
            ? "border-orange-500/70 shadow-orange-500/30"
            : "border-slate-700/80 bg-slate-900/95 backdrop-blur-md"
        }`}
        style={status === "active" ? { backgroundColor: LOC_COLOR + "22", borderColor: LOC_COLOR + "99" } : {}}
      >
        {status === "searching" ? (
          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
        ) : (
          <Crosshair
            className="w-5 h-5 transition-colors"
            style={{ color: status === "active" ? LOC_COLOR : "#94a3b8" }}
          />
        )}
      </button>

      {/* Tombol "Matikan" — hanya muncul saat searching/active */}
      {status !== "idle" && (
        <button
          onClick={onStop}
          title="Matikan pelacak lokasi"
          className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-rose-400 hover:border-rose-700/60 shadow-lg transition-all"
        >
          Matikan
        </button>
      )}
    </div>
  )
}

const TILE_LAYERS = {
  satellite:       { label: "Esri Satellite",   url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",  attribution: "Tiles &copy; Esri", maxZoom: 19, overlay: true  },
  google_road:     { label: "Google Maps",       url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",                                            attribution: "&copy; Google Maps",      maxZoom: 22, overlay: false },
  google_satellite:{ label: "Google Satellite",  url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",                                            attribution: "&copy; Google Satellite",  maxZoom: 22, overlay: false },
  google_hybrid:   { label: "Google Hybrid",     url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",                                            attribution: "&copy; Google Hybrid",     maxZoom: 22, overlay: false },
  google_terrain:  { label: "Google Terrain",    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",                                            attribution: "&copy; Google Terrain",    maxZoom: 22, overlay: false },
  openstreetmap:   { label: "OpenStreetMap",     url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                                             attribution: "&copy; OpenStreetMap",     maxZoom: 19, overlay: false },
}

// ─── Hook Deteksi Mobile ───────────────────────────────────────────────────
// Mobile jika lebar < 768px ATAU pointer: coarse (layar sentuh).
// Pada mode "Situs desktop" di HP, browser menyetel lebar ~980px namun pointer: coarse tetap true!
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches
  })

  useEffect(() => {
    const mqlWidth = window.matchMedia("(max-width: 767px)")
    const mqlPointer = window.matchMedia("(pointer: coarse)")

    const check = () => {
      setIsMobile(window.innerWidth < 768 || mqlPointer.matches)
    }

    mqlWidth.addEventListener("change", check)
    mqlPointer.addEventListener("change", check)
    window.addEventListener("resize", check)

    check()
    return () => {
      mqlWidth.removeEventListener("change", check)
      mqlPointer.removeEventListener("change", check)
      window.removeEventListener("resize", check)
    }
  }, [])

  return isMobile
}

// ─── MapResizeController ───────────────────────────────────────────────────
function MapResizeController({ activeTab, sheetSnap, isMobile }) {
  const map = useMap()
  useEffect(() => {
    const handleResize = () => {
      try { map.invalidateSize() } catch (_) {}
    }
    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)

    const container = map.getContainer()
    let ro
    if (typeof ResizeObserver !== "undefined" && container) {
      ro = new ResizeObserver(() => {
        try { map.invalidateSize() } catch (_) {}
      })
      ro.observe(container)
    }

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
      if (ro) ro.disconnect()
    }
  }, [map])

  // Invalidate peta saat tab atau tinggi sheet berubah
  useEffect(() => {
    const timer = setTimeout(() => {
      try { map.invalidateSize() } catch (_) {}
    }, 280)
    return () => clearTimeout(timer)
  }, [activeTab, sheetSnap, isMobile, map])

  return null
}

// ─── MapBoundsController ────────────────────────────────────────────────────
function MapBoundsController({ geojsonBounds, flyToPoint, markerRefs, isMobile, sheetOffsetPx }) {
  const map = useMap()

  useEffect(() => {
    if (flyToPoint && typeof flyToPoint.lat === "number" && typeof flyToPoint.lng === "number" && !isNaN(flyToPoint.lat) && !isNaN(flyToPoint.lng)) {
      const zoom = 17
      let targetCenter = [flyToPoint.lat, flyToPoint.lng]

      // Bila di mobile dan ada sheet bawah terbuka, geser titik target agar jatuh di tengah bagian peta yang tampak
      if (isMobile && sheetOffsetPx > 0) {
        try {
          const point = map.project(targetCenter, zoom)
          // sheetOffsetPx berada di bawah layar, jadi geser center ke bawah agar titik objek tampak di bagian atas/tengah layar bebas
          const newCenterPoint = L.point(point.x, point.y + (sheetOffsetPx / 2))
          const newLatLng = map.unproject(newCenterPoint, zoom)
          targetCenter = [newLatLng.lat, newLatLng.lng]
        } catch (_) {}
      }

      map.flyTo(targetCenter, zoom, { duration: 1.1 })

      if (markerRefs?.current?.[flyToPoint.id]) {
        setTimeout(() => {
          try {
            const marker = markerRefs.current[flyToPoint.id]
            if (marker) {
              const popup = marker.getPopup()
              if (popup) {
                popup.options.autoPanPaddingTopLeft = [20, 80]
                popup.options.autoPanPaddingBottomRight = [20, isMobile ? (sheetOffsetPx + 40) : 40]
              }
              marker.openPopup()
            }
          } catch (_) {}
        }, 1250)
      }
    } else if (geojsonBounds) {
      try {
        const bounds = L.geoJSON(geojsonBounds).getBounds()
        if (bounds.isValid()) {
          const bottomPad = isMobile ? (sheetOffsetPx + 30) : 60
          map.fitBounds(bounds, {
            paddingTopLeft: [50, 70],
            paddingBottomRight: [50, bottomPad],
            maxZoom: 17,
            duration: 1.0,
          })
        }
      } catch (_) {}
    }
  }, [geojsonBounds, flyToPoint, map, isMobile, sheetOffsetPx, markerRefs])

  return null
}

// ─── PasswordGate ───────────────────────────────────────────────────────────
function PasswordGate({ onSuccess }) {
  const [input, setInput] = useState("")
  const [error, setError] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (input === "Mitra1403") { onSuccess() }
    else { setError(true); setShake(true); setTimeout(() => setShake(false), 500) }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950 z-50 p-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>
      <form
        onSubmit={handleSubmit}
        style={shake ? {animation:"shake 0.4s ease"} : {}}
        className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-5"
      >
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Peta Suplemen</h1>
          <p className="text-xs text-slate-400 text-center leading-relaxed">Masukkan password untuk mengakses<br/>visualisasi data penduduk</p>
        </div>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false) }}
            placeholder="Masukkan password..."
            className={`w-full bg-slate-800 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-3 pr-11 border ${error ? "border-rose-500/70 focus:ring-rose-500" : "border-slate-700 focus:ring-blue-500"} focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-rose-400 text-xs -mt-2 flex items-center gap-1.5 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"/>Password salah. Silakan coba lagi.</p>}
        <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-[0.98]">Masuk</button>
        <p className="text-center text-[11px] text-slate-600 font-mono">BPS Kab. Indragiri Hilir</p>
      </form>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </div>
  )
}

// ─── PersonCard ─────────────────────────────────────────────────────────────
const PersonCard = React.memo(function PersonCard({ person, isSelected, onClick, style, katMap, distanceM }) {
  const hasCoord = typeof person?.lat === "number" && typeof person?.lng === "number" && !isNaN(person.lat) && !isNaN(person.lng)
  const displayId = person.id ? (person.id.includes("_") ? person.id.split("_").pop() : person.id) : ""
  const katInfo = katMap?.[person.kat] ?? KAT_FALLBACK

  return (
    <div
      style={style}
      onClick={() => onClick(person)}
      className={`p-3 rounded-xl transition-all duration-200 cursor-pointer mb-1 ${isSelected ? "bg-blue-600/20 border border-blue-500/40 shadow-lg" : "bg-slate-800/35 hover:bg-slate-800/80 border border-transparent hover:border-slate-700/50"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20"
            style={{ backgroundColor: katInfo.warna }}
            title={katInfo.label_lengkap || katInfo.label}
          />
          <h3 className={`font-bold text-sm leading-snug truncate ${isSelected ? "text-blue-300" : "text-white"}`}>{person.nama || "Tanpa Nama"}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Jarak ke lokasi pengguna — hanya saat terpilih */}
          {isSelected && distanceM !== null && distanceM !== undefined && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md font-mono" style={{ backgroundColor: LOC_COLOR + "22", color: LOC_COLOR }}>
              {formatJarak(distanceM)}
            </span>
          )}
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ backgroundColor: katInfo.warna + "28", color: katInfo.warna }}>
            {katInfo.label}
          </span>
          {displayId && <span className="text-[10px] text-slate-500 font-mono">#{displayId}</span>}
        </div>
      </div>
      <div className="mt-1.5 space-y-1 text-xs text-slate-300">
        <div className="flex items-start gap-1.5"><Home className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0"/><span className="line-clamp-1">{person.alamat || "—"}</span></div>
        <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
          <div className="flex items-center gap-1.5 font-mono"><CreditCard className="w-3 h-3 text-slate-500"/><span>{person.no_kk || "—"}</span></div>
          <div className="flex items-center gap-1 font-mono text-cyan-300/90 font-medium"><Phone className="w-3 h-3 text-cyan-400"/><span>{person.no_hp || "—"}</span></div>
        </div>
        {!hasCoord && (
          <div className="text-[10px] text-amber-400/90 italic pt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>Koordinat belum tersedia
          </div>
        )}
      </div>
    </div>
  )
})

// ─── KategoriChips Desktop ─────────────────────────────────────────────────
function KategoriChipsDesktop({ kategoriList, katCounts, activeKat, onToggle, onAll }) {
  const visible = kategoriList.filter(k => {
    const count = katCounts[k.kode] ?? 0
    if (k.kode === "lain" && count === 0) return false
    return true
  })
  if (visible.length === 0) return null

  const allActive = visible.every(k => activeKat.has(k.kode))

  return (
    <div className="shrink-0 px-3 pt-1 pb-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kategori</span>
        <button
          onClick={onAll}
          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors ${allActive ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-blue-600/30 text-blue-300 hover:bg-blue-600/50"}`}
        >
          Semua
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(k => {
          const count = katCounts[k.kode] ?? 0
          const isOn = activeKat.has(k.kode)
          return (
            <button
              key={k.kode}
              onClick={() => onToggle(k.kode)}
              title={k.label_lengkap || k.label}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                isOn
                  ? "border-transparent text-white shadow-sm"
                  : "border-slate-700/60 text-slate-500 bg-slate-800/40"
              }`}
              style={isOn ? { backgroundColor: k.warna + "30", borderColor: k.warna + "60", color: k.warna } : {}}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 transition-opacity"
                style={{ backgroundColor: k.warna, opacity: isOn ? 1 : 0.35 }}
              />
              <span>{k.label}</span>
              <span className={`font-mono text-[10px] ${isOn ? "opacity-80" : "opacity-50"}`}>({count})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── KategoriChips Mobile ──────────────────────────────────────────────────
function KategoriChipsMobile({ kategoriList, katCounts, activeKat, onToggle, onAll }) {
  const visible = kategoriList.filter(k => {
    const count = katCounts[k.kode] ?? 0
    if (k.kode === "lain" && count === 0) return false
    return true
  })
  if (visible.length === 0) return null

  const allActive = visible.every(k => activeKat.has(k.kode))

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-2.5 max-w-full">
      <button
        onClick={onAll}
        className={`shrink-0 text-xs px-2.5 py-1.5 rounded-xl font-semibold transition-colors ${allActive ? "bg-slate-700 text-slate-200" : "bg-blue-600/40 text-blue-200"}`}
      >
        Semua
      </button>
      {visible.map(k => {
        const count = katCounts[k.kode] ?? 0
        const isOn = activeKat.has(k.kode)
        return (
          <button
            key={k.kode}
            onClick={() => onToggle(k.kode)}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              isOn ? "border-transparent text-white shadow-sm" : "border-slate-700/70 text-slate-400 bg-slate-800/60"
            }`}
            style={isOn ? { backgroundColor: k.warna + "35", borderColor: k.warna + "70", color: k.warna } : {}}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: k.warna, opacity: isOn ? 1 : 0.4 }} />
            <span>{k.label}</span>
            <span className="font-mono text-[11px] opacity-75">({count})</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(false)
  const isMobile = useIsMobile()

  // State mobile tab: "map" | "filter" | "list"
  const [mobileTab, setMobileTab] = useState("map")
  // State mobile sheet snap pada tab daftar: "half" | "full"
  const [sheetSnap, setSheetSnap] = useState("half")
  const autoOpenedFilterRef = useRef(false)

  const [filterOptions, setFilterOptions] = useState([])
  const [loadingFilters, setLoadingFilters] = useState(true)
  const [kategoriList, setKategoriList] = useState([])
  const [activeKat, setActiveKat] = useState(new Set())
  const [kecGeo, setKecGeo] = useState(null)
  const [desaGeo, setDesaGeo] = useState(null)
  const [subSlsGeo, setSubSlsGeo] = useState(null)
  const [pendudukData, setPendudukData] = useState([])
  const [loadingPenduduk, setLoadingPenduduk] = useState(false)
  const [activeTile, setActiveTile] = useState("satellite")
  const [showLayerPicker, setShowLayerPicker] = useState(false)
  const [selectedKecamatan, setSelectedKecamatan] = useState("")
  const [selectedDesa, setSelectedDesa] = useState("")
  const [selectedSubSls, setSelectedSubSls] = useState("")
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [flyToTarget, setFlyToTarget] = useState(null)
  const markerRefs = useRef({})

  // ── Lokasi Saya state ─────────────────────────────────────────────────────
  // status: "idle" | "searching" | "active"
  const [locStatus, setLocStatus] = useState("idle")
  const [userPos, setUserPos] = useState(null)   // { lat, lng, accuracy }
  const [locToast, setLocToast] = useState(null) // string pesan error
  const watchIdRef = useRef(null)
  const hasFlewToUserRef = useRef(false)          // flyTo hanya sekali
  const mapRefForLoc = useRef(null)               // referensi map untuk flyTo dari luar MapContainer

  const rawBase = import.meta.env.BASE_URL || "/"
  const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`

  // Fetch filter-options.json
  useEffect(() => {
    fetch(`${base}data/filter-options.json`)
      .then(r => r.json()).then(d => { setFilterOptions(d); setLoadingFilters(false) })
      .catch(() => setLoadingFilters(false))
  }, [base])

  // Fetch kategori.json
  useEffect(() => {
    fetch(`${base}data/kategori.json`)
      .then(r => r.json())
      .then(d => {
        setKategoriList(d)
        setActiveKat(new Set(d.map(k => k.kode)))
      })
      .catch(() => {})
  }, [base])

  // Buka tab Filter otomatis saat pertama kali di mobile bila belum ada Desa terpilih
  useEffect(() => {
    if (isMobile && !selectedDesa && !autoOpenedFilterRef.current) {
      setMobileTab("filter")
      autoOpenedFilterRef.current = true
    }
  }, [isMobile, selectedDesa])

  // Fetch batas kecamatan
  useEffect(() => {
    if (!selectedKecamatan) { setKecGeo(null); return }
    setKecGeo(null)
    const controller = new AbortController()
    fetch(`${base}data/batas/kecamatan/${selectedKecamatan}.geojson`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => setKecGeo(d))
      .catch(err => { if (err.name !== "AbortError") setKecGeo(null) })
    return () => controller.abort()
  }, [selectedKecamatan, base])

  // Fetch batas desa
  useEffect(() => {
    if (!selectedDesa) { setDesaGeo(null); return }
    setDesaGeo(null)
    const controller = new AbortController()
    fetch(`${base}data/batas/desa/${selectedDesa}.geojson`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => setDesaGeo(d))
      .catch(err => { if (err.name !== "AbortError") setDesaGeo(null) })
    return () => controller.abort()
  }, [selectedDesa, base])

  // Fetch batas sub SLS
  useEffect(() => {
    if (!selectedDesa || !selectedSubSls) { setSubSlsGeo(null); return }
    setSubSlsGeo(null)
    const controller = new AbortController()
    fetch(`${base}data/batas/subsls/${selectedDesa}/${selectedSubSls}.geojson`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => setSubSlsGeo(d))
      .catch(err => { if (err.name !== "AbortError") setSubSlsGeo(null) })
    return () => controller.abort()
  }, [selectedDesa, selectedSubSls, base])

  // Fetch data penduduk
  useEffect(() => {
    if (!selectedDesa) { setPendudukData([]); return }
    setLoadingPenduduk(true)
    const controller = new AbortController()
    fetch(`${base}data/penduduk/${selectedDesa}.json`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { setPendudukData(d); setLoadingPenduduk(false) })
      .catch(err => { if (err.name !== "AbortError") { setPendudukData([]); setLoadingPenduduk(false) } })
    return () => controller.abort()
  }, [selectedDesa, base])

  // ── Derived state ──────────────────────────────────────────────────────────
  const currentKecamatanObj = useMemo(() => filterOptions.find(k=>k.kdkec===selectedKecamatan)||null, [filterOptions, selectedKecamatan])
  const desaOptions = currentKecamatanObj?.desa ?? []
  const currentDesaObj = useMemo(() => desaOptions.find(d=>d.kddesa===selectedDesa)||null, [desaOptions, selectedDesa])
  const subslsOptions = currentDesaObj?.subsls ?? []

  const katMap = useMemo(() => {
    const m = {}
    kategoriList.forEach(k => { m[k.kode] = k })
    return m
  }, [kategoriList])

  const isValidCoord = useCallback((p) => typeof p?.lat === "number" && typeof p?.lng === "number" && !isNaN(p.lat) && !isNaN(p.lng), [])

  const processedPenduduk = useMemo(() => {
    return  pendudukData.map((p, idx) => ({
      ...p,
      id: p.id || `${selectedDesa}_${idx + 1}`
    }))
  }, [pendudukData, selectedDesa])

  // Data setelah filter wilayah (Desa / Sub SLS) — SEBELUM filter kategori
  const pendudukByWilayah = useMemo(() => {
    if (!selectedDesa) return []
    if (selectedSubSls) return processedPenduduk.filter(p => p.idsubsls === selectedSubSls)
    return processedPenduduk
  }, [processedPenduduk, selectedDesa, selectedSubSls])

  // Hitung jumlah per kategori
  const katCounts = useMemo(() => {
    const counts = {}
    pendudukByWilayah.forEach(p => {
      const kode = p.kat || "lain"
      counts[kode] = (counts[kode] || 0) + 1
    })
    return counts
  }, [pendudukByWilayah])

  // Data setelah filter kategori (untuk tampilan peta & daftar)
  const filteredPenduduk = useMemo(() => {
    if (!selectedDesa) return []
    return pendudukByWilayah.filter(p => activeKat.has(p.kat || "lain"))
  }, [pendudukByWilayah, selectedDesa, activeKat])

  const validMarkers = useMemo(() => {
    return filteredPenduduk.filter(isValidCoord)
  }, [filteredPenduduk, isValidCoord])

  const activeBoundsGeo = useMemo(() => {
    if (selectedSubSls && subSlsGeo) return subSlsGeo
    if (selectedDesa && desaGeo) return desaGeo
    if (selectedKecamatan && kecGeo) return kecGeo
    return null
  }, [selectedKecamatan, selectedDesa, selectedSubSls, kecGeo, desaGeo, subSlsGeo])

  // Tinggi offset area tertutup sheet di mobile (untuk map bounds & flyTo centering)
  const sheetOffsetPx = useMemo(() => {
    if (!isMobile) return 0
    if (mobileTab === "list") {
      return (typeof window !== "undefined" ? window.innerHeight : 800) * (sheetSnap === "full" ? 0.85 : 0.5)
    }
    return 0
  }, [isMobile, mobileTab, sheetSnap])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleKecamatanChange = e => {
    setSelectedKecamatan(e.target.value)
    setSelectedDesa("")
    setSelectedSubSls("")
    setSelectedPerson(null)
    setFlyToTarget(null)
  }
  const handleDesaChange = e => {
    setSelectedDesa(e.target.value)
    setSelectedSubSls("")
    setSelectedPerson(null)
    setFlyToTarget(null)
  }
  const handleSubSlsChange = e => {
    setSelectedSubSls(e.target.value)
    setSelectedPerson(null)
    setFlyToTarget(null)
  }
  const handleResetFilter = () => {
    setSelectedKecamatan("")
    setSelectedDesa("")
    setSelectedSubSls("")
    setSelectedPerson(null)
    setFlyToTarget(null)
  }

  const handlePersonClick = useCallback(person => {
    setSelectedPerson(person)
    // Di mobile, jika sheet snap sedang full, kembalikan ke half agar peta terlihat
    if (isMobile && sheetSnap === "full") {
      setSheetSnap("half")
    }
    if (isValidCoord(person)) {
      setFlyToTarget({ id: person.id, lat: person.lat, lng: person.lng })
    }
  }, [isValidCoord, isMobile, sheetSnap])

  const handleKatToggle = useCallback(kode => {
    setActiveKat(prev => {
      const next = new Set(prev)
      if (next.has(kode)) next.delete(kode)
      else next.add(kode)
      return next
    })
  }, [])

  const handleKatAll = useCallback(() => {
    setActiveKat(new Set(kategoriList.map(k => k.kode)))
  }, [kategoriList])

  // ── Lokasi Saya handlers ──────────────────────────────────────────────────
  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    hasFlewToUserRef.current = false
    setLocStatus("idle")
    setUserPos(null)
  }, [])

  // Cleanup saat unmount
  useEffect(() => () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current) }, [])

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setLocToast("Browser Anda tidak mendukung fitur Geolocation. Coba gunakan Chrome atau Firefox terbaru.")
      return
    }
    setLocStatus("searching")
    setUserPos(null)
    hasFlewToUserRef.current = false

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        setUserPos({ lat, lng, accuracy })
        setLocStatus("active")

        // flyTo hanya saat posisi pertama didapat (sekali saja)
        if (!hasFlewToUserRef.current && mapRefForLoc.current) {
          hasFlewToUserRef.current = true
          const map = mapRefForLoc.current
          const currentZoom = map.getZoom()
          map.flyTo([lat, lng], Math.max(currentZoom, 17), { duration: 1.2 })
        }
      },
      (err) => {
        let msg = "Terjadi kesalahan saat mengambil lokasi."
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Izin lokasi ditolak. Untuk mengaktifkannya: buka Pengaturan browser → Privasi & Keamanan → Izin Situs → Lokasi → cari alamat situs ini, lalu ubah ke 'Izinkan'."
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Posisi tidak tersedia. Pastikan GPS aktif dan Anda memiliki sinyal yang cukup."
        } else if (err.code === err.TIMEOUT) {
          msg = "Waktu habis saat mencari lokasi. Pastikan GPS aktif dan coba lagi."
        }
        setLocToast(msg)
        stopWatch()
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
    watchIdRef.current = watchId
  }, [stopWatch])

  const centerToUser = useCallback(() => {
    if (userPos && mapRefForLoc.current) {
      mapRefForLoc.current.flyTo([userPos.lat, userPos.lng], Math.max(mapRefForLoc.current.getZoom(), 17), { duration: 0.8 })
    }
  }, [userPos])

  // ── Hitung jarak ke penduduk terpilih ────────────────────────────────────
  const distanceToSelected = useMemo(() => {
    if (!userPos || !selectedPerson) return null
    const hasCoord = typeof selectedPerson.lat === "number" && typeof selectedPerson.lng === "number" && !isNaN(selectedPerson.lat) && !isNaN(selectedPerson.lng)
    if (!hasCoord) return null
    return L.latLng(userPos.lat, userPos.lng).distanceTo(L.latLng(selectedPerson.lat, selectedPerson.lng))
  }, [userPos, selectedPerson])

  // ── MapRefCapture — komponen dalam MapContainer untuk menyimpan ref map ──
  function MapRefCapture() {
    const map = useMap()
    useEffect(() => { mapRefForLoc.current = map }, [map])
    return null
  }

  // Gestur drag handle bottom sheet daftar di mobile
  const touchStartYRef = useRef(null)
  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e) => {
    if (touchStartYRef.current === null) return
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current
    touchStartYRef.current = null
    if (deltaY < -40) {
      setSheetSnap("full")
    } else if (deltaY > 50) {
      if (sheetSnap === "full") {
        setSheetSnap("half")
      } else {
        setMobileTab("map")
      }
    }
  }

  // ── Styles GeoJSON ─────────────────────────────────────────────────────────
  const kecStyle  = { color:"#f59e0b", weight:selectedDesa?1.5:2.5, dashArray:selectedDesa?"6,6":undefined, fillColor:"#f59e0b", fillOpacity:selectedDesa?0.04:0.12 }
  const desaStyle = { color:"#38bdf8", weight:selectedSubSls?2:3, dashArray:selectedSubSls?"4,4":undefined, fillColor:"#0284c7", fillOpacity:selectedSubSls?0.08:0.18 }
  const subStyle  = { color:"#10b981", weight:3, fillColor:"#10b981", fillOpacity:0.22 }

  const allKatOff = selectedDesa && !loadingPenduduk && filteredPenduduk.length === 0 && pendudukByWilayah.length > 0

  // Titik-titik garis putus-putus dari user ke target terpilih
  const distanceLine = useMemo(() => {
    if (!userPos || !selectedPerson) return null
    const hasCoord = typeof selectedPerson.lat === "number" && typeof selectedPerson.lng === "number" && !isNaN(selectedPerson.lat) && !isNaN(selectedPerson.lng)
    if (!hasCoord) return null
    return [[userPos.lat, userPos.lng], [selectedPerson.lat, selectedPerson.lng]]
  }, [userPos, selectedPerson])

  if (!auth) return <PasswordGate onSuccess={()=>setAuth(true)} />

  const tileInfo = TILE_LAYERS[activeTile] || TILE_LAYERS.satellite

  return (
    <div className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-950 font-sans">
      {/* Peta Fullscreen */}
      <MapContainer center={[-0.7185, 102.9835]} zoom={11} scrollWheelZoom className="w-full h-full z-0" zoomControl={false}>
        <TileLayer key={activeTile} url={tileInfo.url} attribution={tileInfo.attribution} maxZoom={tileInfo.maxZoom} />
        {tileInfo.overlay && (
          <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxZoom={19} opacity={0.65} />
        )}
        <MapRefCapture />
        <MapResizeController activeTab={mobileTab} sheetSnap={sheetSnap} isMobile={isMobile} />
        <MapBoundsController
          geojsonBounds={activeBoundsGeo}
          flyToPoint={flyToTarget}
          markerRefs={markerRefs}
          isMobile={isMobile}
          sheetOffsetPx={sheetOffsetPx}
        />
        {kecGeo && <GeoJSON key={`kec-${selectedKecamatan}-${JSON.stringify(kecGeo).length}`} data={kecGeo} style={kecStyle} />}
        {desaGeo && <GeoJSON key={`desa-${selectedDesa}-${JSON.stringify(desaGeo).length}`} data={desaGeo} style={desaStyle} />}
        {subSlsGeo && <GeoJSON key={`subsls-${selectedDesa}-${selectedSubSls}-${JSON.stringify(subSlsGeo).length}`} data={subSlsGeo} style={subStyle} />}

        {/* Garis putus-putus oranye dari user ke target */}
        {distanceLine && (
          <Polyline
            positions={distanceLine}
            pathOptions={{ color: LOC_COLOR, weight: 2, dashArray: "6,8", opacity: 0.85 }}
          />
        )}

        {/* Layer lokasi pengguna — titik + lingkaran akurasi */}
        <UserLocationLayer userPos={userPos} />

        {/* CircleMarker per titik penduduk, warna sesuai kategori */}
        {selectedDesa && validMarkers.map(item => {
          const isSelected = selectedPerson?.id === item.id
          const katInfo = katMap[item.kat] ?? KAT_FALLBACK
          const color = katInfo.warna
          // Hitung jarak untuk popup saat terpilih
          const itemDistM = isSelected && userPos
            ? L.latLng(userPos.lat, userPos.lng).distanceTo(L.latLng(item.lat, item.lng))
            : null
          return (
            <CircleMarker
              key={item.id}
              center={[item.lat, item.lng]}
              radius={isSelected ? 11 : 8}
              pathOptions={{
                color: "#ffffff",
                weight: isSelected ? 3 : 2,
                fillColor: color,
                fillOpacity: 0.92,
                opacity: 1,
              }}
              ref={ref => { if (ref) markerRefs.current[item.id] = ref }}
              eventHandlers={{ click: () => handlePersonClick(item) }}
            >
              <Popup autoPanPaddingTopLeft={[20, 80]} autoPanPaddingBottomRight={[20, isMobile ? (sheetOffsetPx + 40) : 40]}>
                <div className="p-3.5 sm:p-4 w-64 sm:w-72 text-slate-100">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700/80">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg text-white shrink-0" style={{ backgroundColor: color + "40" }}>
                      <MapPin className="w-4 h-4" style={{ color }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-sm sm:text-base leading-tight truncate">{item.nama}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-medium tracking-wide" style={{ color }}>
                          {katInfo.label_lengkap || katInfo.label}
                        </span>
                        {itemDistM !== null && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono" style={{ backgroundColor: LOC_COLOR + "25", color: LOC_COLOR }}>
                            {formatJarak(itemDistM)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-300"><Home className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0"/><span className="line-clamp-1">{item.alamat || "—"}</span></div>
                    <div className="flex items-center gap-2 text-slate-300"><CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0"/><span className="font-mono text-slate-200">No KK: {item.no_kk || "—"}</span></div>
                    <div className="flex items-center gap-2 text-slate-300"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0"/><span className="font-mono text-cyan-300">{item.no_hp || "—"}</span></div>
                    <div className="flex items-center gap-2 text-slate-300"><span className="text-slate-400 shrink-0">Sub SLS:</span><span className="font-mono text-slate-300 text-[11px]">{item.idsubsls?.slice(-6) || "—"}</span></div>
                    <div className="pt-2 mt-1.5 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between font-mono">
                      <span>Lat: {Number(item.lat).toFixed(5)}</span><span>Lng: {Number(item.lng).toFixed(5)}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Layer Picker Button (Desktop & Mobile) */}
      <div className={`absolute ${showLayerPicker ? "z-[1030]" : "z-[1001]"} transition-all ${isMobile ? "top-3 right-3" : "top-4 right-4"}`}>
        <button
          onClick={() => setShowLayerPicker(!showLayerPicker)}
          aria-label="Pilih Lapisan Peta"
          className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white text-xs font-medium px-3 py-2 sm:py-2.5 rounded-xl shadow-xl hover:bg-slate-800 transition-all min-h-[44px] min-w-[44px] justify-center"
        >
          <Layers className="w-4 h-4 text-cyan-400 shrink-0"/>
          {!isMobile && <span>{tileInfo.label}</span>}
          {!isMobile && <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showLayerPicker ? "rotate-180" : ""}`}/>}
        </button>

        {showLayerPicker && (
          <div className="absolute top-full right-0 mt-2 w-52 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-[1035]">
            {Object.entries(TILE_LAYERS).map(([key, info]) => (
              <button
                key={key}
                onClick={() => { setActiveTile(key); setShowLayerPicker(false) }}
                className={`w-full text-left px-4 py-3 text-xs font-medium transition-colors flex items-center gap-2.5 min-h-[44px] ${activeTile === key ? "bg-blue-600/30 text-blue-300 border-l-2 border-blue-400" : "text-slate-300 hover:bg-slate-700/60 border-l-2 border-transparent"}`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0"/>{info.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tombol Lokasi Saya — Desktop & Mobile */}
      <LokasiSayaButton
        status={locStatus}
        onActivate={startWatch}
        onCenter={centerToUser}
        onStop={stopWatch}
        isMobile={isMobile}
      />

      {/* Toast error lokasi */}
      {locToast && (
        <Toast message={locToast} type="error" onClose={() => setLocToast(null)} />
      )}

      {/* =========================================================================
          DESKTOP LAYOUT (Layar >= 768px dan Pointer: Fine)
          Tampilan desktop persis seperti sebelumnya (sidebar melayang di kiri)
         ========================================================================= */}
      {!isMobile && (
        <aside className="absolute top-4 left-4 z-[1000] w-80 sm:w-96 max-h-[calc(100vh-2rem)] flex flex-col bg-slate-900/92 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header + Dropdowns */}
          <div className="p-4 pb-3 border-b border-slate-800 bg-slate-900/95 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live — Data Real
              </span>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-cyan-400"/>{tileInfo.label}</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Peta Suplemen</h1>
            <p className="text-xs text-slate-400">Visualisasi Sebaran Data Suplemen Penduduk</p>
            <div className="mt-3.5 space-y-2 pt-3 border-t border-slate-800/70">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5 text-blue-400"/>Filter Wilayah</span>
                {selectedKecamatan && <button onClick={handleResetFilter} className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"><RotateCcw className="w-3 h-3"/>Reset</button>}
              </div>
              {/* Dropdown Kecamatan */}
              <div className="relative">
                <select value={selectedKecamatan} onChange={handleKecamatanChange} className="w-full bg-slate-800/90 text-white text-xs font-medium rounded-xl px-3 py-2.5 pr-8 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none shadow-sm">
                  <option value="">-- Pilih Kecamatan --</option>
                  {loadingFilters ? <option disabled>Memuat...</option> : filterOptions.map(k=><option key={k.kdkec} value={k.kdkec}>Kec. {k.nmkec}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
              </div>
              {/* Dropdown Desa */}
              <div className="relative">
                <select value={selectedDesa} onChange={handleDesaChange} disabled={!selectedKecamatan} className="w-full bg-slate-800/90 text-white text-xs font-medium rounded-xl px-3 py-2.5 pr-8 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  <option value="">{selectedKecamatan?"-- Pilih Desa / Kelurahan --":"Pilih Kecamatan Terlebih Dahulu"}</option>
                  {desaOptions.map(d=><option key={d.kddesa} value={d.kddesa}>Desa {d.nmdesa}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
              </div>
              {/* Dropdown Sub SLS */}
              <div className="relative">
                <select value={selectedSubSls} onChange={handleSubSlsChange} disabled={!selectedDesa} className="w-full bg-slate-800/90 text-white text-xs font-medium rounded-xl px-3 py-2.5 pr-8 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  <option value="">{selectedDesa ? "— Semua Sub SLS (tampilkan desa) —" : "Pilih Desa Terlebih Dahulu"}</option>
                  {subslsOptions.map(s=><option key={s.idsubsls} value={s.idsubsls}>{s.nmsls || s.idsubsls}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
              </div>
            </div>
          </div>

          {/* Chips Kategori Desktop */}
          {selectedDesa && !loadingPenduduk && kategoriList.length > 0 && (
            <div className="border-b border-slate-800/70 bg-slate-900/80 shrink-0">
              <KategoriChipsDesktop
                kategoriList={kategoriList}
                katCounts={katCounts}
                activeKat={activeKat}
                onToggle={handleKatToggle}
                onAll={handleKatAll}
              />
            </div>
          )}

          {/* Body list Desktop */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {!selectedKecamatan && (
              <div className="flex flex-col items-center justify-center p-6 text-center my-4 mx-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3"><Navigation className="w-6 h-6 animate-pulse"/></div>
                <h3 className="font-semibold text-white text-sm">Pilih Wilayah</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Pilih <b>Kecamatan</b> dan <b>Desa</b> untuk memuat batas poligon dan data penduduk.</p>
              </div>
            )}
            {selectedKecamatan && !selectedDesa && (
              <div className="flex flex-col items-center justify-center p-5 text-center my-4 mx-3 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2.5"><Info className="w-5 h-5"/></div>
                <h3 className="font-bold text-amber-300 text-sm">Kec. {currentKecamatanObj?.nmkec}</h3>
                <p className="text-xs text-slate-300 mt-1">Poligon batas kecamatan telah ditampilkan di peta.</p>
                <p className="text-[11px] text-amber-400/90 mt-2 font-medium bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">Pilih <b>Desa</b> untuk memuat data penduduk.</p>
              </div>
            )}
            {selectedDesa && (
              <div className="flex flex-col flex-1 min-h-0 p-3 gap-2">
                <div className="flex items-center justify-between text-xs bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80 shrink-0">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium truncate max-w-[190px]"><Users className="w-3.5 h-3.5 text-blue-400 shrink-0"/>{currentDesaObj?.nmdesa??selectedDesa}:</span>
                  <span className="font-bold text-white px-2 py-0.5 rounded-md bg-blue-600/30 text-blue-300 border border-blue-500/30 font-mono text-[11px] shrink-0">
                    {loadingPenduduk ? "…" : (
                      filteredPenduduk.length === pendudukByWilayah.length
                        ? `${filteredPenduduk.length} penduduk`
                        : `${filteredPenduduk.length} dari ${pendudukByWilayah.length} penduduk`
                    )}
                  </span>
                </div>

                {pendudukByWilayah.length > 500 && (
                  <div className="shrink-0 flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0"/><span>Desa ini punya <b>{pendudukByWilayah.length}</b> data — virtual list aktif.</span>
                  </div>
                )}

                {loadingPenduduk && <div className="flex-1 flex items-center justify-center text-xs text-slate-400"><span className="animate-pulse">Memuat data penduduk…</span></div>}

                {allKatOff && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Filter className="w-5 h-5 text-slate-500"/>
                    </div>
                    <p className="text-sm font-semibold text-slate-400">Semua kategori disembunyikan</p>
                    <p className="text-xs text-slate-500">Aktifkan minimal satu kategori di atas untuk menampilkan data.</p>
                    <button onClick={handleKatAll} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition-colors font-medium">
                      Tampilkan Semua
                    </button>
                  </div>
                )}

                {!loadingPenduduk && !allKatOff && filteredPenduduk.length === 0 && (
                  <div className="text-center p-6 text-slate-400 text-xs">Tidak ada penduduk di wilayah ini.</div>
                )}

                {!loadingPenduduk && !allKatOff && filteredPenduduk.length > 0 && (
                  filteredPenduduk.length > 500 ? (
                    <div className="flex-1 min-h-0">
                      <List height={Math.min(filteredPenduduk.length*86, window.innerHeight-360)} itemCount={filteredPenduduk.length} itemSize={86} width="100%">
                        {({index,style})=>{
                          const p = filteredPenduduk[index]
                          const isSel = selectedPerson?.id === p.id
                          return <PersonCard style={style} person={p} isSelected={isSel} onClick={handlePersonClick} katMap={katMap} distanceM={isSel ? distanceToSelected : null}/>
                        }}
                      </List>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-1.5">
                      {filteredPenduduk.map(p=>{
                        const isSel = selectedPerson?.id === p.id
                        return <PersonCard key={p.id} person={p} isSelected={isSel} onClick={handlePersonClick} katMap={katMap} distanceM={isSel ? distanceToSelected : null}/>
                      })}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Footer Desktop */}
          <div className="shrink-0 p-3 bg-slate-900/95 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="truncate max-w-[220px]">{selectedDesa?"Klik nama untuk zoom ke titik":selectedKecamatan?"Peta fokus ke batas Kecamatan":"Peta Suplemen — Siap"}</span>
            <span className="font-mono text-slate-500 shrink-0">Tahap 8</span>
          </div>
        </aside>
      )}

      {/* =========================================================================
          MOBILE LAYOUT (< 768px atau Pointer: Coarse / Touch)
         ========================================================================= */}
      {isMobile && (
        <>
          {/* Baris Chips Kategori Melayang di Atas Peta (Mobile) */}
          {selectedDesa && !loadingPenduduk && kategoriList.length > 0 && (
            <div className="absolute top-3 left-3 right-14 z-[1001] bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
              <KategoriChipsMobile
                kategoriList={kategoriList}
                katCounts={katCounts}
                activeKat={activeKat}
                onToggle={handleKatToggle}
                onAll={handleKatAll}
              />
            </div>
          )}

          {/* Banner Pesan Awal jika Desa Belum Dipilih (Mobile) */}
          {!selectedDesa && mobileTab === "map" && (
            <div className="absolute bottom-20 left-4 right-4 z-[1001] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  {selectedKecamatan ? <span>Kecamatan dipilih. Pilih <b>Desa</b> untuk memuat data.</span> : <span>Pilih <b>Kecamatan dan Desa</b> untuk menampilkan data.</span>}
                </p>
              </div>
              <button
                onClick={() => setMobileTab("filter")}
                className="shrink-0 text-xs font-semibold px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md active:scale-95"
              >
                Pilih Wilayah
              </button>
            </div>
          )}

          {/* Tab Filter: Bottom Sheet (Mobile) */}
          {mobileTab === "filter" && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1009]"
                onClick={() => setMobileTab("map")}
              />
              <div className="fixed bottom-14 left-0 right-0 z-[1010] bg-slate-900/98 backdrop-blur-xl border-t border-slate-700/80 rounded-t-3xl shadow-2xl p-4 max-h-[calc(100dvh-4.5rem)] overflow-y-auto pb-safe animate-in slide-in-from-bottom duration-200">
                {/* Drag Handle */}
                <div className="w-12 h-1.5 rounded-full bg-slate-700 mx-auto mb-3" />

                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-400"/>
                    <h2 className="text-sm font-bold text-white">Filter Wilayah</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedKecamatan && (
                      <button
                        onClick={handleResetFilter}
                        className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5"/>Reset
                      </button>
                    )}
                    <button
                      onClick={() => setMobileTab("map")}
                      className="text-slate-400 hover:text-white p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {!selectedDesa && (
                  <div className="mb-3.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                    <span>Pilih <b>Kecamatan</b> dan <b>Desa</b> untuk memuat batas poligon dan data penduduk.</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kecamatan</label>
                    <div className="relative">
                      <select
                        value={selectedKecamatan}
                        onChange={handleKecamatanChange}
                        className="w-full bg-slate-800 text-white text-sm font-medium rounded-xl px-3.5 py-3 pr-9 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none min-h-[44px]"
                      >
                        <option value="">-- Pilih Kecamatan --</option>
                        {loadingFilters ? <option disabled>Memuat...</option> : filterOptions.map(k=><option key={k.kdkec} value={k.kdkec}>Kec. {k.nmkec}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Desa / Kelurahan</label>
                    <div className="relative">
                      <select
                        value={selectedDesa}
                        onChange={handleDesaChange}
                        disabled={!selectedKecamatan}
                        className="w-full bg-slate-800 text-white text-sm font-medium rounded-xl px-3.5 py-3 pr-9 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                      >
                        <option value="">{selectedKecamatan ? "-- Pilih Desa / Kelurahan --" : "Pilih Kecamatan Terlebih Dahulu"}</option>
                        {desaOptions.map(d=><option key={d.kddesa} value={d.kddesa}>Desa {d.nmdesa}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Sub SLS</label>
                    <div className="relative">
                      <select
                        value={selectedSubSls}
                        onChange={handleSubSlsChange}
                        disabled={!selectedDesa}
                        className="w-full bg-slate-800 text-white text-sm font-medium rounded-xl px-3.5 py-3 pr-9 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                      >
                        <option value="">{selectedDesa ? "— Semua Sub SLS (tampilkan desa) —" : "Pilih Desa Terlebih Dahulu"}</option>
                        {subslsOptions.map(s=><option key={s.idsubsls} value={s.idsubsls}>{s.nmsls || s.idsubsls}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (selectedDesa) setMobileTab("list")
                      else setMobileTab("map")
                    }}
                    className="w-full mt-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] min-h-[44px] flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4"/> Selesai
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Tab Daftar: Bottom Sheet 2 Posisi (Mobile) */}
          {mobileTab === "list" && (
            <div
              className={`fixed bottom-14 left-0 right-0 z-[1010] bg-slate-900/98 backdrop-blur-xl border-t border-slate-700/80 rounded-t-3xl shadow-2xl flex flex-col transition-all duration-300 ease-out ${
                sheetSnap === "full" ? "h-[88dvh]" : "h-[50dvh]"
              }`}
            >
              {/* Header Sheet + Drag Handle */}
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => setSheetSnap(sheetSnap === "half" ? "full" : "half")}
                className="shrink-0 px-4 pt-2 pb-2.5 border-b border-slate-800/80 cursor-pointer select-none bg-slate-900/90 rounded-t-3xl"
              >
                {/* Pill Handle */}
                <div className="w-12 h-1.5 rounded-full bg-slate-600/80 mx-auto mb-2" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-white text-sm truncate">
                      {currentDesaObj ? `Desa ${currentDesaObj.nmdesa}` : "Daftar Penduduk"}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-600/25 text-blue-300 border border-blue-500/30 shrink-0">
                      {loadingPenduduk ? "…" : (
                        filteredPenduduk.length === pendudukByWilayah.length
                          ? `${filteredPenduduk.length}`
                          : `${filteredPenduduk.length} dari ${pendudukByWilayah.length}`
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSheetSnap(sheetSnap === "half" ? "full" : "half")
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title={sheetSnap === "half" ? "Perbesar layar" : "Perkecil layar"}
                    >
                      {sheetSnap === "half" ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMobileTab("map")
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Tutup lembar daftar"
                    >
                      <X className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>

              {/* Body Sheet List */}
              <div className="flex-1 overflow-y-auto min-h-0 p-3 pt-2 space-y-1.5">
                {!selectedDesa && (
                  <div className="text-center p-6 text-slate-400 text-xs">
                    <p>Belum ada desa yang dipilih.</p>
                    <button onClick={() => setMobileTab("filter")} className="mt-2.5 px-3 py-1.5 rounded-lg bg-blue-600/30 text-blue-300 font-semibold">Buka Filter</button>
                  </div>
                )}

                {selectedDesa && loadingPenduduk && (
                  <div className="flex items-center justify-center p-8 text-xs text-slate-400">
                    <span className="animate-pulse">Memuat data penduduk…</span>
                  </div>
                )}

                {selectedDesa && !loadingPenduduk && allKatOff && (
                  <div className="flex flex-col items-center justify-center text-center p-6 gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Filter className="w-5 h-5 text-slate-500"/>
                    </div>
                    <p className="text-sm font-semibold text-slate-400">Semua kategori disembunyikan</p>
                    <p className="text-xs text-slate-500">Aktifkan minimal satu kategori di atas untuk menampilkan data.</p>
                    <button onClick={handleKatAll} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/30 font-medium">
                      Tampilkan Semua
                    </button>
                  </div>
                )}

                {selectedDesa && !loadingPenduduk && !allKatOff && filteredPenduduk.length === 0 && (
                  <div className="text-center p-6 text-slate-400 text-xs">Tidak ada penduduk di wilayah ini.</div>
                )}

                {selectedDesa && !loadingPenduduk && !allKatOff && filteredPenduduk.length > 0 && (
                  filteredPenduduk.length > 500 ? (
                    <div className="h-full">
                      <List height={sheetSnap === "full" ? (window.innerHeight * 0.75) : (window.innerHeight * 0.38)} itemCount={filteredPenduduk.length} itemSize={86} width="100%">
                        {({index,style})=>{
                          const p = filteredPenduduk[index]
                          const isSel = selectedPerson?.id === p.id
                          return <PersonCard style={style} person={p} isSelected={isSel} onClick={handlePersonClick} katMap={katMap} distanceM={isSel ? distanceToSelected : null}/>
                        }}
                      </List>
                    </div>
                  ) : (
                    filteredPenduduk.map(p=>{
                      const isSel = selectedPerson?.id === p.id
                      return <PersonCard key={p.id} person={p} isSelected={isSel} onClick={handlePersonClick} katMap={katMap} distanceM={isSel ? distanceToSelected : null}/>
                    })
                  )
                )}
              </div>
            </div>
          )}

          {/* Navbar Bawah Tetap (Mobile) */}
          <nav className="fixed bottom-0 left-0 right-0 h-14 bg-slate-900/98 backdrop-blur-md border-t border-slate-800 flex items-center justify-around z-[1020] pb-safe px-3 shadow-2xl">
            <button
              onClick={() => setMobileTab("map")}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-colors ${
                mobileTab === "map" ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Map className="w-5 h-5 mb-0.5" />
              <span className="text-[11px]">Peta</span>
            </button>

            <button
              onClick={() => setMobileTab(mobileTab === "filter" ? "map" : "filter")}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-colors ${
                mobileTab === "filter" ? "text-blue-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Filter className="w-5 h-5 mb-0.5" />
              <span className="text-[11px]">Filter</span>
              {selectedDesa && <span className="absolute top-1.5 right-[30%] w-2 h-2 rounded-full bg-blue-500 ring-2 ring-slate-900" />}
            </button>

            <button
              onClick={() => {
                if (mobileTab !== "list") {
                  setMobileTab("list")
                } else {
                  setSheetSnap(sheetSnap === "half" ? "full" : "half")
                }
              }}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-colors ${
                mobileTab === "list" ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span className="text-[11px]">Daftar</span>
              {selectedDesa && (
                <span className="absolute top-1.5 right-[24%] text-[10px] font-mono px-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {filteredPenduduk.length}
                </span>
              )}
            </button>
          </nav>
        </>
      )}

      {/* Layer picker backdrop */}
      {showLayerPicker && <div className="fixed inset-0 z-[1020]" onClick={()=>setShowLayerPicker(false)}/>}
    </div>
  )
}
