import { createAuthClient } from "better-auth/react"

// Automatically fallback to local path with /api/auth included if environment variable isn't set
const backendAuthUrl = import.meta.env.VITE_BASEURL || 'http://localhost:3000/api/auth';

export const authClient = createAuthClient({
    baseURL: backendAuthUrl,
    fetchOptions: {
        credentials: 'include' // This is correct, keeps cookies flowing safely
    },
})

export const { signIn, signUp, useSession } = authClient;
