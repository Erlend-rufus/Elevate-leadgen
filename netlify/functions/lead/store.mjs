/**
 * Storage in Netlify Blobs. The stored lead is the source of truth: the function writes it
 * before it tells anyone else, and everything downstream (Zapier, ClickUp, Slack, the daily
 * reconciliation) can be rebuilt from it.
 *
 *   lead/<lead_id>               the lead (JSON)
 *   by-day/<YYYY-MM-DD>/<id>     an index entry, so a day can be listed without reading every lead
 *   rl/<YYYYMMDDHH>/<ip hash>    a rate-limit counter for one hour
 *
 * Only the hash of an IP address is ever stored, and only in a rate-limit counter that is
 * deleted after the hour. Leads are deleted after the retention period (see RETENTION_DAYS).
 */
import { getStore } from '@netlify/blobs';

export const RETENTION_DAYS = 365;

export const dayOf = (d) => d.toISOString().slice(0, 10);
export const hourOf = (d) => d.toISOString().slice(0, 13).replace(/[-T]/g, '');

export function createStore({ blobs, name = 'leads' } = {}) {
  const store = blobs || getStore({ name, consistency: 'strong' });

  return {
    /**
     * Writes a new lead. {created: false} when that lead_id is already stored: the same
     * visitor submitting twice, or a retry after a lost response.
     */
    async createLead(rec) {
      const r = await store.setJSON('lead/' + rec.lead_id, rec, { onlyIfNew: true });
      if (r && r.modified === false) return { created: false };
      try {
        await store.setJSON(`by-day/${dayOf(new Date(rec.received_at))}/${rec.lead_id}`, { lead_id: rec.lead_id });
      } catch (e) { /* the lead is stored; the index is a convenience for the daily job */ }
      return { created: true };
    },

    async getLead(id) {
      return store.get('lead/' + id, { type: 'json' });
    },

    async saveLead(rec) {
      await store.setJSON('lead/' + rec.lead_id, rec);
    },

    /** lead ids received on a day (YYYY-MM-DD, UTC) */
    async listDay(day) {
      const out = [];
      const { blobs: list } = await store.list({ prefix: `by-day/${day}/` });
      for (const b of list) out.push(b.key.split('/').pop());
      return out;
    },

    /** true when this IP may submit again this hour; counts the attempt */
    async rateHit({ ipHash, hour, limit }) {
      const key = `rl/${hour}/${ipHash}`;
      const cur = await store.get(key, { type: 'json' });
      const n = (cur && cur.n) || 0;
      if (n >= limit) return false;
      await store.setJSON(key, { n: n + 1 });
      return true;
    },

    /**
     * Deletes what has outlived its purpose: rate-limit counters from earlier hours, and
     * leads (with their index entries) older than the retention period.
     * Returns the number of leads removed.
     */
    async sweep({ now, retentionDays = RETENTION_DAYS }) {
      const thisHour = hourOf(now);
      const rl = await store.list({ prefix: 'rl/' });
      for (const b of rl.blobs) {
        const hour = b.key.split('/')[1];
        if (hour < thisHour) await store.delete(b.key);
      }
      const cutoff = dayOf(new Date(now.getTime() - retentionDays * 86400000));
      let removed = 0;
      const idx = await store.list({ prefix: 'by-day/' });
      for (const b of idx.blobs) {
        const [, day, id] = b.key.split('/');
        if (day < cutoff) {
          await store.delete('lead/' + id);
          await store.delete(b.key);
          removed++;
        }
      }
      return removed;
    },
  };
}
