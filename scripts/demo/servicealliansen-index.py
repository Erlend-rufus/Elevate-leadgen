#!/usr/bin/env python3
# Generates public/demo/servicealliansen-nvuhbu/index.html from the ad data below. Run with python3, commit the output.
import html, os
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'demo', 'servicealliansen-nvuhbu')

ADS_A = [
 dict(k='a1', ch='meta', img='img/b1-800.webp', alt='Ansatt i Servicealliansen bærer planker', angle='avlaste styret',
      txt='Styret bruker kveldene på lyspærer og snømåking?\n– Én fast avtale\n– Én kontaktperson som kjenner bygget\n– Dere velger: fast, jevnlig eller ved behov\nEiendomsdrift for borettslag og sameier i Bergen.',
      h='Avlast styret i borettslaget', d='Eiendomsdrift og vaktmester', btn='Få tilbud'),
 dict(k='a2', ch='meta', img='img/b2-800.webp', alt='Ansatt i Servicealliansen med kappsag ved fasade', angle='én kontaktperson',
      txt='Slutt å koordinere sju leverandører.\n– Tilsyn og småreparasjoner\n– Fellesarealer og utearbeid\n– Én totalleverandør, én kontaktperson\nBorettslag og sameier i Bergen.',
      h='Én kontaktperson for hele bygget', d='For borettslag og sameier i Bergen', btn='Få tilbud'),
 dict(k='a3', ch='meta', img='img/b3-800.webp', alt='Ansatt i Servicealliansen med drill', angle='sesong',
      txt='Vinteren kommer. Hvem måker?\n– Snørydding og strøing\n– Daglig tilsyn og små reparasjoner\n– Gressklipping når det blir sommer\nFast avtale eller ved behov.',
      h='Vaktmester gjennom hele året', d='Fast avtale eller ved behov', btn='Få tilbud'),
 dict(k='a4', ch='linkedin', img='img/b4-800.webp', alt='Ansatt i Servicealliansen setter opp beskyttelse innendørs', angle='kontroll for styreledere og driftsansvarlige',
      txt='Styreleder eller driftsansvarlig?\nAvvik som oppdages tidlig, blir ikke store utgifter.\n– Fast plan for tilsyn og vedlikehold\n– Én kontaktperson for hele bygget\nBorettslag, sameier og næringsbygg.',
      h='Eiendomsdrift med fast kontaktperson', d='servicealliansen.no', btn='Be om tilbud'),
 dict(k='a5', ch='linkedin', img='img/b5-800.webp', alt='Ansatt i Servicealliansen på gardintrapp', angle='forebygging',
      txt='Små feil som rettes tidlig, blir ikke store utgifter.\n– Fellesarealer, dører, belysning\n– Tekniske installasjoner\n– Færre overraskelser for styret\nEiendomsdrift med fast kontaktperson.',
      h='Forebyggende tilsyn for borettslag og sameier', d='servicealliansen.no', btn='Be om tilbud'),
]
ADS_B = [
 dict(k='b1', ch='meta', img='img/ad-s1.webp', alt='Annonse: innkalling til styremøte der sak 4 til 6 kan strykes', angle='sakslisten',
      txt='Sak 4: lyspæren i oppgang B.\nSak 5: hvem måker?\nSak 6: kjellerdøren, igjen.\nStryk dem. Det tar vi.\nFast avtale for borettslag og sameier i Bergen.',
      h='Sak 4 til 6 kan dere stryke', d='Eiendomsdrift og vaktmester', btn='Få tilbud'),
 dict(k='b2', ch='meta', img='img/ad-s2.webp', alt='Annonse: sju leverandører strøket over, ett tall: 1 kontaktperson', angle='én kontaktperson',
      txt='Vaktmester, snømåker, gartner, låsesmed.\nEller: én kontaktperson.\n– Én totalleverandør for hele bygget\n– Fast, jevnlig eller ved behov\nBorettslag og sameier i Bergen.',
      h='Én kontaktperson for hele bygget', d='For borettslag og sameier i Bergen', btn='Få tilbud'),
 dict(k='b3', ch='meta', img='img/ad-s3.webp', alt='Annonse: året som ring med fire årstider og oppgaver', angle='hele året',
      txt='Høst: tilsyn før vinteren.\nVinter: snø og strøing.\nVår: utearbeid.\nSommer: gress.\nÉn avtale. Hele året.',
      h='Vaktmester gjennom hele året', d='Fast avtale eller ved behov', btn='Få tilbud'),
 dict(k='b4', ch='linkedin', img='img/ad-l1.webp', alt='Annonse: to kolonner, styret tar og vi tar', angle='styret tar, vi tar',
      txt='Styret tar budsjettet og beboerne.\nVi tar resten:\n– Tilsyn og småreparasjoner\n– Lyspærer, låser, søppel\n– Snø, strøing, gress\nEiendomsdrift med fast kontaktperson.',
      h='Eiendomsdrift med fast kontaktperson', d='servicealliansen.no', btn='Be om tilbud'),
 dict(k='b5', ch='linkedin', img='img/ad-l2.webp', alt='Annonse: en løs takstein i oktober, vannskade i januar', angle='takstein',
      txt='En løs takstein i oktober.\nVannskade i januar.\nRegelmessig tilsyn fanger det opp i oktober.\n– Borettslag, sameier og næringsbygg\n– Én fast kontaktperson',
      h='Forebyggende tilsyn for borettslag og sameier', d='servicealliansen.no', btn='Be om tilbud'),
]

