import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { testimonials } from '@/content'

/** Large single-quote carousel with initials avatar — calm, no auto-spin. */
export function Testimonials() {
  const [index, setIndex] = useState(0)
  const reduce = useReducedMotion()
  const item = testimonials.items[index]

  const initials = item.name
    .split(' ')
    .map((n) => n[0])
    .join('')

  return (
    <section className="section-pad">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl">
            {testimonials.heading}
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="relative mt-12">
          <div className="card-dark px-7 py-12 sm:px-12">
            <Quote className="mx-auto h-8 w-8 text-brand-cyan" />
            <div className="mt-6 min-h-[10rem] sm:min-h-[8rem]">
              <AnimatePresence mode="wait">
                <motion.figure
                  key={index}
                  initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <blockquote className="font-display text-xl font-medium leading-relaxed text-white sm:text-2xl">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="mt-8 flex items-center justify-center gap-4">
                    <span className="gradient-ring flex h-12 w-12 items-center justify-center rounded-full font-display text-sm font-bold text-brand-cyan">
                      {initials}
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-semibold text-white">{item.name}</span>
                      <span className="block text-sm text-dim">{item.role}</span>
                    </span>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setIndex((index - 1 + testimonials.items.length) % testimonials.items.length)}
              className="rounded-full border border-subtle p-2 text-white transition-colors hover:bg-surface-2"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {testimonials.items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? 'w-6 bg-brand-cyan' : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setIndex((index + 1) % testimonials.items.length)}
              className="rounded-full border border-subtle p-2 text-white transition-colors hover:bg-surface-2"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
