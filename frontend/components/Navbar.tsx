"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { motion } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // 🚀 โหลดชื่อผู้ใช้จาก localStorage
    const savedUser = localStorage.getItem("username");
    if (savedUser) setUsername(savedUser);
  }, [pathname]);

  const handleSignout = () => {
    // 🧹 เคลียร์ทุกอย่างแล้วดีดออก!
    Cookies.remove("auth_token");
    localStorage.removeItem("username");
    localStorage.removeItem("fod_mode");
    localStorage.removeItem("fod_result_logs");
    router.push("/login");
    router.refresh(); // บังคับให้ Middleware ทำงานใหม่
  };

  // 🔒 ไม่โชว์ Navbar ในหน้า Login
  if (pathname === "/login") return null;

  const navLinks = [
    { name: "🏠 Home", path: "/" },
    { name: "⚙️ Setup", path: "/input" },
    { name: "📹 Monitoring", path: "/monitoring" },
    { name: "📊 Analytics", path: "/dashboard" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/40 backdrop-blur-md border-b border-white/10 px-6 py-3 flex justify-between items-center">
      
      {/* 🚀 Logo Section */}
      <div className="flex items-center gap-3">
        <Link href="/" className="text-xl font-black bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent hover:scale-105 transition-transform">
          FOD ENGINE
        </Link>
      </div>

      {/* 🔗 Main Navigation Links */}
      <div className="hidden md:flex items-center bg-slate-800/50 p-1 rounded-2xl border border-white/5">
        {navLinks.map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link key={link.path} href={link.path} className="relative px-4 py-2 text-sm font-bold transition-all">
              {isActive && (
                <motion.div 
                  layoutId="nav-glow"
                  className="absolute inset-0 bg-blue-500/10 rounded-xl" 
                />
              )}
              <span className={isActive ? "text-blue-400" : "text-slate-400 hover:text-white"}>
                {link.name}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 👤 User Section */}
      <div className="flex items-center gap-4">
        {username ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Operator</p>
              <p className="text-sm font-bold text-slate-200">{username}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold shadow-lg">
              {username.charAt(0).toUpperCase()}
            </div>
            <button 
              onClick={handleSignout} 
              className="ml-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg text-xs font-black uppercase tracking-wider border border-red-500/20 transition-all hover:scale-105"
            >
              Signout
            </button>
          </div>
        ) : (
          <Link href="/login" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
