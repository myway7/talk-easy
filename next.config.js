/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  distDir: "dist", //this line will tell the build to create a file with this name
};
module.exports = nextConfig;
