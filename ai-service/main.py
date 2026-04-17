from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.media import MediaRelay
from aiortc.rtcrtpsender import RTCRtpSender
from ultralytics import YOLO
import time
import av
import json
import uuid
import cv2
import re
import os
import shutil
import base64
import numpy as np
import imageio
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from contextlib import asynccontextmanager
import asyncpg
from dotenv import load_dotenv
import asyncio

# 🚀 โหลดค่าจากไฟล์ .env
load_dotenv(dotenv_path="../.env")



# ---------------------------------------------------------
# 🗄️ ตั้งค่าระบบ (จาก .env)
# ---------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://fod_user:fod_password@localhost:5433/fod_database")
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key_please_use_env")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
MODEL_PATH = os.getenv("MODEL_PATH", "model/best.pt")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ฟังก์ชันนี้จะรันอัตโนมัติตอนเปิดรัน uvicorn
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. เชื่อมต่อฐานข้อมูล
    try:
        app.state.db_pool = await asyncpg.create_pool(DATABASE_URL, timeout=10)
        
        # 2. สร้างตารางถ้ายังไม่มี
        async with app.state.db_pool.acquire() as connection:
            await connection.execute('''
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    class_name VARCHAR(50) NOT NULL,
                    confidence REAL NOT NULL,
                    lat DOUBLE PRECISION,
                    lon DOUBLE PRECISION,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            ''')
        print("✅ Database connection and table setup successful!")
    except Exception as e:
        print(f"❌ Critical Error: Unable to connect to database! ({e})")
        app.state.db_pool = None
    
    yield # ปล่อยให้ Server รันต่อไป
    
    # 3. ปิดการเชื่อมต่อตอนปิด Server
    if app.state.db_pool:
        await app.state.db_pool.close()

app = FastAPI(lifespan=lifespan)

# ==========================================
# 🗂️ จัดการโฟลเดอร์แบบ "ไม่เก็บขยะ" (เซฟเฉพาะโหมดกล้อง)
# ==========================================
RECORD_DIR = "videorecord"           # เก็บไฟล์จากกล้องสด (ถาวร)
TEMP_DIR = "temp_workspace"          # พื้นที่ทำงานชั่วคราวสำหรับโหมด Video

