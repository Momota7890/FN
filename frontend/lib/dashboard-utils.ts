/**
 * 🛠️ Utility functions for the Advanced Dashboard
 */

interface EventRecord {
  id: number;
  class_name: string;
  confidence: number;
  lat: number;
  lon: number;
  created_at: string;
}

/**
 * Calculates the percentage trend between two periods
 */
export const calculateTrend = (events: EventRecord[]) => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const currentPeriod = events.filter(e => new Date(e.created_at) >= twentyFourHoursAgo);
  const previousPeriod = events.filter(e => {
    const date = new Date(e.created_at);
    return date >= fortyEightHoursAgo && date < twentyFourHoursAgo;
  });

  if (previousPeriod.length === 0) return currentPeriod.length > 0 ? 100 : 0;
  
  const diff = currentPeriod.length - previousPeriod.length;
  return Math.round((diff / previousPeriod.length) * 100);
};

/**
 * Exports data to CSV and triggers download
 */
export const exportToCSV = (data: EventRecord[], filename = "fod_detections_report.csv") => {
  if (data.length === 0) return;

  const headers = ["ID", "Class Name", "Confidence (%)", "Latitude", "Longitude", "Timestamp"];
  const rows = data.map(e => [
    e.id,
    `"${e.class_name}"`,
    e.confidence.toFixed(2),
    e.lat,
    e.lon,
    `"${e.created_at || 'N/A'}"`
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

