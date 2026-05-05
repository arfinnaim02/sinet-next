/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable the app directory for the latest Next.js routing features.
  experimental: {
    appDir: true,
  },
  // Images domains can be configured here if you pull remote images.
  images: {
    domains: [],
  },
};

module.exports = nextConfig;