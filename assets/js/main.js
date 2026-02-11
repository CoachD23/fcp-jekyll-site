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
});
