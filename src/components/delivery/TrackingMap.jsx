import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const riderIcon = L.divIcon({
  className: "",
  html: '<div style="font-size:24px;"><div style="position:absolute;width:36px;height:36px;background:#6B5744;border-radius:50%;opacity:0.3;animation:riderPulse 1.5s infinite ease-out;left:-6px;top:-6px;"></div>🛵</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const customerIcon = L.divIcon({
  className: "",
  html: '<div style="font-size:24px;">📍</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else if (positions.length > 1) {
      map.fitBounds(positions, { padding: [60, 60] });
    }
  }, [JSON.stringify(positions)]);
  return null;
}

export default function TrackingMap({ customerPos, riderPos }) {
  const ISLAMABAD = [33.6844, 73.0479];
  const positions = [];
  if (customerPos) positions.push(customerPos);
  if (riderPos) positions.push(riderPos);
  const center = positions[0] || ISLAMABAD;

  return (
    <>
      <style>{`
        @keyframes riderPulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={14}
        className="w-full h-full"
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        scrollWheelZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {customerPos && <Marker position={customerPos} icon={customerIcon} />}
        {riderPos && <Marker position={riderPos} icon={riderIcon} />}
        {customerPos && riderPos && (
          <Polyline positions={[customerPos, riderPos]} pathOptions={{ color: "#8B7355", dashArray: "6,8" }} />
        )}
        <FitBounds positions={positions} />
      </MapContainer>
    </>
  );
}