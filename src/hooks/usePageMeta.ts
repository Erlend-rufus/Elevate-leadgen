import { useEffect } from 'react'

/**
 * Per-page title + meta description without extra dependencies.
 * Sets document.title and the description/OG tags on mount.
 */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title

    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector(selector)
      if (el) el.setAttribute(attr, value)
    }

    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', description)
  }, [title, description])
}
