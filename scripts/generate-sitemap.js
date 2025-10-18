/**
 * Sitemap Generator Script
 * Generates sitemap.xml with all public URLs for SEO
 * Run with: node scripts/generate-sitemap.js
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_URL = process.env.VITE_SITE_URL || 'https://dajavshne.ge';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Format date for sitemap (YYYY-MM-DD)
 */
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Generate sitemap XML
 */
function generateSitemapXML(urls) {
  const urlTags = urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlTags}
</urlset>`;
}

/**
 * Main function to generate sitemap
 */
async function generateSitemap() {
  console.log('🚀 Starting sitemap generation...');
  
  const urls = [];
  const today = formatDate(new Date());

  // Add static pages (both English and Georgian versions)
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/search', priority: '1.0', changefreq: 'daily' },
    { path: '/about', priority: '0.6', changefreq: 'monthly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.4', changefreq: 'yearly' },
    { path: '/refund-policy', priority: '0.4', changefreq: 'yearly' },
    { path: '/service-description', priority: '0.4', changefreq: 'yearly' },
    { path: '/auth', priority: '0.5', changefreq: 'monthly' },
  ];

  // Add both English and Georgian versions of each page
  staticPages.forEach(page => {
    // Default version (Georgian - as per your i18n config)
    urls.push({
      loc: `${SITE_URL}${page.path}`,
      lastmod: today,
      changefreq: page.changefreq,
      priority: page.priority,
    });
    
    // English version
    urls.push({
      loc: `${SITE_URL}${page.path}?lang=en`,
      lastmod: today,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  });

  console.log(`✅ Added ${staticPages.length} static pages`);

  // Fetch all approved venues
  try {
    const { data: venues, error } = await supabase
      .from('venues')
      .select('id, updated_at')
      .eq('approval_status', 'approved')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching venues:', error);
      throw error;
    }

    if (venues && venues.length > 0) {
      venues.forEach(venue => {
        // Default version (Georgian)
        urls.push({
          loc: `${SITE_URL}/venue/${venue.id}`,
          lastmod: formatDate(venue.updated_at || today),
          changefreq: 'weekly',
          priority: '0.8',
        });
        
        // English version
        urls.push({
          loc: `${SITE_URL}/venue/${venue.id}?lang=en`,
          lastmod: formatDate(venue.updated_at || today),
          changefreq: 'weekly',
          priority: '0.8',
        });
      });
      console.log(`✅ Added ${venues.length * 2} venue pages (Georgian + English)`);
    } else {
      console.log('⚠️  No approved venues found');
    }
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }

  // Generate and write sitemap
  const sitemapXML = generateSitemapXML(urls);
  const publicDir = join(__dirname, '..', 'public');
  const distDir = join(__dirname, '..', 'dist');
  
  try {
    // Write to public directory (for dev)
    writeFileSync(join(publicDir, 'sitemap.xml'), sitemapXML);
    console.log('✅ Sitemap written to public/sitemap.xml');
    
    // Also write to dist directory if it exists (for production)
    try {
      writeFileSync(join(distDir, 'sitemap.xml'), sitemapXML);
      console.log('✅ Sitemap written to dist/sitemap.xml');
    } catch (e) {
      console.log('⚠️  dist directory not found, skipping');
    }
    
    console.log(`\n✨ Sitemap generated successfully with ${urls.length} URLs`);
    console.log(`📍 Site URL: ${SITE_URL}`);
    console.log(`📄 Sitemap URL: ${SITE_URL}/sitemap.xml\n`);
    
  } catch (error) {
    console.error('❌ Error writing sitemap:', error);
    process.exit(1);
  }
}

// Run the generator
generateSitemap().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

