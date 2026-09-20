import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import type { NextAuthConfig } from "next-auth";

export default{
    // middleware.ts builds its own NextAuth() instance from this config,
    // separate from the one in auth.ts. Without trustHost here too, that
    // instance throws UntrustedHost on every request off localhost, which
    // aborts the middleware callback before it can redirect - failing OPEN
    // (every protected route becomes public) instead of closed.
    trustHost: true,
    providers:[
        Github({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
        }),
        Google({
            clientId: process.env.GOOGLE_ID!,
            clientSecret: process.env.GOOGLE_SECRET!,
        }),
    ]
}