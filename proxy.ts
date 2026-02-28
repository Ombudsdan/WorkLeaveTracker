// Next.js 16 renamed the middleware file convention to "proxy".
// The exported function must be named "proxy" (or be a default export).
// See: https://nextjs.org/docs/messages/middleware-to-proxy
export { default as proxy } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
