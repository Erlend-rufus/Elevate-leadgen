import { useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CalendarCheck, Mail } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { usePageMeta } from '@/components/usePageMeta';
import { contact } from '@/content/contact';

const cardIcons: Record<string, LucideIcon> = { Mail, CalendarCheck };

const TYPEFORM_SCRIPT = 'https://embed.typeform.com/next/embed.js';

/** /contact — contact page (cases-audit-pages.md §E). */
export default function Contact() {
  usePageMeta(contact.meta.title, contact.meta.description);

  // Load the Typeform embed script once.
  useEffect(() => {
    if (document.querySelector(`script[src="${TYPEFORM_SCRIPT}"]`)) return;
    const script = document.createElement('script');
    script.src = TYPEFORM_SCRIPT;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <main>
      {/* Hero */}
      <section className="section-pad">
        <div className="container-site">
          <Reveal className="max-w-4xl">
            <h1>{contact.hero.title}</h1>
          </Reveal>
        </div>
      </section>

      {/* Contact cards */}
      <section className="border-t border-white/5">
        <div className="container-site section-pad grid gap-6 md:grid-cols-3">
          {contact.cards.map((card, i) => {
            const CardIcon = cardIcons[card.icon] ?? Mail;
            const body = (
              <div className="card-dark flex h-full flex-col">
                <CardIcon className="h-7 w-7 text-[#00a3d6]" aria-hidden="true" />
                <h3 className="mt-5">{card.label}</h3>
                <p className="mt-2 text-[0.9375rem] text-[#b9bbd9]">{card.value}</p>
                {card.href ? (
                  <span className="mt-auto flex justify-end pt-6">
                    <ArrowRight className="h-5 w-5 text-[#f4f5ff]" aria-hidden="true" />
                  </span>
                ) : null}
              </div>
            );
            return (
              <Reveal key={card.label} delay={i * 100} className="h-full">
                {card.href.startsWith('/') ? (
                  <Link to={card.href} className="block h-full">
                    {body}
                  </Link>
                ) : card.href ? (
                  <a href={card.href} className="block h-full">
                    {body}
                  </a>
                ) : (
                  body
                )}
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Form — Typeform live embed */}
      <section className="section-pad border-t border-white/5">
        <div className="container-site max-w-2xl">
          <Reveal>
            <div className="card-dark">
              <div data-tf-live={contact.form.typeformId} />
              <p className="mt-5 text-sm text-[#7c7ea6]">{contact.form.microcopy}</p>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
