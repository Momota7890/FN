"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell
} from "recharts";

const getClassColor = (name: string) => {
  const lowercase = (name || "").toLowerCase();
  if (lowercase.includes("fastener") || lowercase.includes("metal")) return "#3b82f6"; // Blue
  if (lowercase.includes("plastic")) return "#22d3ee"; // Cyan
  if (lowercase.includes("tools")) return "#ffffff"; // White
  if (lowercase.includes("stone") || lowercase.includes("concrete")) return "#facc15"; // Yellow
  return "#a855f7"; // Purple
};

interface ChartData {
  name: string;
  count: number;
  fill?: string;
}

interface VisualAnalyticsProps {
  timelineData: { hour: string; count: number }[];
  classData: ChartData[];
  isMounted: boolean;
}

export default function VisualAnalytics({ timelineData, classData, isMounted }: VisualAnalyticsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Activity Timeline */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <span>📈</span> Activity Timeline
        </h3>
        <div className="h-[300px] w-full">
          {isMounted && timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 italic">No timeline data available</div>
          )}
        </div>
      </div>

      {/* Class Distribution */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <span>📊</span> Class Distribution
        </h3>
        <div className="h-[300px] w-full">
          {isMounted && classData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {classData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getClassColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 italic">No scan data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
