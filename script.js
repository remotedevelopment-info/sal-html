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
      'website': { min: 2, max: 4, unit: 'weeks' },
      'webapp': { min: 6, max: 12, unit: 'weeks' },
      'ecommerce': { min: 8, max: 16, unit: 'weeks' },
      'saas': { min: 12, max: 24, unit: 'weeks' },
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
    
    // Track conversion
    this.trackCalculatorConversion('email-report', {
      email: email,
      name: name || 'Anonymous',
      company: company || 'Not specified'
    });
    
    // Simulate sending (replace with actual email service)
    this.simulateEmailSend(email, name, company);
  }

  simulateEmailSend(email, name, company) {
    // Show loading state
    const submitBtn = document.querySelector('#email-form button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    // Simulate API call delay
    setTimeout(() => {
      // Show success message
      const modal = document.getElementById('email-modal');
      modal.querySelector('.modal-body').innerHTML = `
        <div class="success-message">
          <h4>✅ Report Sent!</h4>
          <p>We've sent your detailed project assessment to <strong>${email}</strong></p>
          <p>You should receive it within the next few minutes. Check your spam folder if you don't see it.</p>
          <p><strong>Next step:</strong> Book a free consultation to discuss your project in detail.</p>
          <a href="#contact" class="calc-btn calc-btn-primary" onclick="document.getElementById('email-modal').style.display='none'">
            Book Free Consultation
          </a>
        </div>
      `;
    }, 2000);
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
