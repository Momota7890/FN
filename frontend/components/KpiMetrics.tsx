"use client";

import { Activity, ShieldCheck, Target, Zap } from "lucide-react";

interface KpiMetricsProps {
  totalDetections: number;
  trend: number;
  avgConfidence: string;
  topType: string;
  dbStatus: boolean;
  gpsStatus: boolean;
}

export default function KpiMetrics({
  totalDetections,
  trend,
  avgConfidence,
  topType,
  dbStatus,
  gpsStatus
}: KpiMetricsProps) {
  const getClassColor = (name: string) => {
    const lowercase = (name || "").toLowerCase();
    if (lowercase.includes("fastener") || lowercase.includes("metal")) return "text-blue-500";
    if (lowercase.includes("plastic")) return "text-cyan-400";
    if (lowercase.includes("tools")) return "text-white";
    if (lowercase.includes("stone") || lowercase.includes("concrete")) return "text-yellow-400";
    return "text-purple-500"; // Default
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Detections */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Activity size={48} />
        </div>
        <h3 className="text-slate-400 text-sm font-medium">Total Detections (24h)</h3>
        <div className="flex items-end gap-3 mt-2">
          <p className="text-4xl font-bold text-white">{totalDetections}</p>
          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        </div>
      </div>

      {/* Avg Confidence */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <ShieldCheck size={48} />
        </div>
        <h3 className="text-slate-400 text-sm font-medium">Avg Confidence</h3>
        <p className="text-4xl font-bold text-emerald-400 mt-2">{avgConfidence}%</p>
      </div>

      {/* Top FOD Type */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Target size={48} />
        </div>
        <h3 className="text-slate-400 text-sm font-medium">Top FOD Type</h3>
        <p className={`font-bold ${getClassColor(topType)} mt-3 uppercase leading-tight ${topType.length > 12 ? 'text-xl' : 'text-3xl'}`}>
          {topType}
        </p>
      </div>

      {/* System Status */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Zap size={48} />
        </div>
        <h3 className="text-slate-400 text-sm font-medium">System Status</h3>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Database</span>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dbStatus ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></span>
              <span className="text-xs font-mono">{dbStatus ? 'CONNECTED' : 'OFFLINE'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">GPS Sync</span>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${gpsStatus ? 'bg-blue-500' : 'bg-slate-700'}`}></span>
              <span className="text-xs font-mono">{gpsStatus ? 'LOCKED' : 'SEARCHING'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
