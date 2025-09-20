// Cookie Consent Management - GDPR Compliant
class CookieConsent {
  constructor() {
    this.consentKey = 'cookie-consent';
    this.consentExpiry = 365; // days
    this.consent = this.getStoredConsent();
    this.init();
  }

  init() {
    // Check if user has already made a choice
    if (this.consent) {
      this.applyConsent();
      this.showCookieManagement();
    } else {
      this.showConsentBanner();
    }
    this.bindEvents();
  }

  getStoredConsent() {
    const stored = localStorage.getItem(this.consentKey);
    if (stored) {
      const consent = JSON.parse(stored);
      // Check if consent has expired
      if (new Date(consent.expires) > new Date()) {
        return consent;
      } else {
        localStorage.removeItem(this.consentKey);
      }
    }
    return null;
  }

  saveConsent(analytics = false) {
    const expires = new Date();
    expires.setDate(expires.getDate() + this.consentExpiry);
    
    const consent = {
      analytics: analytics,
      timestamp: new Date().toISOString(),
      expires: expires.toISOString(),
      version: '1.0'
    };
    
    localStorage.setItem(this.consentKey, JSON.stringify(consent));
    this.consent = consent;
  }

  applyConsent() {
    if (this.consent && this.consent.analytics) {
      // Load Google Analytics
      if (typeof loadGoogleAnalytics === 'function') {
        loadGoogleAnalytics();
      }
    }
  }

  showConsentBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.style.display = 'block';
      // Focus on the banner for accessibility
      banner.focus();
    }
  }

  hideConsentBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.style.display = 'none';
    }
  }

  showCookieManagement() {
    const management = document.getElementById('cookie-management-link');
    if (management) {
      management.style.display = 'block';
    }
  }

  showSettingsModal() {
    const modal = document.getElementById('cookie-settings-modal');
    const analyticsCheckbox = document.getElementById('analytics-consent');
    
    if (modal) {
      modal.style.display = 'flex';
      // Set current consent state
      if (analyticsCheckbox) {
        analyticsCheckbox.checked = this.consent ? this.consent.analytics : false;
      }
      // Focus on modal for accessibility
      const closeBtn = modal.querySelector('#cookie-modal-close');
      if (closeBtn) closeBtn.focus();
    }
  }

  hideSettingsModal() {
    const modal = document.getElementById('cookie-settings-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  acceptAll() {
    this.saveConsent(true);
    this.applyConsent();
    this.hideConsentBanner();
    this.showCookieManagement();
  }

  rejectAll() {
    this.saveConsent(false);
    this.hideConsentBanner();
    this.showCookieManagement();
  }

  savePreferences() {
    const analyticsCheckbox = document.getElementById('analytics-consent');
    const analyticsConsent = analyticsCheckbox ? analyticsCheckbox.checked : false;
    
    this.saveConsent(analyticsConsent);
    this.applyConsent();
    this.hideSettingsModal();
    this.hideConsentBanner();
    this.showCookieManagement();
  }

  bindEvents() {
    // Banner buttons
    const acceptBtn = document.getElementById('cookie-accept-all');
    const rejectBtn = document.getElementById('cookie-reject-all');
    const settingsBtn = document.getElementById('cookie-settings');
    
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => this.acceptAll());
    }
    
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => this.rejectAll());
    }
    
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.showSettingsModal());
    }

    // Modal buttons
    const modalClose = document.getElementById('cookie-modal-close');
    const savePrefs = document.getElementById('cookie-save-preferences');
    const acceptAllModal = document.getElementById('cookie-accept-all-modal');
    const manageCookies = document.getElementById('manage-cookies');
    const modalOverlay = document.querySelector('.cookie-modal-overlay');
    
    if (modalClose) {
      modalClose.addEventListener('click', () => this.hideSettingsModal());
    }
    
    if (savePrefs) {
      savePrefs.addEventListener('click', () => this.savePreferences());
    }
    
    if (acceptAllModal) {
      acceptAllModal.addEventListener('click', () => {
        const analyticsCheckbox = document.getElementById('analytics-consent');
        if (analyticsCheckbox) analyticsCheckbox.checked = true;
        this.savePreferences();
      });
    }
    
    if (manageCookies) {
      manageCookies.addEventListener('click', () => this.showSettingsModal());
    }
    
    if (modalOverlay) {
      modalOverlay.addEventListener('click', () => this.hideSettingsModal());
    }

    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideSettingsModal();
      }
    });
  }
}

// Performance and SEO enhancements
document.addEventListener("DOMContentLoaded", () => {
  // Initialize cookie consent system
  new CookieConsent();

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
