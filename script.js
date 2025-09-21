// Simple .env Processor - Frontend Only Environment Variables
class EnvProcessor {
  constructor() {
    this.vars = {};
    this.loaded = false;
    this.loadPromise = this.loadEnv();
  }

  async loadEnv() {
    try {
      const response = await fetch('.env');
      if (!response.ok) {
        console.log('No .env file found, using defaults');
        this.setDefaults();
        this.loaded = true;
        return;
      }
      
      const envText = await response.text();
      this.parseEnv(envText);
      this.loaded = true;
      console.log('Environment variables loaded:', Object.keys(this.vars));
    } catch (error) {
      console.log('Error loading .env file, using defaults:', error.message);
      this.setDefaults();
      this.loaded = true;
    }
  }

  parseEnv(envText) {
    const lines = envText.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) return;
      
      // Match AAAA=value pattern (handles spaces in values)
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Remove quotes if present and handle empty values
        this.vars[key] = value.replace(/^["']|["']$/g, '') || '';
      }
    });
  }

  setDefaults() {
    // Fallback defaults if no .env file
    this.vars = {
      COMPANY_NAME: 'Software Antelope Ltd',
      SITE_URL: 'https://softwareantelope.com',
      GA_MEASUREMENT_ID: 'G-RSB5J5W90Z',
      CALENDLY_URL: 'https://calendly.com/youronlineuk',
      POPUP_DELAY: '120000',
      LEAD_VALUE: '400',
      FORMSPREE_ENDPOINT: '',
      CONTACT_EMAIL: 'info@softwareantelope.com',
      PHONE: '+44-7565-112990'
    };
  }

  async waitForLoad() {
    if (this.loaded) return;
    await this.loadPromise;
  }

  get(key, defaultValue = '') {
    return this.vars[key] !== undefined ? this.vars[key] : defaultValue;
  }

  getNumber(key, defaultValue = 0) {
    const value = this.get(key, defaultValue.toString());
    return parseInt(value, 10) || defaultValue;
  }

  getBoolean(key, defaultValue = false) {
    const value = this.get(key, defaultValue.toString()).toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
  }

  getAll() {
    return { ...this.vars };
  }

  // Helper method to check if required services are configured
  isServiceConfigured(service) {
    switch (service) {
      case 'formspree':
        return this.get('FORMSPREE_ENDPOINT') !== '';
      case 'analytics':
        return this.get('GA_MEASUREMENT_ID') !== '';
      case 'calendly':
        return this.get('CALENDLY_URL') !== '';
      default:
        return false;
    }
  }
}

// Initialize environment processor
window.env = new EnvProcessor();

// Universal Form Handler with Formspree Integration
class FormHandler {
  constructor() {
    this.env = window.env;
  }

  async sendToFormspree(formData, formType = 'general') {
    await this.env.waitForLoad();
    
    const endpoint = this.env.get('FORMSPREE_ENDPOINT');
    if (!endpoint || endpoint === 'https://formspree.io/f/YOUR_FORM_ID') {
      console.warn('Formspree not configured, using fallback method');
      return this.fallbackHandler(formData, formType);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          _subject: this.getEmailSubject(formType),
          _replyto: formData.email || formData._replyto,
          _form_type: formType,
          _timestamp: new Date().toISOString(),
          _url: window.location.href,
          _user_agent: navigator.userAgent
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Formspree error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      
      // Track successful form submission
      this.trackFormSubmission(formType, 'success', formData);
      
      return {
        success: true,
        message: this.env.get('SUCCESS_MESSAGE', 'Thank you! We\'ll be in touch within 24 hours.'),
        data: result
      };

    } catch (error) {
      console.error('Form submission error:', error);
      
      // Track failed submission
      this.trackFormSubmission(formType, 'error', { error: error.message });
      
      return {
        success: false,
        message: this.env.get('ERROR_MESSAGE', 'Sorry, there was an error. Please try again or call us directly.'),
        error: error.message
      };
    }
  }

  fallbackHandler(formData, formType) {
    // Fallback: Create mailto link or show contact info
    const email = this.env.get('CONTACT_EMAIL', 'hello@softwareantelope.com');
    const subject = encodeURIComponent(this.getEmailSubject(formType));
    const body = encodeURIComponent(this.formatEmailBody(formData, formType));
    
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
    
    // Track fallback usage
    this.trackFormSubmission(formType, 'fallback', formData);
    
    return {
      success: 'fallback',
      message: 'Opening your email client...',
      action: () => window.open(mailtoLink, '_blank')
    };
  }

  getEmailSubject(formType) {
    switch (formType) {
      case 'calculator':
        return this.env.get('EMAIL_SUBJECT_CALCULATOR', 'Project Complexity Assessment Results');
      case 'contact':
        return this.env.get('EMAIL_SUBJECT_CONTACT', 'New Contact Form Submission');
      case 'popup':
        return 'Fast-Track Development Inquiry';
      default:
        return 'Website Inquiry';
    }
  }

  formatEmailBody(formData, formType) {
    let body = `Form Type: ${formType}\n`;
    body += `Timestamp: ${new Date().toLocaleString()}\n`;
    body += `Website: ${window.location.href}\n\n`;
    
    // Add form data
    Object.entries(formData).forEach(([key, value]) => {
      if (!key.startsWith('_') && value) {
        body += `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}\n`;
      }
    });
    
    return body;
  }

