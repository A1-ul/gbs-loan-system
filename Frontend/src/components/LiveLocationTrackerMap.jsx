import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Building2, Navigation, UserCheck, ShieldAlert, Search,
  ExternalLink, Crosshair, Phone, Layers, RefreshCw
} from 'lucide-react';
import api, { devApi } from '../services/api';

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
  USER_DEVICE: { color: '#10B981', code: 'GPS', label: 'Live Mobile Device' },
  MEMBER: { color: '#A855F7', code: 'MB', label: 'Borrower Phone' },
  CUSTOMER_VISIT: { color: '#F97316', code: 'CV', label: 'Customer Visit' },
};

/**
 * Interactive Google Maps + Leaflet Real-Time GIS & Mobile-Number Locator
 * Supports live device GPS publishing (navigator.geolocation) and exact phone-number coordinate lookup.
 */
export default function LiveLocationTrackerMap({
  markers = [],
  geofences = [],
  onSelectMarker,
  mode = 'developer',
  initialPhone = '',
  onLocationPublished,
}) {
  const [filterType, setFilterType] = useState('ALL');
  const [showGeofences, setShowGeofences] = useState(true);
  const [mapEngine, setMapEngine] = useState('GOOGLE_MAP'); // GOOGLE_MAP | LEAFLET
  const [phoneQuery, setPhoneQuery] = useState(initialPhone || '');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [focusedPin, setFocusedPin] = useState(null);
  const [gpsStatusMsg, setGpsStatusMsg] = useState('');
  const [publishingGps, setPublishingGps] = useState(false);

  const runPhoneLookup = async (rawPhone) => {
    const clean = String(rawPhone || '').trim();
    if (clean.length < 3) {
      setLookupError('Enter at least 3 digits of a user mobile number.');
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    try {
      const client = mode === 'developer' ? devApi : api;
      const endpoint = mode === 'developer' ? '/developer/locations/lookup' : '/gps/locate-by-phone';
      const res = await client.get(endpoint, { params: { phone: clean } });
      const data = res.data?.data || { matches: [], primaryMatch: null };
      setLookupResult(data);
      if (data.primaryMatch?.coordinates) {
        setFocusedPin({
          ...data.primaryMatch,
          lat: data.primaryMatch.coordinates.latitude,
          lng: data.primaryMatch.coordinates.longitude,
          label: `${data.primaryMatch.name} (${data.primaryMatch.phone})`,
        });
        setMapEngine('GOOGLE_MAP');
      } else if (data.totalMatches === 0) {
        setLookupError(`No registered user, field officer, or customer matches phone "${clean}".`);
      } else {
        setLookupError(`Matched ${data.primaryMatch?.name || clean}, but no device GPS or branch coordinates have been recorded yet.`);
      }
    } catch (err) {
      setLookupError(err.response?.data?.message || 'Phone location lookup failed');
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    if (initialPhone && initialPhone.trim().length >= 3) {
      setPhoneQuery(initialPhone);
      runPhoneLookup(initialPhone);
    }
  }, [initialPhone]);

  const handlePublishMyGps = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('Browser Geolocation is not supported on this device.');
      return;
    }
    setPublishingGps(true);
    setGpsStatusMsg('Requesting real GPS fix from device...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const payload = {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracy: pos.coords.accuracy ? Number(pos.coords.accuracy.toFixed(1)) : undefined,
            speed: pos.coords.speed != null && pos.coords.speed >= 0 ? Number(pos.coords.speed.toFixed(2)) : undefined,
            status: 'ONLINE',
          };
          const res = await api.post('/gps/share-location', payload);
          const published = res.data?.data;
          if (published?.coordinates) {
            setFocusedPin({
              ...published,
              lat: published.coordinates.latitude,
              lng: published.coordinates.longitude,
              label: `${published.fullName} (${published.phone})`,
            });
            setMapEngine('GOOGLE_MAP');
          }
          setGpsStatusMsg(`Live GPS synced (${payload.latitude}, ${payload.longitude}) for mobile ${published?.phone || 'your account'}.`);
          if (onLocationPublished) onLocationPublished(published);
        } catch (err) {
          setGpsStatusMsg(err.response?.data?.message || 'Failed to save live GPS coordinates.');
        } finally {
          setPublishingGps(false);
        }
      },
      (err) => {
        setPublishingGps(false);
        setGpsStatusMsg(`Device GPS permission/fix failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const visibleMarkers = useMemo(() => {
    const base = (markers || []).map((m) => ({
      ...m,
      lat: Number(m.coordinates?.latitude ?? m.lat),
      lng: Number(m.coordinates?.longitude ?? m.lng),
      label: m.name || m.label || m.tenantName || 'Location Pin',
    }));
    const lookupPins = (lookupResult?.matches || [])
      .filter((m) => m.coordinates)
      .map((m) => ({
        ...m,
        lat: Number(m.coordinates.latitude),
        lng: Number(m.coordinates.longitude),
        label: `${m.name} (${m.phone})`,
      }));
    const combined = [...lookupPins, ...base].filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
    const deduped = [];
    const seen = new Set();
    for (const item of combined) {
      const key = item.id || `${item.label}-${item.lat}-${item.lng}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }
    if (filterType === 'ALL') return deduped;
    return deduped.filter((m) => m.type === filterType);
  }, [markers, lookupResult, filterType]);

  const activePin = useMemo(() => {
    if (focusedPin && Number.isFinite(Number(focusedPin.lat)) && Number.isFinite(Number(focusedPin.lng))) {
      return focusedPin;
    }
    if (visibleMarkers.length > 0) return visibleMarkers[0];
    return {
      lat: 5.6037,
      lng: -0.187,
      label: 'Accra Operational Hub (Default Center)',
      source: 'DEFAULT_CENTER',
      isLiveGps: false,
    };
  }, [focusedPin, visibleMarkers]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${activePin.lat},${activePin.lng}`;
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${activePin.lat},${activePin.lng}&z=16&output=embed`;

  const effectiveGeofences = useMemo(() => {
    if (geofences && geofences.length > 0) return geofences;
    return visibleMarkers
      .filter((m) => Number(m.geofenceRadius) > 0)
      .map((m) => ({ id: `gf-${m.id}`, lat: m.lat, lng: m.lng, radiusMeters: Number(m.geofenceRadius) }));
  }, [geofences, visibleMarkers]);

  const mapCenter = [Number(activePin.lat), Number(activePin.lng)];

  const handleSelectPin = (pin) => {
    setFocusedPin(pin);
    if (onSelectMarker) onSelectMarker(pin);
  };

  return (
    <div className="glass-panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} /> Real-Time Google Maps &amp; Mobile Number GPS Locator
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
            Pinpoint exact live device GPS or assigned institution location by registered mobile phone number ({visibleMarkers.length} pinned)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {mode === 'tenant' && (
            <button
              type="button"
              onClick={handlePublishMyGps}
              disabled={publishingGps}
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.78rem' }}
            >
              <Crosshair size={14} /> {publishingGps ? 'Syncing GPS...' : 'Share My Live Device GPS'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMapEngine('GOOGLE_MAP')}
            className={mapEngine === 'GOOGLE_MAP' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '7px 12px', fontSize: '0.78rem' }}
          >
            <MapPin size={14} /> Google Maps Pin
          </button>
          <button
            type="button"
            onClick={() => setMapEngine('LEAFLET')}
            className={mapEngine === 'LEAFLET' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '7px 12px', fontSize: '0.78rem' }}
          >
            <Layers size={14} /> GIS Cluster View
          </button>
        </div>
      </div>

      {/* Exact Mobile Number Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runPhoneLookup(phoneQuery);
        }}
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'rgba(6, 12, 24, 0.8)',
          padding: 12,
          borderRadius: 10,
          border: '1px solid rgba(0, 242, 254, 0.25)',
          marginBottom: 14,
        }}
      >
        <Phone size={16} color="#00F2FE" />
        <input
          type="tel"
          className="gbs-input"
          style={{ flex: 1, minWidth: 240 }}
          placeholder="Enter user mobile number (e.g. +233240000001 or 0240000001)"
          value={phoneQuery}
          onChange={(e) => setPhoneQuery(e.target.value)}
        />
        <button type="submit" disabled={lookupLoading} className="btn btn-primary" style={{ padding: '9px 16px' }}>
          <Search size={15} /> {lookupLoading ? 'Locating...' : 'Locate on Google Map'}
        </button>
        {lookupResult && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setPhoneQuery('');
              setLookupResult(null);
              setLookupError('');
              setFocusedPin(null);
            }}
          >
            Clear Lookup
          </button>
        )}
      </form>

      {gpsStatusMsg && (
        <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.35)', color: '#6EE7B7', fontSize: '0.8rem' }}>
          {gpsStatusMsg}
        </div>
      )}

      {lookupError && (
        <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.35)', color: '#FDE68A', fontSize: '0.8rem' }}>
          {lookupError}
        </div>
      )}

      {/* Selected Pin Summary Banner + Google Maps Direct Launch */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(212,175,55,0.28)',
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.92rem' }}>
            Pinned Target: {activePin.label}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: 2 }}>
            Coordinates: <strong>{Number(activePin.lat).toFixed(6)}, {Number(activePin.lng).toFixed(6)}</strong>
            {activePin.phone ? ` • Phone: ${activePin.phone}` : ''}
            {activePin.tenantName ? ` • Institution: ${activePin.tenantName}` : ''}
            {activePin.lastUpdatedAt ? ` • Updated: ${new Date(activePin.lastUpdatedAt).toLocaleString()}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {activePin.source && (
            <span className={`badge ${activePin.isLiveGps ? 'badge-success' : 'badge-warning'}`}>
              {activePin.source.replace(/_/g, ' ')}
            </span>
          )}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
          >
            <ExternalLink size={14} /> Open in Google Maps
          </a>
        </div>
      </div>

      {/* Matched Phone Candidates List (when multiple accounts match partial search) */}
      {lookupResult?.matches?.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {lookupResult.matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => m.coordinates && handleSelectPin({ ...m, lat: m.coordinates.latitude, lng: m.coordinates.longitude, label: `${m.name} (${m.phone})` })}
              className={focusedPin?.id === m.id ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
            >
              {m.name} • {m.phone} ({m.isLiveGps ? 'LIVE GPS' : 'HQ/Branch'})
            </button>
          ))}
        </div>
      )}

      {/* Active Map Viewport */}
      {mapEngine === 'GOOGLE_MAP' ? (
        <div style={{ height: 430, width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(212,175,55,0.35)', marginBottom: 16, background: '#0B1120' }}>
          <iframe
            title={`Google Map Pin - ${activePin.label}`}
            src={googleMapsEmbedUrl}
            style={{ width: '100%', height: '100%', border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
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

          <div style={{ height: 420, width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(212,175,55,0.3)', marginBottom: 16 }}>
            <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}`} center={mapCenter} zoom={focusedPin ? 14 : 7} style={{ height: '100%', width: '100%' }}>
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
                      click: () => handleSelectPin(m),
                    }}
                  >
                    <Popup>
                      <div style={{ color: '#0F172A', minWidth: 190 }}>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{style.label}</div>
                        {m.phone && <div style={{ fontSize: 11 }}><strong>Phone:</strong> {m.phone}</div>}
                        {m.tenantName && <div style={{ fontSize: 11 }}><strong>Institution:</strong> {m.tenantName}</div>}
                        {m.city && <div style={{ fontSize: 11 }}><strong>Location:</strong> {m.city}{m.country ? `, ${m.country}` : ''}</div>}
                        {m.status && <div style={{ fontSize: 11 }}><strong>Status:</strong> {m.status}</div>}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, color: '#2563EB' }}
                        >
                          Open Pin in Google Maps &rarr;
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </>
      )}

      {/* Live Location Cards */}
      <div className="gbs-grid-3">
        {visibleMarkers.slice(0, 9).map((m, idx) => {
          const style = PIN_STYLES[m.type] || PIN_STYLES.BRANCH;
          return (
            <div
              key={m.id || idx}
              onClick={() => handleSelectPin(m)}
              style={{
                background: 'rgba(6, 12, 24, 0.8)',
                border: `1px solid ${focusedPin?.id === m.id ? '#00F2FE' : 'rgba(212,175,55,0.2)'}`,
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
                   m.type === 'COLLECTOR' || m.type === 'USER_DEVICE' ? <Navigation size={14} color={style.color} /> :
                   m.type === 'CUSTOMER_VISIT' ? <UserCheck size={14} color={style.color} /> :
                   <ShieldAlert size={14} color={style.color} />}
                  <span>{m.label}</span>
                </div>
                <div style={{ fontSize: '0.73rem', color: '#94A3B8', marginTop: 2 }}>
                  {style.label} • {Number(m.lat).toFixed(4)}, {Number(m.lng).toFixed(4)}
                  {m.phone ? ` • ${m.phone}` : ''}
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
            Enter a user mobile number above or click &ldquo;Share My Live Device GPS&rdquo; to pin coordinates on Google Maps.
          </div>
        )}
      </div>
    </div>
  );
}
