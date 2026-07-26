import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Reveal } from '@/components/Reveal'
import { faq } from '@/content'

/** FAQ that removes buying barriers — pricing, lock-in, timelines. */
export function FAQ() {
  return (
    // id="faq": deep-link target — the /audit/ funnel links to /#faq
    <section id="faq" className="section-pad">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl">
            {faq.heading}
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {faq.items.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-subtle">
                <AccordionTrigger className="py-5 text-left font-display text-lg font-semibold text-white hover:text-brand-cyan hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 leading-relaxed text-dim">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
