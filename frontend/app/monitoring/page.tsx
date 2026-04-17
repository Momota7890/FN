"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS, apiFetch } from "@/lib/api";


interface Detection {
  id: number;
  class_name: string;
  confidence: number;
}

export default function MonitoringPage() {
  const router = useRouter();
  const [mode, setMode] = useState<string>("camera");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 🟢 State โหมด Camera (สตรีมสด)
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0);
  const [latency, setLatency] = useState<number>(0);
  const [aiStatus, setAiStatus] = useState<string>("idle"); // idle, connecting, active, error
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // 🎯 State สำหรับโชวผลลัพธ์และ Log
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);

  // 🎬 Blob URL สำหรับวิดีโอ (bypass ngrok interstitial)
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  // ✅ นิยามโดยใช้ useCallback เพื่อให้ stopWebRTC เล่าหลาย (stable reference) และ useEffect depสถูกต้อง
  const stopWebRTC = useCallback(() => {
    // 1. ปิดการเชื่อมต่อ WebRTC
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // 2. 🛑 สั่งหยุด "ทุกอย่าง" ในกล้องของเครื่อง (สำคัญมาก!)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // 3. เคลียร์มอนิเตอร์ฝั่งรับ
    if (remoteVideoRef.current?.srcObject) {
      (remoteVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      remoteVideoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setAiStatus("idle");
    setLatency(0);
    setFps(0);
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem("fod_mode");
    if (!savedMode) return router.push("/input");
    setMode(savedMode);

    if (savedMode === "video") {
      setResultVideoUrl(localStorage.getItem("fod_result_video_url"));
      const logs = localStorage.getItem("fod_result_logs");
      if (logs) setDetections(JSON.parse(logs));
    } else if (savedMode === "image") {
      setResultImage(localStorage.getItem("fod_result_image"));
      const logs = localStorage.getItem("fod_result_logs");
      if (logs) setDetections(JSON.parse(logs));
    }

    return () => stopWebRTC();
  }, [router, stopWebRTC]);

  // ✅ Cleanup blob URL เมื่อ unmount
  useEffect(() => {
    return () => { if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl); };
  }, [videoBlobUrl]);

  // ✅ Fetch video เป็น blob เพื่อ bypass ngrok interstitial warning
  // <video src="ngrok_url"> จะโดน ngrok block ด้วย text/html แต่ fetch() + header ผ่านได้
  useEffect(() => {
    if (mode !== "video" || !resultVideoUrl) return;
    setVideoLoading(true);
    setVideoBlobUrl(null);
    fetch(resultVideoUrl, { headers: { 'ngrok-skip-browser-warning': 'skip' } })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => setVideoBlobUrl(URL.createObjectURL(blob)))
      .catch(err => console.error('Video fetch error:', err))
      .finally(() => setVideoLoading(false));
  }, [mode, resultVideoUrl]);

  // 🚀 ฟังก์ชันวิเคราะห์ไฟล์ใหม่ ( Re-upload )
  const handleReUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("threshold", localStorage.getItem("fod_threshold") || "0.5");
    formData.append("lat", localStorage.getItem("fod_lat") || "0.0"); // 🚀 แนบพิกัดไปด้วย!
    formData.append("lon", localStorage.getItem("fod_lon") || "0.0");

    try {
      const endpoint = file.type.startsWith("image/") ? API_ENDPOINTS.PROCESS_IMAGE : API_ENDPOINTS.PROCESS_VIDEO;
      const res = await apiFetch(endpoint, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Processing Failed");
      const data = await res.json();

      // อัปเดต UI ตามประเภทไฟล์ที่เลือกใหม่
      if (file.type.startsWith("image/")) {
        setResultImage(data.processed_image);
        setResultVideoUrl(null);
        setMode("image");
        localStorage.setItem("fod_mode", "image");
      } else {
        setResultVideoUrl(data.video_url);
        setResultImage(null);
        setMode("video");
        localStorage.setItem("fod_mode", "video");
      }
      setDetections(data.detections);

      console.log("✅ วิเคราะห์ข้อมูลใหม่สำเร็จ!");
    } catch (err) {
      console.error(err);
      alert("An error occurred while re-analyzing the file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startWebRTC = async () => {
    setAiStatus("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
      localStreamRef.current = stream; // 🚀 จำไว้ว่าใช้กล้องตัวไหนอยู่
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      const dataChannel = pc.createDataChannel("ai_results");

      dataChannel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.detections) setDetections(data.detections);
        if (data.fps) setFps(data.fps);

        // 🚀 คำนวณ Latency (ms)
        if (data.timestamp) {
          const now = Date.now() / 1000;
          const delay = Math.round((now - data.timestamp) * 1000);
          setLatency(delay);
          setAiStatus("active");
        }
      };

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (evt) => {
        if (evt.track.kind === "video" && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = evt.streams[0];
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const savedThreshold = localStorage.getItem("fod_threshold") || "0.5";
      const savedLat = localStorage.getItem("fod_lat") || "0.0";
      const savedLon = localStorage.getItem("fod_lon") || "0.0";

      const response = await apiFetch(API_ENDPOINTS.OFFER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
          threshold: savedThreshold,
          lat: savedLat,
          lon: savedLon
        })
      });

      const answer = await response.json();
      await pc.setRemoteDescription(answer);
      setIsStreaming(true);
    } catch (err) {
      alert("Failed to open camera!");
    }
  };



  // 🎨 Color mapping (Sync with Dashboard)
  const getClassColor = (name: string) => {
    const lowercase = name.toLowerCase();
    if (lowercase.includes("fastener") || lowercase.includes("metal")) return { text: "text-blue-500", border: "border-blue-600", bg: "bg-blue-600/10" };
    if (lowercase.includes("plastic")) return { text: "text-cyan-400", border: "border-cyan-500", bg: "bg-cyan-500/10" };
    if (lowercase.includes("tools")) return { text: "text-white", border: "border-slate-300", bg: "bg-white/10" };
    if (lowercase.includes("stone") || lowercase.includes("concrete")) return { text: "text-yellow-400", border: "border-yellow-500", bg: "bg-yellow-500/10" };
    return { text: "text-purple-500", border: "border-purple-600", bg: "bg-purple-600/10" }; // Default
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* หน้าจอมอนิเตอร์ */}
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
          {isProcessing && (
            <div className="absolute inset-0 z-10 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mb-4"></div>
              <p className="text-xl font-bold">AI is analyzing new file...</p>
            </div>
          )}

          {mode === "camera" && (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline muted className={`w-full aspect-video bg-black object-contain rounded-xl border border-gray-600 ${!isStreaming ? "hidden" : ""}`} />
              
              {isStreaming && (
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="bg-black/80 text-green-400 font-mono text-sm px-3 py-1 rounded-md border border-green-500/50 flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    LIVE: {fps} FPS
                  </div>
                  <div className="bg-black/80 text-blue-400 font-mono text-sm px-3 py-1 rounded-md border border-blue-500/50">
                    LATENCY: {latency}ms
                  </div>
                </div>
              )}

              {!isStreaming && aiStatus === "idle" && (
                <div className="flex flex-col items-center gap-4 animate-pulse">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border-2 border-dashed border-blue-500/30">
                    <span className="text-4xl">⏯️</span>
                  </div>
                  <div className="text-slate-400 text-xl font-bold tracking-widest uppercase text-center">
                    System Ready<br/>
                    <span className="text-sm font-medium text-slate-500">Press "Start Live Scan" to begin</span>
                  </div>
                </div>
              )}

              {!isStreaming && aiStatus === "connecting" && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center border-4 border-gray-600 border-t-blue-500 animate-spin"></div>
                  <div className="text-gray-500 text-xl font-medium tracking-wide">Establishing WebRTC Link...</div>
                </div>
              )}
            </>
          )}

          {mode === "video" && (
            videoLoading
              ? <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full" />
                  <p className="text-sm font-mono">Loading video...</p>
                </div>
              : videoBlobUrl
                ? <video src={videoBlobUrl} controls autoPlay className="w-full aspect-video bg-black object-contain rounded-xl border border-green-500" />
                : resultVideoUrl && <p className="text-red-400 text-sm text-center">⚠️ Video unavailable — check backend connection</p>
          )}
          {mode === "image" && resultImage && <img src={resultImage} alt="Result" className="w-full max-h-[600px] object-contain rounded-xl border border-purple-500" />}
        </div>

        {/* แผงควบคุมและ Logs */}
        <div className="flex flex-col gap-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h3 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">🎛️ Control Panel</h3>

            {mode === "camera" ? (
              <button onClick={isStreaming ? stopWebRTC : startWebRTC} className={`w-full py-4 rounded-lg font-bold text-xl ${isStreaming ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"}`}>
                {isStreaming ? "🛑 Stop Camera" : "▶️ Start Live Scan"}
              </button>
            ) : (
              <label className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-lg cursor-pointer transition-all border border-blue-500/30 ${isProcessing ? 'bg-gray-700' : 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-400'}`}>
                <input type="file" className="hidden" onChange={handleReUpload} accept={mode === "image" ? "image/jpeg,image/png,image/webp,image/bmp,image/*" : "video/mp4,video/*"} disabled={isProcessing} />
                {isProcessing ? "⏳ AI Processing..." : "🔄 Upload New File"}
              </label>
            )}
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col h-[400px]">
            <h3 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">🎯 Recent Detections</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {detections.length > 0 ? (
                <ul className="space-y-3">
                  {detections.map((det, idx) => {
                    const colors = getClassColor(det.class_name);
                    return (
                      <li key={idx} className={`p-3 rounded-lg border-l-4 ${colors.border} ${colors.bg} flex justify-between items-center transition-all animate-fade-in`}>
                        <span className={`font-bold ${colors.text} text-sm`}>
                          [{det.id !== -1 ? `ID:${det.id}` : 'Detected'}] {det.class_name}
                        </span>
                        <span className="bg-gray-900/50 px-2 py-1 rounded text-xs font-mono border border-gray-700">{det.confidence}%</span>
                      </li>
                    );
                  })}
                </ul>
              ) : <div className="text-gray-500 text-center mt-10">No objects detected</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}