os.makedirs(RECORD_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# เปิดทางให้เบราว์เซอร์เข้ามาดึงวิดีโอชั่วคราวไปกด Play ได้
app.mount("/temp_videos", StaticFiles(directory=TEMP_DIR), name="temp_videos")

# 🚀 🚀 วางฟังก์ชันภารโรงตรงนี้เลย! 🚀 🚀
def cleanup_temp_folder():
    now = time.time()
    for filename in os.listdir(TEMP_DIR):
        file_path = os.path.join(TEMP_DIR, filename)
        # ถ้าไฟล์นี้ถูกสร้างมานานกว่า 3600 วินาที (1 ชั่วโมง) ให้ลบทิ้ง
        if os.stat(file_path).st_mtime < now - 3600:
            try:
                os.remove(file_path)
                print(f"🧹 Cleanup: Removed old temporary file: {filename}")
            except Exception as e:
                print(f"⚠️ Cleanup: Failed to remove file {filename}: {e}")

# ✅ กำหนด allowed origins จาก env หรือใช้ค่า default สำหรับ local dev
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
print(f"Loading model from {MODEL_PATH}...")
try:
    import torch
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    model = YOLO(MODEL_PATH)
    model.to(device)
    print(f"🔥 Load complete! AI running on: {model.device}")
except Exception as e:
    print(f"❌ Failed to load AI model: {e}")
    model = None

# 🚀 ฟังก์ชันช่วยบันทึกลง Database
async def save_event_to_db(pool, class_name, confidence, lat=0.0, lon=0.0):
    try:
        async with pool.acquire() as connection:
            await connection.execute('''
                INSERT INTO events (class_name, confidence, lat, lon) 
                VALUES ($1, $2, $3, $4)
            ''', class_name, confidence, lat, lon)
            print(f"📦 Saved detection to DB: {class_name} ({confidence}%) at ({lat}, {lon})")
    except Exception as e:
        print(f"❌ Error saving to DB: {e}")

relay = MediaRelay()

# ==========================================
# 🟢 ระบบที่ 1: โหมด Camera (Real-time WebRTC)
# ==========================================
class VideoTransformTrack(VideoStreamTrack):
    # 🚀 เพิ่มการรับค่า pool, track, pc, record_path, threshold และ lat/lon
    def __init__(self, track, pc, record_path, threshold=0.565, pool=None, lat=0.0, lon=0.0):
        super().__init__()
        self.track = track
        self.pc = pc
        self.threshold = threshold 
        self.pool = pool
        self.lat = lat
        self.lon = lon
        self.last_saved = {} # เก็บเวลาที่บันทึกล่าสุด {track_id: timestamp}
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.out = cv2.VideoWriter(record_path, fourcc, 30.0, (1280, 720))

    async def recv(self):
        frame = await self.track.recv()
        img = frame.to_ndarray(format="bgr24")

        start_time = time.time()
        # 🚀 ใช้ค่า self.threshold ที่ส่งมาจากหน้าเว็บ
        results = model.track(source=img, conf=self.threshold, persist=True, tracker="bytetrack.yaml", verbose=False, device=0)
        annotated_img = results[0].plot()
        process_time = time.time() - start_time
        current_fps = int(1.0 / process_time) if process_time > 0 else 0

        detections = []
        if len(results[0].boxes) > 0:
            for box in results[0].boxes:
                class_id = int(box.cls[0])
                class_name = model.names[class_id]
                confidence = float(box.conf[0])
                track_id = int(box.id[0]) if box.id is not None else -1 
                
                detections.append({
                    "id": track_id,
                    "class_name": class_name, 
                    "confidence": round(confidence * 100, 2)
                })

                # 🚀 ตรวจสอบคูลดาวน์ 10 วินาทีก่อนบันทึก
                current_time = time.time()
                if track_id != -1:
                    last_time = self.last_saved.get(track_id, 0)
                    if current_time - last_time > 10:
                        if self.pool:
                            # ใช้ create_task เพื่อไม่ให้บล็อกเฟรมวิดีโอ
                            asyncio.create_task(save_event_to_db(self.pool, class_name, confidence * 100, self.lat, self.lon))
                            self.last_saved[track_id] = current_time

        if hasattr(self.pc, "data_channel") and self.pc.data_channel.readyState == "open":
            self.pc.data_channel.send(json.dumps({
                "detections": detections,
                "fps": current_fps,
                "timestamp": time.time() # 🚀 ส่งเวลาไปวัด Latency
            }))

        annotated_img = cv2.resize(annotated_img, (1280, 720), interpolation=cv2.INTER_CUBIC)

        if self.out.isOpened():
            self.out.write(annotated_img)

        new_frame = av.VideoFrame.from_ndarray(annotated_img, format="bgr24")
        new_frame.pts = frame.pts
        new_frame.time_base = frame.time_base
        return new_frame

pcs = set()

@app.post("/offer")
async def offer(request: Request):
    params = await request.json()
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])
    
    # 🚀 ดึงค่า threshold, lat, lon ออกมาจาก JSON
    threshold = float(params.get("threshold", 0.5))
    lat = float(params.get("lat", 0.0))
    lon = float(params.get("lon", 0.0))

    pc = RTCPeerConnection()
    pcs.add(pc)

    capabilities = RTCRtpSender.getCapabilities("video")
    h264_preferences = [codec for codec in capabilities.codecs if codec.name == "H264"]
    for t in pc.getTransceivers():
        if t.kind == "video":
            t.setCodecPreferences(h264_preferences)

    @pc.on("datachannel")
    def on_datachannel(channel):
        pc.data_channel = channel 

    @pc.on("track")
    def on_track(track):
        if track.kind == "video":
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            filename = os.path.join(RECORD_DIR, f"record-{timestamp}.mp4")
            # 🚀 ส่งค่า threshold และ metadata อื่นๆ เข้าไปด้วย
            local_video = VideoTransformTrack(relay.subscribe(track), pc, filename, threshold, request.app.state.db_pool, lat, lon)
            pc.addTrack(local_video)
            pc.local_video_track = local_video

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        if pc.connectionState == "failed" or pc.connectionState == "closed":
            if hasattr(pc, "local_video_track") and pc.local_video_track.out:
                pc.local_video_track.out.release()
            pcs.discard(pc)

    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    new_sdp = re.sub(r'(m=video.*\r\n)', r'\1b=AS:10000\r\n', answer.sdp)
    answer = RTCSessionDescription(sdp=new_sdp, type=answer.type)
    await pc.setLocalDescription(answer)

    return {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}


