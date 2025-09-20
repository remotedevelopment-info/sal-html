// Simple dark mode toggle (optional)
document.addEventListener("DOMContentLoaded", () => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) {
    document.body.classList.add("dark");
  }

  // Mobile menu functionality
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const body = document.body;

  if (mobileMenuToggle && navLinks) {
    mobileMenuToggle.addEventListener('click', () => {
      // Toggle menu visibility
      navLinks.classList.toggle('mobile-menu-open');
      mobileMenuToggle.classList.toggle('menu-active');
      
      // Prevent body scroll when menu is open
      body.classList.toggle('menu-open');
    });

    // Close menu when clicking on a nav link
    const navLinkItems = document.querySelectorAll('.nav-link');
    navLinkItems.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-menu-open');
        mobileMenuToggle.classList.remove('menu-active');
        body.classList.remove('menu-open');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mobileMenuToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('mobile-menu-open');
        mobileMenuToggle.classList.remove('menu-active');
        body.classList.remove('menu-open');
      }
    });
  }
});
