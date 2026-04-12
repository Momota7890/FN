import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-2000"></div>

      <div className="z-10 text-center max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            FOD Runway
          </span>
          <br />
          Monitoring System
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed">
          Advanced AI-powered Foreign Object Debris (FOD) Detection & Analysis system.
          Powered by cutting-edge computer vision.
        </p>

        {/* ⚠️ อัปเกรดตรงนี้: ปุ่ม Get Started ปุ่มเดียว หล่อๆ! */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            🚀 Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}