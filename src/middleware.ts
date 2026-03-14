import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"];
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-request-id", requestId);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const code = request.nextUrl.searchParams.get("code");

  const logRequest = (status?: number) => {
    logger.info("request", {
      request_id: requestId,
      method,
      path: pathname,
      duration_ms: Date.now() - start,
      ...(status !== undefined && { status }),
    });
  };

  // Password reset (and other auth) links often land at /?code=... — send to reset-password
  if (pathname === "/" && code) {
    const resetUrl = new URL("/reset-password", request.url);
    resetUrl.searchParams.set("code", code);
    const res = NextResponse.redirect(resetUrl);
    res.headers.set("x-request-id", requestId);
    logRequest(302);
    return res;
  }

  if (user && pathname === "/") {
    const res = NextResponse.redirect(new URL("/chat", request.url));
    res.headers.set("x-request-id", requestId);
    logRequest(302);
    return res;
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const res = NextResponse.redirect(new URL("/chat", request.url));
    res.headers.set("x-request-id", requestId);
    logRequest(302);
    return res;
  }

  if (!user && !PUBLIC_ROUTES.includes(pathname) && !pathname.startsWith("/join")) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.headers.set("x-request-id", requestId);
    logRequest(302);
    return res;
  }

  logRequest();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
