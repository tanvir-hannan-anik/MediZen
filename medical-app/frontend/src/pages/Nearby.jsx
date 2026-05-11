import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Topbar from '../components/Topbar';
import PaperPlaneLoader from '../components/PaperPlaneLoader';
import { nearbyAPI } from '../api/client';

/* ── Load Leaflet from CDN ───────────────────────────────────────────────── */
let leafletReady = null;
function loadLeaflet() {
  if (window.L?.map) return Promise.resolve();
  if (leafletReady) return leafletReady;
  leafletReady = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = resolve;
    js.onerror = () => { leafletReady = null; reject(new Error('Failed to load map library')); };
    document.head.appendChild(js);
  });
  return leafletReady;
}

/* ── Tile layers ─────────────────────────────────────────────────────────── */
const TILES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

/* ── Service type metadata ───────────────────────────────────────────────── */
const TYPE_META = {
  hospital: { color: '#ba1a1a', tw: 'error',     label: 'H', msIcon: 'local_hospital', iconBg: 'bg-error/10',     iconFg: 'text-error' },
  clinic:   { color: '#003d9b', tw: 'primary',   label: 'C', msIcon: 'medical_services', iconBg: 'bg-primary-container', iconFg: 'text-on-primary-container' },
  pharmacy: { color: '#4f625d', tw: 'secondary', label: 'P', msIcon: 'medication', iconBg: 'bg-secondary-fixed', iconFg: 'text-on-secondary-fixed' },
  college:  { color: '#43424e', tw: 'tertiary',  label: 'U', msIcon: 'school', iconBg: 'bg-tertiary-fixed',   iconFg: 'text-on-tertiary-fixed' },
};

