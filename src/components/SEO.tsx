import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

export interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogType?: 'website' | 'article' | 'business.business';
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  noindex?: boolean;
  nofollow?: boolean;
  structuredData?: Record<string, any> | Record<string, any>[];
  keywords?: string[];
}

/**
 * SEO Component - Manages all meta tags, Open Graph, Twitter Cards, and structured data
 * Follows modern SEO best practices with proper fallbacks
 */
const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage,
  ogImageAlt,
  twitterCard = 'summary_large_image',
  noindex = false,
  nofollow = false,
  structuredData,
  keywords = [],
}) => {
  const { i18n } = useTranslation();
  
  // Default values
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://dajavshne.ge';
  const defaultTitle = 'Dajavshne - Book Gaming Venues in Georgia';
  const defaultDescription = 'Discover and book amazing gaming venues in Georgia - Console rooms, VR zones, PC gaming cafes, PlayStation rooms and more. Easy online booking with instant confirmation.';
  const defaultImage = `${siteUrl}/favicon_logoai/android-chrome-512x512.png`;
  
  const finalTitle = title || defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalCanonical = canonical || (typeof window !== 'undefined' ? window.location.href.split('?')[0] : siteUrl);
  const finalImage = ogImage || defaultImage;
  const finalImageAlt = ogImageAlt || 'Dajavshne - Gaming Venue Booking Platform';
  
  // Construct robots meta
  const robotsContent = [];
  if (noindex) robotsContent.push('noindex');
  if (nofollow) robotsContent.push('nofollow');
  if (!noindex && !nofollow) robotsContent.push('index', 'follow');
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <html lang={i18n.language} />
      <title>{finalTitle}</title>
      <meta name="title" content={finalTitle} />
      <meta name="description" content={finalDescription} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      
      {/* Language and Hreflang Tags */}
      <link rel="alternate" hrefLang="ka" href={finalCanonical.replace(/\/en\//, '/').replace(/\/ka\//, '/')} />
      <link rel="alternate" hrefLang="en" href={finalCanonical.replace(/\/ka\//, '/').replace(/\/en\//, '/')} />
      <link rel="alternate" hrefLang="x-default" href={finalCanonical.replace(/\/ka\//, '/').replace(/\/en\//, '/')} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonical} />
      
      {/* Robots */}
      <meta name="robots" content={robotsContent.join(', ')} />
      <meta name="googlebot" content={robotsContent.join(', ')} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={finalCanonical} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:alt" content={finalImageAlt} />
      <meta property="og:locale" content={i18n.language === 'ka' ? 'ka_GE' : 'en_US'} />
      <meta property="og:site_name" content="Dajavshne" />
      
      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={finalCanonical} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      <meta name="twitter:image:alt" content={finalImageAlt} />
      <meta name="twitter:site" content="@dajavshne" />
      
      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(structuredData) 
              ? { '@graph': structuredData }
              : structuredData
          )}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;

