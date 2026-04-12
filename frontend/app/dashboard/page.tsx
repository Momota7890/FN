"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { API_ENDPOINTS } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // 🚀 ชี้ไปที่ Python Backend ผ่าน Centralized Config
  const API_URL = API_ENDPOINTS.EVENTS;
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        setEvents(data);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
      } catch (error) {
        console.error("❌ Failed to fetch data from Python Backend:", error);
        setLoading(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 5000); // Update ทุก 5 วินาที
    return () => clearInterval(interval);
  }, []);

  // 🚀 เพิ่มประสิทธิภาพด้วย useMemo (คำนวณใหม่เฉพาะเมื่อ events เปลี่ยน)
  const { chartData, totalDetections, avgConfidence, topType } = useMemo(() => {
    const classStats = events.reduce((acc, curr) => {
      acc[curr.class_name] = (acc[curr.class_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartDataResult = Object.keys(classStats).map((key, index) => ({
      name: key,
      count: classStats[key],
      fill: COLORS[index % COLORS.length] // 🎨 ใส่สีเตรียมไว้ใน Data เลย
    }));

    const total = events.length;
    const avgConf = events.length > 0
      ? (events.reduce((acc, curr) => acc + curr.confidence, 0) / events.length).toFixed(1)
      : "0.0";

    const top = chartDataResult.length > 0
      ? chartDataResult.sort((a, b) => b.count - a.count)[0].name
      : "N/A";

    return { chartData: chartDataResult, totalDetections: total, avgConfidence: avgConf, topType: top };
  }, [events]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">

      {loading ? (
        <div className="flex flex-col items-center justify-center mt-40 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-slate-400">Waiting for AI engine data...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-8">

          <div className="flex justify-start items-center">
            <p className="text-slate-500 text-sm">🕰️ Last Updated: {lastUpdated || "Fetching data..."}</p>
          </div>

          {/* ส่วนตัวเลขสรุป */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-slate-400 text-sm font-medium">Total Detections</h3>
              <p className="text-5xl font-bold text-white mt-2">{totalDetections}</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-slate-400 text-sm font-medium">Average Confidence</h3>
              <p className="text-5xl font-bold text-emerald-400 mt-2">{avgConfidence}%</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-slate-400 text-sm font-medium">Most Frequent Type</h3>
              <p className="text-3xl font-bold text-amber-400 mt-4 uppercase">
                {topType}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* กราฟแท่ง */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-lg font-semibold mb-6 text-slate-300 italic">📈 Material Distribution</h3>
              <div className="h-[300px] w-full">
                {isMounted && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="text-center text-slate-500 mt-20">No scan data available</div>}
              </div>
            </div>

            {/* กราฟวงกลม */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-lg font-semibold mb-6 text-slate-300 italic">🍩 Detection Proportion</h3>
              <div className="h-[300px] w-full">
                {isMounted && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        label={({ name, percent }) =>
                          name && percent !== undefined
                            ? `${name} ${(percent * 100).toFixed(0)}%`
                            : ""
                        }
                      />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="text-center text-slate-500 mt-20">No scan data available</div>}
              </div>
            </div>
          </div>

          {/* ตารางประวัติ */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-800/50">
              <h3 className="text-xl font-bold">📋 History Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider">
                    <th className="p-4">ID</th>
                    <th className="p-4">Object Class</th>
                    <th className="p-4">Confidence</th>
                    <th className="p-4">Coordinates</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {events.length > 0 ? events.slice(0, 15).map((e) => (
                    <tr key={e.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 text-slate-500 text-sm">#{e.id}</td>
                      <td className="p-4 font-bold text-blue-400 uppercase">{e.class_name}</td>
                      <td className="p-4">
                        <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs border border-emerald-500/20">
                          {e.confidence.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-sm">{e.lat.toFixed(5)}, {e.lon.toFixed(5)}</td>
                      <td className="p-4 text-slate-400 text-sm">{e.created_at}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-500">No debris detection history found on runway</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}