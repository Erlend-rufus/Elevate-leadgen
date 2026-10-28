/**
 * Homepage draft from a spec.
 *
 * A draft entry in drafts/drafts.json may point at a spec (drafts/<dir>/spec.json)
 * instead of a Claude Design export. The spec holds what is particular to the
 * prospect: name, logo, colours, copy. Everything else, the structure, the type,
 * the rhythm of thin rules and big numbers, is the Elevate Marketing design
 * system (artifact "Elevate Marketing - Design system", 2026-10-14), carried
 * over here as a page template so that a draft can be made by a scheduled run
 * without a person opening the canvas. The prospect's own logo and colours are
 * what make it theirs; the system is what makes it good.
 *
 * Rules carried from the first two rounds of drafts (project document
 * "Prismodell: to alternativer. Og nettsidesporet", 28 Aug 2026):
 *   - it must read as the prospect's site, not as documentation of a fix
 *   - nothing stated as fact that is not on the prospect's site today; what we
 *     could not verify is written as [[TO CONFIRM: ...]] in the spec and shown
 *     as a quiet but visible inline mark, never a yellow box
 *   - no stock photography, no illustration, no AI imagery: type, number, line
 *   - no exclamation marks, no hype, UK English
 *
 * Fonts are the self-hosted Montserrat and Poppins already under /nevari/fonts/,
 * so the page makes no request outside getelevateleads.com. The logo is copied
 * next to the page for the same reason (see build-drafts.mjs).
 *
 * Spec shape: see drafts/SPEC.md.
 */

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** [[TO CONFIRM: x]] -> a quiet inline mark; everything else escaped. */
export function text(s) {
  const parts = String(s ?? '').split(/(\[\[TO CONFIRM:[^\]]*\]\])/g);
  return parts.map((p, i) => {
    if (i % 2 === 1) {
      const inner = p.replace(/^\[\[TO CONFIRM:\s*/, '').replace(/\]\]$/, '').trim();
      return `<em class="confirm" title="To confirm">${esc(inner)}</em>`;
    }
    return esc(p);
  }).join('');
}

