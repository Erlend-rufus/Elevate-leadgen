import type { ReactNode } from 'react';
import { site } from '@/content/site';

/**
 * Reusable JSON-LD script tag for any page.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }): ReactNode {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Home page structured data: Organization + WebSite (design.md §2).
 * FAQPage schema is rendered separately by the home FAQ section.
 */
export default function HomeStructuredData() {
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: site.brand,
      url: site.url,
      email: site.email,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.brand,
      url: site.url,
    },
  ];
  return <JsonLd data={data} />;
}
