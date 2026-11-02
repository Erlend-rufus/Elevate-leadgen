/**
 * Homepage draft from a spec.
 *
 * A draft entry in drafts/drafts.json may point at a spec (drafts/<dir>/spec.json)
 * instead of a Claude Design export. The spec holds what is particular to the
 * prospect: name, logo, colours, photographs from their own site, copy. The
 * structure, type and rhythm come from one of three styles, each a page template
 * derived from the Elevate Marketing design system and from what the best sites
 * in that sector have in common (research 28 Oct 2026: one dramatic element per
 * page, credibility above the fold, real people, a frictionless path to contact):
 *
 *   editorial  law, finance, consultancy: Fraunces display, paper and ink,
 *              full-height photograph with a floating figure, hairline rows
 *   technical  IT and MSP: Montserrat display, deep hero band, mono eyebrows,
 *              bordered cards
 *   clinical   health: Geist display, soft tint from the brand colour, rounded
 *              cards, calm spacing
 *
 * Rules carried from the first rounds of drafts (project document "Prismodell:
 * to alternativer. Og nettsidesporet", 28 Aug 2026, and the 28 Oct round):
 *   - it must read as the prospect's site, not as documentation of a fix
 *   - nothing stated as fact that is not on the prospect's site today; what we
 *     could not verify is written as [[TO CONFIRM: ...]] in the spec and shown
 *     as a quiet but visible inline mark, never a yellow box
 *   - photographs only from the prospect's own site, never stock we found, never
 *     AI imagery; without a usable photograph the page is type, number and line
 *   - no exclamation marks, no hype, UK English
 *
 * All fonts are self-hosted (/nevari/fonts/ and /g/_assets/fonts/), images are
 * copied next to the page, so the page makes no request outside
 * getelevateleads.com. No script.
 *
 * Spec shape: see drafts/SPEC.md.
 */

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** [[TO CONFIRM: x]] -> a quiet inline mark; everything else escaped. */
export function text(s) {
  const parts = String(s ?? '').split(/(\[\[TO CONFIRM\b[^\]]*\]\])/g);
  return parts.map((p, i) => {
    if (i % 2 === 1) {
      const inner = p.replace(/^\[\[TO CONFIRM:?\s*/, '').replace(/\]\]$/, '').trim() || 'to confirm';
      return `<em class="confirm" title="To confirm">${esc(inner)}</em>`;
    }
    return esc(p);
  }).join('');
}

