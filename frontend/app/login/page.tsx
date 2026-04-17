"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import { API_ENDPOINTS, apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🚀 ฟังก์ชัน Auth (Login / Register)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isLogin ? API_ENDPOINTS.LOGIN : API_ENDPOINTS.REGISTER;
    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        if (isLogin) {
          // 🍪 เซฟ Token ลง Cookie (อยู่ได้ 1 วัน)
          Cookies.set("auth_token", data.token, { expires: 1 });
          localStorage.setItem("username", data.username);
          router.push("/input");
          router.refresh(); // บังคับให้ Middleware ตรวจสอบใหม่
        } else {
          // ถ้าสมัครสำเร็จ สลับไปหน้า Login ทันที
          alert("Registration successful! Please sign in.");
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 overflow-hidden relative">
      
      {/* 🌌 Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
              FOD RUNWAY
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">
              AI Monitoring System
            </p>
          </div>

          <div className="flex bg-slate-900/50 p-1 rounded-2xl mb-8 border border-slate-700/50">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${isLogin ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white"}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${!isLogin ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-400 hover:text-white"}`}
            >
              Register
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form 
              key={isLogin ? "login" : "register"}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              onSubmit={handleAuth}
              className="space-y-5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Username</label>
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 focus:border-blue-500 outline-none rounded-2xl px-4 py-3 text-white transition-all duration-300"
                  placeholder="Enter username..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 focus:border-blue-500 outline-none rounded-2xl px-4 py-3 text-white transition-all duration-300"
                  placeholder="Enter password..."
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs font-bold text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                  ⚠️ {error}
                </motion.p>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all transform active:scale-95 flex justify-center items-center gap-3 ${
                  isLogin 
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-600/20" 
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-600/20"
                } text-white shadow-xl disabled:opacity-50`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  isLogin ? "Sign In" : "Register Now"
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="mt-8 text-center border-t border-slate-700/50 pt-6">
            <Link href="/" className="text-slate-500 hover:text-slate-300 text-xs font-bold tracking-widest uppercase transition-colors">
              ⬅️ Back to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
