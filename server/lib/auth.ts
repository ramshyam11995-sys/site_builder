import 'dotenv/config';
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";

const trustedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    // Production frontend
    "https://site-builder-4-9za6.onrender.com",
    ...(process.env.TRUSTED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) || []),
];

const authBaseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const isProduction = process.env.NODE_ENV === 'production';

// FIXED: Enable cross-site cookies if running in production across different Render URLs
const useCrossSiteCookies = true;

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    trustedOrigins,
    emailAndPassword: {
        enabled: true,
    },
    user: {
        deleteUser: { enabled: true }
    },
    baseURL: authBaseUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    advanced: {
        cookies: {
            session_token: {
                name: 'auth_session',
                attributes: {
                    httpOnly: true,
                    // Secure must be true for cross-site 'none' cookies to work
                    secure: useCrossSiteCookies, 
                    sameSite: useCrossSiteCookies ? 'none' : 'lax',
                    path: '/',
                },
            },
        },
    },
});