/* ── HTML escape for popup strings ──────────────────────────────────────── */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Google Maps directions URL ─────────────────────────────────────────── */
function directionsUrl(service, userPos) {
  const dest = `${service.latitude},${service.longitude}`;
  if (userPos) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${dest}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

/* ── Leaflet Map ─────────────────────────────────────────────────────────── */
function LeafletMap({ services, selected, onSelect, userPos, mapMode }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const tileRef      = useRef(null);
  const markersRef   = useRef({});
  const userDotRef   = useRef(null);
  const userPosRef   = useRef(userPos);
  const [ready, setReady] = useState(false);
  const [err,   setErr]   = useState('');

  useEffect(() => { userPosRef.current = userPos; }, [userPos]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => {
        if (cancelled || mapRef.current) return;
        const L   = window.L;
        const map = L.map(containerRef.current, {
          center:      [23.7461, 90.3742],
          zoom:        13,
          zoomControl: false,
        });
        const cfg = TILES.satellite;
        tileRef.current = L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: cfg.maxZoom }).addTo(map);
        mapRef.current = map;
        setReady(true);
      })
      .catch(e => setErr(e.message));

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileRef.current = null;
        markersRef.current = {};
        userDotRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = window.L;
    tileRef.current?.remove();
    const cfg = TILES[mapMode] || TILES.satellite;
    tileRef.current = L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: cfg.maxZoom }).addTo(mapRef.current);
  }, [ready, mapMode]);

  useEffect(() => {
    if (!ready || !userPos || !mapRef.current) return;
    const L = window.L;
    userDotRef.current?.remove();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="12" fill="rgba(0,61,155,0.2)"/>
      <circle cx="13" cy="13" r="8"  fill="#003d9b" stroke="white" stroke-width="2.5"/>
      <circle cx="13" cy="13" r="3"  fill="white"/>
    </svg>`;
    userDotRef.current = L.marker(userPos, {
      icon: L.divIcon({ html: svg, className: '', iconSize: [26, 26], iconAnchor: [13, 13] }),
      zIndexOffset: 1000,
      title: 'Your location',
    }).addTo(mapRef.current);
  }, [ready, userPos?.[0], userPos?.[1]]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = window.L;
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    services.forEach(s => {
      const meta   = TYPE_META[s.type] || TYPE_META.clinic;
      const active = selected?.id === s.id;
      const isFeat = s.featured;
      const w = active ? 46 : isFeat ? 40 : 34;
      const h = Math.round(w * 48 / 36);

      const starBadge = isFeat
        ? `<circle cx="28" cy="6" r="7" fill="#003d9b" stroke="white" stroke-width="1.5"/>
           <text x="28" y="9.5" text-anchor="middle" fill="white" font-size="7" font-weight="bold" font-family="Arial">★</text>`
        : '';

      const pin = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="${w}" height="${h}" overflow="visible">
        <path d="M18 2C9 2 2 9 2 18c0 12 16 28 16 28S34 30 34 18C34 9 27 2 18 2z"
              fill="${meta.color}" stroke="white" stroke-width="${isFeat ? 3 : 2.5}"/>
        <text x="18" y="${active ? 23 : 22}" text-anchor="middle" fill="white"
              font-size="${active ? 14 : 12}" font-weight="bold" font-family="Arial,sans-serif">${meta.label}</text>
        ${starBadge}
      </svg>`;

      const icon = L.divIcon({ html: pin, className: '', iconSize: [w, h], iconAnchor: [w / 2, h], popupAnchor: [0, -h] });

      const getPopup = () => {
        const pos = userPosRef.current;
        const dirUrl = directionsUrl(s, pos);
        return `
          <div style="min-width:210px;font-family:sans-serif;line-height:1.55;padding:2px 0">
            ${s.featured ? '<div style="font-size:10px;font-weight:700;color:#003d9b;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">★ Featured</div>' : ''}
            <div style="font-size:13px;font-weight:700;color:#111;margin-bottom:3px">${esc(s.name)}</div>
            <div style="font-size:11px;color:#666;margin-bottom:5px">${esc(s.address)}</div>
            ${s.rating ? `<div style="font-size:11px;color:#003d9b;margin-bottom:4px">★ ${s.rating}</div>` : ''}
            <div style="font-size:11px;font-weight:600;color:${s.open_24h ? '#4f625d' : '#92400e'};margin-bottom:4px">
              ${s.open_24h ? '● Open 24h' : `● ${esc(s.hours || 'Hours vary')}`}
            </div>
            ${s.phone ? `<div style="font-size:11px;margin-bottom:6px">📞 <a href="tel:${esc(s.phone)}" style="color:#003d9b">${esc(s.phone)}</a></div>` : ''}
            <a href="${dirUrl}" target="_blank"
               style="background:#003d9b;color:#fff;padding:5px 12px;border-radius:7px;text-decoration:none;font-size:11px;font-weight:600">
              ${pos ? 'Directions from you →' : 'Directions →'}
            </a>
          </div>`;
      };

      const marker = L.marker([s.latitude, s.longitude], { icon, title: s.name })
        .addTo(mapRef.current);
      marker.bindPopup(() => getPopup(), { maxWidth: 260 });
      marker.on('click', () => onSelect(s));
      markersRef.current[s.id] = marker;
    });
  }, [ready, services]);

  useEffect(() => {
    if (!ready || !selected || !mapRef.current) return;
    const marker = markersRef.current[selected.id];
    if (!marker) return;
    mapRef.current.setView([selected.latitude, selected.longitude], 16, { animate: true });
    marker.openPopup();
  }, [ready, selected?.id]);

  const zoomIn  = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const recenter = () => {
    if (userPos && mapRef.current) mapRef.current.setView(userPos, 15, { animate: true });
  };

  if (err) return (
    <div className="absolute inset-0 flex items-center justify-center bg-error-container text-on-error-container p-lg text-center text-body-sm">
      {err}
    </div>
  );

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Right-side stacked map controls (zoom + locate) */}
      <div className="absolute top-md right-md z-[400] flex flex-col bg-surface/95 backdrop-blur-md rounded-xl border border-outline-variant overflow-hidden" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
        <button onClick={zoomIn} className="w-10 h-10 flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface" title="Zoom in">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
        </button>
        <div className="h-px bg-outline-variant mx-1.5" />
        <button onClick={zoomOut} className="w-10 h-10 flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface" title="Zoom out">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>remove</span>
        </button>
        <div className="h-px bg-outline-variant mx-1.5" />
        <button
          onClick={recenter}
          disabled={!userPos}
          className="w-10 h-10 flex items-center justify-center hover:bg-surface-container transition-colors text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          title="Center on my location"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>my_location</span>
        </button>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Main Nearby page
   ════════════════════════════════════════════════════════════════════════════ */
