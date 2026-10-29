import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Crosshair, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="font-size:30px;line-height:30px;">📍</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const storeIcon = L.divIcon({
  className: "",
  html: '<div style="font-size:26px;line-height:26px;">☕</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function ClickToPlace({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [target?.lat, target?.lng]);
  return null;
}

/**
 * Lets the customer search an address, use GPS, or drop/drag a pin.
 * Reports { lat, lng } (or null) via onChange, and { inRange, distance } via onStatus.
 */
export default function DeliveryLocationPicker({
  storeLat,
  storeLng,
  radiusKm,
  value,
  onChange,
  onAddressFound,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [flyTarget, setFlyTarget] = useState(null);
  const markerRef = useRef(null);

  const distance = value ? distanceKm(storeLat, storeLng, value.lat, value.lng) : null;
  const inRange = distance !== null && distance <= radiusKm;

  const place = (lat, lng, address) => {
    setError("");
    onChange({ lat, lng });
    setFlyTarget({ lat, lng });
    if (address && onAddressFound) onAddressFound(address);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`
      );
      const j = await r.json();
      return j?.display_name || "";
    } catch {
      return "";
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const d = 0.12; // bias results toward the area around the store
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=pk` +
        `&viewbox=${storeLng - d},${storeLat + d},${storeLng + d},${storeLat - d}` +
        `&q=${encodeURIComponent(q)}`;
      const r = await fetch(url);
      const j = await r.json();
      if (!Array.isArray(j) || j.length === 0) {
        setError("We couldn't find that place. Try a nearby landmark, or drop the pin on the map.");
      } else {
        setResults(j);
      }
    } catch {
      setError("Search is unavailable right now. Please drop the pin on the map instead.");
    } finally {
      setSearching(false);
    }
  };

  const handlePickResult = (res) => {
    setResults([]);
    setQuery(res.display_name);
    place(parseFloat(res.lat), parseFloat(res.lon), res.display_name);
  };

  const handleMapPick = async (lat, lng) => {
    place(lat, lng);
    const addr = await reverseGeocode(lat, lng);
    if (addr && onAddressFound) onAddressFound(addr);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError("Location isn't available on this device. Please drop the pin on the map.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocating(false);
        place(latitude, longitude);
        const addr = await reverseGeocode(latitude, longitude);
        if (addr && onAddressFound) onAddressFound(addr);
      },
      () => {
        setLocating(false);
        setError("We couldn't get your location. Please allow location access, or drop the pin on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-[#8B7355] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your area, street or landmark"
            className="w-full border border-[#D4C4B0] rounded-lg py-2 pl-8 pr-2 text-sm text-[#5C4A3A]"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-3 rounded-lg bg-[#5C4A3A] text-white text-sm disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="border border-[#E8DED8] rounded-lg bg-white divide-y divide-[#F0E8E0] max-h-44 overflow-auto">
          {results.map((r) => (
            <button
              type="button"
              key={r.place_id}
              onClick={() => handlePickResult(r)}
              className="w-full text-left text-xs text-[#5C4A3A] p-2 hover:bg-[#F5F1ED]"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        className="flex items-center gap-1.5 text-xs text-[#8B7355] border border-[#D4C4B0] rounded-lg px-3 py-1.5 disabled:opacity-50"
      >
        {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
        Use my current location
      </button>

      <div className="h-56 rounded-xl overflow-hidden border border-[#E8DED8]">
        <MapContainer
          center={value ? [value.lat, value.lng] : [storeLat, storeLng]}
          zoom={value ? 15 : 13}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          scrollWheelZoom={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Circle
            center={[storeLat, storeLng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: "#8B7355", weight: 2, fillColor: "#8B7355", fillOpacity: 0.08 }}
          />
          <Marker position={[storeLat, storeLng]} icon={storeIcon} interactive={false} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pinIcon}
              draggable
              ref={markerRef}
              eventHandlers={{
                dragend() {
                  const m = markerRef.current;
                  if (m) {
                    const { lat, lng } = m.getLatLng();
                    handleMapPick(lat, lng);
                  }
                },
              }}
            />
          )}
          <ClickToPlace onPick={handleMapPick} />
          <FlyTo target={flyTarget} />
        </MapContainer>
      </div>
      <p className="text-[11px] text-[#8B7355]">
        Tap the map or drag the pin to your exact delivery spot. The shaded circle is our {radiusKm} km delivery area.
      </p>

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {value && distance !== null && !inRange && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Sorry, this location is outside our delivery area. We deliver within {radiusKm} km of Bean
            (you're about {distance.toFixed(1)} km away).
          </span>
        </div>
      )}
      {value && inRange && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Great, we deliver here ({distance.toFixed(1)} km from Bean).</span>
        </div>
      )}
    </div>
  );
}
