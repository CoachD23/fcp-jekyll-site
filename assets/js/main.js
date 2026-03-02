// Florida Coastal Prep - Main JS

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');

  // Mobile nav toggle
  if (toggle && nav) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      nav.classList.toggle('active');
      toggle.classList.toggle('active');
      toggle.setAttribute('aria-expanded', nav.classList.contains('active'));
      // Close all dropdowns when closing nav
      if (!nav.classList.contains('active')) {
        document.querySelectorAll('.dropdown.open').forEach(dd => dd.classList.remove('open'));
      }
    });

    // Close nav on outside click
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('active');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.querySelectorAll('.dropdown.open').forEach(dd => dd.classList.remove('open'));
      }
    });
  }

  // Mobile dropdown toggles - use event delegation so it works regardless of load width
  document.querySelectorAll('.dropdown > a').forEach(link => {
    link.addEventListener('click', (e) => {
      // Only intercept on mobile-sized screens
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        const dd = link.parentElement;
        // Close other dropdowns
        document.querySelectorAll('.dropdown.open').forEach(other => {
          if (other !== dd) other.classList.remove('open');
        });
        dd.classList.toggle('open');
      }
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Header scroll effect
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  // --- Scroll-triggered fade-in animations ---
  const fadeElements = document.querySelectorAll('.fade-in');
  if (fadeElements.length > 0) {
    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.01,
      rootMargin: '0px 0px 200px 0px'
    });
    fadeElements.forEach(el => fadeObserver.observe(el));
  }

  // --- Animated number counter ---
  const impactNumbers = document.querySelectorAll('.impact-number[data-count]');
  if (impactNumbers.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    impactNumbers.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const duration = 1800;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }

  // --- Staggered fade-in for grid children ---
  const staggerGrids = document.querySelectorAll('.levels-grid, .impact-grid, .program-cards');
  if (staggerGrids.length > 0) {
    const staggerObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const children = entry.target.children;
          Array.from(children).forEach((child, i) => {
            child.style.transitionDelay = `${i * 0.1}s`;
            child.classList.add('visible');
          });
          staggerObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05 });
    staggerGrids.forEach(el => staggerObserver.observe(el));
  }

  // --- Alumni Spotlight (no JS needed — static editorial cards) ---

  // --- Sticky CTA bar: hide on scroll-down, show on scroll-up ---
  const ctaBar = document.querySelector('.sticky-cta-bar');
  if (ctaBar) {
    let lastY = 0;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y > 200 && y > lastY) {
            ctaBar.classList.add('hidden');
          } else {
            ctaBar.classList.remove('hidden');
          }
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
});
