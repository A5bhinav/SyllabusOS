/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add empty turbopack config to silence warning (we're using webpack for pdf-parse compatibility)
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude canvas and jsdom from server bundle (pdf-parse doesn't need them for text extraction)
      // Also mark pdf-parse as external to avoid webpack bundling issues
      config.externals = [
        ...(config.externals || []), 
        'canvas', 
        'jsdom',
        'pdf-parse',
      ]
      
      // Suppress warnings about missing optional dependencies
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        jsdom: false,
        encoding: false,
      }
      
      // Suppress warnings about browser APIs that pdf-parse doesn't actually need
      const originalWarningsFilter = config.ignoreWarnings
      config.ignoreWarnings = [
        ...(Array.isArray(originalWarningsFilter) ? originalWarningsFilter : []),
        { module: /node_modules\/pdf-parse/ },
        { file: /node_modules\/pdf-parse/ },
        /DOMMatrix/,
        /ImageData/,
        /Path2D/,
        /Cannot polyfill/,
      ]
    }
    
    return config
  },
}

module.exports = nextConfig

