# 🛸 FOD Runway Monitoring System (Pro Edition)

**Intelligent AI-Powered Foreign Object Debris (FOD) Detection, Analysis & Tracking System.**

This system provides a enterprise-grade solution for airport runway safety, combining real-time computer vision detection (YOLOv8) with advanced data analytics and spatial mapping to identify, log, and track potential hazards.

---

## ✨ Key Features

### 🖥️ Enterprise Dashboard
- **Total Detections (24h)**: Accurate server-side statistics with real-time trend analysis.
- **Top FOD Type KPI**: Instantly identify the most frequent hazard categories.
- **Visual Analytics**: Interactive bar charts and timeline area charts for detection distribution.
- **Intelligent Visual Map**: Topographic mapping with markers and a **high-vibrancy spectral heatmap** for density analysis.

### 🎥 Real-Time Monitoring
- **WebRTC Live Stream**: Low-latency video transmission directly to the browser.
- **AI-Overlay**: Real-time bounding box and classification display.
- **Smart Connection States**: Interactive UI feedback (Ready, Connecting, Live) for operator clarity.

### 📋 Data Management
- **Detailed Logs**: paginated detection history with class-specific color coding.
- **GPS Integration**: All detections are logged with precise coordinates for spatial tracking.
- **CSV Export**: Fully formatted history export including timestamps and classification for offline analysis.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (React 19), Tailwind CSS 4, Recharts, Leaflet, Framer Motion.
- **AI Service**: Python 3.10+, FastAPI, YOLOv8 (Ultralytics), aiortc (WebRTC), OpenCV.
- **Database**: PostgreSQL (High-performance event logging).

---

## 🚀 Installation & Setup

### 1. AI Service (Python Backend)
Requires Python 3.10+ and a CUDA-compatible GPU (recommended).

```bash
# Navigate to service directory
cd ai-service

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure .env (Root Directory)
# DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
# MODEL_PATH=model/best.pt
```

### 2. Frontend (Next.js)
Requires Node.js 18+.

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🔒 Security & Environment
- **Environment Variables**: Managed via `.env` in the root directory. Never commit this file.
- **Database**: Ensure PostgreSQL is running and accessible via the provided `DATABASE_URL`.

---

## 👨‍💻 Project Structure
- `/frontend`: User interface and data visualization.
- `/ai-service`: Computer vision engine and API layer.
- `/ai-service/model`: YOLOv8 weight files (.pt).
- `/ai-service/videorecord`: storage for analyzed video buffers.
