import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface EnhancedSeoProps {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  structuredData?: Record<string, any>;
  robots?: string;
  author?: string;
  locale?: string;
  siteName?: string;
}

const EnhancedSeo: React.FC<EnhancedSeoProps> = ({
  title,
  description,
  keywords = ['drawing game', 'mobile game', 'sketch', 'multiplayer', 'art', 'creativity'],
  canonicalUrl,
  ogType = 'website',
  ogImage = '/og-image.jpg',
  twitterCard = 'summary_large_image',
  structuredData,
  robots = 'index, follow',
  author = 'SketchyAF Team',
  locale = 'en_US',
  siteName = 'SketchyAF',
}) => {
  const location = useLocation();
  
  // Generate full title with site name
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  
  // Generate canonical URL if not provided
  const baseUrl = process.env.VITE_SITE_URL || 'https://sketchyaf.com';
  const currentUrl = canonicalUrl || `${baseUrl}${location.pathname}`;
  
  // Generate structured data for the organization
  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    description: 'The wildly entertaining drawing game perfect for killing time anywhere',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      'https://twitter.com/sketchyaf',
      'https://facebook.com/sketchyaf',
      'https://instagram.com/sketchyaf',
    ],
  };

  // Merge custom structured data with defaults
  const mergedStructuredData = structuredData 
    ? { ...defaultStructuredData, ...structuredData }
    : defaultStructuredData;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content={author} />
      <meta name="robots" content={robots} />
      <meta name="language" content={locale.split('_')[0]} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={currentUrl} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:locale" content={locale} />
      {ogImage && <meta property="og:image" content={ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`} />}
      {ogImage && <meta property="og:image:alt" content={title} />}
      {ogImage && <meta property="og:image:width" content="1200" />}
      {ogImage && <meta property="og:image:height" content="630" />}
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@sketchyaf" />
      <meta name="twitter:creator" content="@sketchyaf" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`} />}
      {ogImage && <meta name="twitter:image:alt" content={title} />}
      
      {/* Additional Meta Tags for Mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <meta name="theme-color" content="#4f57d2" />
      <meta name="msapplication-TileColor" content="#4f57d2" />
      
      {/* Apple Meta Tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      
      {/* Favicon and Icons */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />
      
      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://images.pexels.com" />
      <link rel="preconnect" href="https://randomuser.me" />
      
      {/* DNS Prefetch for commonly used domains */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      <link rel="dns-prefetch" href="//images.pexels.com" />
      
      {/* Structured Data */}
      {mergedStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(mergedStructuredData)}
        </script>
      )}
      
      {/* Additional Security Headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
    </Helmet>
  );
};

export default EnhancedSeo;