// Only applied for the GitHub Pages build (set by the deploy workflow) so
// local `next dev`/LAN testing still runs at the site root.
const isGithubPages = process.env.GITHUB_PAGES_BUILD === "true";
const repoName = "adversary-studio";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets other devices on the LAN hit the dev server without Next.js
  // rejecting the request as cross-origin.
  allowedDevOrigins: ["192.168.0.117"],
  ...(isGithubPages && {
    output: "export",
    basePath: `/${repoName}`,
    assetPrefix: `/${repoName}/`,
    trailingSlash: true,
  }),
};

export default nextConfig;
