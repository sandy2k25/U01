// This file provides additional configuration for Vercel deployments

module.exports = {
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // Configure headers for static files
  headers: async () => [
    {
      // Cache static assets for a year
      source: '/(assets|_next|static)/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      // Set security headers for all routes
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
      ],
    },
  ],

  // Vercel rewrites configuration to complement vercel.json
  rewrites: async () => [
    // Forward API and secure-player requests to the serverless function
    { source: '/api/:path*', destination: '/api' },
    { source: '/secure-player/:path*', destination: '/api' },
  ],
};