  trackFormSubmission(formType, status, data = {}) {
    if (typeof gtag === 'function') {
      gtag('event', 'form_submission', {
        event_category: 'forms',
        event_label: formType,
        form_type: formType,
        submission_status: status,
        value: status === 'success' ? this.env.getNumber('LEAD_VALUE', 400) : 0
      });

      if (status === 'success') {
        gtag('event', 'generate_lead', {
          currency: 'GBP',
          value: this.env.getNumber('LEAD_VALUE', 400),
          lead_source: formType,
          form_type: formType
        });
      }
    }
  }

  // Utility method for showing form feedback
  showFormFeedback(container, result) {
    if (!container) return;

    const feedbackClass = result.success === true ? 'form-success' : 
                         result.success === 'fallback' ? 'form-fallback' : 'form-error';
    
    const feedbackHTML = `
      <div class="form-feedback ${feedbackClass}">
        <p>${result.message}</p>
        ${result.success === 'fallback' ? '<button onclick="result.action()" class="fallback-btn">Open Email</button>' : ''}
      </div>
    `;

    container.innerHTML = feedbackHTML;

    // Auto-remove success messages after 5 seconds
    if (result.success === true) {
      setTimeout(() => {
        container.innerHTML = '';
      }, 5000);
    }
  }
}

// Initialize form handler
window.formHandler = new FormHandler();

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

  // Initialize engagement tracking (will be enhanced by GA when loaded)
  function initializeBasicTracking() {
    // Track time on page (enhanced version handled by GA)
    let startTime = Date.now();
    
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      if (typeof gtag !== 'undefined' && timeOnPage > 10) {
        gtag('event', 'session_complete', {
          name: 'total_time_on_page',
          value: timeOnPage,
          event_category: 'engagement'
        });
      }
    });
  }

  // Initialize basic tracking
  initializeBasicTracking();

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

// Project Complexity Calculator
class ProjectCalculator {
  constructor() {
    this.currentQuestion = 1;
    this.totalQuestions = 5;
    this.answers = {};
    this.score = 0;
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateProgress();
  }

