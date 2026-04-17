import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 🔒 หน้าที่ต้องล็อกอินก่อนถึงจะเข้าได้
const protectedRoutes = ['/monitoring', '/dashboard', '/input'];

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. ถ้าพยายามเข้าหน้า Protected และไม่มี Token -> ดีดไปหน้า Login
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. ถ้ามี Token แล้วแต่อยากเข้าหน้า Login -> ดีดไปหน้า Setup (Input)
  if (pathname === '/login' && token) {
    const inputUrl = new URL('/input', request.url);
    return NextResponse.redirect(inputUrl);
  }

  return NextResponse.next();
}

// ตั้งค่า matcher เพื่อไม่ให้รัน proxy บนไฟล์รูปภาพหรือไฟล์ระบบอื่นๆ
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
