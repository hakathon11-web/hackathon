/**
 * Structured Data (JSON-LD) utilities for SEO
 * Implements Schema.org types for rich search results
 */

interface VenueData {
  id: string;
  name: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  services?: string[];
}

interface ReviewData {
  author: string;
  rating: number;
  text: string;
  datePublished: string;
}

interface ServiceData {
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration?: number;
}

/**
 * Generate LocalBusiness structured data for a venue
 */
export const generateVenueStructuredData = (venue: VenueData, siteUrl: string, language: string = 'en') => {
  const baseData: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${siteUrl}/venue/${venue.id}`,
    name: venue.name,
    url: `${siteUrl}/venue/${venue.id}`,
    image: venue.images && venue.images.length > 0 
      ? venue.images.map(img => img.startsWith('http') ? img : `${siteUrl}${img}`)
      : [`${siteUrl}/favicon_logoai/android-chrome-512x512.png`],
    inLanguage: language === 'ka' ? 'ka' : 'en',
  };

  // Add description if available
  if (venue.description) {
    baseData.description = venue.description;
  }

  // Add address if available
  if (venue.address) {
    baseData.address = {
      '@type': 'PostalAddress',
      streetAddress: venue.address,
      addressCountry: 'GE',
    };
  }

  // Add geo coordinates if available
  if (venue.latitude && venue.longitude) {
    baseData.geo = {
      '@type': 'GeoCoordinates',
      latitude: venue.latitude,
      longitude: venue.longitude,
    };
  }

  // Add contact information
  if (venue.phone || venue.email) {
    baseData.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
    };
    if (venue.phone) baseData.contactPoint.telephone = venue.phone;
    if (venue.email) baseData.contactPoint.email = venue.email;
  }

  // Add aggregate rating if available
  if (venue.rating && venue.reviewCount) {
    baseData.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: venue.rating,
      reviewCount: venue.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Add price range if available
  if (venue.priceRange) {
    baseData.priceRange = venue.priceRange;
  }

  return baseData;
};

/**
 * Generate Review structured data
 */
export const generateReviewStructuredData = (
  review: ReviewData,
  venueName: string,
  venueId: string,
  siteUrl: string
) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'LocalBusiness',
      name: venueName,
      url: `${siteUrl}/venue/${venueId}`,
    },
    author: {
      '@type': 'Person',
      name: review.author,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.text,
    datePublished: review.datePublished,
  };
};

/**
 * Generate Service structured data
 */
export const generateServiceStructuredData = (
  service: ServiceData,
  venueName: string,
  venueId: string,
  siteUrl: string
) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: service.name,
    provider: {
      '@type': 'LocalBusiness',
      name: venueName,
      url: `${siteUrl}/venue/${venueId}`,
    },
    description: service.description,
    offers: {
      '@type': 'Offer',
      price: service.price,
      priceCurrency: service.currency,
    },
  };
};

/**
 * Generate Organization structured data for the website
 */
export const generateOrganizationStructuredData = (siteUrl: string, language: string = 'en') => {
  const descriptions = {
    en: 'Gaming venue booking platform in Georgia - Book console rooms, VR zones, PC gaming cafes and more',
    ka: 'სათამაშო ვენების დაჯავშნის პლატფორმა საქართველოში - დაჯავშნე კონსოლის ოთახები, VR ზონები, PC გეიმინგ კაფეები და სხვა'
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Dajavshne',
    alternateName: language === 'ka' ? 'დაჯავშნე' : 'Dajavshne',
    url: siteUrl,
    logo: `${siteUrl}/favicon_logoai/android-chrome-512x512.png`,
    description: descriptions[language as keyof typeof descriptions] || descriptions.en,
    sameAs: [
      // Add your social media profiles here
      'https://twitter.com/dajavshne',
      // 'https://facebook.com/dajavshne',
      // 'https://instagram.com/dajavshne',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['English', 'Georgian'],
    },
    inLanguage: language === 'ka' ? 'ka' : 'en',
  };
};

/**
 * Generate WebSite structured data with search action
 */
export const generateWebsiteStructuredData = (siteUrl: string, language: string = 'en') => {
  const names = {
    en: 'Dajavshne',
    ka: 'დაჯავშნე'
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: names[language as keyof typeof names] || names.en,
    alternateName: language === 'ka' ? 'Dajavshne' : 'დაჯავშნე',
    url: siteUrl,
    inLanguage: language === 'ka' ? 'ka' : 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
};

/**
 * Generate BreadcrumbList structured data
 */
export const generateBreadcrumbStructuredData = (
  items: Array<{ name: string; url: string }>,
  siteUrl: string
) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    })),
  };
};

/**
 * Generate ItemList structured data for search results
 */
export const generateSearchResultsStructuredData = (
  venues: Array<{ id: string; name: string; description?: string }>,
  siteUrl: string
) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: venues.map((venue, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'LocalBusiness',
        '@id': `${siteUrl}/venue/${venue.id}`,
        name: venue.name,
        url: `${siteUrl}/venue/${venue.id}`,
        description: venue.description,
      },
    })),
  };
};