  bindEvents() {
    // Navigation buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) prevBtn.addEventListener('click', () => this.previousQuestion());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextQuestion());

    // Radio button changes
    document.querySelectorAll('.question input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleAnswerChange(e);
      });
    });

    // Email report button
    const emailBtn = document.getElementById('email-report');
    if (emailBtn) {
      emailBtn.addEventListener('click', () => {
        this.showEmailModal();
      });
    }

    // Email modal
    const modalClose = document.getElementById('modal-close');
    const emailForm = document.getElementById('email-form');
    const modalOverlay = document.querySelector('.modal-overlay');

    if (modalClose) modalClose.addEventListener('click', () => this.hideEmailModal());
    if (modalOverlay) modalOverlay.addEventListener('click', () => this.hideEmailModal());
    if (emailForm) emailForm.addEventListener('submit', (e) => this.handleEmailSubmit(e));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideEmailModal();
      }
    });
  }

  handleAnswerChange(e) {
    const questionNum = e.target.closest('.question').dataset.question;
    const questionName = e.target.name;
    const value = e.target.value;
    const score = parseInt(e.target.dataset.score) || 0;
    
    // Store answer with metadata
    this.answers[questionName] = {
      value: value,
      score: score,
      element: e.target
    };

    // Track analytics
    this.trackQuestionAnswer(questionNum, questionName, value);

    // Enable next button
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
      nextBtn.disabled = false;
      if (this.currentQuestion === this.totalQuestions) {
        nextBtn.textContent = 'Calculate Results';
      }
    }
  }

  previousQuestion() {
    if (this.currentQuestion > 1) {
      this.currentQuestion--;
      this.showQuestion(this.currentQuestion);
      this.updateProgress();
      this.updateNavigation();
    }
  }

  nextQuestion() {
    if (this.currentQuestion < this.totalQuestions) {
      this.currentQuestion++;
      this.showQuestion(this.currentQuestion);
      this.updateProgress();
      this.updateNavigation();
    } else {
      // Show results
      this.calculateResults();
    }
  }

  showQuestion(questionNum) {
    // Hide all questions
    document.querySelectorAll('.question').forEach(q => {
      q.classList.remove('active');
    });
    
    // Show current question
    const currentQ = document.querySelector(`.question[data-question="${questionNum}"]`);
    if (currentQ) {
      currentQ.classList.add('active');
    }
  }

  updateProgress() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    const percentage = (this.currentQuestion / this.totalQuestions) * 100;
    
    if (progressFill) {
      progressFill.style.width = percentage + '%';
    }
    
    if (progressText) {
      progressText.textContent = `Question ${this.currentQuestion} of ${this.totalQuestions}`;
    }
  }

  updateNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
      prevBtn.disabled = this.currentQuestion === 1;
    }
    
    if (nextBtn) {
      // Check if current question is answered
      const currentQuestionElement = document.querySelector(`.question[data-question="${this.currentQuestion}"]`);
      const hasAnswer = currentQuestionElement && currentQuestionElement.querySelector('input:checked');
      
      nextBtn.disabled = !hasAnswer;
      
      if (this.currentQuestion === this.totalQuestions) {
        nextBtn.textContent = 'Calculate Results';
      } else {
        nextBtn.textContent = 'Next Question';
      }
    }
  }

  calculateResults() {
    // Calculate compatibility score
    this.score = this.calculateCompatibilityScore();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations();
    
    // Show results section
    this.showResults(recommendations);
    
    // Track completion
    this.trackCalculatorCompletion();
  }

  calculateCompatibilityScore() {
    let totalScore = 0;
    let maxPossibleScore = 175; // Adjusted for realistic scoring
    
    // Project type scoring (higher for our sweet spots)
    const projectType = this.answers['project-type'];
    if (projectType) {
      if (projectType.value === 'webapp' || projectType.value === 'saas') {
        totalScore += 35; // Our specialty
      } else if (projectType.value === 'aiapp') {
        totalScore += 30; // requires a team
      } else if (projectType.value === 'enterprise') {
        totalScore += 25; // Good fit with team
      } else if (projectType.value === 'website') {
        totalScore += 30; // Quick wins
      } else {
        totalScore += projectType.score;
      }
    }

    // Timeline scoring (realistic expectations)
    const timeline = this.answers['timeline'];
    if (timeline) {
      if (timeline.value === 'asap') {
        totalScore += 15; // Rush jobs are risky
      } else if (timeline.value === '3-months' || timeline.value === 'flexible') {
        totalScore += 35; // Sweet spot
      } else {
        totalScore += timeline.score;
      }
    }

    // Readiness scoring
    const readiness = this.answers['readiness'];
    if (readiness) {
      totalScore += readiness.score;
    }

    // Team preference scoring
    const teamType = this.answers['team-type'];
    if (teamType) {
      if (teamType.value === 'not-sure') {
        totalScore += 25; // We can guide
      } else {
        totalScore += teamType.score;
      }
    }

    // Goal scoring
    const goal = this.answers['goal'];
    if (goal) {
      totalScore += goal.score;
    }

    // Convert to percentage
    return Math.min(Math.round((totalScore / maxPossibleScore) * 100), 99);
  }

  generateRecommendations() {
    const projectType = this.answers['project-type']?.value;
    const timeline = this.answers['timeline']?.value;
    const readiness = this.answers['readiness']?.value;
    const teamType = this.answers['team-type']?.value;
    const goal = this.answers['goal']?.value;

    // Project summary
    const projectTypeLabels = {
      'website': 'Website/Landing Page',
      'webapp': 'Web Application',
      'ecommerce': 'E-commerce Platform',
      'saas': 'SaaS Platform',
      'enterprise': 'Enterprise System'
    };

    // Timeline estimates based on project type and readiness
    const timelineEstimates = {
      'website': { min: 1, max: 8, unit: 'days' },
      'webapp': { min: 2, max: 12, unit: 'weeks' },
      'ecommerce': { min: 8, max: 16, unit: 'weeks' },
      'saas': { min: 8, max: 24, unit: 'weeks' },
      'enterprise': { min: 16, max: 32, unit: 'weeks' }
    };

    // Adjust timeline based on readiness
    let timeEst = timelineEstimates[projectType] || { min: 4, max: 8, unit: 'weeks' };
    if (readiness === 'idea') {
      timeEst.min += 2;
      timeEst.max += 4;
    } else if (readiness === 'designed') {
      timeEst.min = Math.max(1, timeEst.min - 2);
      timeEst.max = Math.max(2, timeEst.max - 2);
    }

    // Team recommendations
    const teamRecommendations = {
      'solo-fast': 'Solo Developer - Instant Collaboration Service',
      'solo-quality': 'Solo Developer - Quality-Focused Development',
      'small-team': 'Small Managed Team - Specialist Skills',
      'not-sure': 'Consultation - We\'ll recommend the best approach'
    };

    return {
      projectSummary: `${projectTypeLabels[projectType] || 'Custom Project'} with ${timeline?.replace('-', ' to ') || 'flexible'} timeline`,
      timelineEstimate: `${timeEst.min}-${timeEst.max} ${timeEst.unit}`,
      approach: teamRecommendations[teamType] || 'Custom approach based on your needs',
      nextSteps: this.generateNextSteps()
    };
  }

  generateNextSteps() {
    const score = this.score;
    
    if (score >= 85) {
      return {
        title: 'Excellent Fit - Let\'s Start Planning',
        steps: [
          'Book a free 30-minute strategy session',
          'We\'ll provide a detailed project roadmap',
          'Get a fixed-price quote within 48 hours',
          'Start development within 1 week of agreement'
        ]
      };
    } else if (score >= 70) {
      return {
        title: 'Good Fit - Some Planning Needed',
        steps: [
          'Free consultation to refine your requirements',
          'We\'ll suggest the optimal development approach',
          'Discuss timeline and budget considerations',
          'Create a detailed project specification'
        ]
      };
    } else if (score >= 50) {
      return {
        title: 'Potential Fit - Let\'s Explore Options',
        steps: [
          'Discovery session to understand your vision',
          'Explore alternative approaches and technologies',
          'Discuss phased development to manage complexity',
          'Create a realistic timeline and budget'
        ]
      };
    } else {
      return {
        title: 'Consultation Recommended',
        steps: [
          'Free consultation to understand your needs better',
          'Explore whether your project might be better suited for a different approach',
          'Discuss alternative solutions or phased development',
          'Get honest advice about the best path forward'
        ]
      };
    }
  }

  showResults(recommendations) {
    // Hide questions
    document.getElementById('calculator-questions').style.display = 'none';
    document.querySelector('.calculator-nav').style.display = 'none';
    
    // Show results
    const resultsSection = document.getElementById('calculator-results');
    resultsSection.style.display = 'block';

    // Animate score
    this.animateScore();

    // Populate content
    document.getElementById('compatibility-text').textContent = 
      this.score >= 85 ? 'Excellent Fit!' :
      this.score >= 70 ? 'Great Fit!' :
      this.score >= 50 ? 'Good Potential!' : 'Let\'s Explore Options';

    document.getElementById('project-summary').innerHTML = `
      <p><strong>Project Type:</strong> ${recommendations.projectSummary}</p>
      <p><strong>Readiness Level:</strong> ${this.getReadinessDescription()}</p>
    `;

    document.getElementById('timeline-estimate').innerHTML = `
      <p><strong>Estimated Duration:</strong> ${recommendations.timelineEstimate}</p>
      <p><strong>Approach:</strong> ${this.getApproachDescription()}</p>
    `;

    document.getElementById('approach-recommendation').innerHTML = `
      <p><strong>Recommended Team:</strong> ${recommendations.approach}</p>
      <p><strong>Best Fit Because:</strong> ${this.getWhyGoodFit()}</p>
    `;

    const nextSteps = recommendations.nextSteps;
    document.getElementById('next-steps').innerHTML = `
      <h5>${nextSteps.title}</h5>
      <ol>
        ${nextSteps.steps.map(step => `<li>${step}</li>`).join('')}
      </ol>
    `;

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }

  animateScore() {
    const scoreElement = document.getElementById('score-number');
    const finalScore = this.score;
    let currentScore = 0;
    const increment = finalScore / 30; // Animation duration
    
    const timer = setInterval(() => {
      currentScore += increment;
      if (currentScore >= finalScore) {
        scoreElement.textContent = finalScore;
        clearInterval(timer);
        
        // Add completion class for styling
        document.getElementById('score-circle').classList.add('completed');
      } else {
        scoreElement.textContent = Math.floor(currentScore);
      }
    }, 50);
  }

  getReadinessDescription() {
    const readiness = this.answers['readiness']?.value;
    const descriptions = {
      'idea': 'Early stage - need to define requirements',
      'outlined': 'High-level concept ready for technical planning',
      'detailed': 'Well-defined requirements ready for development',
      'designed': 'Fully spec\'d with designs - ready to build',
      'started': 'Partially built - needs completion or fixes'
    };
    return descriptions[readiness] || 'Custom situation';
  }

  getApproachDescription() {
    const timeline = this.answers['timeline']?.value;
    const approaches = {
      'asap': 'Rapid prototyping with iterative improvements',
      '1-month': 'Focused sprint development with core features',
      '3-months': 'Balanced development with thorough testing',
      '6-months': 'Comprehensive build with extensive features',
      'flexible': 'Quality-focused with adaptable timeline'
    };
    return approaches[timeline] || 'Custom timeline approach';
  }

  getWhyGoodFit() {
    const projectType = this.answers['project-type']?.value;
    const score = this.score;
    
    if (score >= 85) {
      return 'This project aligns perfectly with our expertise and proven development processes.';
    } else if (score >= 70) {
      return 'Good match for our skills with some planning to optimize the approach.';
    } else if (score >= 50) {
      return 'We can help, but may need to adjust scope or timeline for best results.';
    } else {
      return 'Let\'s discuss how to structure this project for success.';
    }
  }

  showEmailModal() {
    document.getElementById('email-modal').style.display = 'flex';
    document.getElementById('report-email').focus();
  }

  hideEmailModal() {
    document.getElementById('email-modal').style.display = 'none';
  }

  handleEmailSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const name = formData.get('name');
    const company = formData.get('company');
    
    // Send to Formspree with calculator results
    this.sendCalculatorResults(email, name, company);
  }

  async sendCalculatorResults(email, name, company) {
    // Show loading state
    const submitBtn = document.querySelector('#email-form button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    // Prepare calculator results data
    const results = {
      score: this.score,
      projectType: this.answers['project-type']?.value || 'unknown',
      timeline: this.answers['timeline']?.value || 'unknown',
      readiness: this.answers['readiness']?.value || 'unknown',
      teamType: this.answers['team-type']?.value || 'unknown',
      goal: this.answers['goal']?.value || 'unknown'
    };

    const formData = {
      email: email,
      name: name || 'Calculator User',
      company: company || '',
      message: 'Project Complexity Calculator Results',
      
      // Calculator specific data
      compatibility_score: this.score,
      project_type: results.projectType,
      timeline_preference: results.timeline,
      project_readiness: results.readiness,
      team_preference: results.teamType,
      primary_goal: results.goal,
      
      // Generated recommendations
      estimated_timeline: this.generateTimelineEstimate(results),
      recommended_approach: this.generateApproachRecommendation(results),
      
      // Formatted results for email
      calculator_summary: this.formatCalculatorSummary(results)
    };

    try {
      // Send via FormHandler
      const result = await window.formHandler.sendToFormspree(formData, 'calculator');
      
      if (result.success === true) {
        // Formspree success - show consultation booking flow
        this.showConsultationSuccess(email, name);
        
        // Store lead data locally as backup
        this.storeLeadData(email, name, company, results);
        
      } else if (result.success === 'fallback') {
        // Fallback to email client
        this.showFallbackSuccess(email, name, result);
        
      } else {
        // Error occurred
        this.showSubmissionError(result.message);
      }
      
    } catch (error) {
      console.error('Calculator submission error:', error);
      this.showSubmissionError('Unable to send results. Please try booking a consultation directly.');
    }
    
    // Reset button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }

  generateTimelineEstimate(results) {
    const timelineEstimates = {
      'website': '2-4 weeks',
      'webapp': '6-12 weeks', 
      'ecommerce': '8-16 weeks',
      'saas': '12-24 weeks',
      'enterprise': '16-32 weeks'
    };
    
    let estimate = timelineEstimates[results.projectType] || '4-8 weeks';
    
    // Adjust based on readiness
    if (results.readiness === 'idea') {
      estimate = estimate.replace(/(\d+)/g, (match) => parseInt(match) + 2);
    } else if (results.readiness === 'designed') {
      estimate = estimate.replace(/(\d+)/g, (match) => Math.max(1, parseInt(match) - 2));
    }
    
    return estimate;
  }

  generateApproachRecommendation(results) {
    const approaches = {
      'solo-fast': 'Instant Collaboration Service - Direct development with experienced developer',
      'solo-quality': 'Quality-Focused Solo Development - Thorough documentation and best practices',
      'small-team': 'Small Managed Team - Specialist skills with project management',
      'not-sure': 'Consultation-Based Approach - We\'ll recommend the optimal strategy'
    };
    
    return approaches[results.teamType] || 'Custom approach based on project needs';
  }

  formatCalculatorSummary(results) {
    return `
Assessment Score: ${this.score}%
Project Type: ${results.projectType}
Timeline Preference: ${results.timeline}
Project Readiness: ${results.readiness}
Team Preference: ${results.teamType}
Primary Goal: ${results.goal}

Estimated Timeline: ${this.generateTimelineEstimate(results)}
Recommended Approach: ${this.generateApproachRecommendation(results)}
    `.trim();
  }

  storeLeadData(email, name, company, results) {
    const leadData = {
      email,
      name: name || 'Calculator User',
      company: company || '',
      timestamp: new Date().toISOString(),
      source: 'project_calculator',
      results,
      score: this.score,
      userAgent: navigator.userAgent,
      referrer: document.referrer || 'direct'
    };
    
    localStorage.setItem('calculator_lead', JSON.stringify(leadData));
    
    // Add to leads collection
    const existingLeads = JSON.parse(localStorage.getItem('all_leads') || '[]');
    existingLeads.push(leadData);
    localStorage.setItem('all_leads', JSON.stringify(existingLeads));
  }

  showFallbackSuccess(email, name, result) {
    const modal = document.getElementById('email-modal');
    modal.querySelector('.modal-body').innerHTML = `
      <div class="success-message">
        <h4>📧 Email Draft Ready</h4>
        <p>We'll open your email client with a pre-filled message containing your assessment results.</p>
        <p><strong>Alternative:</strong> Book a consultation directly below instead.</p>
        <div class="fallback-buttons">
          <button class="calc-btn calc-btn-primary" onclick="(${result.action.toString()})()">
            Open Email Client
          </button>
          <a href="#contact" class="calc-btn calc-btn-secondary" onclick="document.getElementById('email-modal').style.display='none'; document.getElementById('contact').scrollIntoView({behavior: 'smooth'});">
            Book Consultation Instead
          </a>
        </div>
      </div>
    `;
  }

  showSubmissionError(message) {
    const modal = document.getElementById('email-modal');
    modal.querySelector('.modal-body').innerHTML = `
      <div class="error-message">
        <h4>⚠️ Unable to Send Report</h4>
        <p>${message}</p>
        <p><strong>No worries!</strong> Let's discuss your project directly instead.</p>
        <div class="error-buttons">
          <a href="#contact" class="calc-btn calc-btn-primary" onclick="document.getElementById('email-modal').style.display='none'; document.getElementById('contact').scrollIntoView({behavior: 'smooth'});">
            Book Free Consultation
          </a>
          <button class="calc-btn calc-btn-secondary" onclick="document.getElementById('email-modal').style.display='none'">
            I'll Try Later
          </button>
        </div>
        <p class="contact-info">
          <small>Or call us directly: ${window.env ? window.env.get('PHONE', '+44-7565-112990') : '+44-7565-112990'}</small>
        </p>
      </div>
    `;
  }

  captureLeadAndBook(email, name, company) {
    // This method now calls sendCalculatorResults for consistency
    this.sendCalculatorResults(email, name, company);
  }

  showConsultationSuccess(email, name) {
    const modal = document.getElementById('email-modal');
    const displayName = name || email.split('@')[0];
    
    modal.querySelector('.modal-body').innerHTML = `
      <div class="success-message">
        <h4>🎯 Perfect, ${displayName}!</h4>
        <p>Your project assessment shows <strong>${this.score}% compatibility</strong> with our expertise.</p>
        <p><strong>Next step:</strong> Let's discuss your specific requirements in a free 30-minute strategy session.</p>
        <div class="consultation-benefits">
          <h5>In your consultation, we'll cover:</h5>
          <ul>
            <li>✅ Detailed timeline breakdown for your project</li>
            <li>✅ Technology recommendations based on your needs</li>
            <li>✅ Risk assessment and mitigation strategies</li>
            <li>✅ Fixed-price quote within 48 hours</li>
            <li>✅ No obligation - valuable insights regardless</li>
          </ul>
        </div>
        <div class="cta-buttons">
          <a href="#contact" class="calc-btn calc-btn-primary calc-btn-large" onclick="this.closest('.calculator-modal').style.display='none'; document.getElementById('contact').scrollIntoView({behavior: 'smooth'});">
            Book My Free Strategy Session
          </a>
          <button class="calc-btn calc-btn-secondary" onclick="this.closest('.calculator-modal').style.display='none';">
            I'll Book Later
          </button>
        </div>
      </div>
    `;
  }

  simulateEmailSend(email, name, company) {
    // This function is replaced by captureLeadAndBook
    this.captureLeadAndBook(email, name, company);
  }

  // Analytics tracking functions
  trackQuestionAnswer(questionNum, questionName, value) {
    if (typeof gtag === 'function') {
      gtag('event', 'calculator_question_answered', {
        event_category: 'calculator',
        event_label: `Q${questionNum}: ${questionName}`,
        custom_parameter: value,
        question_number: questionNum
      });
    }
  }

  trackCalculatorCompletion() {
    if (typeof gtag === 'function') {
      gtag('event', 'calculator_completed', {
        event_category: 'calculator',
        event_label: 'assessment_finished',
        value: this.score,
        compatibility_score: this.score,
        project_type: this.answers['project-type']?.value || 'unknown'
      });
    }
  }

  trackCalculatorConversion(conversionType, additionalData = {}) {
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', {
        event_category: 'calculator',
        event_label: conversionType,
        value: conversionType === 'consultation-booking' ? 400 : 200, // Lead values
        conversion_type: conversionType,
        calculator_score: this.score,
        ...additionalData
      });
      
      // Enhanced tracking
      gtag('event', 'generate_lead', {
        currency: 'GBP',
        value: conversionType === 'consultation-booking' ? 400 : 200,
        lead_source: 'project_calculator',
        calculator_score: this.score
      });
    }
  }
}

