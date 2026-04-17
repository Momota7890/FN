"use client";

import { useEffect, useState, useMemo } from "react";
import { API_ENDPOINTS, apiFetch } from "@/lib/api";
import { exportToCSV } from "@/lib/dashboard-utils";
import dynamic from "next/dynamic";

// Dynamic import for Map to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/MapComponent"), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-800 animate-pulse rounded-2xl flex items-center justify-center text-slate-500">Loading Map Satellite Data...</div>
});

import KpiMetrics from "@/components/KpiMetrics";
import VisualAnalytics from "@/components/VisualAnalytics";
import DetectionLogs from "@/components/DetectionLogs";

interface EventRecord {
  id: number;
  class_name: string;
  confidence: number;
  lat: number;
  lon: number;
  created_at: string;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [stats, setStats] = useState({ total_24h: 0, trend: 0, avg_confidence: "0.0", top_type: "N/A" });
  const [loading, setLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [dbStatus, setDbStatus] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch both events and stats in parallel
      const [eventsRes, statsRes] = await Promise.all([
        apiFetch(API_ENDPOINTS.EVENTS),
        apiFetch(API_ENDPOINTS.STATS)
      ]);

      if (!eventsRes.ok || !statsRes.ok) throw new Error("Network response was not ok");

      const [eventsData, statsData] = await Promise.all([
        eventsRes.json(),
        statsRes.json()
      ]);

      setEvents(eventsData);
      setStats(statsData);
      setDbStatus(true);
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);
    } catch (error) {
      console.error("❌ Failed to fetch data:", error);
      setDbStatus(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // ⏱️ ตั้งค่า Sync ทุก 15 วินาที
    return () => clearInterval(interval);
  }, []);

  // 🚀 ประมวลผลข้อมูลสำหรับกราฟเท่านั้น (เพราะสถิติ KPI มาจาก Backend แล้ว)
  const { chartData, timelineData } = useMemo(() => {
    const classStats = events.reduce((acc, curr) => {
      acc[curr.class_name] = (acc[curr.class_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartDataResult = Object.keys(classStats).map((key) => ({
      name: key,
      count: classStats[key]
    }));

    // Timeline Data (Group by hour)
    const timelineMap = events.reduce((acc, curr) => {
      const parts = curr.created_at.split(" ");
      if (parts.length > 1) {
        const hour = parts[1].split(":")[0] + ":00";
        acc[hour] = (acc[hour] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const timelineResult = Object.keys(timelineMap)
      .sort()
      .map(hour => ({ hour, count: timelineMap[hour] }));

    return { 
      chartData: chartDataResult, 
      timelineData: timelineResult
    };
  }, [events]);

  const handleExport = () => {
    exportToCSV(events);
  };

  return (
    <div className="min-h-screen p-6 pb-20">
      {loading ? (
        <div className="flex flex-col items-center justify-center mt-40 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-slate-400 font-medium tracking-widest">INITIALIZING DASHBOARD...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* Header Area */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white bg-clip-text">
                FOD <span className="text-blue-500">DASHBOARD</span>
              </h1>
              <p className="text-slate-500 text-sm mt-1 font-mono uppercase tracking-widest">
                Real-time Foreign Object Debris Monitoring System
              </p>
            </div>
            <div className="flex items-center gap-3 bg-slate-800/40 backdrop-blur px-4 py-2 rounded-full border border-slate-700">
               <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <p className="text-slate-300 text-xs font-mono">LIVE SYNC: {lastUpdated}</p>
            </div>
          </div>

          {/* 1. KPI Metrics */}
          <KpiMetrics 
            totalDetections={stats.total_24h}
            trend={stats.trend}
            avgConfidence={stats.avg_confidence}
            topType={stats.top_type}
            dbStatus={dbStatus}
            gpsStatus={events.length > 0} // Lat/Lon available means GPS locked
          />

          {/* 2. Interactive Map */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>🗺️</span> Intelligent Visual Map 
              </h2>
              <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700">
                <button 
                  onClick={() => setShowHeatmap(false)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${!showHeatmap ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Markers
                </button>
                <button 
                  onClick={() => setShowHeatmap(true)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${showHeatmap ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Heatmap
                </button>
              </div>
            </div>
            <div className="h-[500px]">
              <MapComponent 
                detections={events} 
                showHeatmap={showHeatmap} 
                autoFocus={true} 
              />
            </div>
          </div>

          {/* 3. Visual Analytics Charts */}
          <VisualAnalytics 
            timelineData={timelineData}
            classData={chartData}
            isMounted={isMounted}
          />

          {/* 4. Detailed History Logs */}
          <DetectionLogs 
            events={events}
            onExport={handleExport}
          />

        </div>
      )}
    </div>
  );
}