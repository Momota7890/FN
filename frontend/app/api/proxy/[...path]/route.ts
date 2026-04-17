import { NextRequest, NextResponse } from "next/server";

const TARGET_URL = "https://d9da-2001-fb1-db-f5d8-e557-d75a-2824-319d.ngrok-free.app";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, await params);
}

export async function OPTIONS() {
  // สำคัญมาก: ตอบกลับ OPTIONS กลับเป็น 200 OK อัตโนมัติ เพื่อให้ Browser ผ่านตอนมันทำ Preflight
  // ไม่ต้องส่ง OPTIONS ต่อไปให้ Ngrok
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, ngrok-skip-browser-warning",
    },
  });
}

async function handleRequest(req: NextRequest, params: { path: string[] }) {
  try {
    const path = params.path.join("/");
    const url = new URL(req.url);
    const queryString = url.search;
    
    // ชี้เป้าไปที่ Backend Ngrok
    const target = `${TARGET_URL}/${path}${queryString}`;

    // ถ้าไม่ใช่ GET เราจะอ่าน body ออกมาเป็น blob / formdata
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        body = await req.formData();
      } else {
        body = await req.text();
      }
    }

    // สร้าง Header โดยจะแนบ ngrok bypass ไปด้วยเสมอ
    const headers = new Headers();
    headers.set("ngrok-skip-browser-warning", "skip");
    if (req.headers.has("content-type")) {
      headers.set("content-type", req.headers.get("content-type")!);
    }

    // ยิงไป Ngrok (Server-to-Server)
    const res = await fetch(target, {
      method: req.method,
      headers: headers,
      body: body as any, 
      cache: "no-store",
    });

    // ดึง body ออกจาก response
    const data = await res.arrayBuffer();

    return new NextResponse(data, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "*", // แปะ CORS header ด้วยเผื่อหน้าเว็บโวยวาย
      },
    });

  } catch (error: any) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ detail: "Proxy connection failed" }, { status: 504 });
  }
}