// Global function for tracking conversions (called from HTML)
function trackCalculatorConversion(conversionType) {
  if (window.projectCalculator) {
    window.projectCalculator.trackCalculatorConversion(conversionType);
  }
}

// Initialize calculator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize calculator if the section exists
  if (document.getElementById('calculator')) {
    window.projectCalculator = new ProjectCalculator();
  }
});

// Smart Pricing Popup System
class SmartPricingPopup {
  constructor() {
    this.timeThreshold = 120000; // 120 seconds
    this.hasShown = false;
    this.calculatorCompleted = false;
    this.exitIntentTriggered = false;
    this.startTime = Date.now();
    
    this.init();
  }

  init() {
    // Check if popup has been shown before (respect user choice)
    if (localStorage.getItem('pricing-popup-dismissed')) {
      return;
    }

    // Check if calculator was completed (no popup needed)
    this.checkCalculatorStatus();
    
    // Set up event listeners
    this.bindEvents();
    
    // Start time-based trigger
    this.startTimeBasedTrigger();
  }

  checkCalculatorStatus() {
    // Check if calculator was completed in this session
    const calculatorLead = localStorage.getItem('calculator_lead');
    if (calculatorLead) {
      const leadData = JSON.parse(calculatorLead);
      const leadTime = new Date(leadData.timestamp).getTime();
      const now = Date.now();
      
      // If calculator was completed within last 24 hours, don't show popup
      if (now - leadTime < 86400000) { // 24 hours
        this.calculatorCompleted = true;
        return;
      }
    }

    // Check if user is currently on calculator section
    if (window.location.hash === '#calculator') {
      this.calculatorCompleted = true;
      return;
    }

    // Listen for calculator completion
    document.addEventListener('calculator-completed', () => {
      this.calculatorCompleted = true;
    });
  }

