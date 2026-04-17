"use client";

import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet + Next.js
const fixLeafletIcon = (L: any) => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "",
  });
};

interface Detection {
  id: number;
  class_name: string;
  confidence: number;
  lat: number;
  lon: number;
}

interface MapComponentProps {
  detections: Detection[];
  autoFocus?: boolean;
  showHeatmap?: boolean;
}

// 🛰️ The actual Leaflet implementation (will be dynamically loaded)
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then(mod => mod.Circle), { ssr: false });

// Helper component for auto-focus that uses useMap internal to MapContainer
const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

export default function MapComponent({ detections, autoFocus = true, showHeatmap = false }: MapComponentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    import("leaflet").then((L) => {
      fixLeafletIcon(L);
    });
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full min-h-[400px] bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
        <div className="animate-pulse text-slate-500">Initializing Smart Map...</div>
      </div>
    );
  }

  const latestDetection = detections.length > 0 ? detections[0] : null;
  const defaultCenter: [number, number] = latestDetection ? [latestDetection.lat, latestDetection.lon] : [13.69, 100.75];

  return (
    <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={16} 
        style={{ height: "100%", width: "100%", background: "#0f172a" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {autoFocus && latestDetection && <ChangeView center={[latestDetection.lat, latestDetection.lon]} />}

        {showHeatmap ? (
          detections.map((det, idx) => {
            // 🌈 Professional Spectral Heatmap (Like Radar/Infrared)
            let color = "#3b82f6"; // Blue (Very Low)
            if (det.confidence > 92) color = "#ff0000";      // Deep Red
            else if (det.confidence > 85) color = "#ef4444"; // Red
            else if (det.confidence > 75) color = "#f97316"; // Orange
            else if (det.confidence > 60) color = "#eab308"; // Yellow
            else if (det.confidence > 45) color = "#22c55e"; // Green
            else if (det.confidence > 30) color = "#06b6d4"; // Cyan

            return [
              <Circle
                key={`outer-${idx}`}
                center={[det.lat, det.lon]}
                radius={50}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.15,
                  stroke: false
                }}
              />,
              <Circle
                key={`mid-${idx}`}
                center={[det.lat, det.lon]}
                radius={30}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.3,
                  stroke: false
                }}
              />,
              <Circle
                key={`core-${idx}`}
                center={[det.lat, det.lon]}
                radius={10}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.6,
                  stroke: true,
                  color: "white",
                  weight: 0.5,
                  opacity: 0.4
                }}
              />,
            ];
          })
        ) : (
          detections.map((det) => (
            <Marker key={det.id} position={[det.lat, det.lon]}>
              <Popup>
                <div className="text-slate-900 p-1">
                  <p className="font-bold border-b mb-1">{det.class_name.toUpperCase()}</p>
                  <p className="text-xs">Confidence: {det.confidence.toFixed(1)}%</p>
                </div>
              </Popup>
            </Marker>
          ))
        )}
      </MapContainer>
    </div>
  );
}