export default function Nearby() {
  const [allServices,  setAllServices]  = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [distFilter,   setDistFilter]   = useState('20');
  const [hoursFilter,  setHoursFilter]  = useState('any');
  const [search,       setSearch]       = useState('');
  const [userPos,      setUserPos]      = useState(null);
  const [locStatus,    setLocStatus]    = useState('requesting');
  const [mapMode,      setMapMode]      = useState('satellite');

  const watchIdRef      = useRef(null);
  const hasFetchedRef   = useRef(false);
  const abortRef        = useRef(null);
  const selectedRowRef  = useRef(null);

  /* ── Live geolocation ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus('unavailable');
      setUserPos([23.7461, 90.3742]);
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocStatus('live');
      },
      () => {
        setLocStatus('denied');
        setUserPos([23.7461, 90.3742]);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 12000 }
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  /* ── Fetch services ──────────────────────────────────────────────────── */
  const fetchServices = useCallback(async (pos) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const params = { limit: 200 };
      if (pos) { params.user_lat = pos[0]; params.user_lng = pos[1]; }
      const res = await nearbyAPI.get(params);
      if (controller.signal.aborted) return;
      setAllServices(res.data);
      setSelected(prev => prev ?? (res.data[0] || null));
    } catch (e) {
      if (controller.signal.aborted) return;
      setError('Could not load nearby services. Is the backend running?');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userPos || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchServices(userPos);
  }, [userPos, fetchServices]);

  /* ── Filtered list ───────────────────────────────────────────────────── */
  const services = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allServices.filter(s => {
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      if (distFilter && userPos) {
        const km = s.distance_km;
        if (km > 0 && km > Number(distFilter)) return false;
      }
      if (hoursFilter === 'open24' && !s.open_24h) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.address.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allServices, typeFilter, distFilter, hoursFilter, search, userPos]);

  useEffect(() => {
    if (selected && !services.find(s => s.id === selected.id)) {
      setSelected(services[0] ?? null);
    }
  }, [services]);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selected?.id]);

  const typeCounts = useMemo(() =>
    allServices.reduce((acc, s) => { acc[s.type] = (acc[s.type] || 0) + 1; return acc; }, {}),
    [allServices]
  );

  const handleRefresh = () => {
    hasFetchedRef.current = false;
    fetchServices(userPos);
  };

  /* ── GPS chip styles ─────────────────────────────────────────────────── */
  const locChip = ({
    live:        { label: 'Live GPS',          bg: 'bg-secondary-fixed',  fg: 'text-on-secondary-fixed', dot: 'bg-secondary',  pulse: true  },
    requesting:  { label: 'Getting location…', bg: 'bg-tertiary-fixed',   fg: 'text-on-tertiary-fixed',  dot: 'bg-tertiary',   pulse: false },
    denied:      { label: 'Location denied',   bg: 'bg-error-container',  fg: 'text-on-error-container', dot: 'bg-error',      pulse: false },
    unavailable: { label: 'GPS unavailable',   bg: 'bg-surface-container',fg: 'text-on-surface-variant', dot: 'bg-outline',    pulse: false },
  })[locStatus] || { label: 'Location', bg: 'bg-surface-container', fg: 'text-on-surface-variant', dot: 'bg-outline', pulse: false };

  const tabs = [
    { id: 'all',      label: 'All' },
    { id: 'hospital', label: 'Hospitals' },
    { id: 'clinic',   label: 'Clinics' },
    { id: 'pharmacy', label: 'Pharmacies' },
    { id: 'college',  label: 'Colleges' },
  ];

  return (
    <>
      <Topbar eyebrow="Discovery" title="Nearby medical services">
        <span
          className={`inline-flex items-center gap-2 pl-2.5 pr-3.5 py-1.5 ${locChip.bg} ${locChip.fg} rounded-full text-[13px] font-bold border border-outline-variant/40`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <span className={`w-2 h-2 rounded-full ${locChip.dot} ${locChip.pulse ? 'animate-pulse' : ''}`} style={{ boxShadow: '0 0 0 3px rgba(255,255,255,0.6)' }} />
          {locChip.label}
        </span>
        <button
          onClick={handleRefresh}
          disabled={!userPos || loading}
          className="group flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant bg-surface-container-lowest hover:bg-surface-container hover:border-primary/40 active:scale-95 transition-all text-on-surface disabled:opacity-50 disabled:hover:bg-surface-container-lowest text-[13px] font-bold"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <span className={`material-symbols-outlined text-[18px] text-primary ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`}>refresh</span>
          Refresh
        </button>
        <a
          href="tel:999"
          className="no-underline hover:no-underline flex items-center gap-xs px-lg py-sm bg-error text-on-error rounded-xl font-bold active:scale-95 transition-transform text-sm"
          style={{ boxShadow: '0 8px 24px rgba(186,26,26,0.25)' }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
          Emergency · 999
        </a>
      </Topbar>

      <section className="flex-1 flex overflow-hidden">

        {/* ══════════════ List section (40%) ══════════════ */}
        <div className="w-[40%] min-w-[360px] flex flex-col border-r border-outline-variant bg-surface-container-lowest">

          {/* Search + filters */}
          <div className="p-md space-y-md border-b border-outline-variant">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">search</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search hospitals, pharmacies…"
                className="w-full pl-xl pr-md py-md bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-md top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface-variant"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                </button>
              )}
            </div>

            {/* Type chips */}
            <div className="flex gap-sm overflow-x-auto pb-xs" style={{ scrollbarWidth: 'none' }}>
              {tabs.map(t => {
                const active = typeFilter === t.id;
                const count = t.id === 'all' ? null : typeCounts[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => setTypeFilter(t.id)}
                    className={`px-md py-xs rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high hover:bg-surface-variant text-on-surface-variant'
                    }`}
                  >
                    {t.label}{count != null ? ` (${count})` : ''}
                  </button>
                );
              })}
            </div>

            {/* Distance + hours */}
            <div className="flex gap-md">
              <div className="flex-1 relative">
                <select
                  value={distFilter}
                  onChange={e => setDistFilter(e.target.value)}
                  className="w-full p-sm pr-xl bg-surface-container-low border border-outline-variant rounded-lg text-sm appearance-none cursor-pointer"
                >
                  <option value="2">Within 2 km</option>
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="20">Within 20 km</option>
                  <option value="">Any distance</option>
                </select>
                <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
              </div>
              <div className="flex-1 relative">
                <select
                  value={hoursFilter}
                  onChange={e => setHoursFilter(e.target.value)}
                  className="w-full p-sm pr-xl bg-surface-container-low border border-outline-variant rounded-lg text-sm appearance-none cursor-pointer"
                >
                  <option value="any">Any hours</option>
                  <option value="open24">24/7 only</option>
                </select>
                <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
              </div>
            </div>
          </div>

          {/* Scrollable results */}
          <div className="flex-1 overflow-y-auto p-md space-y-md">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-xl gap-md text-on-surface-variant">
                <div className="w-9 h-9 rounded-full border-[3px] border-surface-container-high border-t-primary animate-spin" />
                <span className="text-sm">Searching nearby…</span>
              </div>
            ) : error ? (
              <div className="space-y-md">
                <div className="p-md bg-error-container text-on-error-container rounded-xl text-sm">
                  {error}
                </div>
                <button
                  onClick={handleRefresh}
                  className="w-full py-sm bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Try again
                </button>
              </div>
            ) : services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-xl text-center gap-sm">
                {!userPos ? (
                  <PaperPlaneLoader message="Waiting for your location…" size={180} />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 40 }}>search_off</span>
                    <p className="font-bold text-on-surface">No results found</p>
                    <p className="text-sm text-on-surface-variant">Try a different filter or wider distance.</p>
                    <button
                      onClick={() => { setTypeFilter('all'); setDistFilter('20'); setHoursFilter('any'); setSearch(''); }}
                      className="mt-sm px-md py-xs bg-surface-container-high hover:bg-surface-variant rounded-full text-sm font-semibold text-on-surface-variant"
                    >
                      Clear all filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant font-medium">
                  {services.length} place{services.length !== 1 ? 's' : ''} found
                </p>

                {services.map(s => {
                  const meta   = TYPE_META[s.type] || TYPE_META.clinic;
                  const active = selected?.id === s.id;
                  const isFeat = s.featured;

                  if (isFeat) {
                    return (
                      <div
                        key={s.id}
                        ref={active ? selectedRowRef : null}
                        onClick={() => setSelected(s)}
                        className="p-md rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm relative cursor-pointer hover:shadow-md transition-all"
                      >
                        <div className="absolute -top-3 right-md px-md py-1 bg-primary text-on-primary rounded-full text-[10px] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> FEATURED
                        </div>
                        <div className="flex gap-md">
                          <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container flex-shrink-0">
                            <span className="material-symbols-outlined">{meta.msIcon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-sm">
                              <h3 className="font-bold text-[16px] text-primary leading-tight">{s.name}</h3>
                              <span className="text-primary font-bold text-sm whitespace-nowrap">
                                {s.distance_km > 0 ? `${s.distance_km} km` : '—'}
                              </span>
                            </div>
                            <p className="text-sm text-on-surface-variant mt-1 truncate">{s.address}</p>
                            <div className="flex items-center gap-md mt-md flex-wrap">
                              <span className={`flex items-center gap-1 text-[12px] font-bold ${s.open_24h ? 'text-secondary' : 'text-on-surface-variant'}`}>
                                <span className={`w-2 h-2 rounded-full ${s.open_24h ? 'bg-secondary' : 'bg-outline'}`} />
                                {s.open_24h ? 'Open 24h' : (s.hours || 'Hours vary')}
                              </span>
                              {s.rating && (
                                <span className="flex items-center gap-1 text-[12px] font-bold text-on-surface">
                                  <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                  {s.rating}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={s.id}
                      ref={active ? selectedRowRef : null}
                      onClick={() => setSelected(s)}
                      className={`p-md rounded-xl border bg-surface transition-all cursor-pointer ${
                        active
                          ? 'border-primary shadow-md'
                          : 'border-outline-variant hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex gap-md">
                        <div className={`w-12 h-12 rounded-xl ${meta.iconBg} ${meta.iconFg} flex items-center justify-center flex-shrink-0`}>
                          <span className="material-symbols-outlined">{meta.msIcon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-sm">
                            <h3 className="font-bold text-[16px] text-on-surface leading-tight truncate">{s.name}</h3>
                            <span className="text-on-surface-variant font-bold text-sm whitespace-nowrap">
                              {s.distance_km > 0 ? `${s.distance_km} km` : '—'}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface-variant mt-1 truncate">{s.address}</p>
                          <div className="flex items-center gap-md mt-md flex-wrap">
                            <span className={`flex items-center gap-1 text-[12px] font-bold ${s.open_24h ? 'text-secondary' : 'text-on-surface-variant'}`}>
                              {s.open_24h && <span className="w-2 h-2 rounded-full bg-secondary" />}
                              {s.open_24h ? 'Open 24h' : (s.hours || 'Hours vary')}
                            </span>
                            {s.rating && (
                              <span className="flex items-center gap-1 text-[12px] font-bold text-on-surface">
                                <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                {s.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ══════════════ Map section (60%) ══════════════ */}
        <div className="flex-1 relative bg-surface-container-highest">
          <LeafletMap
            services={services}
            selected={selected}
            onSelect={setSelected}
            userPos={userPos}
            mapMode={mapMode}
          />

          {/* Mode toggle — sleek segmented (top-left) */}
          <div className="absolute top-md left-md z-[400] inline-flex bg-surface/95 backdrop-blur-md rounded-full border border-outline-variant p-0.5" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
            {[
              { id: 'satellite', icon: 'satellite_alt', label: 'Satellite' },
              { id: 'street',    icon: 'map',           label: 'Street' },
            ].map(m => {
              const active = mapMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMapMode(m.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{m.icon}</span>
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Legend — slim horizontal pill (bottom-left) */}
          <div className="absolute bottom-md left-md z-[400] inline-flex items-center gap-md bg-surface/95 backdrop-blur-md px-md py-1.5 rounded-full border border-outline-variant" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
            {Object.entries(TYPE_META).map(([type, meta]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                <span className="text-[11px] font-semibold text-on-surface-variant capitalize">{type}</span>
              </div>
            ))}
            <span className="w-px h-3 bg-outline-variant" />
            <div className="flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="text-[11px] font-bold">Featured</span>
            </div>
          </div>

          {/* Selected info popup — bottom-center, above legend */}
          {selected && (
            <div
              className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[401] w-[min(380px,calc(100%-32px))] bg-surface rounded-2xl border border-outline-variant overflow-hidden"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.20)' }}
            >
              <div className={`px-md pt-md pb-sm ${selected.featured ? 'bg-primary/5' : ''} flex justify-between items-start gap-sm`}>
                <div className="min-w-0">
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1 ${selected.featured ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {selected.featured && (
                      <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>star</span>
                    )}
                    {selected.featured ? 'Featured · DIU' : selected.type}
                  </span>
                  <h4 className="font-bold text-[17px] text-on-surface mt-0.5 leading-tight truncate">{selected.name}</h4>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center flex-shrink-0 -mt-0.5 -mr-0.5"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <div className="px-md pb-md space-y-sm">
                <p className="text-[13px] text-on-surface-variant leading-snug">{selected.address}</p>

                <div className="flex items-center gap-sm flex-wrap text-[12px]">
                  <span className={`inline-flex items-center gap-1 font-semibold ${selected.open_24h ? 'text-secondary' : 'text-on-surface-variant'}`}>
                    {selected.open_24h && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                    {selected.open_24h ? 'Open 24h' : (selected.hours || 'Hours vary')}
                  </span>
                  {selected.distance_km > 0 && (
                    <>
                      <span className="text-outline-variant">•</span>
                      <span className="text-on-surface-variant">{selected.distance_km} km away</span>
                    </>
                  )}
                  {selected.rating && (
                    <>
                      <span className="text-outline-variant">•</span>
                      <span className="inline-flex items-center gap-0.5 font-semibold text-on-surface">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>star</span>
                        {selected.rating}
                      </span>
                    </>
                  )}
                </div>

                {selected.departments?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.departments.slice(0, 5).map((d, i) => (
                      <span key={i} className="px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full text-[10.5px] font-medium">
                        {d}
                      </span>
                    ))}
                  </div>
                )}

                <div className={`grid ${selected.phone ? 'grid-cols-2' : 'grid-cols-1'} gap-sm pt-1`}>
                  {selected.phone && (
                    <a
                      href={`tel:${selected.phone}`}
                      className="no-underline hover:no-underline py-2 px-md border border-primary text-primary rounded-xl font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/5 transition-colors text-[13px]"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span> Call
                    </a>
                  )}
                  <a
                    href={directionsUrl(selected, userPos)}
                    target="_blank"
                    rel="noreferrer"
                    className="no-underline hover:no-underline py-2 px-md bg-primary text-on-primary rounded-xl font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-[13px]"
                    style={{ boxShadow: '0 4px 12px rgba(0,61,155,0.25)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>directions</span>
                    Directions
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