# ==========================================
# 🚀 ระบบที่ 2: โหมด Video (แก้จอดำด้วย imageio)
# ==========================================
def _process_video_sync(temp_input: str, temp_output: str, threshold: float) -> dict:
    """Synchronous video processing — runs in thread executor to avoid blocking the async event loop"""
    import subprocess

    cap = cv2.VideoCapture(temp_input)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0 or fps != fps:
        fps = 30.0

    # Pass 1: เขียน video ดิบ (moov อยู่ท้ายไฟล์ปกติ)
    raw_output = temp_output.replace('.mp4', '_raw.mp4')
    writer = imageio.get_writer(raw_output, fps=fps, codec='libx264')
    unique_detections = {}

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # ✅ ใช้ model.track() + ByteTrack (ต้องใช้ lapx แทน lap เพื่อหลีกเลี่ยง WDAC)
        results = model.track(source=frame, conf=threshold, persist=True, tracker="bytetrack.yaml", verbose=False, device=0)
        annotated_frame = results[0].plot()

        if len(results[0].boxes) > 0:
            for box in results[0].boxes:
                class_name = model.names[int(box.cls[0])]
                conf = float(box.conf[0])

                if box.id is not None:
                    track_id = int(box.id[0])
                    key = f"{class_name}_{track_id}"

                    if key not in unique_detections or conf > unique_detections[key]["confidence"]:
                        unique_detections[key] = {
                            "id": track_id,
                            "class_name": class_name,
                            "confidence": round(conf * 100, 2)
                        }

        annotated_frame = cv2.resize(annotated_frame, (1280, 720), interpolation=cv2.INTER_CUBIC)
        rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
        writer.append_data(rgb_frame)

    cap.release()
    writer.close()

    # Pass 2: Remux ด้วย +faststart ให้ moov อยู่ต้นไฟล์ → browser เล่นได้ทันทีแบบ stream
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run(
            [ffmpeg_exe, '-i', raw_output, '-c', 'copy', '-movflags', '+faststart', '-y', temp_output],
            check=True, capture_output=True
        )
        print(f"✅ Video remuxed with faststart: {temp_output}")
    except Exception as e:
        print(f"⚠️ faststart remux failed ({e}) — using raw output")
        shutil.move(raw_output, temp_output)
    finally:
        if os.path.exists(raw_output):
            os.remove(raw_output)

    return unique_detections


