// Performance and SEO enhancements
document.addEventListener("DOMContentLoaded", () => {
  // Service Worker registration for better caching (if available)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker not available, continue normally
    });
  }

  // Lazy load images (if Intersection Observer is supported)
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // Enhanced analytics tracking for SEO insights
  function trackUserEngagement() {
    // Track time on page
    let startTime = Date.now();
    
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      if (typeof gtag !== 'undefined' && timeOnPage > 10) {
        gtag('event', 'timing_complete', {
          name: 'time_on_page',
          value: timeOnPage
        });
      }
    });

    // Track CTA clicks
    document.querySelectorAll('.btn-primary, .cta-button').forEach(button => {
      button.addEventListener('click', () => {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'click', {
            event_category: 'CTA',
            event_label: button.textContent.trim(),
            value: 1
          });
        }
        
        // Track service inquiry
        if (typeof trackServiceInquiry === 'function') {
          trackServiceInquiry('consultation_request');
        }
      });
    });

    // Track section views for better content insights
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && typeof gtag !== 'undefined') {
          const sectionId = entry.target.id || entry.target.className;
          gtag('event', 'view_section', {
            event_category: 'engagement',
            event_label: sectionId,
            value: 1
          });
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('section[id]').forEach(section => {
      sectionObserver.observe(section);
    });
  }

  // Initialize engagement tracking
  trackUserEngagement();

  // Dark mode preference handling
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) {
    document.body.classList.add("dark");
  }

  // Mobile menu functionality with improved accessibility
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const body = document.body;

  if (mobileMenuToggle && navLinks) {
    // Update ARIA expanded state
    function updateAriaExpanded(expanded) {
      mobileMenuToggle.setAttribute('aria-expanded', expanded);
    }

    mobileMenuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.contains('mobile-menu-open');
      
      // Toggle menu visibility
      navLinks.classList.toggle('mobile-menu-open');
      mobileMenuToggle.classList.toggle('menu-active');
      
      // Prevent body scroll when menu is open
      body.classList.toggle('menu-open');
      
      // Update accessibility attributes
      updateAriaExpanded(!isOpen);
      
      // Focus management
      if (!isOpen) {
        navLinks.querySelector('a').focus();
      }
    });

    // Close menu when clicking on a nav link
    const navLinkItems = document.querySelectorAll('.nav-link');
    navLinkItems.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-menu-open');
        mobileMenuToggle.classList.remove('menu-active');
        body.classList.remove('menu-open');
        updateAriaExpanded(false);
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mobileMenuToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('mobile-menu-open');
        mobileMenuToggle.classList.remove('menu-active');
        body.classList.remove('menu-open');
        updateAriaExpanded(false);
      }
    });

    // Keyboard navigation support
    mobileMenuToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        mobileMenuToggle.click();
      }
    });
  }

  // Enhanced smooth scrolling for better UX
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = target.offsetTop - headerHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Update focus for accessibility
        target.focus();
        target.setAttribute('tabindex', '-1');
      }
    });
  });
});
