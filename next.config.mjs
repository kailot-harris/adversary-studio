/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets other devices on the LAN hit the dev server without Next.js
  // rejecting the request as cross-origin.
  allowedDevOrigins: ["192.168.0.117"],
};

export default nextConfig;
