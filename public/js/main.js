// Scroll animations
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('show'); });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fi').forEach(el => obs.observe(el));

// Sticky CTA bar - appears after scrolling past hero, hides near form
const stickyBar = document.getElementById('stickyBar');
const heroSection = document.getElementById('hero');
const formSection = document.getElementById('form');
let heroVisible = true;
let formVisible = false;

function updateStickyBar() {
  if (heroVisible || formVisible) {
    stickyBar.classList.remove('visible');
    if (formVisible) stickyBar.classList.add('hide-sticky');
  } else {
    stickyBar.classList.remove('hide-sticky');
    stickyBar.classList.add('visible');
  }
}

const stickyObs = new IntersectionObserver(entries => {
  entries.forEach(e => { heroVisible = e.isIntersecting; });
  updateStickyBar();
}, { threshold: 0 });
stickyObs.observe(heroSection);

if (formSection) {
  const formObs = new IntersectionObserver(entries => {
    entries.forEach(e => { formVisible = e.isIntersecting; });
    updateStickyBar();
  }, { threshold: 0.1 });
  formObs.observe(formSection);
}

// Counter animation
let started = false;
const cobs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting && !started) {
      started = true;
      document.querySelectorAll('.ctr').forEach(c => {
        const t = +c.dataset.t, s = performance.now();
        (function run(now) {
          const p = Math.min((now - s) / 1400, 1);
          c.textContent = Math.round(t * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(run);
        })(s);
      });
    }
  });
}, { threshold: 0.3 });
const sr = document.querySelector('.stats');
if (sr) cobs.observe(sr);

// FAQ accordion
document.querySelectorAll('.fi-q button').forEach(b => {
  b.addEventListener('click', () => {
    const item = b.parentElement;
    const was = item.classList.contains('on');
    document.querySelectorAll('.fi-q').forEach(i => i.classList.remove('on'));
    if (!was) item.classList.add('on');
  });
});

// UTM capture for Typeform
document.addEventListener('DOMContentLoaded', function() {
  const params = new URLSearchParams(window.location.search);
  const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const typeformEl = document.querySelector('[data-tf-live]');
  if (typeformEl) {
    const hiddenValues = utmFields.map(f => f + '=' + (params.get(f) || '')).join(',');
    typeformEl.setAttribute('data-tf-hidden', hiddenValues);
  }
});

// Conversion tracking is handled on the thank you page (takk.html)
// Typeform redirects to /takk after submission, which fires Pixel Lead event and GA4 conversion
