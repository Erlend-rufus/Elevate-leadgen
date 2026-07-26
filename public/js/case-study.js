// Scroll progress bar
const progressBar = document.querySelector('.scroll-progress-bar');
if (progressBar) {
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    progressBar.style.width = progress + '%';
  }, { passive: true });
}

// Show nav after scrolling past hero
const caseNav = document.querySelector('.case-nav');
const csHero = document.querySelector('.cs-hero');
if (caseNav && csHero) {
  const navObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) {
        caseNav.classList.add('visible');
      } else {
        caseNav.classList.remove('visible');
      }
    });
  }, { threshold: 0 });
  navObs.observe(csHero);
}

// Scroll-triggered fade-in for story sections
const storyObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('show');
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.cs-stat, .cs-story-inner, .cs-contrast-card, .cs-quote-inner, .cs-final-cta .wrap, .cs-other-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(40px)';
  el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
  storyObs.observe(el);
});

// Stagger stats animation
const statsSection = document.querySelector('.cs-stats-section');
if (statsSection) {
  const statsObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const stats = e.target.querySelectorAll('.cs-stat');
        stats.forEach((stat, i) => {
          setTimeout(() => {
            stat.classList.add('show');
          }, i * 200);
        });

        // Animate counters
        e.target.querySelectorAll('.cs-counter').forEach(c => {
          const target = +c.dataset.target;
          const start = performance.now();
          const duration = 1600;
          (function animate(now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            c.textContent = Math.round(target * eased);
            if (p < 1) requestAnimationFrame(animate);
          })(start);
        });

        statsObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  statsObs.observe(statsSection);
}

// Show class handler
document.querySelectorAll('.cs-stat, .cs-story-inner, .cs-contrast-card, .cs-quote-inner, .cs-final-cta .wrap, .cs-other-card').forEach(el => {
  const origObserver = new MutationObserver(() => {
    if (el.classList.contains('show')) {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }
  });
  origObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
});
