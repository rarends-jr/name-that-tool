import crypto from "crypto";
import { NextResponse } from "next/server";

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function getCookie(req: Request, name: string): string | undefined {
  const cookie = req.headers.get("cookie");
  if (!cookie) return undefined;
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : undefined;
}

export function setCookie(res: NextResponse, name: string, value: string) {
  res.headers.set("Set-Cookie", `${name}=${value}; Path=/; HttpOnly; SameSite=Strict`);
}

export function verifyCsrf(req: Request): boolean {
  const csrfCookie = getCookie(req, "csrfToken");
  const csrfHeader = req.headers.get("x-csrf-token");
  return Boolean(csrfCookie) && Boolean(csrfHeader) && csrfCookie === csrfHeader;
}
