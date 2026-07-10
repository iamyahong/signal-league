import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

// Light, Edge-runtime-safe Auth.js instance — no PrismaAdapter, no bcrypt.
// Only used by src/middleware.ts to keep the Edge Function bundle small.
// It can decode the existing JWT session cookie (status/roles already
// baked into the token by the heavy auth.ts instance at sign-in time)
// but cannot query the database.
export const { auth } = NextAuth(authConfig);
