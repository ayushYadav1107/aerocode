import NextAuth from "next-auth";

import authConfig from "./auth.config";
import { apiAuthPrefix, authRoutes, DEFAULT_LOGIN_REDIRECT, publicRoutes } from "./routes";


const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;

    const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);

    const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

    const isAuthRoute = authRoutes.includes(nextUrl.pathname);

    if (isApiAuthRoute) {
        return null;
    }

    if (isAuthRoute) {
        if (isLoggedIn) {
            return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
        }

        return null;
    }
    if (!isLoggedIn && !isPublicRoute) {
        return Response.redirect(new URL("/auth/sign-in", nextUrl));
    }
    return null; 
})

export const config = {
    // /api/auth/* is excluded here (not just via the isApiAuthRoute check
    // above): running the auth() wrapper on Auth.js's own routes means two
    // separate NextAuth engines process the same request, which throws
    // "UnknownAction: Only GET and POST requests are supported" in production.
    matcher: [
        "/((?!api|_next|.+\\.[\\w]+$).*)",
        "/api/((?!auth).*)",
        "/trpc/(.*)",
    ],
};