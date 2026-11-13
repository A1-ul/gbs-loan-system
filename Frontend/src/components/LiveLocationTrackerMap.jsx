import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Building2, Navigation, UserCheck, ShieldAlert } from 'lucide-react';

function buildPinIcon(color, label) {
  return L.divIcon({
    className: 'gbs-leaflet-pin',
    html: `<div style="background:${color};color:#060C18;border:2px solid #FFFFFF;border-radius:999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 4px 12px rgba(0,0,0,0.6);">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

const PIN_STYLES = {
  TENANT_HQ: { color: '#D4AF37', code: 'HQ', label: 'Tenant HQ' },
  BRANCH: { color: '#38BDF8', code: 'BR', label: 'Branch Office' },
  COLLECTOR: { color: '#10B981', code: 'FC', label: 'Field Collector' },
  CUSTOMER_VISIT: { color: '#F97316', code: 'CV', label: 'Customer Visit' },
};

/**
 * Interactive OpenStreetMap / Leaflet Real-Time GIS Tracker
 * Strictly scoped to the Hidden GBS Developer Control Center.
 */
export default function LiveLocationTrackerMap({ markers = [], geofences = [], onSelectMarker }) {
  const [filterType, setFilterType] = useState('ALL');
  const [showGeofences, setShowGeofences] = useState(true);

  const visibleMarkers = useMemo(() => {
    const normalized = (markers || []).map((m) => ({
      ...m,
      lat: Number(m.coordinates?.latitude ?? m.lat),
      lng: Number(m.coordinates?.longitude ?? m.lng),
      label: m.name || m.label || m.tenantName || 'Location Pin',
    }));
    const valid = normalized.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
    if (filterType === 'ALL') return valid;
    return valid.filter((m) => m.type === filterType);
  }, [markers, filterType]);

  const effectiveGeofences = useMemo(() => {
    if (geofences && geofences.length > 0) return geofences;
    return visibleMarkers
      .filter((m) => Number(m.geofenceRadius) > 0)
      .map((m) => ({ id: `gf-${m.id}`, lat: m.lat, lng: m.lng, radiusMeters: Number(m.geofenceRadius) }));
  }, [geofences, visibleMarkers]);

  const mapCenter = useMemo(() => {
    if (visibleMarkers.length > 0) {
      return [Number(visibleMarkers[0].lat), Number(visibleMarkers[0].lng)];
    }
    return [5.6037, -0.187]; // Default center: Accra, Ghana
  }, [visibleMarkers]);

  return (
    <div className="glass-panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} /> Live Enterprise GIS & Field Collector Map
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
            Real-time Tenant HQs, Branch Geofences, Collector GPS Telemetry & Borrower Visits ({visibleMarkers.length} pinned)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Pins' },
            { id: 'TENANT_HQ', label: 'Tenant HQs' },
            { id: 'BRANCH', label: 'Branches' },
            { id: 'COLLECTOR', label: 'Collectors' },
            { id: 'CUSTOMER_VISIT', label: 'Visits' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setFilterType(btn.id)}
              className={filterType === btn.id ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '6px 12px', fontSize: '0.76rem' }}
            >
              {btn.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowGeofences((v) => !v)}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.76rem', borderColor: showGeofences ? '#10B981' : undefined }}
          >
            Geofences: {showGeofences ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Real Interactive Leaflet Map */}
      <div style={{ height: 420, width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(212,175,55,0.3)', marginBottom: 16 }}>
        <MapContainer center={mapCenter} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {showGeofences &&
            effectiveGeofences.map((g, idx) => (
              <Circle
                key={g.id || idx}
                center={[Number(g.lat), Number(g.lng)]}
                radius={Number(g.radiusMeters || 500)}
                pathOptions={{ color: '#D4AF37', fillColor: '#D4AF37', fillOpacity: 0.12, weight: 1.5 }}
              />
            ))}

          {visibleMarkers.map((m, idx) => {
            const style = PIN_STYLES[m.type] || PIN_STYLES.BRANCH;
            const icon = buildPinIcon(m.isActive === false ? '#EF4444' : style.color, style.code);
            return (
              <Marker
                key={m.id || idx}
                position={[Number(m.lat), Number(m.lng)]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    if (onSelectMarker) onSelectMarker(m);
                  },
                }}
              >
                <Popup>
                  <div style={{ color: '#0F172A', minWidth: 180 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{style.label}</div>
                    {m.tenantName && <div style={{ fontSize: 11 }}><strong>Institution:</strong> {m.tenantName}</div>}
                    {m.city && <div style={{ fontSize: 11 }}><strong>Location:</strong> {m.city}{m.country ? `, ${m.country}` : ''}</div>}
                    {m.status && <div style={{ fontSize: 11 }}><strong>Status:</strong> {m.status}</div>}
                    {m.batteryLevel != null && <div style={{ fontSize: 11 }}><strong>Battery:</strong> {m.batteryLevel}%</div>}
                    {m.recordedAt && <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>{new Date(m.recordedAt).toLocaleString()}</div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Live Location Cards */}
      <div className="gbs-grid-3">
        {visibleMarkers.slice(0, 9).map((m, idx) => {
          const style = PIN_STYLES[m.type] || PIN_STYLES.BRANCH;
          return (
            <div
              key={m.id || idx}
              onClick={() => onSelectMarker && onSelectMarker(m)}
              style={{
                background: 'rgba(6, 12, 24, 0.8)',
                border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: 10,
                padding: 12,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.type === 'TENANT_HQ' ? <Building2 size={14} color={style.color} /> :
                   m.type === 'COLLECTOR' ? <Navigation size={14} color={style.color} /> :
                   m.type === 'CUSTOMER_VISIT' ? <UserCheck size={14} color={style.color} /> :
                   <ShieldAlert size={14} color={style.color} />}
                  <span>{m.label}</span>
                </div>
                <div style={{ fontSize: '0.73rem', color: '#94A3B8', marginTop: 2 }}>
                  {style.label} • {Number(m.lat).toFixed(4)}, {Number(m.lng).toFixed(4)}
                </div>
              </div>
              <span className="badge" style={{ background: `${style.color}22`, color: style.color, border: `1px solid ${style.color}55` }}>
                {m.status || 'LIVE'}
              </span>
            </div>
          );
        })}
        {visibleMarkers.length === 0 && (
          <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
            No GIS coordinates matching filter &ldquo;{filterType}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
