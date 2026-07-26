import type { LegalDoc } from '@/content/legal';
import { usePageMeta } from './usePageMeta';
import Reveal from './Reveal';

/**
 * Layout for privacy/terms: title, updated date, prose sections.
 */
export default function LegalPage({ doc }: { doc: LegalDoc }) {
  usePageMeta(doc.meta.title, doc.meta.description);
  return (
    <main className="section-pad">
      <div className="container-site max-w-3xl">
        <Reveal>
          <h1 className="mb-3">{doc.title}</h1>
          <p className="mb-12 text-sm text-[#7c7ea6]">{doc.updated}</p>
        </Reveal>
        <div className="space-y-10">
          {doc.sections.map((section) => (
            <Reveal key={section.heading}>
              <section>
                <h2 className="mb-3 text-2xl">{section.heading}</h2>
                {section.body.map((paragraph, i) => (
                  <p key={i} className="mb-3 text-[#b9bbd9]">
                    {paragraph}
                  </p>
                ))}
              </section>
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
