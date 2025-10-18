import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Content Security Policy - Restrict resource loading
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://api.stripe.com https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com wss://*.supabase.co; " +
    "frame-src 'self' https://js.stripe.com; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
  
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Referrer Policy - Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy - Control browser features
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  
  // Cross-Origin Embedder Policy (only in production)
  if (process.env.NODE_ENV === 'production') {
    // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); // Disabled - conflicts with Supabase storage
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
};

// Apply security headers to all routes
app.use(securityHeaders);

// Serve static files from the dist directory, but exclude index.html (we handle it dynamically)
app.use(express.static(join(__dirname, 'dist'), {
  index: false  // Don't serve index.html automatically - we handle it with env injection
}));

// Handle client-side routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  try {
    const indexPath = join(__dirname, 'dist', 'index.html');
    let indexContent = readFileSync(indexPath, 'utf8');
    
    // Collect VITE_* variables to expose to the client at runtime
    const runtimeEnv = Object.keys(process.env)
      .filter((key) => key.startsWith('VITE_'))
      .reduce((acc, key) => {
        acc[key] = process.env[key] || '';
        return acc;
      }, {});

    // Inject environment variables at runtime - place early in <head> to ensure availability
    const envScript = `<script>window.__ENV__ = ${JSON.stringify(runtimeEnv)};</script>`;
    
    // Inject the env script right after the opening <head> tag to load before modules
    indexContent = indexContent.replace('<head>', `<head>${envScript}`);
    
    res.send(indexContent);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
