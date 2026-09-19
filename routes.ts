/**
 * An Array of routes that are accessible to the public
 * These routes do not require authentication
 * @type {string[]}
 */

export const publicRoutes: string[] = [
    "/", // landing page + the "How to use the editor" guide
]

/**
 * Everything not listed in publicRoutes/authRoutes requires authentication,
 * so /dashboard, /playground/* and the API routes stay protected by default.
 */

/**
 * An Array of routes that are accessible to the public
 * Routes that start with this (/api/auth) prefix do not require authentication
 * @type {string[]}
 */

export const authRoutes: string[] = [
    "/auth/sign-in",   // Added leading slash
   
]

/**
 * An Array of routes that are accessible to the public
 * Routes that start with this (/api/auth) prefix do not require authentication
 * @type {string}
 */

export const apiAuthPrefix: string = "/api/auth"

export const DEFAULT_LOGIN_REDIRECT = "/"; // Changed to redirect to home page after login