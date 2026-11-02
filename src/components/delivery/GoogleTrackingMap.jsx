import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

let loaderPromise = null;
function loadGoogleMaps(key) {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const prev = window.__beanGmReady;
    window.__beanGmReady = () => { if (prev) prev(); resolve(); };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&language=en&region=PK&callback=__beanGmReady`;
    s.async = true;
    s.onerror = () => { loaderPromise = null; reject(new Error("Google Maps failed to load")); };
    document.head.appendChild(s);
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (window.google?.maps?.importLibrary) { clearInterval(iv); resolve(); }
      else if (Date.now() - t0 > 12000) { clearInterval(iv); loaderPromise = null; reject(new Error("Google Maps load timed out")); }
    }, 100);
  });
  return loaderPromise;
}

/**
 * Live tracking map (Google). Shows the customer's pin, the rider's scooter and, when the
 * Routes API is enabled on the key, the real road route + traffic-aware ETA via onRoute({minutes, km}).
 * If Google can't load, onFail() is called so the caller can fall back to the free map.
 */
export default function GoogleTrackingMap({ apiKey, customerPos, riderPos, onRoute, onFail }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const libsRef = useRef({});
  const customerMarker = useRef(null);
  const riderMarker = useRef(null);
  const routeLine = useRef(null);
  const lastRoute = useRef({ t: 0, lat: 0, lng: 0 });
  const routesBlocked = useRef(false);
  const onRouteRef = useRef(onRoute);
  onRouteRef.current = onRoute;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps(apiKey);
        const [maps, marker] = await Promise.all([
          window.google.maps.importLibrary("maps"),
          window.google.maps.importLibrary("marker"),
        ]);
        if (cancelled || !divRef.current) return;
        libsRef.current = { maps, marker };
        const start = customerPos || riderPos || [33.5306669, 73.0997785];
        mapRef.current = new maps.Map(divRef.current, {
          center: { lat: start[0], lng: start[1] },
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
        });
        setReady(true);
      } catch (e) {
        console.error("[GoogleTrackingMap] falling back to free map:", e);
        if (!cancelled && onFail) onFail();
      }
    })();
    window.gm_authFailure = () => { if (!cancelled && onFail) onFail(); };
    return () => { cancelled = true; };
  }, [apiKey]);

  // Markers + fit
  useEffect(() => {
    if (!ready) return;
    const { marker } = libsRef.current;
    const map = mapRef.current;

    if (customerPos) {
      const p = { lat: customerPos[0], lng: customerPos[1] };
      if (!customerMarker.current) {
        customerMarker.current = new marker.Marker({ map, position: p, title: "Delivery location", zIndex: 5 });
      } else customerMarker.current.setPosition(p);
    }
    if (riderPos) {
      const p = { lat: riderPos[0], lng: riderPos[1] };
      if (!riderMarker.current) {
        riderMarker.current = new marker.Marker({
          map,
          position: p,
          title: "Your rider",
          zIndex: 10,
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 17, fillColor: "#ffffff", fillOpacity: 1, strokeColor: "#6B5744", strokeWeight: 2 },
          label: { text: "🛵", fontSize: "20px" },
        });
      } else riderMarker.current.setPosition(p);
    }
    if (customerPos && riderPos) {
      const b = new window.google.maps.LatLngBounds();
      b.extend({ lat: customerPos[0], lng: customerPos[1] });
      b.extend({ lat: riderPos[0], lng: riderPos[1] });
      map.fitBounds(b, 60);
      // Don't zoom in absurdly far when the two points are almost the same
      window.google.maps.event.addListenerOnce(map, "idle", () => { if (map.getZoom() > 17) map.setZoom(17); });
    } else if (customerPos) {
      map.setCenter({ lat: customerPos[0], lng: customerPos[1] });
    }
  }, [ready, customerPos?.[0], customerPos?.[1], riderPos?.[0], riderPos?.[1]]);

  // Real road route + traffic-aware ETA (needs the Routes API enabled on the key; silently skipped otherwise)
  useEffect(() => {
    if (!ready || !customerPos || !riderPos || routesBlocked.current) return;
    const now = Date.now();
    const moved = Math.abs(riderPos[0] - lastRoute.current.lat) + Math.abs(riderPos[1] - lastRoute.current.lng);
    if (now - lastRoute.current.t < 20000 && moved < 0.0005) return;
    lastRoute.current = { t: now, lat: riderPos[0], lng: riderPos[1] };
    (async () => {
      try {
        const { Route } = await window.google.maps.importLibrary("routes");
        const { routes } = await Route.computeRoutes({
          origin: { lat: riderPos[0], lng: riderPos[1] },
          destination: { lat: customerPos[0], lng: customerPos[1] },
          travelMode: "DRIVING",
          routingPreference: "TRAFFIC_AWARE",
          fields: ["durationMillis", "distanceMeters", "path"],
        });
        const r = routes?.[0];
        if (!r) return;
        if (routeLine.current) routeLine.current.setMap(null);
        routeLine.current = new window.google.maps.Polyline({
          map: mapRef.current,
          path: r.path,
          strokeColor: "#6B5744",
          strokeOpacity: 0.9,
          strokeWeight: 5,
        });
        if (onRouteRef.current) onRouteRef.current({ minutes: Math.max(1, Math.round(r.durationMillis / 60000)), km: r.distanceMeters / 1000 });
      } catch (e) {
        routesBlocked.current = true; // Routes API not enabled on this key — page uses its own road-factor estimate
        if (onRouteRef.current) onRouteRef.current(null);
      }
    })();
  }, [ready, riderPos?.[0], riderPos?.[1], customerPos?.[0], customerPos?.[1]]);

  return (
    <div className="relative w-full h-full bg-[#F5F1ED]">
      <div ref={divRef} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" />
        </div>
      )}
    </div>
  );
}