def card(ad, page):
    e = html.escape
    href = f'{page}/?utm_source={ad["ch"]}&utm_campaign=demo&utm_content={ad["k"]}'
    li = ad['ch'] == 'linkedin'
    who = ('<div class="who"><div class="ava s"><img src="img/mark-white.png" alt=""></div><div><div class="n">Servicealliansen AS</div><div class="s">Promotert</div></div></div>' if li
           else '<div class="who"><div class="ava r"><img src="img/mark-white.png" alt=""></div><div><div class="n">Servicealliansen</div><div class="s">Sponset</div></div></div>')
    more = '… se mer' if li else '… mer'
    foot = (f'<div class="foot"><div><div class="h">{e(ad["h"])}</div><div class="b">{e(ad["d"])}</div></div><span class="btn">{e(ad["btn"])}</span></div>' if li
            else f'<div class="foot"><div><div class="d">servicealliansen.no</div><div class="h">{e(ad["h"])}</div><div class="b">{e(ad["d"])}</div></div><span class="btn">{e(ad["btn"])}</span></div>')
    return f'''      <article class="ad{' li' if li else ''}">
        <div class="card" data-ad="{ad['k']}">
          {who}
          <p class="txt clamp">{e(ad['txt'])}</p>
          <button class="more" type="button" aria-expanded="false">{more}</button>
          <a class="hit" href="{href}"><img class="img {'wide' if li else 'sq'}" src="{ad['img']}" alt="{e(ad['alt'])}" loading="lazy">
          {foot}</a>
        </div>
        <p class="angle">Vinkel: {e(ad['angle'])}</p>
      </article>
'''

def block(set_id, title, sub, ads, page):
    m = ''.join(card(a, page) for a in ads if a['ch'] == 'meta')
    l = ''.join(card(a, page) for a in ads if a['ch'] == 'linkedin')
    return f'''  <section class="set" id="{set_id}">
    <div class="sethead">
      <div><p class="eyebrow">{html.escape(title)}</p><h2>{html.escape(sub)}</h2></div>
      <a class="go small" href="{page}/">Se landingsside {set_id[-1].upper()}</a>
    </div>
    <p class="eyebrow sub">Facebook og Instagram</p>
    <div class="grid m">
{m}    </div>
    <p class="eyebrow sub">LinkedIn</p>
    <div class="grid l">
{l}    </div>
  </section>
'''

