/** @type {import('next').NextConfig} */
const nextConfig = {
  // הגדרות עבור Vercel
  experimental: {
    serverComponentsExternalPackages: ['openai']
  },
  

  
  // הגדרות תמונות מסופבייס
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // הגדרות Headers ו-CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ]
      }
    ]
  },
  
  // הגדרות אופטימיזציה
  swcMinify: true,
  
  // הגדרות output (אופציונלי - רק אם נחוץ)
  output: 'standalone',
}

module.exports = nextConfig 