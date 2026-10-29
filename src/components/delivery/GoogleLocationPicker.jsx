import { useState, useEffect, useRef } from "react";
import { Search, Crosshair, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

let loaderPromise = null;
function loadGoogleMaps(key) {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&language=en&region=PK`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loaderPromise = null; reject(new Error("Google Maps failed to load")); };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

/**
 * Google Maps + Places (New) location picker.
 * Calls onFail() if the key is rejected or the script can't load, so the caller can fall back.
 */
export default function GoogleLocationPicker({ apiKey, storeLat, storeLng, radiusKm, value, onChange, onAddressFound, onFail }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const libsRef = useRef({});
  const sessionRef = useRef(null);
  const debounceRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onAddrRef = useRef(onAddressFound);
  onChangeRef.current = onChange;
  onAddrRef.current = onAddressFound;

  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const distance = value ? distanceKm(storeLat, storeLng, value.lat, value.lng) : null;
  const inRange = distance !== null && distance <= radiusKm;

  const reverseGeocode = async (lat, lng) => {
    try {
      const { Geocoder } = libsRef.current.geocoding;
      const res = await new Geocoder().geocode({ location: { lat, lng } });
      return res?.results?.[0]?.formatted_address || "";
    } catch {
      return ""; // Geocoding API may not be enabled — customer just types the address
    }
  };

  const setPin = (lat, lng, pan = true) => {
    onChangeRef.current({ lat, lng });
    if (markerRef.current) markerRef.current.setPosition({ lat, lng });
    if (pan && mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      if (mapRef.current.getZoom() < 15) mapRef.current.setZoom(16);
    }
  };

  const pickOnMap = async (lat, lng) => {
    setError("");
    setPin(lat, lng, false);
    const addr = await reverseGeocode(lat, lng);
    if (addr && onAddrRef.current) onAddrRef.current(addr);
  };

  // Load the SDK and build the map once
  useEffect(() => {
    let cancelled = false;
    window.gm_authFailure = () => { if (!cancelled && onFail) onFail(); };
    (async () => {
      try {
        await loadGoogleMaps(apiKey);
        const [maps, places, marker, geocoding] = await Promise.all([
          window.google.maps.importLibrary("maps"),
          window.google.maps.importLibrary("places"),
          window.google.maps.importLibrary("marker"),
          window.google.maps.importLibrary("geocoding"),
        ]);
        if (cancelled || !mapDivRef.current) return;
        libsRef.current = { maps, places, marker, geocoding };

        const center = value ? { lat: value.lat, lng: value.lng } : { lat: storeLat, lng: storeLng };
        const map = new maps.Map(mapDivRef.current, {
          center,
          zoom: value ? 16 : 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
        });
        mapRef.current = map;

        new maps.Circle({
          map,
          center: { lat: storeLat, lng: storeLng },
          radius: radiusKm * 1000,
          strokeColor: "#8B7355",
          strokeWeight: 2,
          fillColor: "#8B7355",
          fillOpacity: 0.1,
          clickable: false,
        });

        new maps.Marker({
          map,
          position: { lat: storeLat, lng: storeLng },
          label: { text: "☕", fontSize: "20px" },
          title: "Bean",
          clickable: false,
        });

        const pin = new maps.Marker({
          map: value ? map : null,
          position: center,
          draggable: true,
          title: "Delivery location",
        });
        markerRef.current = pin;
        pin.addListener("dragend", () => {
          const p = pin.getPosition();
          pickOnMap(p.lat(), p.lng());
        });
        map.addListener("click", (e) => {
          if (markerRef.current && !markerRef.current.getMap()) markerRef.current.setMap(map);
          pickOnMap(e.latLng.lat(), e.latLng.lng());
        });

        setReady(true);
      } catch (e) {
        if (!cancelled && onFail) onFail();
      }
    })();
    return () => { cancelled = true; };
  }, [apiKey]);

  // Keep the pin marker in sync with `value`
  useEffect(() => {
    if (!ready || !markerRef.current) return;
    if (value) {
      markerRef.current.setPosition({ lat: value.lat, lng: value.lng });
      if (!markerRef.current.getMap()) markerRef.current.setMap(mapRef.current);
    } else {
      markerRef.current.setMap(null);
    }
  }, [ready, value?.lat, value?.lng]);

  // Places (New) autocomplete, debounced
  const runSearch = (text) => {
    clearTimeout(debounceRef.current);
    if (!text.trim() || text.trim().length < 3 || !ready) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } = libsRef.current.places;
        if (!sessionRef.current) sessionRef.current = new AutocompleteSessionToken();
        const { suggestions: s } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: text,
          sessionToken: sessionRef.current,
          includedRegionCodes: ["pk"],
          locationBias: { center: { lat: storeLat, lng: storeLng }, radius: 30000 },
        });
        setSuggestions((s || []).filter((x) => x.placePrediction).slice(0, 6));
        setError("");
      } catch (e) {
        setSuggestions([]);
        setError("Search is unavailable right now. Please drop the pin on the map instead.");
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const handlePick = async (sug) => {
    try {
      const place = sug.placePrediction.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
      sessionRef.current = null; // end the billing session
      setSuggestions([]);
      setQuery(sug.placePrediction.text.toString());
      setError("");
      const lat = place.location.lat();
      const lng = place.location.lng();
      setPin(lat, lng);
      const addr = place.formattedAddress || sug.placePrediction.text.toString();
      if (addr && onAddrRef.current) onAddrRef.current(addr);
    } catch {
      setError("Couldn't load that place. Please try another, or drop the pin on the map.");
    }
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
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        setPin(latitude, longitude);
        const addr = await reverseGeocode(latitude, longitude);
        if (addr && onAddrRef.current) onAddrRef.current(addr);
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
      <div className="relative">
        <Search className="h-4 w-4 text-[#8B7355] absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); runSearch(e.target.value); }}
          placeholder="Search your area, street or landmark"
          className="w-full border border-[#D4C4B0] rounded-lg py-2 pl-8 pr-8 text-sm text-[#5C4A3A]"
        />
        {searching && <Loader2 className="h-4 w-4 animate-spin text-[#8B7355] absolute right-2.5 top-1/2 -translate-y-1/2" />}
        {suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 border border-[#E8DED8] rounded-lg bg-white shadow-lg divide-y divide-[#F0E8E0] max-h-56 overflow-auto">
            {suggestions.map((s, i) => (
              <button
                type="button"
                key={s.placePrediction.placeId || i}
                onClick={() => handlePick(s)}
                className="w-full text-left text-xs text-[#5C4A3A] p-2.5 hover:bg-[#F5F1ED]"
              >
                {s.placePrediction.text.toString()}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        className="flex items-center gap-1.5 text-xs text-[#8B7355] border border-[#D4C4B0] rounded-lg px-3 py-1.5 disabled:opacity-50"
      >
        {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
        Use my current location
      </button>

      <div className="relative h-64 rounded-xl overflow-hidden border border-[#E8DED8] bg-[#F5F1ED]">
        <div ref={mapDivRef} className="absolute inset-0" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" />
          </div>
        )}
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
