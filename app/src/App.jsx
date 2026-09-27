import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { FixedSizeList as List } from "react-window"
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet"
import L from "leaflet"
import {
  MapPin, Phone, CreditCard, Home, Users, Layers,
  ChevronDown, Filter, Info, RotateCcw, Navigation,
  Lock, Eye, EyeOff, Map,
} from "lucide-react"

const createCustomIcon = (isActive = false) =>
  L.divIcon({
    className: "custom-map-marker",
    html: `<div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full cursor-pointer"><div class="absolute -inset-1 rounded-full ${isActive ? "bg-cyan-400 animate-ping opacity-75" : "bg-blue-500/40"}"></div><div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${isActive ? "bg-gradient-to-tr from-cyan-600 to-cyan-400 ring-2 ring-white text-white scale-110" : "bg-gradient-to-tr from-blue-600 to-indigo-500 ring-2 ring-slate-900 text-white hover:scale-105"} transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div><div class="absolute -bottom-1 w-1.5 h-1.5 bg-slate-900 rotate-45"></div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })

const TILE_LAYERS = {
  satellite:       { label: "Esri Satellite",   url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",  attribution: "Tiles &copy; Esri", maxZoom: 19, overlay: true  },
  google_road:     { label: "Google Maps",       url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",                                            attribution: "&copy; Google Maps",      maxZoom: 22, overlay: false },
  google_satellite:{ label: "Google Satellite",  url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",                                            attribution: "&copy; Google Satellite",  maxZoom: 22, overlay: false },
  google_hybrid:   { label: "Google Hybrid",     url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",                                            attribution: "&copy; Google Hybrid",     maxZoom: 22, overlay: false },
  google_terrain:  { label: "Google Terrain",    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",                                            attribution: "&copy; Google Terrain",    maxZoom: 22, overlay: false },
  openstreetmap:   { label: "OpenStreetMap",     url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",                                             attribution: "&copy; OpenStreetMap",     maxZoom: 19, overlay: false },
}

function MapBoundsController({ geojsonBounds, flyToPoint, markerRefs }) {
  const map = useMap()
  useEffect(() => {
    if (flyToPoint && typeof flyToPoint.lat === "number" && typeof flyToPoint.lng === "number" && !isNaN(flyToPoint.lat) && !isNaN(flyToPoint.lng)) {
      map.flyTo([flyToPoint.lat, flyToPoint.lng], 17, { duration: 1.2 })
      if (markerRefs?.current?.[flyToPoint.id]) {
        setTimeout(() => { try { markerRefs.current[flyToPoint.id]?.openPopup() } catch(_){} }, 1350)
      }
    } else if (geojsonBounds) {
      try {
        const bounds = L.geoJSON(geojsonBounds).getBounds()
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17, duration: 1.0 })
      } catch(_) {}
    }
  }, [geojsonBounds, flyToPoint, map])
  return null
}

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
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950 z-50">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>
      <form
        onSubmit={handleSubmit}
        style={shake ? {animation:"shake 0.4s ease"} : {}}
        className="relative w-full max-w-sm mx-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col gap-5"
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

const PersonCard = React.memo(function PersonCard({ person, isSelected, onClick, style }) {
  const hasCoord = typeof person?.lat === "number" && typeof person?.lng === "number" && !isNaN(person.lat) && !isNaN(person.lng)
  const displayId = person.id ? (person.id.includes("_") ? person.id.split("_").pop() : person.id) : ""

  return (
    <div
      style={style}
      onClick={() => onClick(person)}
      className={`p-3 rounded-xl transition-all duration-200 cursor-pointer mb-1 ${isSelected ? "bg-blue-600/20 border border-blue-500/40 shadow-lg" : "bg-slate-800/30 hover:bg-slate-800/80 border border-transparent hover:border-slate-700/50"}`}
    >
      <div className="flex items-center justify-between">
        <h3 className={`font-bold text-sm leading-snug truncate max-w-[200px] ${isSelected ? "text-blue-300" : "text-white"}`}>{person.nama || "Tanpa Nama"}</h3>
        {displayId && <span className="text-[10px] text-slate-500 font-mono shrink-0">#{displayId}</span>}
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

export default function App() {
  const [auth, setAuth] = useState(false)
  const [filterOptions, setFilterOptions] = useState([])
  const [loadingFilters, setLoadingFilters] = useState(true)
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
  const rawBase = import.meta.env.BASE_URL || "/"
  const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`

  useEffect(() => {
    fetch(`${base}data/filter-options.json`)
      .then(r => r.json()).then(d => { setFilterOptions(d); setLoadingFilters(false) })
      .catch(() => setLoadingFilters(false))
  }, [base])

  useEffect(() => {
    if (!selectedKecamatan) { setKecGeo(null); return }
    fetch(`${base}data/batas/kecamatan/${selectedKecamatan}.geojson`).then(r=>r.json()).then(setKecGeo).catch(()=>setKecGeo(null))
  }, [selectedKecamatan, base])

  useEffect(() => {
    if (!selectedDesa) { setDesaGeo(null); return }
    fetch(`${base}data/batas/desa/${selectedDesa}.geojson`).then(r=>r.json()).then(setDesaGeo).catch(()=>setDesaGeo(null))
  }, [selectedDesa, base])

  useEffect(() => {
    if (!selectedDesa || !selectedSubSls) { setSubSlsGeo(null); return }
    fetch(`${base}data/batas/subsls/${selectedDesa}/${selectedSubSls}.geojson`).then(r=>r.json()).then(setSubSlsGeo).catch(()=>setSubSlsGeo(null))
  }, [selectedDesa, selectedSubSls, base])

  useEffect(() => {
    if (!selectedDesa) { setPendudukData([]); return }
    setLoadingPenduduk(true)
    fetch(`${base}data/penduduk/${selectedDesa}.json`)
      .then(r=>r.json()).then(d=>{ setPendudukData(d); setLoadingPenduduk(false) })
      .catch(()=>{ setPendudukData([]); setLoadingPenduduk(false) })
  }, [selectedDesa, base])

  const currentKecamatanObj = useMemo(() => filterOptions.find(k=>k.kdkec===selectedKecamatan)||null, [filterOptions, selectedKecamatan])
  const desaOptions = currentKecamatanObj?.desa ?? []
  const currentDesaObj = useMemo(() => desaOptions.find(d=>d.kddesa===selectedDesa)||null, [desaOptions, selectedDesa])
  const subslsOptions = currentDesaObj?.subsls ?? []

  const isValidCoord = useCallback((p) => typeof p?.lat === "number" && typeof p?.lng === "number" && !isNaN(p.lat) && !isNaN(p.lng), [])

  const processedPenduduk = useMemo(() => {
    return pendudukData.map((p, idx) => ({
      ...p,
      id: p.id || `${selectedDesa}_${idx + 1}`
    }))
  }, [pendudukData, selectedDesa])

  const filteredPenduduk = useMemo(() => {
    if (!selectedDesa) return []
    if (selectedSubSls) return processedPenduduk.filter(p=>p.idsubsls===selectedSubSls)
    return processedPenduduk
  }, [processedPenduduk, selectedDesa, selectedSubSls])

  const validMarkers = useMemo(() => {
    return filteredPenduduk.filter(isValidCoord)
  }, [filteredPenduduk, isValidCoord])

  const activeBoundsGeo = useMemo(() => {
    if (selectedSubSls && subSlsGeo) return subSlsGeo
    if (selectedDesa && desaGeo) return desaGeo
    if (selectedKecamatan && kecGeo) return kecGeo
    return null
  }, [selectedKecamatan, selectedDesa, selectedSubSls, kecGeo, desaGeo, subSlsGeo])

  const handleKecamatanChange = e => { setSelectedKecamatan(e.target.value); setSelectedDesa(""); setSelectedSubSls(""); setSelectedPerson(null); setFlyToTarget(null) }
  const handleDesaChange = e => { setSelectedDesa(e.target.value); setSelectedSubSls(""); setSelectedPerson(null); setFlyToTarget(null) }
  const handleSubSlsChange = e => { setSelectedSubSls(e.target.value); setSelectedPerson(null); setFlyToTarget(null) }
  const handleResetFilter = () => { setSelectedKecamatan(""); setSelectedDesa(""); setSelectedSubSls(""); setSelectedPerson(null); setFlyToTarget(null) }
  const handlePersonClick = useCallback(person => {
    setSelectedPerson(person)
    if (isValidCoord(person)) {
      setFlyToTarget({ id: person.id, lat: person.lat, lng: person.lng })
    }
  }, [isValidCoord])

  const kecStyle   = { color:"#f59e0b", weight:selectedDesa?1.5:2.5, dashArray:selectedDesa?"6,6":undefined, fillColor:"#f59e0b", fillOpacity:selectedDesa?0.04:0.12 }
  const desaStyle  = { color:"#38bdf8", weight:selectedSubSls?2:3, dashArray:selectedSubSls?"4,4":undefined, fillColor:"#0284c7", fillOpacity:selectedSubSls?0.08:0.18 }
  const subStyle   = { color:"#10b981", weight:3, fillColor:"#10b981", fillOpacity:0.22 }

  if (!auth) return <PasswordGate onSuccess={()=>setAuth(true)} />

  const tileInfo = TILE_LAYERS[activeTile]

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <MapContainer center={[-0.7185,102.9835]} zoom={11} scrollWheelZoom className="w-full h-full z-0" zoomControl={false}>
        <TileLayer key={activeTile} url={tileInfo.url} attribution={tileInfo.attribution} maxZoom={tileInfo.maxZoom} />
        {tileInfo.overlay && (
          <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxZoom={19} opacity={0.65} />
        )}
        <MapBoundsController geojsonBounds={activeBoundsGeo} flyToPoint={flyToTarget} markerRefs={markerRefs} />
        {kecGeo && <GeoJSON key={`kec-${selectedKecamatan}`} data={kecGeo} style={kecStyle} />}
        {desaGeo && <GeoJSON key={`desa-${selectedDesa}`} data={desaGeo} style={desaStyle} />}
        {subSlsGeo && <GeoJSON key={`subsls-${selectedSubSls}`} data={subSlsGeo} style={subStyle} />}
        {selectedDesa && validMarkers.map(item => {
          const isSelected = selectedPerson?.id === item.id
          return (
            <Marker key={item.id} position={[item.lat,item.lng]} icon={createCustomIcon(isSelected)}
              ref={ref=>{ if(ref) markerRefs.current[item.id]=ref }}
              eventHandlers={{click:()=>handlePersonClick(item)}}>
              <Popup>
                <div className="p-4 w-72 text-slate-100">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700/80">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400"><MapPin className="w-4 h-4"/></span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-base leading-tight truncate">{item.nama}</h4>
                      <span className="text-[11px] text-cyan-400 font-medium tracking-wide">Sub SLS: {item.idsubsls?.slice(-6) || "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-300"><Home className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0"/><span>{item.alamat || "—"}</span></div>
                    <div className="flex items-center gap-2 text-slate-300"><CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0"/><span className="font-mono text-slate-200">No KK: {item.no_kk || "—"}</span></div>
                    <div className="flex items-center gap-2 text-slate-300"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0"/><span className="font-mono text-cyan-300">{item.no_hp || "—"}</span></div>
                    <div className="pt-2 mt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between font-mono">
                      <span>Lat: {Number(item.lat).toFixed(5)}</span><span>Lng: {Number(item.lng).toFixed(5)}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Layer Picker */}
      <div className="absolute top-4 right-4 z-[1001]">
        <button onClick={()=>setShowLayerPicker(!showLayerPicker)}
          className="flex items-center gap-2 bg-slate-800/90 backdrop-blur-md border border-slate-700/80 text-white text-xs font-medium px-3 py-2.5 rounded-xl shadow-xl hover:bg-slate-700/90 transition-all">
          <Map className="w-4 h-4 text-cyan-400"/><span>{tileInfo.label}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showLayerPicker?"rotate-180":""}`}/>
        </button>
        {showLayerPicker && (
          <div className="absolute top-full right-0 mt-2 w-52 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-[1002]">
            {Object.entries(TILE_LAYERS).map(([key,info])=>(
              <button key={key} onClick={()=>{setActiveTile(key);setShowLayerPicker(false)}}
                className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-2 ${activeTile===key?"bg-blue-600/30 text-blue-300 border-l-2 border-blue-400":"text-slate-300 hover:bg-slate-700/60 border-l-2 border-transparent"}`}>
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0"/>{info.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="absolute top-4 left-4 z-[1000] w-84 sm:w-96 max-h-[calc(100vh-2rem)] flex flex-col bg-slate-900/92 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
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
            <div className="relative">
              <select value={selectedKecamatan} onChange={handleKecamatanChange} className="w-full bg-slate-800/90 text-white text-xs font-medium rounded-xl px-3 py-2.5 pr-8 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none shadow-sm">
                <option value="">-- Pilih Kecamatan --</option>
                {loadingFilters ? <option disabled>Memuat...</option> : filterOptions.map(k=><option key={k.kdkec} value={k.kdkec}>Kec. {k.nmkec}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
            </div>
            <div className="relative">
              <select value={selectedDesa} onChange={handleDesaChange} disabled={!selectedKecamatan} className="w-full bg-slate-800/90 text-white text-xs font-medium rounded-xl px-3 py-2.5 pr-8 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                <option value="">{selectedKecamatan?"-- Pilih Desa / Kelurahan --":"Pilih Kecamatan Terlebih Dahulu"}</option>
                {desaOptions.map(d=><option key={d.kddesa} value={d.kddesa}>Desa {d.nmdesa}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
            </div>
            <div className="relative">
              <select value={selectedSubSls} onChange={handleSubSlsChange} disabled={!selectedDesa} className="w-full bg-slate-800/90 text-white text-xs font-medium rounded-xl px-3 py-2.5 pr-8 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                <option value="">{selectedDesa?"-- Semua Sub SLS (Opsional) --":"Pilih Desa Terlebih Dahulu"}</option>
                {subslsOptions.map(s=><option key={s.idsubsls} value={s.idsubsls}>{s.nmsls}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
            </div>
          </div>
        </div>

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
                  {loadingPenduduk ? "…" : `${filteredPenduduk.length} Penduduk${validMarkers.length !== filteredPenduduk.length ? ` (${validMarkers.length} Titik)` : ""}`}
                </span>
              </div>
              {filteredPenduduk.length > 500 && (
                <div className="shrink-0 flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0"/><span>Desa ini punya <b>{filteredPenduduk.length}</b> data — virtual list aktif.</span>
                </div>
              )}
              {loadingPenduduk && <div className="flex-1 flex items-center justify-center text-xs text-slate-400"><span className="animate-pulse">Memuat data penduduk…</span></div>}
              {!loadingPenduduk && filteredPenduduk.length === 0 && <div className="text-center p-6 text-slate-400 text-xs">Tidak ada penduduk di Sub SLS ini.</div>}
              {!loadingPenduduk && filteredPenduduk.length > 0 && (
                filteredPenduduk.length > 500 ? (
                  <div className="flex-1 min-h-0">
                    <List height={Math.min(filteredPenduduk.length*86, window.innerHeight-360)} itemCount={filteredPenduduk.length} itemSize={86} width="100%">
                      {({index,style})=><PersonCard style={style} person={filteredPenduduk[index]} isSelected={selectedPerson?.id===filteredPenduduk[index].id} onClick={handlePersonClick}/>}
                    </List>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-1.5">
                    {filteredPenduduk.map(p=><PersonCard key={p.id} person={p} isSelected={selectedPerson?.id===p.id} onClick={handlePersonClick}/>)}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 p-3 bg-slate-900/95 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="truncate max-w-[220px]">{selectedDesa?"Klik nama untuk zoom ke titik":selectedKecamatan?"Peta fokus ke batas Kecamatan":"Peta Suplemen — Siap"}</span>
          <span className="font-mono text-slate-500 shrink-0">Tahap 3</span>
        </div>
      </aside>

      {showLayerPicker && <div className="fixed inset-0 z-[1000]" onClick={()=>setShowLayerPicker(false)}/>}
    </div>
  )
}
