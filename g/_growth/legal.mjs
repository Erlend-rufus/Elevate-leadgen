/**
 * The body of the privacy notice and the website terms (g/<slug>/legal.json) as HTML.
 *
 * A pure function of the document, the funnel's config and a set of flags, so a test can render the same
 * text with and without a flag and compare. It throws instead of exiting; the build turns the error into
 * its usual message.
 *
 * Blocks:  { h2 } { p } { ul: [..] } { table: { label, head: [..], rows: [[..] | { when|unless, cells }] } }
 *          { button: { id, text } }
 * Any block, and any table row written as an object, may carry "when": flag or "unless": flag. It is kept
 * when the flag is set (when) or not set (unless).
 * Inline:  [[label|/path]], [[label|@privacy]], [[label|@terms]] become links to this site. The contact
 *          address becomes a mailto link wherever it appears.
 */
const esc = (s) => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function inline(text, cfg) {
  let h = esc(text);
  h = h.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (m, label, href) => {
    const target = href === '@privacy' ? cfg.links.privacy : href === '@terms' ? cfg.links.terms : href;
    if (!/^\/[A-Za-z0-9/_-]*$/.test(target)) throw new Error(`the link "${m}" must point at a path on this site`);
    return `<a href="${esc(target)}">${label}</a>`;
  });
  const mail = esc(cfg.contact.email);
  return h.split(mail).join(`<a href="mailto:${mail}">${mail}</a>`);
}

function keep(item, flags) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return true;
  for (const key of ['when', 'unless']) {
    if (item[key] === undefined) continue;
    if (!(item[key] in flags)) throw new Error(`the condition "${item[key]}" is not one the build knows (it knows ${Object.keys(flags).join(', ')})`);
    if (key === 'when' ? !flags[item[key]] : flags[item[key]]) return false;
  }
  return true;
}

function table(t, cfg, flags) {
  if (!t.label || !Array.isArray(t.head) || !Array.isArray(t.rows)) throw new Error('a table needs label, head and rows');
  const rows = t.rows.filter((r) => keep(r, flags)).map((r) => (Array.isArray(r) ? r : r.cells));
  for (const cells of rows) {
    if (!Array.isArray(cells) || cells.length !== t.head.length) throw new Error(`a row of "${t.label}" does not have ${t.head.length} cells`);
  }
  const head = t.head.map((h) => `<th scope="col">${inline(h, cfg)}</th>`).join('');
  const body = rows.map((cells) => '<tr>' + cells.map((c, i) => (i === 0
    ? `<th scope="row">${inline(c, cfg)}</th>`
    : `<td data-label="${esc(t.head[i])}">${inline(c, cfg)}</td>`)).join('') + '</tr>').join('\n          ');
  return `<table class="lg-table"><caption class="vh">${esc(t.label)}</caption>
        <thead><tr>${head}</tr></thead>
        <tbody>
          ${body}
        </tbody></table>`;
}

export function renderLegalBlocks(doc, cfg, flags) {
  const out = [];
  for (const b of doc.blocks) {
    if (!keep(b, flags)) continue;
    if (b.h2 !== undefined) out.push(`<h2>${inline(b.h2, cfg)}</h2>`);
    else if (b.p !== undefined) out.push(`<p>${inline(b.p, cfg)}</p>`);
    else if (b.ul) out.push(`<ul>${b.ul.map((x) => `<li>${inline(x, cfg)}</li>`).join('')}</ul>`);
    else if (b.table) out.push(table(b.table, cfg, flags));
    else if (b.button) out.push(`<p><button class="lg-btn" type="button" id="${esc(b.button.id)}" hidden>${esc(b.button.text)}</button></p>`);
    else throw new Error('a block with nothing to show: ' + JSON.stringify(b).slice(0, 80));
  }
  return out.join('\n        ');
}