  bindEvents() {
    // Exit intent detection (desktop)
    if (!this.isMobile()) {
      document.addEventListener('mouseleave', (e) => {
        if (e.clientY <= 0 && !this.exitIntentTriggered) {
          this.triggerExitIntent();
        }
      });
    }

    // Mobile scroll-up detection (mobile exit intent)
    if (this.isMobile()) {
      let lastScrollY = window.scrollY;
      
      window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // If user scrolls up quickly near top of page
        if (currentScrollY < lastScrollY && currentScrollY < 100 && !this.exitIntentTriggered) {
          this.triggerExitIntent();
        }
        
        lastScrollY = currentScrollY;
      });
    }

    // Popup dismiss handlers
    document.addEventListener('click', (e) => {
      if (e.target.id === 'pricing-popup-overlay' || e.target.id === 'pricing-popup-close') {
        this.dismissPopup();
      }
    });

    // Keyboard escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('pricing-popup')) {
        this.dismissPopup();
      }
    });
  }

  startTimeBasedTrigger() {
    setTimeout(() => {
      if (!this.hasShown && !this.calculatorCompleted) {
        this.showPopup('time-based');
      }
    }, this.timeThreshold);
  }

  triggerExitIntent() {
    this.exitIntentTriggered = true;
    
    // Only show if enough time has passed and popup hasn't been shown
    const timeElapsed = Date.now() - this.startTime;
    if (timeElapsed > 30000 && !this.hasShown && !this.calculatorCompleted) { // At least 30 seconds
      this.showPopup('exit-intent');
    }
  }

  showPopup(trigger) {
    if (this.hasShown || this.calculatorCompleted) return;
    
    this.hasShown = true;
    
    // Track popup display
    if (typeof gtag === 'function') {
      gtag('event', 'popup_displayed', {
        event_category: 'engagement',
        event_label: 'pricing_popup',
        trigger_type: trigger,
        time_on_page: Math.round((Date.now() - this.startTime) / 1000)
      });
    }

    // Create popup HTML
    this.createPopupHTML();
    
    // Show with animation
    const popup = document.getElementById('pricing-popup');
    popup.style.display = 'flex';
    
    // Animate in
    setTimeout(() => {
      popup.classList.add('popup-visible');
    }, 50);
  }

  createPopupHTML() {
    const popupHTML = `
      <div id="pricing-popup" class="pricing-popup">
        <div id="pricing-popup-overlay" class="popup-overlay"></div>
        <div class="popup-content">
          <button id="pricing-popup-close" class="popup-close" aria-label="Close popup">&times;</button>
          
          <div class="popup-header">
            <h3>🚀 Limited Time: Fast-Track Your Project</h3>
            <div class="urgency-indicator">
              <span class="urgency-dot"></span>
              <span>Special pricing available now</span>
            </div>
          </div>

          <div class="popup-body">
            <div class="offer-content">
              <div class="offer-badge">Founder's Special Offer</div>
              
              <h4>Start Your Project in 7 Days</h4>
              <p class="offer-description">
                Skip the usual 2-3 week planning phase. Get a complete project roadmap 
                and fixed-price quote within 48 hours of our consultation.
              </p>

              <div class="offer-benefits">
                <div class="benefit-item">
                  <span class="benefit-icon">⚡</span>
                  <div>
                    <strong>Fast-Track Development</strong>
                    <p>Start building within 7 days of agreement</p>
                  </div>
                </div>
                <div class="benefit-item">
                  <span class="benefit-icon">💰</span>
                  <div>
                    <strong>50% Deposit Only</strong>
                    <p>Reduced upfront payment vs. standard terms</p>
                  </div>
                </div>
                <div class="benefit-item">
                  <span class="benefit-icon">🎯</span>
                  <div>
                    <strong>Fixed-Price Guarantee</strong>
                    <p>No surprises - know your exact cost upfront</p>
                  </div>
                </div>
                <div class="benefit-item">
                  <span class="benefit-icon">🛡️</span>
                  <div>
                    <strong>30-Day Satisfaction Guarantee</strong>
                    <p>Risk-free development with full warranty</p>
                  </div>
                </div>
              </div>

              <div class="social-proof">
                <p class="social-proof-text">
                  <strong>Join 50+ successful projects</strong> including Pfizer, Tesco, and Virgin Media
                </p>
              </div>
            </div>
          </div>

          <div class="popup-footer">
            <div class="cta-section">
              <p class="cta-text">Ready to fast-track your project?</p>
              <div class="popup-buttons">
                <button class="popup-btn popup-btn-primary" onclick="window.smartPopup.takeOffer()">
                  Claim Fast-Track Offer
                </button>
                <button class="popup-btn popup-btn-secondary" onclick="window.smartPopup.showCalculator()">
                  Take Project Assessment First
                </button>
              </div>
              <p class="disclaimer">No spam, no obligation. Just expert guidance.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', popupHTML);
  }

  takeOffer() {
    // Track conversion
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', {
        event_category: 'popup',
        event_label: 'fast_track_offer',
        value: 400,
        currency: 'GBP',
        conversion_type: 'popup_to_consultation'
      });

      gtag('event', 'generate_lead', {
        currency: 'GBP',
        value: 400,
        lead_source: 'pricing_popup',
        offer_type: 'fast_track'
      });
    }

    // Store offer acceptance
    localStorage.setItem('fast-track-offer-claimed', JSON.stringify({
      timestamp: new Date().toISOString(),
      offer: 'fast_track_development',
      value: 'consultation_booking'
    }));

    // Close popup and scroll to contact
    this.dismissPopup(false); // Don't mark as dismissed permanently
    
    // Show confirmation and scroll to contact
    setTimeout(() => {
      document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
      
      // Optional: Show confirmation message
      this.showOfferConfirmation();
    }, 300);
  }

  showCalculator() {
    // Track calculator redirect
    if (typeof gtag === 'function') {
      gtag('event', 'click', {
        event_category: 'popup',
        event_label: 'calculator_redirect',
        popup_type: 'pricing'
      });
    }

    // Close popup and go to calculator
    this.dismissPopup(false);
    
    setTimeout(() => {
      window.location.hash = '#calculator';
      document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }

  showOfferConfirmation() {
    // Create a temporary confirmation message
    const confirmationHTML = `
      <div id="offer-confirmation" class="offer-confirmation">
        <div class="confirmation-content">
          <h4>🎉 Fast-Track Offer Claimed!</h4>
          <p>Book your consultation below to get started within 7 days.</p>
          <p><strong>Remember:</strong> Mention "Fast-Track Offer" for 50% deposit terms.</p>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', confirmationHTML);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      const confirmation = document.getElementById('offer-confirmation');
      if (confirmation) {
        confirmation.remove();
      }
    }, 8000);
  }

  dismissPopup(permanent = true) {
    const popup = document.getElementById('pricing-popup');
    if (!popup) return;

    // Animate out
    popup.classList.remove('popup-visible');
    
    setTimeout(() => {
      popup.remove();
    }, 300);

    if (permanent) {
      // Remember user dismissed popup (respect their choice)
      localStorage.setItem('pricing-popup-dismissed', Date.now().toString());
      
      // Track dismissal
      if (typeof gtag === 'function') {
        gtag('event', 'popup_dismissed', {
          event_category: 'engagement',
          event_label: 'pricing_popup',
          time_on_page: Math.round((Date.now() - this.startTime) / 1000)
        });
      }
    }
  }

  isMobile() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}

