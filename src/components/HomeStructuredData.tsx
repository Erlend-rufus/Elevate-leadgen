import { useEffect } from 'react'
import { faq, services, site } from '@/content'

/**
 * Injects FAQPage + services structured data into <head> on the home page.
 * Matches the visible FAQ/service copy exactly (Google requires this) and
 * makes answers eligible for rich results in search.
 */
export function HomeStructuredData() {
  useEffect(() => {
    const id = 'ld-home'
    if (document.getElementById(id)) return

    const data = [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Services',
        itemListElement: services.items.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Service',
            name: s.name,
            description: s.outcome,
            provider: { '@type': 'ProfessionalService', name: site.name, url: site.url },
            areaServed: 'GB',
          },
        })),
      },
    ]

    const script = document.createElement('script')
    script.id = id
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(data)
    document.head.appendChild(script)
    return () => {
      document.getElementById(id)?.remove()
    }
  }, [])

  return null
}