export function countConfirms(spec) {
  return (JSON.stringify(spec).match(/\[\[TO CONFIRM\b/g) || []).length;
}

/**
 * Design 2: wrap every word of already-escaped HTML in a masked span so the
 * heading can rise word by word (BYQ gem scroll-text-reveal-01, as a load
 * animation in CSS). Tags, and so the [[TO CONFIRM]] marks, are left whole.
 */
export function words(html) {
  let n = 0;
  return String(html).split(/(<[^>]*>)/g).map((part) => {
    if (part.startsWith('<')) return part;
    return part.split(/(\s+)/).map((w) => (!w || /^\s+$/.test(w) ? w : `<span class="w"><span style="--i:${n++}">${w}</span></span>`)).join('');
  }).join('');
}

const STYLES = ['editorial', 'technical', 'clinical'];
export function styleOf(spec) {
  if (STYLES.includes(spec.style)) return spec.style;
  const ind = String(spec.industry || '').toLowerCase();
  if (/health|clinic|medical|dental|hospital|care/.test(ind)) return 'clinical';
  if (/\bit\b|msp|tech|software|cyber|cloud/.test(ind)) return 'technical';
  return 'editorial';
}

const hex = /^#[0-9a-fA-F]{6}$/;
const toRgb = (h) => h.slice(1).match(/../g).map((x) => parseInt(x, 16));
const toHex = (r) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** mix(a, b, t): t of b into a */
const mix = (a, b, t) => toHex(toRgb(a).map((v, i) => v + (toRgb(b)[i] - v) * t));

function luminance(h) {
  const c = toRgb(h).map((x) => x / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/**
 * The palette. The spec gives the prospect's primary (and optionally a second)
 * colour and a theme. Everything else is derived so that text always reads:
 * the accent is used on the canvas only where it clears 3:1, the deep band is
 * the brand colour darkened when the brand is dark enough to carry white text,
 * and the CTA ink is black or white by contrast, never guessed.
 */
export function palette(spec, style = styleOf(spec)) {
  const p = spec.palette || {};
  const theme = p.theme === 'dark' ? 'dark' : 'light';
  const primary = hex.test(p.primary || '') ? p.primary : '#0B2A4A';
  const secondary = hex.test(p.secondary || '') ? p.secondary : primary;
  const paper = style === 'editorial';
  const light = {
    bg: paper ? '#FBF9F5' : '#FFFFFF',
    bgAlt: paper ? '#F3EFE7' : (style === 'clinical' ? mix('#FFFFFF', primary, 0.06) : '#F3F5F8'),
    ink: paper ? '#15181D' : '#13161B', muted: paper ? '#5C6069' : '#5B6470', faint: '#8A929D',
    line: 'rgba(19,22,27,0.10)', lineStrong: 'rgba(19,22,27,0.18)',
    deepInk: '#FFFFFF', deepMuted: 'rgba(255,255,255,0.66)',
  };
  const dark = {
    bg: '#13161B', bgAlt: '#191C20', ink: '#FFFFFF', muted: '#9AA3AF', faint: '#6B7280',
    line: 'rgba(255,255,255,0.07)', lineStrong: 'rgba(255,255,255,0.12)',
    deepInk: '#FFFFFF', deepMuted: 'rgba(255,255,255,0.66)',
  };
  const base = theme === 'dark' ? dark : light;
  // the deep band: the brand colour darkened if it is dark enough to carry white
  const deepFromBrand = contrast('#FFFFFF', primary) >= 4.5 ? mix(primary, '#000000', 0.45) : (contrast('#FFFFFF', secondary) >= 4.5 ? mix(secondary, '#000000', 0.45) : '#0E1116');
  const overrides = { deep: deepFromBrand };
  for (const k of ['bg', 'bgAlt', 'ink', 'muted', 'deep']) if (hex.test(p[k] || '')) overrides[k] = p[k];
  const out = { ...base, ...overrides, theme, primary, secondary, style };
  out.accentOnBg = contrast(primary, out.bg) >= 3 ? primary : (contrast(secondary, out.bg) >= 3 ? secondary : out.ink);
  out.accentOnDeep = contrast(secondary, out.deep) >= 3 && secondary !== primary ? secondary : (contrast(primary, out.deep) >= 3 ? primary : '#FFFFFF');
  out.ctaBg = primary;
  out.ctaInk = contrast('#FFFFFF', primary) >= contrast('#0E1116', primary) ? '#FFFFFF' : '#0E1116';
  out.tint = mix(out.bg, primary, 0.08);
  return out;
}

const FONTS = {
  fraunces: `@font-face{font-family:'Fraunces';font-weight:100 900;font-display:swap;src:url(/g/_assets/fonts/fraunces-v1.woff2) format('woff2')}`,
  geist: `@font-face{font-family:'Geist';font-weight:100 900;font-display:swap;src:url(/g/_assets/fonts/geist-v1.woff2) format('woff2')}`,
  geistMono: `@font-face{font-family:'Geist Mono';font-weight:100 900;font-display:swap;src:url(/g/_assets/fonts/geist-mono-v1.woff2) format('woff2')}`,
  montserrat: [700, 800, 900].map((w) => `@font-face{font-family:'Montserrat';font-weight:${w};font-display:swap;src:url(/nevari/fonts/Montserrat-${w}.woff2) format('woff2')}`).join('\n'),
  poppins: [300, 400, 500, 600].map((w) => `@font-face{font-family:'Poppins';font-weight:${w};font-display:swap;src:url(/nevari/fonts/Poppins-${w}.woff2) format('woff2')}`).join('\n'),
};

const TYPE = {
  editorial: {
    fonts: [FONTS.fraunces, FONTS.geist, FONTS.geistMono],
    display: `'Fraunces',Georgia,'Times New Roman',serif`, body: `'Geist','Helvetica Neue',Arial,sans-serif`, mono: `'Geist Mono',ui-monospace,monospace`,
    hWeight: 500, hTrack: '-0.015em', hLead: 1.04, bodyWeight: 400, radius: '6px', btnRadius: '999px',
  },
  technical: {
    fonts: [FONTS.montserrat, FONTS.poppins, FONTS.geistMono],
    display: `'Montserrat','Helvetica Neue',Arial,sans-serif`, body: `'Poppins','Helvetica Neue',Arial,sans-serif`, mono: `'Geist Mono',ui-monospace,monospace`,
    hWeight: 800, hTrack: '-0.03em', hLead: 1.02, bodyWeight: 300, radius: '10px', btnRadius: '8px',
  },
  clinical: {
    fonts: [FONTS.geist, FONTS.geistMono],
    display: `'Geist','Helvetica Neue',Arial,sans-serif`, body: `'Geist','Helvetica Neue',Arial,sans-serif`, mono: `'Geist Mono',ui-monospace,monospace`,
    hWeight: 600, hTrack: '-0.025em', hLead: 1.06, bodyWeight: 400, radius: '18px', btnRadius: '999px',
  },
};

function css(c, t, style, m2 = false) {
  return `${t.fonts.join('\n')}
:root{--bg:${c.bg};--bg-alt:${c.bgAlt};--tint:${c.tint};--ink:${c.ink};--muted:${c.muted};--faint:${c.faint};
  --line:${c.line};--line-strong:${c.lineStrong};--accent:${c.accentOnBg};--brand:${c.primary};--brand2:${c.secondary};
  --deep:${c.deep};--deep-ink:${c.deepInk};--deep-muted:${c.deepMuted};--accent-deep:${c.accentOnDeep};
  --cta:${c.ctaBg};--cta-ink:${c.ctaInk};--r:${t.radius};--rb:${t.btnRadius};
  --display:${t.display};--body:${t.body};--mono:${t.mono}}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:var(--body);font-weight:${t.bodyWeight};font-size:17px;line-height:1.6}
img{max-width:100%;height:auto;display:block}
a{color:inherit;text-decoration:none}
h1,h2,h3{font-family:var(--display);font-weight:${t.hWeight};letter-spacing:${t.hTrack};line-height:${t.hLead};margin:0}
p{margin:0}
.wrap{max-width:1200px;margin:0 auto;padding:0 32px}
@media(max-width:640px){.wrap{padding:0 20px}}
.dc-banner{position:sticky;top:0;z-index:99;display:flex;align-items:center;gap:14px;min-height:40px;padding:8px 32px;background:#0E1116;border-bottom:1px solid rgba(0,255,197,0.5)}
.dc-banner i{display:block;width:20px;height:2px;background:#00FFC5;flex:none}
.dc-banner span{font-family:'Geist','Poppins',sans-serif;font-size:12px;letter-spacing:0.06em;color:#fff}
.eyebrow{font-family:var(--mono);font-weight:500;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:var(--accent)}
.rule{width:40px;height:2px;background:var(--accent);margin:0 0 18px}
.confirm{font-style:normal;border-bottom:2px dotted #D6A800;background:rgba(255,224,102,0.22);padding:0 2px;cursor:help}
.img{position:relative;overflow:hidden;border-radius:var(--r);background:var(--bg-alt)}
.img img{width:100%;height:100%;object-fit:cover}
/* header */
.hd{position:relative;z-index:5}
.hd .wrap{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:88px}
.hd .logo img{max-height:52px;width:auto;max-width:240px}
.hd .logo .wordmark{font-family:var(--display);font-weight:${t.hWeight};font-size:24px;letter-spacing:-0.01em}
.hd nav{display:flex;gap:30px;align-items:center;font-size:14.5px;font-weight:500}
.hd nav a.lnk{padding:6px 0;border-bottom:1.5px solid transparent}
.hd nav a.lnk:hover{border-bottom-color:var(--accent)}
.hd .cta{margin-left:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;padding:0 26px;border-radius:var(--rb);font-family:var(--body);font-weight:500;font-size:15px;letter-spacing:0.005em;transition:transform .12s ease,filter .12s ease,background .12s ease}
.btn-primary{background:var(--cta);color:var(--cta-ink)}
.btn-primary:hover{filter:brightness(0.92)}
.btn-primary:active{transform:translateY(1px)}
.btn-ghost{border:1px solid var(--line-strong);color:var(--ink)}
.btn-ghost:hover{border-color:var(--ink)}
.btn .arr{width:16px;height:16px;flex:none}
@media(max-width:900px){.hd nav .lnk{display:none}}
@media(max-width:640px){.hd .cta{display:none}.hd .wrap{min-height:72px}.hd .logo img{max-height:44px;max-width:200px}}
/* hero: statement (no photograph) */
.hero{padding:80px 0 64px}
.hero .grid{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:64px;align-items:end}
.hero h1{font-size:clamp(38px,5.6vw,70px);margin:18px 0 22px;max-width:14ch}
.hero .sub{font-size:20px;line-height:1.55;color:var(--muted);max-width:540px}
.hero .actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}
.hero .note{margin-top:16px;font-size:13px;color:var(--faint)}
.hero aside{border-left:2px solid var(--accent);padding-left:24px}
.hero aside .k{font-family:var(--display);font-weight:${t.hWeight};font-size:clamp(44px,5.4vw,72px);letter-spacing:-0.03em;line-height:1;color:var(--accent)}
.hero aside .l{font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-top:10px;font-family:var(--mono)}
.hero aside .q{font-family:var(--display);font-weight:${t.hWeight};font-size:22px;line-height:1.35;color:var(--ink)}
.hero aside .q strong{display:block;font-family:var(--body);color:var(--muted);font-weight:400;margin-top:12px;font-size:14px}
@media(max-width:860px){.hero{padding:52px 0 44px}.hero .grid{grid-template-columns:1fr;gap:36px}.hero h1{max-width:none}}
/* hero: photograph */
.hero-img{padding:0}
.hero-img .grid{display:grid;grid-template-columns:minmax(0,11fr) minmax(0,9fr);gap:0;align-items:stretch;min-height:640px}
.hero-img .copy{padding:88px 64px 80px 0;display:flex;flex-direction:column;justify-content:center}
.hero-img h1{font-size:clamp(38px,5vw,64px);margin:18px 0 22px;max-width:15ch}
.hero-img .sub{font-size:20px;line-height:1.55;color:var(--muted);max-width:520px}
.hero-img .actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}
.hero-img .note{margin-top:16px;font-size:13px;color:var(--faint)}
.hero-img .pic{position:relative;border-radius:var(--r);overflow:hidden;min-height:420px;margin:32px 0}
.hero-img .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(0.82)}
.hero-img .pic::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,17,22,0) 40%,rgba(14,17,22,0.72) 100%)}
.hero-img .hcard{position:absolute;left:28px;right:28px;bottom:28px;z-index:2;color:#fff}
.hero-img .hcard .k{font-family:var(--display);font-weight:${t.hWeight};font-size:clamp(40px,4.6vw,64px);letter-spacing:-0.03em;line-height:1}
.hero-img .hcard .l{font-family:var(--mono);font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.78);margin-top:8px;max-width:34ch}
.hero-img .hcard .q{font-family:var(--display);font-weight:${t.hWeight};font-size:21px;line-height:1.35}
.hero-img .hcard .q strong{display:block;font-family:var(--body);font-size:13px;font-weight:400;color:rgba(255,255,255,0.78);margin-top:10px}
@media(max-width:900px){.hero-img .grid{grid-template-columns:1fr;min-height:0}.hero-img .copy{padding:52px 0 36px}.hero-img h1{max-width:none}.hero-img .pic{min-height:360px;margin:0 0 40px}}
/* trust strip */
.trust{border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.trust .wrap{display:flex;flex-wrap:wrap;align-items:center;gap:20px 48px;min-height:92px;padding-top:16px;padding-bottom:16px}
.trust .l{font-family:var(--mono);font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted)}
.trust img{max-height:54px;width:auto;max-width:170px;opacity:0.9}
.trust .t{font-size:14.5px;color:var(--muted)}
/* proof bento */
.proof{padding:72px 0 0}
.bento{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}
.tile{border-radius:var(--r);padding:32px;min-height:220px;display:flex;flex-direction:column;justify-content:flex-end}
.tile-stat{background:var(--bg-alt);grid-column:span 4}
.tile-stat .k{font-family:var(--display);font-weight:${t.hWeight};font-size:clamp(44px,5vw,68px);letter-spacing:-0.03em;line-height:1;color:var(--accent)}
.tile-stat .l{font-size:13.5px;color:var(--muted);margin-top:12px;max-width:26ch;line-height:1.45}
.tile-quote{background:var(--deep);color:var(--deep-ink);grid-column:span 8}
.tile-quote p{font-family:var(--display);font-weight:${t.hWeight};font-size:clamp(22px,2.4vw,30px);line-height:1.3;max-width:30ch}
.tile-quote .who{font-family:var(--body);font-size:13.5px;color:var(--deep-muted);margin-top:16px}
.tile-quote .mark{font-family:var(--display);font-size:64px;line-height:0.6;color:var(--accent-deep);margin-bottom:auto}
.tile-quote.wide{grid-column:span 12}
.tile-img{grid-column:span 4;padding:0;min-height:260px}
.tile-img img{width:100%;height:100%;object-fit:cover}
@media(max-width:900px){.tile-stat,.tile-quote,.tile-img{grid-column:span 12}.tile{min-height:0;padding:26px}.tile-img{min-height:240px}}
@media(min-width:901px){.bento.n2 .tile-stat{grid-column:span 6}.bento.n1 .tile-stat{grid-column:span 12}.tile-quote.wide{grid-column:span 12;flex-direction:row;align-items:flex-end;gap:40px;padding:40px 48px}.tile-quote.wide .mark{margin:0;font-size:96px;line-height:0.5;align-self:flex-start}.tile-quote.wide p{max-width:36ch;font-size:clamp(24px,2.6vw,34px)}.tile-quote.wide .who{margin-left:auto;text-align:right;max-width:22ch}}
/* sections */
.sec{padding:96px 0}
.sec h2{font-size:clamp(30px,3.6vw,46px);max-width:22ch;margin:14px 0 0}
.sec .lead{color:var(--muted);font-size:18px;max-width:580px;margin-top:18px}
.head2{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:48px;align-items:end}
@media(max-width:860px){.head2{grid-template-columns:1fr;gap:16px}}
/* services: rows (editorial) */
.rows{margin-top:56px;border-top:1px solid var(--line)}
.row{display:grid;grid-template-columns:72px minmax(0,4fr) minmax(0,6fr) 200px;gap:32px;align-items:center;padding:30px 0;border-bottom:1px solid var(--line)}
.row .n{font-family:var(--mono);font-size:13px;color:var(--accent);letter-spacing:0.1em}
.row h3{font-size:24px}
.row p{color:var(--muted);font-size:16px}
.row .img{aspect-ratio:4/3}
.row.noimg{grid-template-columns:72px minmax(0,4fr) minmax(0,6fr)}
@media(max-width:860px){.row,.row.noimg{grid-template-columns:1fr;gap:12px}.row .n{order:-1}.row .img{max-width:320px}}
/* services: cards (technical, clinical) */
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:56px}
.card{border-radius:var(--r);padding:32px;background:var(--bg-alt);display:flex;flex-direction:column;gap:14px;min-height:280px;border:1px solid transparent;transition:border-color .15s ease,transform .15s ease}
.card:hover{border-color:var(--line-strong);transform:translateY(-2px)}
.card .n{font-family:var(--mono);font-size:12px;color:var(--accent);letter-spacing:0.12em}
.card h3{font-size:22px;margin-top:auto}
.card p{color:var(--muted);font-size:15.5px}
.card .img{aspect-ratio:16/10;margin:-32px -32px 8px;border-radius:var(--r) var(--r) 0 0}
@media(max-width:860px){.cards{grid-template-columns:1fr}.card{min-height:0}}
/* highlight: the one thing on the page that is only this firm's */
.hl{padding:0 0 96px}
.hl .box{border-top:2px solid var(--ink);padding-top:40px}
.hl h2{font-size:clamp(30px,3.6vw,46px);max-width:22ch;margin:14px 0 0}
.hl .lead{color:var(--muted);font-size:18px;max-width:580px;margin-top:18px}
.hl .head2{align-items:start}
.terms{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:48px;border-top:1px solid var(--line)}
.terms .t{padding:28px 28px 28px 0;border-bottom:1px solid var(--line)}
.terms .t:nth-child(4n){padding-right:0}
.terms .k{font-family:var(--display);font-weight:${t.hWeight};font-size:clamp(28px,3vw,40px);letter-spacing:-0.02em;line-height:1.05}
.terms .l{font-family:var(--mono);font-size:11.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-top:10px}
@media(max-width:900px){.terms{grid-template-columns:repeat(2,1fr)}.terms .t:nth-child(4n){padding-right:28px}.terms .t:nth-child(2n){padding-right:0}}
@media(max-width:520px){.terms{grid-template-columns:1fr}.terms .t{padding-right:0}}
.compare{display:grid;grid-template-columns:minmax(0,1fr) 120px minmax(0,1fr);gap:24px;align-items:center;margin-top:48px;padding:40px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.compare .k{font-family:var(--display);font-weight:${t.hWeight};font-size:clamp(64px,9vw,128px);letter-spacing:-0.04em;line-height:0.95}
.compare .was .k{color:var(--muted);text-decoration:line-through;text-decoration-thickness:3px;text-decoration-color:var(--accent)}
.compare .now .k{color:var(--accent)}
.compare .l{font-family:var(--mono);font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-top:14px;max-width:26ch}
.compare .arrow{display:flex;justify-content:center}
.compare .arrow svg{width:72px;height:72px;color:var(--ink)}
.compare .note{grid-column:1/-1;font-size:15px;color:var(--muted);max-width:60ch;padding-top:8px}
@media(max-width:700px){.compare{grid-template-columns:1fr;gap:12px}.compare .arrow svg{transform:rotate(90deg);width:48px;height:48px}}
/* why */
.sec-alt{background:var(--bg-alt)}
.two{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:64px;align-items:start}
.two .body{color:var(--muted);font-size:17px}
.two .body p+p{margin-top:18px}
.two .body strong{color:var(--ink);font-weight:600}
.two .img{aspect-ratio:4/5;max-height:560px}
@media(max-width:860px){.two{grid-template-columns:1fr;gap:28px}.two .img{aspect-ratio:16/10}}
.why-list{display:grid;gap:0;margin-top:8px}
.why-list .it{padding:22px 0;border-top:1px solid var(--line-strong);display:grid;grid-template-columns:40px 1fr;gap:16px}
.why-list .it:last-child{border-bottom:1px solid var(--line-strong)}
.why-list .n{font-family:var(--mono);font-size:12px;color:var(--accent);padding-top:6px}
.why-list h3{font-size:19px;margin-bottom:6px;font-family:var(--body);font-weight:600;letter-spacing:0}
.why-list p{color:var(--muted);font-size:15.5px}
/* deep band */
.band{background:var(--deep);color:var(--deep-ink);padding:96px 0;position:relative;overflow:hidden}
.band .eyebrow{color:var(--accent-deep)}
.band .rule{background:var(--accent-deep)}
.band h2{font-size:clamp(30px,3.8vw,50px);max-width:20ch;margin-top:14px}
.band p{color:var(--deep-muted);font-size:18px;max-width:560px;margin-top:18px}
.band .actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}
.band .btn-ghost{border-color:rgba(255,255,255,0.28);color:var(--deep-ink)}
.band .btn-ghost:hover{border-color:#fff}
.band .contact{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;margin-top:64px;padding-top:32px;border-top:1px solid rgba(255,255,255,0.14)}
.band .contact .l{font-family:var(--mono);font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:var(--deep-muted)}
.band .contact .v{margin-top:8px;font-size:16px;color:var(--deep-ink);max-width:none}
@media(max-width:700px){.band{padding:60px 0}.band .contact{grid-template-columns:1fr;gap:20px}}
/* footer */
.ft{padding:28px 0 44px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
.ft .wrap{display:flex;flex-wrap:wrap;gap:12px 32px;justify-content:space-between}
${STYLE_CSS[style]}${m2 ? MOTION_CSS : ''}
@media print{.dc-banner{position:static;background:#fff;border-bottom:2px solid #000}.dc-banner span{color:#000;font-weight:700}.dc-banner i{background:#000}${m2 ? '.m2 *,.m2 *::before,.m2 *::after{animation:none!important}' : ''}}`;
}

const STYLE_CSS = {
  editorial: `
.hd{border-bottom:1px solid var(--line)}
h1,h2{font-variation-settings:"opsz" 144,"SOFT" 30}
.hero h1,.hero-img h1{font-weight:500}
.tile-stat{background:var(--tint)}
.row h3{font-weight:500}
.card h3{font-weight:500}`,
  technical: `
.hd{border-bottom:1px solid var(--line)}
.hero,.hero-img{background:var(--deep);color:var(--deep-ink)}
.hero .sub,.hero-img .sub{color:var(--deep-muted)}
.hero .note,.hero-img .note{color:var(--deep-muted)}
.hero .eyebrow,.hero-img .eyebrow{color:var(--accent-deep)}
.hero aside{border-color:var(--accent-deep)}
.hero aside .k{color:var(--accent-deep)}
.hero aside .l,.hero aside .q strong{color:var(--deep-muted)}
.hero aside .q{color:var(--deep-ink)}
.hero .btn-ghost,.hero-img .btn-ghost{border-color:rgba(255,255,255,0.28);color:var(--deep-ink)}
.hero-img .pic{border-radius:var(--r)}
.hero-img .pic{margin:40px 0}
.card{background:var(--bg);border-color:var(--line)}
.sec-alt .card{background:var(--bg)}
.tile-stat{background:var(--bg-alt)}`,
  clinical: `
.hd{border-bottom:1px solid var(--line)}
.hero-img .pic{border-radius:28px}
.tile,.card{border-radius:22px}
.tile-stat{background:var(--bg-alt)}
.card{background:var(--bg-alt)}
.row .img{border-radius:18px}
.btn-primary:hover{filter:brightness(1.06)}`,
};

/**
 * Design 2 (spec.design === 2): motion from the BYQ Supply library, ported to CSS
 * because a draft ships no script and makes no request outside getelevateleads.com.
 *   hero heading: words rise from a mask         (gem scroll-text-reveal-01, on load)
 *   hero photograph: curtain wipe, slow settle,  (gem curtain-image-reveal-01, and
 *     parallax while it passes                    avenir-hero-5)
 *   sections, rows, cards, terms: rise in on     (nextwell-value-features-6,
 *     scroll, staggered along a row               genesis-value-features-4)
 *   figures: come into focus as they enter       (gem scroll-blur-reveal-01)
 *   why list: a spine draws as you scroll        (gem scroll-timeline-01)
 *   before and after: the strike-through draws   (own)
 *   hover: row line draws, button arrow slides   (stringer-team-grid-2, reforma-hero-7)
 * Rules: nothing loops (WCAG 2.2.2); every animation sits behind
 * prefers-reduced-motion: no-preference, and the scroll-driven ones also behind
 * @supports (animation-timeline: view()), so a browser without them, a printout or a
 * crawler gets the finished page; no element is hidden except by an animation that
 * reveals it. overflow:clip, not hidden, on anything that contains a view() element,
 * because overflow:hidden makes the element the scroller and the timeline would never run.
 */
const MOTION_CSS = `
/* design 2 */
.m2 .pic,.m2 .img,.m2 .card,.m2 .band,.m2 .tile{overflow:clip}
.m2 .hl .box{border-top:0;position:relative}
.m2 .hl .box::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--ink);transform-origin:left}
.m2 .compare .was .k{text-decoration:none;background:linear-gradient(var(--accent),var(--accent)) 0 47%/100% 4px no-repeat;width:max-content;max-width:100%}
.m2 .why-list{position:relative;isolation:isolate}
.m2 .why-list::before,.m2 .why-list::after{content:"";position:absolute;z-index:-1;left:19px;top:0;bottom:0;width:2px}
.m2 .why-list::before{background:var(--line-strong)}
.m2 .why-list::after{background:var(--accent);transform-origin:top}
.m2 .why-list .n{position:relative;z-index:1;background:var(--bg-alt);text-align:center;align-self:start;padding:6px 0}
.m2 .card,.m2 .row{position:relative}
.m2 h1 .w{display:inline-block;overflow:clip;vertical-align:top;padding:.1em 0;margin:-.1em 0}
.m2 h1 .w>span{display:inline-block}
.m2[data-style=technical] .hero-img .pic::before{background:var(--deep)}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media (prefers-reduced-motion:no-preference){
@keyframes m2-word{from{transform:translateY(110%)}to{transform:none}}
@keyframes m2-fade{from{opacity:0;translate:0 14px}to{opacity:1;translate:0 0}}
@keyframes m2-curtain{from{transform:translateX(0)}to{transform:translateX(101%)}}
@keyframes m2-settle{from{scale:1.24}to{scale:1.1}}
@keyframes m2-pan{from{translate:0 -5%}to{translate:0 5%}}
@keyframes m2-rise{from{opacity:0;translate:0 34px}to{opacity:1;translate:0 0}}
@keyframes m2-sharp{from{opacity:.12;filter:blur(14px);translate:0 18px}to{opacity:1;filter:blur(0);translate:0 0}}
@keyframes m2-strike{from{background-size:0 4px}to{background-size:100% 4px}}
@keyframes m2-slide{from{opacity:0;translate:-24px 0}to{opacity:1;translate:0 0}}
@keyframes m2-draw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes m2-spine{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.m2 h1 .w>span{animation:m2-word .95s cubic-bezier(.2,.7,.1,1) both;animation-delay:calc(.1s + var(--i,0)*.055s)}
.m2 .hero .eyebrow,.m2 .hero-img .eyebrow{animation:m2-fade .7s .05s both}
.m2 .hero .sub,.m2 .hero-img .sub{animation:m2-fade .8s .4s both}
.m2 .hero .actions,.m2 .hero-img .actions{animation:m2-fade .8s .55s both}
.m2 .hero .note,.m2 .hero-img .note{animation:m2-fade .8s .7s both}
.m2 .hero aside{animation:m2-fade .9s .5s both}
.m2 .hero-img .pic::before{content:"";position:absolute;inset:0;z-index:3;background:var(--bg);transform-origin:right;animation:m2-curtain 1.1s .15s cubic-bezier(.7,0,.2,1) both}
.m2 .hero-img .pic img,.m2 .tile-img img{scale:1.1}
.m2 .hero-img .pic img{animation:m2-settle 1.6s .15s cubic-bezier(.2,.7,.1,1) both}
@media (hover:hover){
  .m2 .btn .arr{transition:translate .25s cubic-bezier(.2,.7,.1,1)}
  .m2 .btn:hover .arr{translate:5px 0}
  .m2 .row::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform .5s cubic-bezier(.2,.7,.1,1)}
  .m2 .row:hover::after{transform:scaleX(1)}
  .m2 .row h3{transition:translate .35s cubic-bezier(.2,.7,.1,1)}
  .m2 .row:hover h3{translate:10px 0}
  .m2 .card::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform .45s cubic-bezier(.2,.7,.1,1)}
  .m2 .card:hover::before{transform:scaleX(1)}
  .m2 .terms .t .k{transition:color .25s ease,translate .35s cubic-bezier(.2,.7,.1,1)}
  .m2 .terms .t:hover .k{color:var(--accent);translate:6px 0}
}
@supports (animation-timeline:view()){
  .m2 .head2>*,.m2 .row,.m2 .card,.m2 .terms .t,.m2 .why-list .it,.m2 .two .body p,.m2 .two>div:first-child>*,
  .m2 .band .eyebrow,.m2 .band h2,.m2 .band p,.m2 .band .actions,.m2 .band .contact>div,.m2 .trust .wrap>*,.m2 .compare .note,.m2 .compare .now{
    animation:m2-rise linear both;animation-timeline:view();animation-range:entry calc(var(--i,0)*8%) entry calc(52% + var(--i,0)*8%)}
  .m2 .tile{animation:m2-sharp linear both;animation-timeline:view();animation-range:entry calc(var(--i,0)*8%) entry calc(60% + var(--i,0)*8%)}
  .m2 .hero-img .pic img{animation:m2-settle 1.6s .15s cubic-bezier(.2,.7,.1,1) both,m2-pan linear both;animation-timeline:auto,view();animation-range:normal,cover}
  .m2 .tile-img img{animation:m2-pan linear both;animation-timeline:view();animation-range:cover}
  .m2 .hl .box::before{animation:m2-draw linear both;animation-timeline:view();animation-range:entry 0% entry 80%}
  .m2 .compare .was .k{animation:m2-strike linear both;animation-timeline:view();animation-range:entry 35% cover 45%}
  .m2 .compare .arrow svg{animation:m2-slide linear both;animation-timeline:view();animation-range:entry 20% entry 90%}
  .m2 .why-list::after{animation:m2-spine linear both;animation-timeline:view();animation-range:cover 8% cover 62%}
}
}`;

function logoHtml(spec) {
  const l = spec.logo || {};
  if (l.file) return `<a class="logo" href="#top" aria-label="${esc(spec.company)}"><img src="${esc(l.published)}" alt="${esc(spec.company)}"${l.width ? ` width="${l.width}"` : ''}${l.height ? ` height="${l.height}"` : ''}></a>`;
  return `<a class="logo" href="#top"><span class="wordmark">${esc(l.text || spec.company)}</span></a>`;
}

const ARROW = `<svg class="arr" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** All image files the spec references, for the build to copy. */
export function imageFiles(spec) {
  const out = new Set();
  const add = (im) => { if (im && im.file) out.add(im.file); };
  if (spec.logo && spec.logo.file) out.add(spec.logo.file);
  const im = spec.images || {};
  for (const k of ['hero', 'proof', 'about', 'band']) add(im[k]);
  for (const s of (spec.services && spec.services.items) || []) add(s.image);
  for (const t of spec.trust || []) add(t);
  return [...out];
}

export function renderSpec(spec, { slug }) {
  const style = styleOf(spec);
  const t = TYPE[style];
  const c = palette(spec, style);
  const m2 = spec.design === 2;                       // see MOTION_CSS and drafts/SPEC.md
  const si = (i) => (m2 ? ` style="--i:${i}"` : '');   // position along a row, for the stagger
  const src = (file) => `/draft/${slug}/${file}`;
  const pic = (im, cls = 'img') => im && im.file ? `<div class="${cls}"><img src="${esc(src(im.file))}" alt="${esc(im.alt || '')}"${im.position ? ` style="object-position:${esc(im.position)}"` : ''}></div>` : '';

  const h = spec.hero || {};
  const im = spec.images || {};
  const nav = (spec.nav || []).map((n) => `<a class="lnk" href="${esc(n.href || '#')}">${esc(n.label)}</a>`).join('');
  const ctaLabel = h.cta || spec.cta || 'Get in touch';
  const ctaHref = h.ctaHref || '#contact';
  const actions = `<div class="actions"><a class="btn btn-primary" href="${esc(ctaHref)}">${text(ctaLabel)}${ARROW}</a>${h.secondary ? `<a class="btn btn-ghost" href="${esc(h.secondaryHref || '#services')}">${text(h.secondary)}</a>` : ''}</div>`;
  const copy = `${h.eyebrow ? `<div class="eyebrow">${text(h.eyebrow)}</div>` : ''}
    <h1>${m2 ? words(text(h.title || spec.company)) : text(h.title || spec.company)}</h1>
    ${h.sub ? `<p class="sub">${text(h.sub)}</p>` : ''}
    ${actions}
    ${h.note ? `<p class="note">${text(h.note)}</p>` : ''}`;

  let heroHtml;
  if (im.hero && im.hero.file) {
    const card = h.stat
      ? `<div class="hcard"><div class="k">${text(h.stat.value)}</div><div class="l">${text(h.stat.label)}</div></div>`
      : h.quote ? `<div class="hcard"><p class="q">${text(h.quote.text)}<strong>${text(h.quote.who)}</strong></p></div>` : '';
    heroHtml = `<section class="hero-img"><div class="wrap"><div class="grid">
  <div class="copy">${copy}</div>
  <div class="pic"><img src="${esc(src(im.hero.file))}" alt="${esc(im.hero.alt || '')}"${im.hero.position ? ` style="object-position:${esc(im.hero.position)}"` : ''}>${card}</div>
</div></div></section>`;
  } else {
    const side = h.stat
      ? `<aside><div class="k">${text(h.stat.value)}</div><div class="l">${text(h.stat.label)}</div></aside>`
      : h.quote ? `<aside><p class="q">${text(h.quote.text)}<strong>${text(h.quote.who)}</strong></p></aside>` : '';
    heroHtml = `<section class="hero"><div class="wrap"><div class="grid"><div>${copy}</div>${side}</div></div></section>`;
  }

  const trust = spec.trust || [];
  const trustHtml = trust.length || spec.trustText ? `<section class="trust" aria-label="Accreditation"><div class="wrap">
  ${spec.trustLabel ? `<span class="l">${text(spec.trustLabel)}</span>` : ''}
  ${trust.map((x, i) => x.file ? `<img src="${esc(src(x.file))}" alt="${esc(x.alt || '')}"${si(i + 1)}>` : `<span class="t"${si(i + 1)}>${text(x.text || '')}</span>`).join('')}
  ${spec.trustText ? `<span class="t"${si(trust.length + 1)}>${text(spec.trustText)}</span>` : ''}
</div></section>` : '';

  // proof: stats, the quote, a photograph, as a bento
  const stats = (spec.stats || []).slice(0, 3);
  const why = spec.why || {};
  const quote = why.quote || spec.quote;
  const tiles = [
    ...stats.map((s, i) => `<div class="tile tile-stat"${si(i)}><div class="k">${text(s.value)}</div><div class="l">${text(s.label)}</div></div>`),
    quote ? `<div class="tile tile-quote${im.proof && im.proof.file ? '' : ' wide'}"${si(stats.length)}><div class="mark">“</div><p>${text(quote.text)}</p><div class="who">${text(quote.who)}</div></div>` : '',
    im.proof && im.proof.file ? `<div class="tile tile-img"${si(stats.length + 1)}><img src="${esc(src(im.proof.file))}" alt="${esc(im.proof.alt || '')}"></div>` : '',
  ].filter(Boolean);
  const proofHtml = tiles.length ? `<section class="proof" aria-label="Key figures"><div class="wrap"><div class="bento n${stats.length}">${tiles.join('')}</div></div></section>` : '';

  const services = spec.services || {};
  const items = (services.items || []).slice(0, 4);
  let list = '';
  if (items.length && style === 'editorial') {
    list = `<div class="rows">${items.map((s, i) => `<div class="row${s.image && s.image.file ? '' : ' noimg'}"><div class="n">0${i + 1}</div><h3>${text(s.title)}</h3><p>${text(s.text)}</p>${pic(s.image)}</div>`).join('')}</div>`;
  } else if (items.length) {
    list = `<div class="cards">${items.slice(0, 3).map((s, i) => `<div class="card"${si(i)}>${pic(s.image)}<div class="n">0${i + 1}</div><h3>${text(s.title)}</h3><p>${text(s.text)}</p></div>`).join('')}</div>`;
  }
  const servicesHtml = list ? `
<section class="sec" id="${esc(services.id || 'services')}"><div class="wrap">
  <div class="head2"><div><div class="eyebrow">${text(services.eyebrow || 'What we do')}</div><h2>${text(services.title || '')}</h2></div>
  ${services.lead ? `<p class="lead">${text(services.lead)}</p>` : '<div></div>'}</div>
  ${list}
</div></section>` : '';

  // highlight: one element only this firm could have. "terms": the courts, contract
  // forms, standards or specialisms it works in, set big; "compare": one before and
  // after figure from its own site.
  const hl = spec.highlight || {};
  let hlBody = '';
  if (hl.kind === 'terms' && (hl.items || []).length) {
    hlBody = `<div class="terms">${hl.items.slice(0, 8).map((x, i) => `<div class="t"${si(i % 4)}><div class="k">${text(x.term)}</div>${x.label ? `<div class="l">${text(x.label)}</div>` : ''}</div>`).join('')}</div>`;
  } else if (hl.kind === 'compare' && hl.before && hl.after) {
    hlBody = `<div class="compare">
      <div class="was"><div class="k">${text(hl.before.value)}</div><div class="l">${text(hl.before.label)}</div></div>
      <div class="arrow"><svg viewBox="0 0 72 72" aria-hidden="true"><path d="M8 36h52M44 20l16 16-16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="now"><div class="k">${text(hl.after.value)}</div><div class="l">${text(hl.after.label)}</div></div>
      ${hl.note ? `<p class="note">${text(hl.note)}</p>` : ''}
    </div>`;
  }
  const highlightHtml = hlBody ? `
<section class="hl" id="${esc(hl.id || 'highlight')}"><div class="wrap"><div class="box">
  <div class="head2"><div>${hl.eyebrow ? `<div class="eyebrow">${text(hl.eyebrow)}</div>` : ''}<h2>${text(hl.title || '')}</h2></div>
  ${hl.lead ? `<p class="lead">${text(hl.lead)}</p>` : '<div></div>'}</div>
  ${hlBody}
</div></div></section>` : '';

  const whyHtml = (why.items || []).length ? `
<section class="sec sec-alt" id="${esc(why.id || 'why')}"><div class="wrap">
  <div class="two">
    <div><div class="eyebrow">${text(why.eyebrow || 'Why us')}</div><h2>${text(why.title || '')}</h2>${why.lead ? `<p class="lead">${text(why.lead)}</p>` : ''}</div>
    <div class="why-list">${why.items.map((p, i) => `<div class="it"><div class="n">0${i + 1}</div><div><h3>${text(p.title)}</h3><p>${text(p.text)}</p></div></div>`).join('')}</div>
  </div>
</div></section>` : '';

  const about = spec.about || {};
  const aboutHtml = about.paragraphs ? `
<section class="sec" id="${esc(about.id || 'about')}"><div class="wrap">
  <div class="two">
    <div><div class="eyebrow">${text(about.eyebrow || 'About')}</div><h2>${text(about.title || '')}</h2>${im.about && im.about.file ? `<div style="margin-top:32px">${pic(im.about)}</div>` : ''}</div>
    <div class="body">${about.paragraphs.map((p) => `<p>${text(p)}</p>`).join('')}</div>
  </div>
</div></section>` : '';

  const contact = spec.contact || {};
  const rows = [
    ['Telephone', contact.phone], ['Email', contact.email], ['Address', contact.address],
  ].filter(([, v]) => v).map(([l, v], i) => `<div${si(i)}><div class="l">${l}</div><p class="v">${text(v)}</p></div>`).join('');
  const band = spec.band || {};
  const bandHtml = `
<section class="band" id="contact"><div class="wrap">
  <div class="eyebrow">${text(band.eyebrow || 'Next step')}</div><div class="rule"></div>
  <h2>${text(band.title || `Talk to ${spec.company}`)}</h2>
  ${band.text ? `<p>${text(band.text)}</p>` : ''}
  <div class="actions"><a class="btn btn-primary" href="${esc(band.ctaHref || (contact.email ? `mailto:${contact.email}` : '#'))}">${text(band.cta || ctaLabel)}${ARROW}</a>${band.secondary ? `<a class="btn btn-ghost" href="${esc(band.secondaryHref || '#')}">${text(band.secondary)}</a>` : ''}</div>
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
<style>${css(c, t, style, m2)}</style>
</head>
<body id="top" data-style="${style}"${m2 ? ' class="m2"' : ''}>
${banner}
<header class="hd"><div class="wrap">${logoHtml(spec)}<nav>${nav}<a class="btn btn-primary cta" href="${esc(ctaHref)}">${text(ctaLabel)}</a></nav></div></header>
<main>
${heroHtml}
${trustHtml}
${proofHtml}
${servicesHtml}
${highlightHtml}
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