// Global functions for popup actions
window.smartPopup = null;

// Initialize smart popup system
document.addEventListener('DOMContentLoaded', () => {
  // Initialize calculator if the section exists
  if (document.getElementById('calculator')) {
    window.projectCalculator = new ProjectCalculator();
  }

  // Initialize contact form handler
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactFormSubmit);
  }

  // Initialize popup system with slight delay to ensure other systems load first
  setTimeout(() => {
    window.smartPopup = new SmartPricingPopup();
  }, 5000); // 5 second delay before popup system starts monitoring
});

// Contact Form Handler
async function handleContactFormSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  const feedbackContainer = document.getElementById('contact-form-feedback');
  
  // Show loading state
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;
  
  // Clear previous feedback
  feedbackContainer.innerHTML = '';
  
  // Prepare form data
  const contactData = {
    name: formData.get('name'),
    email: formData.get('email'),
    company: formData.get('company') || '',
    phone: formData.get('phone') || '',
    project_type: formData.get('project_type') || 'Not specified',
    budget_range: formData.get('budget_range') || 'Not specified',
    timeline: formData.get('timeline') || 'Not specified',
    message: formData.get('message'),
    
    // Additional context
    source: 'contact_form',
    page_url: window.location.href,
    referrer: document.referrer || 'Direct'
  };
  
  try {
    // Send via FormHandler
    const result = await window.formHandler.sendToFormspree(contactData, 'contact');
    
    if (result.success === true) {
      // Success - show confirmation
      feedbackContainer.innerHTML = `
        <div class="form-feedback form-success">
          <h4>✅ Message Sent Successfully!</h4>
          <p>Thank you for your inquiry. We'll review your project details and respond within 24 hours.</p>
          <p><strong>Next steps:</strong></p>
          <ul>
            <li>We'll analyze your requirements</li>
            <li>Prepare a tailored response</li>
            <li>Schedule a follow-up call if needed</li>
          </ul>
        </div>
      `;
      
      // Clear form on success
      form.reset();
      
      // Track successful contact form submission
      if (typeof gtag === 'function') {
        gtag('event', 'generate_lead', {
          currency: 'GBP',
          value: window.env.getNumber('LEAD_VALUE', 400),
          lead_source: 'contact_form',
          project_type: contactData.project_type,
          budget_range: contactData.budget_range
        });
      }
      
    } else if (result.success === 'fallback') {
      // Fallback to email client
      feedbackContainer.innerHTML = `
        <div class="form-feedback form-fallback">
          <h4>📧 Email Draft Ready</h4>
          <p>We'll open your email client with your message pre-filled.</p>
          <button onclick="${result.action}" class="btn-primary">Open Email Client</button>
          <p><small>Alternative: Call us directly at ${window.env.get('PHONE', '+44-7565-112990')}</small></p>
        </div>
      `;
      
    } else {
      // Error occurred
      feedbackContainer.innerHTML = `
        <div class="form-feedback form-error">
          <h4>⚠️ Unable to Send Message</h4>
          <p>${result.message}</p>
          <p><strong>Alternative contact methods:</strong></p>
          <ul>
            <li>Call us: ${window.env.get('PHONE', '+44-7565-112990')}</li>
            <li>Email: ${window.env.get('CONTACT_EMAIL', 'hello@softwareantelope.com')}</li>
            <li>Book a consultation using the calendar below</li>
          </ul>
          <button onclick="this.closest('.form-feedback').remove()" class="btn-secondary">Try Again</button>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Contact form error:', error);
    feedbackContainer.innerHTML = `
      <div class="form-feedback form-error">
        <h4>⚠️ Technical Error</h4>
        <p>Sorry, there was a technical issue. Please try one of these alternatives:</p>
        <ul>
          <li>Call us directly: ${window.env.get('PHONE', '+44-7565-112990')}</li>
          <li>Email: ${window.env.get('CONTACT_EMAIL', 'hello@softwareantelope.com')}</li>
          <li>Use the booking calendar below</li>
        </ul>
      </div>
    `;
  }
  
  // Reset button state
  submitBtn.textContent = originalText;
  submitBtn.disabled = false;
  
  // Scroll to feedback
  feedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
