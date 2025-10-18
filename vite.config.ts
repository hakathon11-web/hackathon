import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Content Security Policy - Restrict resource loading
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://api.stripe.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com wss://*.supabase.co; frame-src 'self' https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self';",
      
      // Prevent clickjacking attacks
      'X-Frame-Options': 'DENY',
      
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Enable XSS protection
      'X-XSS-Protection': '1; mode=block',
      
      // Strict Transport Security (only in production)
      ...(mode === 'production' && {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      }),
      
      // Referrer Policy - Control referrer information
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions Policy - Control browser features
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
      
      // Cross-Origin Embedder Policy (only in production)
      ...(mode === 'production' && {
        // 'Cross-Origin-Embedder-Policy': 'require-corp' // Disabled - conflicts with Supabase storage
      }),
      
      // Cross-Origin Opener Policy (only in production or localhost)
      ...(mode === 'production' && {
        'Cross-Origin-Opener-Policy': 'same-origin'
      }),
      
      // Cross-Origin Resource Policy (only in production)
      ...(mode === 'production' && {
        'Cross-Origin-Resource-Policy': 'cross-origin'
      })
    }
  },
  preview: {
    host: true,
    port: 8080,
    allowedHosts: [
      'qmffekryff.us-east-1.awsapprunner.com',
      'localhost',
      '127.0.0.1'
    ]
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
