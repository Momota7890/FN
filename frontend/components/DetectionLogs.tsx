"use client";

import { useState } from "react";
import { Search, Download, Filter } from "lucide-react";

interface EventRecord {
  id: number;
  class_name: string;
  confidence: number;
  lat: number;
  lon: number;
  created_at: string;
}

interface DetectionLogsProps {
  events: EventRecord[];
  onExport: () => void;
}

export default function DetectionLogs({ events, onExport }: DetectionLogsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [minConfidence, setMinConfidence] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const filteredEvents = events.filter(e => 
    (e.class_name.toLowerCase().includes(searchTerm.toLowerCase()) || e.id.toString().includes(searchTerm)) &&
    e.confidence >= minConfidence
  );

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const currentData = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 🎨 Color mapping for consistent class identification
  const getClassColor = (name: string) => {
    const lowercase = name.toLowerCase();
    if (lowercase.includes("fastener") || lowercase.includes("metal")) return "text-blue-500";
    if (lowercase.includes("plastic")) return "text-cyan-400";
    if (lowercase.includes("tools")) return "text-white";
    if (lowercase.includes("stone") || lowercase.includes("concrete")) return "text-yellow-400";
    return "text-purple-500"; // Default
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span>📋</span> Detection Logs
        </h3>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search ID or Type..." 
              className="bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to page 1 on search
              }}
            />
          </div>

          {/* Confidence Filter */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg">
            <Filter size={14} className="text-slate-500" />
            <span className="text-xs text-slate-400 whitespace-nowrap">Min Conf: {minConfidence}%</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="5"
              className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              value={minConfidence}
              onChange={(e) => {
                setMinConfidence(parseInt(e.target.value));
                setCurrentPage(1); // Reset to page 1 on filter
              }}
            />
          </div>

          {/* Export Button */}
          <button 
            onClick={onExport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
              <th className="p-4">ID</th>
              <th className="p-4">Object Class</th>
              <th className="p-4">Confidence</th>
              <th className="p-4">Coordinates</th>
              <th className="p-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {currentData.length > 0 ? currentData.map((e) => (
              <tr key={e.id} className="hover:bg-slate-700/30 transition-colors group">
                <td className="p-4 text-slate-500 text-sm">#{e.id}</td>
                <td className={`p-4 font-bold ${getClassColor(e.class_name)} uppercase tracking-tight`}>{e.class_name}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${e.confidence > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${e.confidence}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono">{e.confidence.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="p-4 text-slate-300 font-mono text-xs opacity-70 group-hover:opacity-100">{e.lat.toFixed(5)}, {e.lon.toFixed(5)}</td>
                <td className="p-4 text-slate-400 text-xs">{e.created_at}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="p-10 text-center text-slate-500 italic">No debris detection logs matching your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/20">
          <p className="text-xs text-slate-500 font-mono text-center sm:text-left">
            SHOWING {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredEvents.length)} OF {filteredEvents.length} DETECTIONS
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1 rounded bg-slate-700 text-white text-[10px] font-bold disabled:opacity-30 hover:bg-slate-600 transition-colors h-7"
            >
              PREV
            </button>
            <div className="flex items-center gap-1 overflow-hidden">
              {(() => {
                const pages = [];
                const range = 1; // Number of pages to show on each side of current page
                
                for (let i = 1; i <= totalPages; i++) {
                  if (
                    i === 1 || // Always show first page
                    i === totalPages || // Always show last page
                    (i >= currentPage - range && i <= currentPage + range) // Show pages around current
                  ) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold transition-all ${currentPage === i ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                      >
                        {i}
                      </button>
                    );
                  } else if (
                    i === currentPage - range - 1 || 
                    i === currentPage + range + 1
                  ) {
                    pages.push(<span key={i} className="text-slate-600 px-1 text-[10px]">...</span>);
                  }
                }
                return pages;
              })()}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1 rounded bg-slate-700 text-white text-[10px] font-bold disabled:opacity-30 hover:bg-slate-600 transition-colors h-7"
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