page = f'''<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
<title>Eksempelkampanje: eiendomsdrift for borettslag og sameier i Bergen</title>
<meta name="description" content="Eksempel laget av Elevate Marketing for Servicealliansen. To annonsesett og to landingssider.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400&family=Geist:wght@400;500;600&display=swap">
<style>
:root{{--paper:#F7F5F0;--paper2:#EFEDE7;--ink:#10141C;--muted:#4A5162;--line:#CFCBC0;--navy:#0A1628;--white:#fff}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{-webkit-text-size-adjust:100%;scroll-behavior:smooth}}
body{{background:var(--paper);color:var(--ink);font-family:'Geist',Arial,sans-serif;font-size:17px;line-height:1.55;-webkit-font-smoothing:antialiased}}
a{{color:inherit}}
.wrap{{max-width:1180px;margin:0 auto;padding:0 20px}}
.demo-line{{font-size:13px;color:var(--muted);padding:12px 0;border-bottom:1px solid var(--line)}}
header.top{{display:flex;align-items:center;justify-content:space-between;padding:22px 0;gap:16px;flex-wrap:wrap}}
header.top img{{height:34px;width:auto;display:block}}
header.top nav{{display:flex;gap:22px;font-size:14px;font-weight:500}}
header.top nav a{{text-decoration:none;border-bottom:1px solid var(--ink);padding-bottom:2px}}
.eyebrow{{font-size:12px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted)}}
h1{{font-family:'Fraunces',Georgia,serif;font-weight:400;font-size:clamp(34px,5.2vw,60px);line-height:1.08;letter-spacing:-.02em;margin:14px 0 20px;max-width:14ch}}
h2{{font-family:'Fraunces',Georgia,serif;font-weight:400;font-size:clamp(26px,3.4vw,38px);line-height:1.12;letter-spacing:-.01em;margin-top:10px}}
.lead{{font-size:19px;line-height:1.55;color:var(--muted);max-width:60ch}}
.intro{{padding:56px 0 40px;border-bottom:1px solid var(--ink)}}
.set{{padding:48px 0 8px;border-bottom:1px solid var(--line)}}
.sethead{{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:12px}}
.eyebrow.sub{{margin:28px 0 18px}}
.grid{{display:grid;gap:24px}}
.grid.m{{grid-template-columns:repeat(3,minmax(0,1fr))}}
.grid.l{{grid-template-columns:repeat(2,minmax(0,1fr));max-width:860px}}
@media(max-width:900px){{.grid.m,.grid.l{{grid-template-columns:1fr;max-width:520px}}}}
.ad{{display:flex;flex-direction:column;gap:10px}}
.card{{color:#050505;background:var(--white);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-family:'Geist',Arial,sans-serif;transition:transform .15s ease,border-color .15s ease}}
.card:hover{{transform:translateY(-2px);border-color:var(--muted)}}
.hit{{display:block;text-decoration:none;color:inherit}}
.hit:focus-visible{{outline:3px solid var(--navy);outline-offset:-3px}}
.who{{display:flex;align-items:center;gap:10px;padding:12px 14px 8px}}
.ava{{width:40px;height:40px;background:#002855;display:flex;align-items:center;justify-content:center;flex:none}}
.ava.r{{border-radius:50%}}.ava.s{{border-radius:4px}}
.ava img{{width:24px;height:auto;display:block}}
.who .n{{font-size:14px;font-weight:600;line-height:1.2}}
.who .s{{font-size:12px;color:#65676B;line-height:1.3}}
.txt{{margin:0 14px 6px;font-size:14px;line-height:1.4;white-space:pre-line}}
.txt.clamp{{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}}
.more{{padding:0 14px 10px;display:block;font-size:13px;color:#65676B;background:none;border:0;font-family:inherit;cursor:pointer;text-align:left}}
.img{{display:block;width:100%;object-fit:cover;background:#ddd}}
.img.sq{{aspect-ratio:1/1}}.img.wide{{aspect-ratio:1200/627}}
.foot{{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:#F0F2F5}}
.foot .d{{font-size:12px;color:#65676B;text-transform:lowercase}}
.foot .h{{font-size:15px;font-weight:600;line-height:1.25;margin-top:2px}}
.foot .b{{font-size:13px;color:#65676B;margin-top:2px}}
.btn{{flex:none;font-size:14px;font-weight:600;padding:8px 14px;border-radius:6px;background:#E4E6EB;color:#050505;white-space:nowrap}}
.li .foot{{background:var(--white);border-top:1px solid #E6E6E6}}
.li .btn{{background:var(--white);border:1.5px solid #0A66C2;color:#0A66C2;border-radius:20px;padding:6px 16px}}
.angle{{font-size:13px;color:var(--muted);padding:0 2px}}
.how{{padding:56px 0 24px;margin-top:8px}}
.how h2{{margin:12px 0 28px}}
.step{{display:grid;grid-template-columns:40px 1fr;gap:16px;padding:20px 0;border-top:1px solid var(--line)}}
.step:last-of-type{{border-bottom:1px solid var(--line)}}
.step .k{{font-weight:500;color:var(--muted);font-variant-numeric:tabular-nums}}
.step h3{{font-family:'Fraunces',Georgia,serif;font-weight:400;font-size:22px;margin-bottom:4px}}
.step p{{color:var(--muted);font-size:16px}}
.go{{display:inline-block;background:var(--navy);color:#fff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:16px 28px}}
.go.small{{padding:12px 20px;font-size:12px}}
.go:hover{{background:#142242}}
.goes{{display:flex;gap:12px;flex-wrap:wrap;margin:32px 0 8px}}
.bottom{{padding:40px 0 48px;font-size:13px;color:var(--muted);border-top:1px solid var(--line);margin-top:48px}}
</style>
</head>
<body>
<div class="wrap">
  <p class="demo-line">Eksempel laget av Elevate Marketing for Servicealliansen. Annonsene er ikke publisert.</p>
  <header class="top">
    <img src="img/elevate-ink.png" alt="Elevate Marketing" width="600" height="241">
    <nav><a href="#sett-a">Sett A</a><a href="#sett-b">Sett B</a><a href="side/">Landingsside A</a><a href="side-b/">Landingsside B</a></nav>
  </header>

  <section class="intro">
    <p class="eyebrow">Eksempelkampanje</p>
    <h1>Eiendomsdrift for borettslag og sameier i Bergen</h1>
    <p class="lead">Slik kan en kampanje se ut. To annonsesett, ett med foto og ett typografisk, hvert med tre annonser for Facebook og Instagram og to for LinkedIn. Hvert sett leder til sin egen landingsside med skjema. Skjemaet spør om kundetype, behov og postnummer, så forespørselen kan gå rett til riktig avdeling.</p>
  </section>

{block('sett-a', 'Sett A, med foto', 'Deres egne bilder, nøktern tone.', ADS_A, 'side')}
{block('sett-b', 'Sett B, typografisk', 'Ingen foto. Sakslisten, én kontaktperson, hele året.', ADS_B, 'side-b')}
  <section class="how">
    <p class="eyebrow">Slik henger det sammen</p>
    <h2>Fra annonse til forespørsel</h2>
    <div class="step"><span class="k">1</span><div><h3>Annonsen</h3><p>Treffer styreledere, styremedlemmer og forvaltere i Bergen. To sett testes mot hverandre.</p></div></div>
    <div class="step"><span class="k">2</span><div><h3>Landingssiden</h3><p>Én side om eiendomsdrift for borettslag og sameier, i Servicealliansens eget uttrykk. Side A er rolig, side B er mer direkte.</p></div></div>
    <div class="step"><span class="k">3</span><div><h3>Skjemaet</h3><p>Spør om kundetype, behov, type avtale og postnummer.</p></div></div>
    <div class="step"><span class="k">4</span><div><h3>Oppfølgingen</h3><p>Forespørselen går til riktig avdeling. Vi måler kostnad per forespørsel, ikke klikk.</p></div></div>
    <div class="goes"><a class="go" href="side/">Se landingsside A</a><a class="go" href="side-b/">Se landingsside B</a></div>
  </section>

  <p class="bottom">Bilder og tjenestebeskrivelser fra servicealliansen.no. Tjenester og område avklares med dere før noe publiseres.</p>
</div>
<script>
document.querySelectorAll('.more').forEach(function(b){{
  b.addEventListener('click',function(e){{
    e.preventDefault();e.stopPropagation();
    var t=b.previousElementSibling;t.classList.toggle('clamp');
    var open=!t.classList.contains('clamp');
    b.setAttribute('aria-expanded',open);
    b.textContent=open?'Vis mindre':(b.closest('.li')?'… se mer':'… mer');
  }});
}});
</script>
</body>
</html>
'''
with open(os.path.join(HERE, 'index.html'), 'w') as f:
    f.write(page)
print('index.html written', len(page))
