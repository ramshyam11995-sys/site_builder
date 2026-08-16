import 'dotenv/config';
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";

const trustedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(process.env.TRUSTED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) || []),
];

const authBaseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const isLocalDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const shouldUseCrossSiteSessionCookie = isLocalDevelopment && authBaseUrl.includes('localhost');

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    trustedOrigins,
    emailAndPassword: {
        enabled: true,
    },
    user: {
        deleteUser: {enabled: true}
    },
    baseURL: authBaseUrl,
    secret: process.env.BETTER_AUTH_SECRET!,
    advanced: {
        cookies: {
            session_token: {
                name: 'auth_session',
                attributes: {
                    httpOnly: true,
                    secure: shouldUseCrossSiteSessionCookie || process.env.NODE_ENV === 'production',
                    sameSite: shouldUseCrossSiteSessionCookie ? 'none' : 'lax',
                    path: '/',
                },
            },
        },
    },
});