export function countConfirms(spec) {
  return (JSON.stringify(spec).match(/\[\[TO CONFIRM:/g) || []).length;
}

const hex = /^#[0-9a-fA-F]{6}$/;

/** Relative luminance of a #rrggbb colour (sRGB). */
function luminance(h) {
  const c = h.slice(1).match(/../g).map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/**
 * The palette. The spec gives the prospect's primary (and optionally a second)
 * colour and a theme. Everything else is derived so that text always reads:
 * the accent is used on the canvas only where it clears 3:1, and the CTA ink is
 * black or white by contrast, never guessed.
 */
export function palette(spec) {
  const p = spec.palette || {};
  const theme = p.theme === 'dark' ? 'dark' : 'light';
  const primary = hex.test(p.primary || '') ? p.primary : (theme === 'dark' ? '#00FFC5' : '#0B2A4A');
  const secondary = hex.test(p.secondary || '') ? p.secondary : primary;
  const light = {
    bg: '#FFFFFF', bgAlt: '#F5F6F8', ink: '#13161B', muted: '#5B6470', faint: '#8A929D',
    line: 'rgba(19,22,27,0.10)', lineStrong: 'rgba(19,22,27,0.18)',
    deep: '#0E1116', deepInk: '#FFFFFF', deepMuted: '#9AA3AF',
  };
  const dark = {
    bg: '#13161B', bgAlt: '#191C20', ink: '#FFFFFF', muted: '#9AA3AF', faint: '#6B7280',
    line: 'rgba(255,255,255,0.07)', lineStrong: 'rgba(255,255,255,0.12)',
    deep: '#0E1116', deepInk: '#FFFFFF', deepMuted: '#9AA3AF',
  };
  const base = theme === 'dark' ? dark : light;
  const overrides = {};
  for (const k of ['bg', 'bgAlt', 'ink', 'muted', 'deep']) if (hex.test(p[k] || '')) overrides[k] = p[k];
  const out = { ...base, ...overrides, theme, primary, secondary };
  // the accent on this background: the brand colour if it reads, else the ink
  out.accentOnBg = contrast(primary, out.bg) >= 3 ? primary : out.ink;
  out.accentOnDeep = contrast(primary, out.deep) >= 3 ? primary : (contrast(secondary, out.deep) >= 3 ? secondary : '#FFFFFF');
  out.ctaBg = primary;
  out.ctaInk = contrast('#FFFFFF', primary) >= contrast('#0E1116', primary) ? '#FFFFFF' : '#0E1116';
  return out;
}

const FONT_CSS = `
@font-face{font-family:'Montserrat';font-weight:700;font-display:swap;src:url(/nevari/fonts/Montserrat-700.woff2) format('woff2')}
@font-face{font-family:'Montserrat';font-weight:800;font-display:swap;src:url(/nevari/fonts/Montserrat-800.woff2) format('woff2')}
@font-face{font-family:'Montserrat';font-weight:900;font-display:swap;src:url(/nevari/fonts/Montserrat-900.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:300;font-display:swap;src:url(/nevari/fonts/Poppins-300.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:400;font-display:swap;src:url(/nevari/fonts/Poppins-400.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:500;font-display:swap;src:url(/nevari/fonts/Poppins-500.woff2) format('woff2')}
@font-face{font-family:'Poppins';font-weight:600;font-display:swap;src:url(/nevari/fonts/Poppins-600.woff2) format('woff2')}`;

function css(c) {
  return `${FONT_CSS}
:root{--bg:${c.bg};--bg-alt:${c.bgAlt};--ink:${c.ink};--muted:${c.muted};--faint:${c.faint};
  --line:${c.line};--line-strong:${c.lineStrong};--accent:${c.accentOnBg};--brand:${c.primary};
  --deep:${c.deep};--deep-ink:${c.deepInk};--deep-muted:${c.deepMuted};--accent-deep:${c.accentOnDeep};
  --cta:${c.ctaBg};--cta-ink:${c.ctaInk};
  --display:'Montserrat','Helvetica Neue',Arial,sans-serif;--body:'Poppins','Helvetica Neue',Arial,sans-serif}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:var(--body);font-weight:300;font-size:17px;line-height:1.6}
img{max-width:100%;height:auto;display:block}
a{color:inherit;text-decoration:none}
h1,h2,h3{font-family:var(--display);font-weight:800;letter-spacing:-0.02em;line-height:1.08;margin:0}
p{margin:0}
.wrap{max-width:1180px;margin:0 auto;padding:0 32px}
@media(max-width:640px){.wrap{padding:0 20px}}
.dc-banner{position:sticky;top:0;z-index:99;display:flex;align-items:center;gap:14px;min-height:40px;padding:8px 32px;background:#0E1116;border-bottom:1px solid rgba(0,255,197,0.5)}
.dc-banner i{display:block;width:20px;height:2px;background:#00FFC5;flex:none}
.dc-banner span{font-family:'Poppins',sans-serif;font-size:12px;letter-spacing:0.06em;color:#fff}
.eyebrow{font-family:var(--body);font-weight:500;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:var(--accent)}
.rule{width:48px;height:2px;background:var(--accent);margin:0 0 20px}
.confirm{font-style:normal;border-bottom:2px dotted #D6A800;background:rgba(255,224,102,0.22);padding:0 2px;cursor:help}
/* header */
.hd{border-bottom:1px solid var(--line)}
.hd .wrap{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:84px}
.hd .logo img{max-height:52px;width:auto;max-width:240px}
.hd .logo .wordmark{font-family:var(--display);font-weight:800;font-size:22px;letter-spacing:-0.01em}
.hd nav{display:flex;gap:28px;align-items:center;font-size:14px;font-weight:500}
.hd nav a{padding:6px 0;border-bottom:2px solid transparent}
.hd nav a:hover{border-bottom-color:var(--accent)}
.hd .cta{margin-left:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 24px;border-radius:8px;font-family:var(--body);font-weight:500;font-size:15px;letter-spacing:0.01em;transition:transform .12s ease,filter .12s ease}
.btn-primary{background:var(--cta);color:var(--cta-ink)}
.btn-primary:hover{filter:brightness(0.92)}
.btn-primary:active{transform:translateY(1px)}
.btn-ghost{border:1px solid var(--line-strong);color:var(--ink)}
.btn-ghost:hover{border-color:var(--ink)}
@media(max-width:860px){.hd nav .lnk{display:none}}
@media(max-width:640px){.hd .cta{display:none}.hd .wrap{min-height:72px}.hd .logo img{max-height:44px;max-width:200px}}
/* hero */
.hero{padding:88px 0 72px}
.hero .grid{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:64px;align-items:end}
.hero h1{font-size:clamp(34px,5.2vw,64px);letter-spacing:-0.03em;margin:18px 0 22px;max-width:14ch}
.hero .sub{font-size:20px;line-height:1.55;color:var(--muted);max-width:520px}
.hero .actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}
.hero .note{margin-top:16px;font-size:13px;color:var(--faint)}
.hero aside{border-left:2px solid var(--accent);padding-left:24px}
.hero aside .k{font-family:var(--display);font-weight:800;font-size:clamp(40px,5vw,64px);letter-spacing:-0.03em;line-height:1;color:var(--accent)}
.hero aside .l{font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);margin-top:10px}
.hero aside .q{font-size:17px;line-height:1.55;color:var(--muted)}
.hero aside .q strong{display:block;color:var(--ink);font-weight:500;margin-top:12px;font-size:14px}
@media(max-width:860px){.hero{padding:56px 0 48px}.hero .grid{grid-template-columns:1fr;gap:36px}.hero h1{max-width:none}}
/* stats */
.stats{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--bg-alt)}
.stats .wrap{display:grid;grid-template-columns:repeat(3,1fr)}
.stats .s{padding:36px 28px 36px 0;border-right:1px solid var(--line)}
.stats .s:last-child{border-right:0}
.stats .s+.s{padding-left:28px}
.stats .k{font-family:var(--display);font-weight:800;font-size:clamp(34px,4vw,52px);letter-spacing:-0.03em;line-height:1;color:var(--accent)}
.stats .l{font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-top:10px}
@media(max-width:700px){.stats .wrap{grid-template-columns:1fr}.stats .s{border-right:0;border-bottom:1px solid var(--line);padding:22px 0}.stats .s+.s{padding-left:0}.stats .s:last-child{border-bottom:0}}
/* sections */
.sec{padding:88px 0}
.sec h2{font-size:clamp(28px,3.4vw,42px);max-width:22ch;margin:14px 0 0}
.sec .lead{color:var(--muted);font-size:18px;max-width:560px;margin-top:18px}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:52px;border-top:1px solid var(--line)}
.cols .c{padding:32px 32px 32px 0;border-right:1px solid var(--line)}
.cols .c:last-child{border-right:0}
.cols .c+.c{padding-left:32px}
.cols h3{font-size:19px;font-weight:700;letter-spacing:-0.01em;margin-bottom:12px}
.cols p{color:var(--muted);font-size:15.5px}
.cols .n{font-family:var(--display);font-weight:800;font-size:13px;letter-spacing:0.12em;color:var(--accent);margin-bottom:18px}
@media(max-width:800px){.cols{grid-template-columns:1fr}.cols .c{border-right:0;border-bottom:1px solid var(--line);padding:24px 0}.cols .c+.c{padding-left:0}.cols .c:last-child{border-bottom:0}}
.sec-alt{background:var(--bg-alt);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.two{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:64px;align-items:start}
.two .body p+p{margin-top:16px}
.two .body{color:var(--muted);font-size:17px}
.two .body strong{color:var(--ink);font-weight:500}
@media(max-width:860px){.two{grid-template-columns:1fr;gap:28px}}
.quote{border-left:2px solid var(--accent);padding-left:24px;margin-top:36px}
.quote p{font-family:var(--display);font-weight:700;font-size:20px;line-height:1.35;letter-spacing:-0.01em;color:var(--ink)}
.quote .who{font-family:var(--body);font-size:13px;color:var(--muted);margin-top:12px;font-weight:400;letter-spacing:0.02em}
/* deep band */
.band{background:var(--deep);color:var(--deep-ink);padding:88px 0}
.band .eyebrow{color:var(--accent-deep)}
.band .rule{background:var(--accent-deep)}
.band h2{font-size:clamp(28px,3.6vw,46px);max-width:20ch;margin-top:14px}
.band p{color:var(--deep-muted);font-size:18px;max-width:560px;margin-top:18px}
.band .actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}
.band .btn-ghost{border-color:rgba(255,255,255,0.25);color:var(--deep-ink)}
.band .contact{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;margin-top:56px;padding-top:32px;border-top:1px solid rgba(255,255,255,0.1)}
.band .contact .l{font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:var(--deep-muted)}
.band .contact .v{margin-top:8px;font-size:16px;color:var(--deep-ink);max-width:none}
@media(max-width:700px){.band{padding:56px 0}.band .contact{grid-template-columns:1fr;gap:20px}}
/* footer */
.ft{padding:28px 0 40px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
.ft .wrap{display:flex;flex-wrap:wrap;gap:12px 32px;justify-content:space-between}
@media print{.dc-banner{position:static;background:#fff;border-bottom:2px solid #000}.dc-banner span{color:#000;font-weight:700}.dc-banner i{background:#000}}`;
}

function logoHtml(spec) {
  const l = spec.logo || {};
  if (l.file) return `<a class="logo" href="#top" aria-label="${esc(spec.company)}"><img src="${esc(l.published)}" alt="${esc(spec.company)}"${l.width ? ` width="${l.width}"` : ''}${l.height ? ` height="${l.height}"` : ''}></a>`;
  return `<a class="logo" href="#top"><span class="wordmark">${esc(l.text || spec.company)}</span></a>`;
}

export function renderSpec(spec, { slug }) {
  const c = palette(spec);
  const h = spec.hero || {};
  const nav = (spec.nav || []).map((n) => `<a class="lnk" href="${esc(n.href || '#')}">${esc(n.label)}</a>`).join('');
  const ctaLabel = h.cta || spec.cta || 'Get in touch';
  const ctaHref = h.ctaHref || '#contact';

  const side = h.stat
    ? `<aside><div class="k">${text(h.stat.value)}</div><div class="l">${text(h.stat.label)}</div></aside>`
    : h.quote
      ? `<aside><p class="q">${text(h.quote.text)}<strong>${text(h.quote.who)}</strong></p></aside>`
      : '';

  const stats = (spec.stats || []).length
    ? `<section class="stats" aria-label="Key figures"><div class="wrap">${spec.stats.slice(0, 3).map((s) =>
      `<div class="s"><div class="k">${text(s.value)}</div><div class="l">${text(s.label)}</div></div>`).join('')}</div></section>`
    : '';

  const services = spec.services || {};
  const servicesHtml = (services.items || []).length ? `
<section class="sec" id="${esc(services.id || 'services')}"><div class="wrap">
  <div class="eyebrow">${text(services.eyebrow || 'What we do')}</div>
  <h2>${text(services.title || '')}</h2>
  ${services.lead ? `<p class="lead">${text(services.lead)}</p>` : ''}
  <div class="cols">${services.items.slice(0, 3).map((s, i) =>
    `<div class="c"><div class="n">0${i + 1}</div><h3>${text(s.title)}</h3><p>${text(s.text)}</p></div>`).join('')}</div>
</div></section>` : '';

  const why = spec.why || {};
  const whyHtml = (why.items || []).length ? `
<section class="sec sec-alt" id="${esc(why.id || 'why')}"><div class="wrap">
  <div class="two">
    <div><div class="eyebrow">${text(why.eyebrow || 'Why us')}</div><h2>${text(why.title || '')}</h2>
      ${why.quote ? `<div class="quote"><p>${text(why.quote.text)}</p><div class="who">${text(why.quote.who)}</div></div>` : ''}</div>
    <div class="body">${(why.items || []).map((p) => `<p><strong>${text(p.title)}</strong> ${text(p.text)}</p>`).join('')}</div>
  </div>
</div></section>` : '';

  const about = spec.about || {};
  const aboutHtml = about.paragraphs ? `
<section class="sec" id="${esc(about.id || 'about')}"><div class="wrap">
  <div class="two">
    <div><div class="eyebrow">${text(about.eyebrow || 'About')}</div><h2>${text(about.title || '')}</h2></div>
    <div class="body">${about.paragraphs.map((p) => `<p>${text(p)}</p>`).join('')}</div>
  </div>
</div></section>` : '';

  const contact = spec.contact || {};
  const rows = [
    contact.phone && `<div><div class="l">Telephone</div><p class="v">${text(contact.phone)}</p></div>`,
    contact.email && `<div><div class="l">Email</div><p class="v">${text(contact.email)}</p></div>`,
    contact.address && `<div><div class="l">Address</div><p class="v">${text(contact.address)}</p></div>`,
  ].filter(Boolean).join('');
  const band = spec.band || {};
  const bandHtml = `
<section class="band" id="contact"><div class="wrap">
  <div class="eyebrow">${text(band.eyebrow || 'Next step')}</div><div class="rule"></div>
  <h2>${text(band.title || `Talk to ${spec.company}`)}</h2>
  ${band.text ? `<p>${text(band.text)}</p>` : ''}
  <div class="actions"><a class="btn btn-primary" href="${esc(band.ctaHref || (contact.email ? `mailto:${contact.email}` : '#'))}">${text(band.cta || ctaLabel)}</a>${band.secondary ? `<a class="btn btn-ghost" href="${esc(band.secondaryHref || '#')}">${text(band.secondary)}</a>` : ''}</div>
  ${rows ? `<div class="contact">${rows}</div>` : ''}
</div></section>`;

  const foot = spec.footer || {};
  const footHtml = `<footer class="ft"><div class="wrap"><div>${text(foot.legal || `© ${new Date().getFullYear()} ${spec.company}`)}</div>${foot.note ? `<div>${text(foot.note)}</div>` : ''}</div></footer>`;

  const banner = `<div class="dc-banner"><i></i><span>Draft prepared by Elevate Marketing. Not published by ${esc(spec.company)}.</span></div>`;

  return `<!DOCTYPE html>
<html lang="${esc(spec.lang || 'en-GB')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
<meta name="referrer" content="no-referrer">
<link rel="icon" href="data:,">
<title>Draft — ${esc(spec.company)}: homepage</title>
<style>${css(c)}</style>
</head>
<body id="top">
${banner}
<header class="hd"><div class="wrap">${logoHtml(spec)}<nav>${nav}<a class="btn btn-primary cta" href="${esc(ctaHref)}">${text(ctaLabel)}</a></nav></div></header>
<main>
<section class="hero"><div class="wrap"><div class="grid">
  <div>
    ${h.eyebrow ? `<div class="eyebrow">${text(h.eyebrow)}</div>` : ''}
    <h1>${text(h.title || spec.company)}</h1>
    ${h.sub ? `<p class="sub">${text(h.sub)}</p>` : ''}
    <div class="actions"><a class="btn btn-primary" href="${esc(ctaHref)}">${text(ctaLabel)}</a>${h.secondary ? `<a class="btn btn-ghost" href="${esc(h.secondaryHref || '#services')}">${text(h.secondary)}</a>` : ''}</div>
    ${h.note ? `<p class="note">${text(h.note)}</p>` : ''}
  </div>
  ${side}
</div></div></section>
${stats}
${servicesHtml}
${whyHtml}
${aboutHtml}
${bandHtml}
</main>
${footHtml}
<!-- draft:${esc(slug)} -->
</body>
</html>
`;
}
