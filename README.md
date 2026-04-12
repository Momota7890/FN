# FOD Runway Monitoring System (AI-Powered)

Advanced AI-powered Foreign Object Debris (FOD) Detection & Analysis system for airport runways. Built with Next.js and FastAPI (Python), utilizing YOLOv8 for real-time computer vision.

## 🚀 Project Structure

- `/frontend`: Next.js application (React, Tailwind CSS, Recharts)
- `/ai-service`: Python FastAPI backend (YOLOv8, WebRTC, PostgreSQL)

---

## 🛠️ Requirements & Installation

### 1. AI Service (Backend)
Requires Python 3.10+ and a CUDA-compatible GPU (recommended: RTX 30-series or higher).

**Setup:**
1. Navigate to `ai-service/`.
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure `.env` in the project root:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/db
   SECRET_KEY=your_secret_key
   MODEL_PATH=model/best.pt
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend
Requires Node.js 18+ and npm/yarn.

**Setup:**
1. Navigate to `frontend/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 🔒 Security Note
The `.gitignore` file is configured to exclude sensitive files like `.env`, `node_modules/`, and `venv/`. **Do NOT commit the `.env` file to public repositories.**

## 📊 Analytics & Monitoring
- Real-time WebRTC streaming with AI overlay.
- Historical data logging to PostgreSQL.
- Interactive Dashboard using Recharts.
<a>
