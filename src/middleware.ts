import { auth } from "@/lib/auth.edge";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/pricing", "/faq", "/login", "/signup", "/terms", "/privacy", "/score-policy", "/forgot-password"];
const PUBLIC_PREFIXES = ["/predictions", "/verify-email", "/reset-password"];
const AUTH_PATHS = ["/login", "/signup"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;

  if (
    path.startsWith("/auth/") ||
    path.startsWith("/internal/") ||
    path.startsWith("/_next/") ||
    path.startsWith("/_dev/")
  ) {
    return NextResponse.next();
  }

  const isPublic =
    PUBLIC_PATHS.some((p) => path === p) ||
    PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  const isAuthPath = AUTH_PATHS.includes(path);

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (session?.user) {
    const status = session.user.status;
    const roles = (session.user.roles as string[]) || [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");

    if (isAuthPath) {
      if (status === "PENDING_BETA") return NextResponse.redirect(new URL("/pending", nextUrl));
      if (status === "SUSPENDED") return NextResponse.redirect(new URL("/suspended", nextUrl));
      if (isAdmin) return NextResponse.redirect(new URL("/admin", nextUrl));
      return NextResponse.redirect(new URL("/home", nextUrl));
    }

    if (status === "SUSPENDED" && path !== "/suspended") {
      return NextResponse.redirect(new URL("/suspended", nextUrl));
    }

    if (status === "PENDING_BETA") {
      const pendingBlocked =
        path === "/home" ||
        path.startsWith("/me/") ||
        path === "/admin" ||
        path.startsWith("/admin/") ||
        path === "/predictions/new";
      if (pendingBlocked) return NextResponse.redirect(new URL("/pending", nextUrl));
    }

    if (path === "/pending" && status !== "PENDING_BETA") {
      if (isAdmin) return NextResponse.redirect(new URL("/admin", nextUrl));
      return NextResponse.redirect(new URL("/home", nextUrl));
    }

    if ((path === "/admin" || path.startsWith("/admin/")) && !isAdmin) {
      return NextResponse.redirect(new URL("/home", nextUrl));
    }

    if (path.startsWith("/me/") && status !== "BETA_ACTIVE" && status !== "ACTIVE") {
      if (status === "PENDING_BETA") return NextResponse.redirect(new URL("/pending", nextUrl));
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