@app.post("/process-video")
async def process_video(request: Request, file: UploadFile = File(...), threshold: float = Form(0.5), lat: float = Form(0.0), lon: float = Form(0.0)):
    cleanup_temp_folder()
    print(f"🎬 Received video: {file.filename} (Threshold: {threshold}) Processing...")

    temp_input = os.path.join(TEMP_DIR, f"in_{uuid.uuid4().hex[:8]}.mp4")
    output_name = f"out_{uuid.uuid4().hex[:8]}.mp4"
    temp_output = os.path.join(TEMP_DIR, output_name)

    with open(temp_input, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 🚀 รัน video processing ใน thread pool — ไม่บล็อก async event loop
    loop = asyncio.get_event_loop()
    unique_detections = await loop.run_in_executor(None, _process_video_sync, temp_input, temp_output, threshold)

    # บันทึกผลลัพธ์ลง Database
    pool = request.app.state.db_pool
    for det in unique_detections.values():
        await save_event_to_db(pool, det["class_name"], det["confidence"], lat, lon)

    if os.path.exists(temp_input):
        os.remove(temp_input)

    base_url = str(request.base_url).rstrip("/")
    return {
        "video_url": f"{base_url}/temp_videos/{output_name}",
        "video_filename": output_name,
        "detections": list(unique_detections.values())
    }

# ==========================================
# 🖼️ ระบบที่ 3: โหมด Image (ประมวลผลบน RAM ล้วนๆ)
# ==========================================
@app.post("/process-image")
async def process_image(request: Request, file: UploadFile = File(...), threshold: float = Form(0.5), lat: float = Form(0.0), lon: float = Form(0.0)): # 🚀 รับค่า Threshold, lat, lon
    print(f"🖼️ Received image: {file.filename} (Threshold: {threshold}) Scanning...")
    
    # อ่านไฟล์ภาพเข้า RAM ตรงๆ ไม่ต้องเซฟลงดิสก์
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        return {"error": "Unable to read image file"}

    # 🚀 โยน threshold เข้าไปให้ AI
    results = model.predict(source=img, conf=threshold, verbose=False, device=0)
    annotated_img = results[0].plot()

    # 🚀 ใช้ enumerate เพื่อนับลำดับวัตถุจำลองเป็น ID
    detections = []
    if len(results[0].boxes) > 0:
        for index, box in enumerate(results[0].boxes): # ใส่ enumerate เข้ามา
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            confidence = float(box.conf[0])
            
            detections.append({
                "id": index + 1, # 🚀 จำลอง ID เป็น 1, 2, 3... แทนที่จะเป็น -1
                "class_name": class_name, 
                "confidence": round(confidence * 100, 2)
            })

    # แปลงกลับเป็น Base64 ส่งให้เว็บเลย (ไม่มีไฟล์ตกค้าง 100%)
    _, buffer = cv2.imencode('.jpg', annotated_img)
    encoded_result = base64.b64encode(buffer).decode('utf-8')
    result_base64 = f"data:image/jpeg;base64,{encoded_result}"

    # 🚀 บันทึกผลลัพธ์ลง Database
    pool = request.app.state.db_pool
    for det in detections:
        await save_event_to_db(pool, det["class_name"], det["confidence"], lat, lon)

    return {
        "processed_image": result_base64,
        "detections": detections
    }

# ---------------------------------------------------------
# 🚀 API สำหรับ Database (แทนที่ Rust)
# ---------------------------------------------------------

# โครงสร้างข้อมูลที่หน้าเว็บจะส่งมา
class EventPayload(BaseModel):
    class_name: str
    confidence: float
    lat: float = 0.0
    lon: float = 0.0

@app.post("/api/events")
async def create_event(payload: EventPayload, request: Request):
    pool = request.app.state.db_pool
    if not pool:
        return {"error": "Database not connected"}
    async with pool.acquire() as connection:
        await connection.execute('''
            INSERT INTO events (class_name, confidence, lat, lon) 
            VALUES ($1, $2, $3, $4)
        ''', payload.class_name, payload.confidence, payload.lat, payload.lon)
    return {"message": "Event saved"}

@app.get("/api/stats")
async def get_stats(request: Request):
    pool = request.app.state.db_pool
    if not pool:
        return {"total_24h": 0, "trend": 0, "avg_confidence": "0.0", "top_type": "N/A"}
    
    async with pool.acquire() as connection:
        # 1. Total 24h
        total_24h = await connection.fetchval('''
            SELECT count(*) FROM events WHERE created_at >= NOW() - INTERVAL '24 hours'
        ''')
        
        # 2. Previous 24h (for trend)
        total_prev_24h = await connection.fetchval('''
            SELECT count(*) FROM events 
            WHERE created_at >= NOW() - INTERVAL '48 hours' 
            AND created_at < NOW() - INTERVAL '24 hours'
        ''')
        
        trend = 0
        if total_prev_24h > 0:
            trend = int(((total_24h - total_prev_24h) / total_prev_24h) * 100)
        elif total_24h > 0:
            trend = 100
            
        # 3. Avg Confidence (24h)
        avg_conf = await connection.fetchval('''
            SELECT AVG(confidence) FROM events WHERE created_at >= NOW() - INTERVAL '24 hours'
        ''')
        
        # 4. Top Type (24h)
        top_type = await connection.fetchval('''
            SELECT class_name FROM events 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY class_name ORDER BY count(*) DESC LIMIT 1
        ''')

        return {
            "total_24h": total_24h or 0,
            "trend": trend,
            "avg_confidence": f"{float(avg_conf or 0):.1f}",
            "top_type": top_type or "N/A"
        }

@app.get("/api/events")
async def get_events(request: Request):
    pool = request.app.state.db_pool
    if not pool:
        return []
    async with pool.acquire() as connection:
        # ดึงประวัติทั้งหมด (ไม่จำกัด 50 อีกต่อไป)
        rows = await connection.fetch('''
            SELECT id, class_name, confidence, lat, lon, created_at 
            FROM events ORDER BY created_at DESC
        ''')
        
        events = []
        for row in rows:
            # 🚀 ปรับเวลาระบบจาก UTC เป็นเวลาประเทศไทย (GMT+7)
            local_time = row["created_at"] + timedelta(hours=7)
            events.append({
                "id": row["id"],
                "class_name": row["class_name"],
                "confidence": row["confidence"],
                "lat": row["lat"],
                "lon": row["lon"],
                "created_at": local_time.strftime("%Y-%m-%d %H:%M:%S")
            })
        return events

# ---------------------------------------------------------
# 🔑 Auth API (ระบบสมาชิก)
# ---------------------------------------------------------

class AuthPayload(BaseModel):
    username: str
    password: str

@app.post("/api/auth/register")
async def register(payload: AuthPayload, request: Request):
    pool = request.app.state.db_pool
    if not pool:
        return {"error": "Database not connected"}
    hashed_pw = get_password_hash(payload.password)
    
    try:
        async with pool.acquire() as connection:
            await connection.execute('''
                INSERT INTO users (username, password_hash) VALUES ($1, $2)
            ''', payload.username, hashed_pw)
        return {"message": "Registration successful!"}
    except Exception as e:
        return {"error": "Username already exists or database error"}

@app.post("/api/auth/login")
async def login(payload: AuthPayload, request: Request):
    pool = request.app.state.db_pool
    if not pool:
        return JSONResponse(status_code=503, content={"error": "Database not connected"})
    async with pool.acquire() as connection:
        user = await connection.fetchrow('SELECT * FROM users WHERE username = $1', payload.username)

        if not user or not verify_password(payload.password, user["password_hash"]):
            return JSONResponse(status_code=401, content={"error": "Invalid username or password"})

        token = create_access_token(data={"sub": user["username"]})
        return {
            "message": "Login successful!",
            "token": token,
            "username": user["username"]
        }