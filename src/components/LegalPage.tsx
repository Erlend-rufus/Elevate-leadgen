import type { ReactNode } from 'react'
import { Header } from '@/sections/Header'
import { Footer } from '@/sections/Footer'
import { Reveal } from '@/components/Reveal'
import { usePageMeta } from '@/hooks/usePageMeta'

interface LegalSection {
  heading: string
  body: ReactNode
}

interface LegalPageProps {
  title: string
  metaTitle: string
  metaDescription: string
  updated: string
  intro: string
  sections: LegalSection[]
}

/** Shared layout for privacy/terms — readable measure, same chrome as the site. */
export function LegalPage({ title, metaTitle, metaDescription, updated, intro, sections }: LegalPageProps) {
  usePageMeta(metaTitle, metaDescription)

  return (
    <>
      <Header />
      <main className="pt-32">
        <section className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
          <Reveal>
            <h1 className="font-display text-4xl font-bold tracking-[-0.02em] text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 text-sm text-dim">Last updated: {updated}</p>
            <p className="mt-6 text-lg leading-relaxed text-dim">{intro}</p>
          </Reveal>

          <div className="mt-12 space-y-10">
            {sections.map((s, i) => (
              <Reveal key={i} delay={i * 0.03}>
                <section>
                  <h2 className="font-display text-xl font-bold text-white">{s.heading}</h2>
                  <div className="mt-3 space-y-3 leading-relaxed text-dim">{s.body}</div>
                  {i < sections.length - 1 && <div className="mt-10 border-t border-subtle" />}
                </section>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
