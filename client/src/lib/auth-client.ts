import { createAuthClient } from "better-auth/react";

const backendAuthUrl =
  import.meta.env.VITE_BASEURL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: backendAuthUrl,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, useSession } = authClient;
