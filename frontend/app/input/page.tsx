"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS, apiFetch } from "@/lib/api";
import API_BASE_URL from "@/lib/api";
import Link from "next/link";

export default function InputPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"camera" | "image" | "video">("camera");
  const [threshold, setThreshold] = useState<number>(0.7);
  const [lat, setLat] = useState<string>("0.0000");
  const [lon, setLon] = useState<string>("0.0000");
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "success" | "error">("idle");

  // 🚀 ฟังก์ชันดึง GPS อัตโนมัติ
  const requestGps = () => {
    if (!("geolocation" in navigator)) {
      setGpsStatus("error");
      return;
    }

    setIsGpsLoading(true);
    setGpsStatus("idle");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLon(position.coords.longitude.toFixed(6));
        setIsGpsLoading(false);
        setGpsStatus("success");
        console.log("📍 GPS Success:", position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error("❌ GPS Error:", error);
        setIsGpsLoading(false);
        setGpsStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    // ลองดึงทันที
    requestGps();

    // เช็ค Permissions (บางเบราว์เซอร์อาจต้องการการตรวจสอบก่อน)
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        result.onchange = () => {
          if (result.state === "granted") requestGps();
        };
      });
    }
  }, []);

  // 🖼️ State โหมดรูปภาพ (เก็บทั้งไฟล์จริงสำหรับส่ง และลิงก์สำหรับพรีวิว)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 🎬 State โหมดวิดีโอ
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);

  // 🚀 State โหลดดิ้ง (ใช้ทั้งตอนอัปโหลดและให้ AI ประมวลผล)
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // คำนวณขนาดไฟล์ให้ดูง่ายๆ
  const getFileSize = (size: number) => {
    return (size / (1024 * 1024)).toFixed(2) + " MB";
  };

  // รับไฟล์รูป
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file); // 🚀 เก็บไฟล์จริงไว้ส่ง API
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string); // เก็บไว้โชว์หน้าเว็บ
      reader.readAsDataURL(file);
    }
  };

  // รับไฟล์วิดีโอ
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFileName(file.name);
      setVideoFile(file);
    }
  };

  // 🚀 ฟังก์ชันเริ่มภารกิจ (The Engine Room)
  const handleStartMission = async () => {
    // เซฟ Metadata พื้นฐาน
    localStorage.setItem("fod_mode", mode);
    localStorage.setItem("fod_threshold", threshold.toString());
    localStorage.setItem("fod_lat", lat);
    localStorage.setItem("fod_lon", lon);

    // 🟢 โหมด Camera: ไปหน้า Monitoring ได้เลยไม่ต้องรออะไร
    if (mode === "camera") {
      localStorage.removeItem("fod_result_image");
      localStorage.removeItem("fod_result_video_url");
      localStorage.removeItem("fod_result_logs");
      router.push("/monitoring");
      return;
    }

    // 🖼️ โหมด Image: ส่งไฟล์และค่า Threshold ไปรัน AI
    if (mode === "image") {
      if (!imageFile) return alert("Error! Please upload an image first.");

      setIsProcessing(true);
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("threshold", threshold.toString());
      formData.append("lat", lat); // 🚀 แนบพิกัดไปด้วย!
      formData.append("lon", lon);

      try {
        const endpoint = API_ENDPOINTS.PROCESS_IMAGE;
        const res = await apiFetch(endpoint, {
          method: "POST",
          body: formData
        });
        if (!res.ok) throw new Error("Image Processing Failed");
        const data = await res.json();

        // เซฟผลลัพธ์เพื่อเอาไปโชว์หน้าต่อไป
        localStorage.setItem("fod_result_image", data.processed_image);
        localStorage.setItem("fod_result_logs", JSON.stringify(data.detections));
        router.push("/monitoring");
      } catch (err) {
        console.error(err);
        alert("Image processing failed! Check server status.");
      } finally {
        setIsProcessing(false);
      }
    }

    // 🎬 โหมด Video: ส่งไฟล์และค่า Threshold ไปรัน AI
    else if (mode === "video") {
      if (!videoFile) return alert("Error! Please upload a video file first.");

      setIsProcessing(true);
      const formData = new FormData();
      formData.append("file", videoFile);
      formData.append("threshold", threshold.toString());
      formData.append("lat", lat); // 🚀 แนบพิกัดไปด้วย!
      formData.append("lon", lon);

      try {
        const endpoint = API_ENDPOINTS.PROCESS_VIDEO;
        const res = await apiFetch(endpoint, {
          method: "POST",
          body: formData
        });
        if (!res.ok) throw new Error("Video Processing Failed");
        const data = await res.json();

        // เซฟลิงก์วิดีโอใหม่และ Log
        // ใช้ video_filename จาก server + API_BASE_URL ของ frontend
        // เพื่อให้ URL ถูกต้องเสมอ ไม่ว่า backend จะรันอยู่ที่ไหน
        const videoUrl = `${API_BASE_URL}/temp_videos/${data.video_filename}`;
        localStorage.setItem("fod_result_video_url", videoUrl);
        localStorage.setItem("fod_result_logs", JSON.stringify(data.detections));
        router.push("/monitoring");
      } catch (err) {
        console.error(err);
        alert("Video processing failed! Check server status.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl">


        <div className="space-y-8">

          {/* 1. เลือกโหมด */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-300">1. Select Operation Mode</h2>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => setMode("camera")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mode === "camera" ? "border-blue-500 bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "border-gray-700 bg-gray-900 hover:border-gray-500"}`}>
                <span className="text-4xl">📹</span><span className="font-bold">Live Camera</span>
              </button>
              <button onClick={() => setMode("image")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mode === "image" ? "border-purple-500 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "border-gray-700 bg-gray-900 hover:border-gray-500"}`}>
                <span className="text-4xl">📁</span><span className="font-bold">Image</span>
              </button>
              <button onClick={() => setMode("video")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mode === "video" ? "border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "border-gray-700 bg-gray-900 hover:border-gray-500"}`}>
                <span className="text-4xl">🎞️</span><span className="font-bold">Video</span>
              </button>
            </div>
          </div>

          {/* 2. อัปโหลดรูป */}
          {mode === "image" && (
            <div className="p-6 bg-gray-900 rounded-xl border border-gray-700 animate-fade-in">
              <h2 className="text-xl font-semibold mb-4 text-purple-400">Upload Target Image</h2>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />

              {!imagePreview ? (
                <div onClick={() => fileInputRef.current?.click()} className="h-32 border-2 border-dashed border-gray-500 hover:border-purple-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-800/50 group gap-1">
                  <span className="text-3xl group-hover:scale-110 transition-transform">🖼️</span>
                  <span className="text-gray-400">Click here to upload image file</span>
                  <span className="text-xs text-gray-600 font-mono">.jpg  .jpeg  .png  .webp  .bmp</span>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-600">
                  <div className="flex items-center gap-4">
                    <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-lg object-cover border border-purple-500" />
                    <div>
                      <p className="font-bold text-purple-400 text-lg">Image ready for scanning!</p>
                      <p className="text-sm text-gray-400">{imageFile?.name}</p>
                      <p className="text-xs text-gray-500">Size: {imageFile && getFileSize(imageFile.size)}</p>
                    </div>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold disabled:opacity-50">🔄 Change Image</button>
                </div>
              )}
            </div>
          )}

          {/* 🚀 2.1 อัปโหลดวิดีโอ */}
          {mode === "video" && (
            <div className="p-6 bg-gray-900 rounded-xl border border-gray-700 animate-fade-in">
              <h2 className="text-xl font-semibold mb-4 text-green-400">Upload Target Video</h2>
              <input type="file" accept="video/mp4,video/x-m4v,video/*" className="hidden" ref={videoInputRef} onChange={handleVideoUpload} />

              {!videoFile ? (
                <div onClick={() => videoInputRef.current?.click()} className="h-32 border-2 border-dashed border-gray-500 hover:border-green-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-800/50 group">
                  <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📥</span>
                  <span className="text-gray-400">Click here to select video file (MP4)</span>
                </div>
              ) : (
                <div className="flex items-center gap-4 justify-between bg-gray-800 p-4 rounded-lg border border-gray-600">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">🎬</span>
                    <div>
                      <p className="font-bold text-green-400 text-lg">File ready for upload!</p>
                      <p className="text-sm text-gray-400">{videoFileName}</p>
                      <p className="text-xs text-gray-500">Size: {getFileSize(videoFile.size)}</p>
                    </div>
                  </div>
                  <button onClick={() => videoInputRef.current?.click()} disabled={isProcessing} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg transition-all font-bold">
                    🔄 Change File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Metadata (Threshold & พิกัด) */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-300">2. Mission Metadata Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-900 p-6 rounded-xl border border-gray-700">
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 text-sm font-bold text-blue-400">🎯 Sensitivity (Threshold: {threshold})</label>
                <input type="range" min="0.1" max="0.9" step="0.05" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} className="cursor-pointer accent-blue-500" disabled={isProcessing} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-gray-400 text-xs font-bold tracking-wider uppercase">Latitude</label>
                  {isGpsLoading && <span className="text-[10px] text-yellow-500 animate-pulse font-medium">⏳ Fetching...</span>}
                  {gpsStatus === "success" && <span className="text-[10px] text-green-400 font-medium flex items-center gap-1">✅ From GPS</span>}
                  {gpsStatus === "error" && <span className="text-[10px] text-red-500 font-medium cursor-pointer" onClick={requestGps}>❌ Failed (Retry)</span>}
                </div>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  disabled={isProcessing}
                  className={`bg-gray-800/50 border outline-none rounded-xl px-4 py-3 text-white transition-all duration-300 font-mono ${gpsStatus === 'success' ? 'border-green-500/50 ring-1 ring-green-500/20' : 'border-gray-700 focus:border-blue-500'}`}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-gray-400 text-xs font-bold tracking-wider uppercase">Longitude</label>
                  {isGpsLoading && <span className="text-[10px] text-yellow-500 animate-pulse font-medium">⏳ Fetching...</span>}
                  {gpsStatus === "success" && <span className="text-[10px] text-green-400 font-medium flex items-center gap-1">✅ From GPS</span>}
                  {gpsStatus === "error" && <span className="text-[10px] text-red-500 font-medium cursor-pointer" onClick={requestGps}>❌ Failed (Retry)</span>}
                </div>
                <input
                  type="text"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  disabled={isProcessing}
                  className={`bg-gray-800/50 border outline-none rounded-xl px-4 py-3 text-white transition-all duration-300 font-mono ${gpsStatus === 'success' ? 'border-green-500/50 ring-1 ring-green-500/20' : 'border-gray-700 focus:border-blue-500'}`}
                />
              </div>
            </div>
          </div>

          {/* ปุ่มยืนยัน (เปลี่ยนสถานะตาม isProcessing) */}
          <button
            onClick={handleStartMission}
            disabled={isProcessing || (mode === "video" && !videoFile) || (mode === "image" && !imageFile)}
            className={`w-full py-4 font-bold text-xl rounded-xl shadow-lg transition-all flex justify-center items-center gap-3 ${isProcessing
                ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transform hover:scale-[1.01]"
              }`}
          >
            {isProcessing ? (
              <>
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                {mode === "video" ? "Uploading & AI Processing (Please wait)..." : "AI Scanning Image..."}
              </>
            ) : (
              "🚀 Confirm & Start Monitoring"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}