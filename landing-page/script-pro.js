/**
 * Professional JavaScript Architecture 2025
 * Ultra-Modern, Performance-Optimized Script
 * Following latest industry standards and best practices
 */

'use strict';

// ================================
// PERFORMANCE MONITORING & METRICS
// ================================

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.startTime = performance.now();
        this.initializeObservers();
    }

    initializeObservers() {
        // Core Web Vitals monitoring
        if ('PerformanceObserver' in window) {
            this.observeWebVitals();
            this.observeResourceTiming();
            this.observeNavigationTiming();
        }

        // Memory usage monitoring
        if ('memory' in performance) {
            this.observeMemoryUsage();
        }
    }

    observeWebVitals() {
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                this.metrics.set('lcp', entry.startTime);
                console.log('LCP:', entry.startTime);
            }
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                this.metrics.set('fid', entry.processingStart - entry.startTime);
                console.log('FID:', entry.processingStart - entry.startTime);
            }
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let cumulativeLayoutShift = 0;
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    cumulativeLayoutShift += entry.value;
                    this.metrics.set('cls', cumulativeLayoutShift);
                }
            }
        }).observe({ entryTypes: ['layout-shift'] });
    }

    observeResourceTiming() {
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.initiatorType === 'script' || entry.initiatorType === 'link') {
                    console.log(`${entry.name}: ${entry.loadEventEnd - entry.startTime}ms`);
                }
            }
        }).observe({ entryTypes: ['resource'] });
    }

    observeNavigationTiming() {
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                this.metrics.set('navigation', {
                    domContentLoaded: entry.domContentLoadedEventEnd - entry.startTime,
                    loadComplete: entry.loadEventEnd - entry.startTime
                });
            }
        }).observe({ entryTypes: ['navigation'] });
    }

    observeMemoryUsage() {
        const checkMemory = () => {
            const memory = performance.memory;
            this.metrics.set('memory', {
                used: Math.round(memory.usedJSHeapSize / 1048576), // MB
                total: Math.round(memory.totalJSHeapSize / 1048576), // MB
                limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
            });
        };

        checkMemory();
        setInterval(checkMemory, 30000); // Check every 30 seconds
    }

    getMetrics() {
        return Object.fromEntries(this.metrics);
    }
}

// ================================
// UTILITY FUNCTIONS
// ================================

class Utils {
    // Advanced debounce with immediate execution option
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    // RAF-based throttle for smooth animations
    static throttle(func, limit = 16) {
        let inThrottle;
        let lastFunc;
        let lastRan;
        
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                lastRan = Date.now();
                inThrottle = true;
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, Math.max(limit - (Date.now() - lastRan), 0));
            }
        };
    }

    // Modern intersection observer with advanced options
    static createIntersectionObserver(callback, options = {}) {
        const defaultOptions = {
            root: null,
            rootMargin: '0px 0px -50px 0px',
            threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
        };

        return new IntersectionObserver(callback, { ...defaultOptions, ...options });
    }

    // Viewport detection with container queries support
    static isInViewport(element, threshold = 0.1) {
        if (!element) return false;

        const rect = element.getBoundingClientRect();
        const viewHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewWidth = window.innerWidth || document.documentElement.clientWidth;

        return (
            rect.top >= -threshold * viewHeight &&
            rect.left >= -threshold * viewWidth &&
            rect.bottom <= viewHeight + threshold * viewHeight &&
            rect.right <= viewWidth + threshold * viewWidth
        );
    }

    // Advanced user preference detection
    static getUserPreferences() {
        return {
            reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            reduceData: window.matchMedia('(prefers-reduced-data: reduce)').matches,
            highContrast: window.matchMedia('(prefers-contrast: high)').matches,
            colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            colorGamut: window.matchMedia('(color-gamut: p3)').matches ? 'p3' : 'srgb'
        };
    }

    // Device capability detection
    static getDeviceCapabilities() {
        const ua = navigator.userAgent;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        return {
            // Device type
            isMobile: /Mobile|Android|iPhone|iPad/.test(ua),
            isTablet: /iPad|Android.*Tablet/.test(ua),
            isDesktop: !/Mobile|Android|iPhone|iPad/.test(ua),
            
            // Browser capabilities
            supportsWebP: this.supportsImageFormat('webp'),
            supportsAVIF: this.supportsImageFormat('avif'),
            supportsContainerQueries: CSS.supports('container-type: inline-size'),
            supportsHasSelector: CSS.supports('selector(:has(*))'),
            
            // Performance indicators
            hardwareConcurrency: navigator.hardwareConcurrency || 2,
            deviceMemory: navigator.deviceMemory || 4,
            
            // Network information
            connection: {
                effectiveType: connection?.effectiveType || 'unknown',
                downlink: connection?.downlink || 0,
                rtt: connection?.rtt || 0,
                saveData: connection?.saveData || false
            }
        };
    }

    // Image format support detection
    static supportsImageFormat(format) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
    }

    // Modern clipboard API with fallback
    static async copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.warn('Clipboard API failed, using fallback');
            }
        }

        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            textArea.remove();
            return true;
        } catch (err) {
            textArea.remove();
            return false;
        }
    }

    // Color mixing utility for modern CSS
    static colorMix(color1, color2, percentage = 50) {
        return `color-mix(in srgb, ${color1} ${percentage}%, ${color2})`;
    }

    // CSS custom property management
    static setCSSProperty(property, value, element = document.documentElement) {
        element.style.setProperty(property, value);
    }

    static getCSSProperty(property, element = document.documentElement) {
        return getComputedStyle(element).getPropertyValue(property).trim();
    }
}

// ================================
// MODERN COMPONENT ARCHITECTURE
// ================================

class ComponentManager {
    constructor() {
        this.components = new Map();
        this.observers = new Map();
        this.initialized = false;
    }

    register(name, component) {
        this.components.set(name, component);
    }

    async initialize() {
        if (this.initialized) return;

        // Initialize components in optimal order
        const initOrder = [
            'performance',
            'accessibility',
            'navigation',
            'animations',
            'interactions',
            'forms'
        ];

        for (const componentName of initOrder) {
            const component = this.components.get(componentName);
            if (component && typeof component.init === 'function') {
                try {
                    await component.init();
                    console.log(`✓ ${componentName} initialized`);
                } catch (error) {
                    console.error(`✗ Failed to initialize ${componentName}:`, error);
                }
            }
        }

        this.initialized = true;
        this.announceReady();
    }

    announceReady() {
        document.body.classList.add('js-ready');
        
        // Dispatch custom event
        const readyEvent = new CustomEvent('app:ready', {
            detail: {
                timestamp: performance.now(),
                components: Array.from(this.components.keys())
            }
        });
        
        document.dispatchEvent(readyEvent);
    }
}

// ================================
// ACCESSIBILITY COMPONENT
// ================================

class AccessibilityManager {
    constructor() {
        this.focusTrap = null;
        this.announcer = null;
    }

    async init() {
        this.createSkipLink();
        this.createAnnouncer();
        this.enhanceFormAccessibility();
        this.setupKeyboardNavigation();
        this.initializeFocusManagement();
        this.setupReducedMotionSupport();
    }

    createSkipLink() {
        if (document.querySelector('.skip-link')) return;

        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'דילוג לתוכן העיקרי';
        
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Ensure main content exists
        const heroSection = document.querySelector('.hero');
        if (heroSection && !heroSection.id) {
            heroSection.id = 'main-content';
            heroSection.setAttribute('tabindex', '-1');
        }
    }

    createAnnouncer() {
        this.announcer = document.createElement('div');
        this.announcer.setAttribute('aria-live', 'polite');
        this.announcer.setAttribute('aria-atomic', 'true');
        this.announcer.className = 'sr-only';
        this.announcer.id = 'announcer';
        document.body.appendChild(this.announcer);
    }

    announce(message, priority = 'polite') {
        if (!this.announcer) return;

        this.announcer.setAttribute('aria-live', priority);
        this.announcer.textContent = message;

        // Clear after announcement
        setTimeout(() => {
            this.announcer.textContent = '';
        }, 1000);
    }

    enhanceFormAccessibility() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                // Ensure proper labeling
                if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
                    const label = form.querySelector(`label[for="${input.id}"]`) || 
                                 input.closest('.form-group')?.querySelector('label');
                    
                    if (label && !input.id) {
                        input.id = `input-${Math.random().toString(36).substr(2, 9)}`;
                        label.setAttribute('for', input.id);
                    }
                }

                // Add required indicators
                if (input.hasAttribute('required')) {
                    input.setAttribute('aria-required', 'true');
                    
                    const label = form.querySelector(`label[for="${input.id}"]`);
                    if (label && !label.textContent.includes('*')) {
                        const requiredSpan = document.createElement('span');
                        requiredSpan.className = 'required';
                        requiredSpan.setAttribute('aria-label', 'שדה חובה');
                        requiredSpan.textContent = ' *';
                        label.appendChild(requiredSpan);
                    }
                }

                // Enhanced validation feedback
                input.addEventListener('invalid', (e) => {
                    e.preventDefault();
                    this.showValidationError(input, input.validationMessage);
                });

                input.addEventListener('input', () => {
                    this.clearValidationError(input);
                });
            });
        });
    }

    showValidationError(input, message) {
        input.setAttribute('aria-invalid', 'true');
        
        let errorElement = input.parentNode.querySelector('.validation-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'validation-error';
            errorElement.setAttribute('role', 'alert');
            errorElement.id = `error-${input.id || Math.random().toString(36).substr(2, 9)}`;
            input.setAttribute('aria-describedby', errorElement.id);
            input.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        this.announce(`שגיאה בשדה: ${message}`, 'assertive');
    }

    clearValidationError(input) {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        
        const errorElement = input.parentNode.querySelector('.validation-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    setupKeyboardNavigation() {
        // Enhanced tab navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('using-keyboard');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('using-keyboard');
        });

        // Escape key functionality
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
    }

    handleEscapeKey() {
        // Close modals, menus, etc.
        const openElements = document.querySelectorAll('[aria-expanded="true"]');
        openElements.forEach(element => {
            if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
                element.click();
            }
        });

        // Release focus trap
        this.releaseFocusTrap();
    }

    initializeFocusManagement() {
        // Auto-focus management for dynamic content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const autoFocus = node.querySelector('[data-auto-focus]');
                            if (autoFocus) {
                                setTimeout(() => autoFocus.focus(), 100);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    createFocusTrap(container) {
        const focusableElements = container.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const trapFocus = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        container.addEventListener('keydown', trapFocus);
        firstElement.focus();

        this.focusTrap = {
            container,
            destroy: () => {
                container.removeEventListener('keydown', trapFocus);
                this.focusTrap = null;
            }
        };

        return this.focusTrap;
    }

    releaseFocusTrap() {
        if (this.focusTrap) {
            this.focusTrap.destroy();
        }
    }

    setupReducedMotionSupport() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        const handleReducedMotion = (e) => {
            document.body.classList.toggle('reduced-motion', e.matches);
        };

        handleReducedMotion(mediaQuery);
        mediaQuery.addEventListener('change', handleReducedMotion);
    }
}

// ================================
// NAVIGATION COMPONENT
// ================================

class NavigationManager {
    constructor() {
        this.header = null;
        this.nav = null;
        this.menuToggle = null;
        this.isMenuOpen = false;
        this.scrollThreshold = 100;
    }

    async init() {
        this.header = document.querySelector('.header');
        this.nav = document.querySelector('.nav');
        this.menuToggle = document.querySelector('.menu-toggle');

        if (!this.header) return;

        this.setupScrollBehavior();
        this.setupMobileMenu();
        this.setupSmoothScrolling();
        this.enhanceNavigation();
    }

    setupScrollBehavior() {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateHeader = () => {
            const currentScrollY = window.scrollY;
            
            // Add/remove scrolled class
            this.header.classList.toggle('scrolled', currentScrollY > this.scrollThreshold);
            
            // Hide/show header based on scroll direction
            if (currentScrollY > lastScrollY && currentScrollY > 200) {
                this.header.style.transform = 'translateY(-100%)';
            } else {
                this.header.style.transform = 'translateY(0)';
            }
            
            lastScrollY = currentScrollY;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    setupMobileMenu() {
        if (!this.menuToggle || !this.nav) return;

        // Enhance button accessibility
        this.menuToggle.setAttribute('aria-expanded', 'false');
        this.menuToggle.setAttribute('aria-controls', 'navigation-menu');
        this.nav.id = 'navigation-menu';

        this.menuToggle.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Close menu on outside click
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && !this.header.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMobileMenu();
                this.menuToggle.focus();
            }
        });
    }

    toggleMobileMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        
        this.nav.classList.toggle('open', this.isMenuOpen);
        this.menuToggle.classList.toggle('active', this.isMenuOpen);
        this.menuToggle.setAttribute('aria-expanded', this.isMenuOpen.toString());
        
        // Announce state change
        const message = this.isMenuOpen ? 'התפריט נפתח' : 'התפריט נסגר';
        app.accessibility.announce(message);
        
        // Manage focus trap
        if (this.isMenuOpen) {
            app.accessibility.createFocusTrap(this.nav);
        } else {
            app.accessibility.releaseFocusTrap();
        }
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
    }

    closeMobileMenu() {
        if (!this.isMenuOpen) return;
        this.toggleMobileMenu();
    }

    setupSmoothScrolling() {
        const navLinks = document.querySelectorAll('.nav__link[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const headerHeight = this.header.offsetHeight;
                    const targetPosition = targetElement.getBoundingClientRect().top + 
                                         window.pageYOffset - headerHeight;
                    
                    // Close mobile menu if open
                    this.closeMobileMenu();
                    
                    // Smooth scroll
                    window.scrollTo({
                        top: targetPosition,
                        behavior: Utils.getUserPreferences().reduceMotion ? 'auto' : 'smooth'
                    });
                    
                    // Focus target for accessibility
                    targetElement.focus({ preventScroll: true });
                    
                    // Update URL without causing scroll
                    if (history.pushState) {
                        history.pushState(null, null, `#${targetId}`);
                    }
                }
            });
        });
    }

    enhanceNavigation() {
        // Add current page indicator
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav__link');
        
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.setAttribute('aria-current', 'page');
                link.classList.add('active');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + M to toggle mobile menu
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                if (this.menuToggle) {
                    this.menuToggle.click();
                }
            }
        });
    }
}

// ================================
// ANIMATION COMPONENT
// ================================

class AnimationManager {
    constructor() {
        this.observers = new Map();
        this.animationQueue = [];
        this.isReducedMotion = Utils.getUserPreferences().reduceMotion;
    }

    async init() {
        this.setupScrollAnimations();
        this.setupCounterAnimations();
        this.setupProgressAnimations();
        this.initializeIntersectionObservers();
    }

    setupScrollAnimations() {
        if (this.isReducedMotion) {
            // Show all elements immediately if reduced motion is preferred
            document.querySelectorAll('[data-animate]').forEach(el => {
                el.classList.add('fade-in');
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
            return;
        }

        const animationObserver = Utils.createIntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.triggerEntranceAnimation(entry.target);
                        animationObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        // Observe elements with animation data attributes
        document.querySelectorAll('[data-animate]').forEach(el => {
            animationObserver.observe(el);
        });

        // Observe sections and cards
        document.querySelectorAll('section, .card, .feature-card').forEach(el => {
            animationObserver.observe(el);
        });
    }

    triggerEntranceAnimation(element) {
        const animationType = element.dataset.animate || 'fade-in';
        const delay = parseInt(element.dataset.animateDelay) || 0;

        setTimeout(() => {
            element.classList.add(animationType);
            
            // Trigger any child animations
            this.animateChildren(element);
        }, delay);
    }

    animateChildren(parent) {
        const children = parent.querySelectorAll('[data-animate-child]');
        
        children.forEach((child, index) => {
            const delay = parseInt(child.dataset.animateDelay) || index * 100;
            
            setTimeout(() => {
                child.classList.add('fade-in');
            }, delay);
        });
    }

    setupCounterAnimations() {
        const counters = document.querySelectorAll('[data-counter]');
        
        if (counters.length === 0) return;

        const counterObserver = Utils.createIntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateCounter(entry.target);
                        counterObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.5 }
        );

        counters.forEach(counter => counterObserver.observe(counter));
    }

    animateCounter(element) {
        const target = parseInt(element.dataset.counter) || parseInt(element.textContent);
        const duration = parseInt(element.dataset.duration) || 2000;
        const suffix = element.dataset.suffix || '';
        
        if (this.isReducedMotion) {
            element.textContent = target + suffix;
            return;
        }

        let current = 0;
        const increment = target / (duration / 16); // 60fps
        const startTime = performance.now();

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            current = Math.floor(target * easeOutQuart);
            
            element.textContent = current + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target + suffix;
            }
        };

        requestAnimationFrame(updateCounter);
    }

    setupProgressAnimations() {
        const progressBars = document.querySelectorAll('.progress-fill');
        
        const progressObserver = Utils.createIntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateProgressBar(entry.target);
                        progressObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.3 }
        );

        progressBars.forEach(bar => progressObserver.observe(bar));
    }

    animateProgressBar(bar) {
        const targetWidth = bar.style.width || bar.dataset.progress || '0%';
        
        if (this.isReducedMotion) {
            bar.style.width = targetWidth;
            return;
        }

        bar.style.width = '0%';
        
        // Trigger reflow
        bar.offsetWidth;
        
        setTimeout(() => {
            bar.style.width = targetWidth;
        }, 200);
    }

    initializeIntersectionObservers() {
        // Store observers for cleanup
        this.observers.set('animation', 
            document.querySelectorAll('[data-animate]').length > 0
        );
    }

    // Cleanup method
    destroy() {
        this.observers.forEach(observer => {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        });
        this.observers.clear();
    }
}

// ================================
// INTERACTION COMPONENT
// ================================

class InteractionManager {
    constructor() {
        this.touchStartY = 0;
        this.touchStartX = 0;
    }

    async init() {
        this.setupButtonInteractions();
        this.setupCardInteractions();
        this.setupTouchGestures();
        this.setupKeyboardShortcuts();
        this.initializeCustomCursor();
    }

    setupButtonInteractions() {
        const buttons = document.querySelectorAll('.btn, button');
        
        buttons.forEach(button => {
            // Ripple effect on click
            button.addEventListener('click', (e) => {
                if (Utils.getUserPreferences().reduceMotion) return;
                
                this.createRippleEffect(button, e);
            });

            // Enhanced hover states
            button.addEventListener('mouseenter', () => {
                if (!button.disabled) {
                    button.style.setProperty('--btn-hover', '1');
                }
            });

            button.addEventListener('mouseleave', () => {
                button.style.setProperty('--btn-hover', '0');
            });
        });
    }

    createRippleEffect(element, event) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: currentColor;
            opacity: 0.3;
            pointer-events: none;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            animation: ripple 0.6s ease-out;
            z-index: 1;
        `;
        
        // Ensure element has relative positioning
        const originalPosition = element.style.position;
        if (!originalPosition || originalPosition === 'static') {
            element.style.position = 'relative';
        }
        
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
            if (!originalPosition) {
                element.style.position = '';
            }
        }, 600);
    }

    setupCardInteractions() {
        const cards = document.querySelectorAll('.card, .feature-card');
        
        cards.forEach(card => {
            // Tilt effect on mouse move
            card.addEventListener('mousemove', (e) => {
                if (Utils.getUserPreferences().reduceMotion) return;
                
                this.applyTiltEffect(card, e);
            });

            card.addEventListener('mouseleave', () => {
                this.resetTiltEffect(card);
            });

            // Focus enhancement
            card.addEventListener('focusin', () => {
                card.classList.add('focused');
            });

            card.addEventListener('focusout', () => {
                card.classList.remove('focused');
            });
        });
    }

    applyTiltEffect(element, event) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (event.clientX - centerX) / (rect.width / 2);
        const deltaY = (event.clientY - centerY) / (rect.height / 2);
        
        const rotateX = deltaY * -5; // Max 5 degrees
        const rotateY = deltaX * 5;
        
        element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    }

    resetTiltEffect(element) {
        element.style.transform = '';
    }

    setupTouchGestures() {
        // Swipe detection for mobile navigation
        document.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
            this.touchStartX = e.touches[0].clientX;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!this.touchStartY || !this.touchStartX) return;

            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const diffY = this.touchStartY - touchEndY;
            const diffX = this.touchStartX - touchEndX;

            // Horizontal swipe detection
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    // Swipe left
                    this.handleSwipeLeft();
                } else {
                    // Swipe right
                    this.handleSwipeRight();
                }
            }

            this.touchStartY = 0;
            this.touchStartX = 0;
        }, { passive: true });
    }

    handleSwipeLeft() {
        // Could be used for navigation or closing menus
        const nav = document.querySelector('.nav');
        if (nav && nav.classList.contains('open')) {
            app.navigation.closeMobileMenu();
        }
    }

    handleSwipeRight() {
        // Could be used for opening menus
        console.log('Swipe right detected');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search (if implemented)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.focusSearch();
            }

            // Ctrl/Cmd + / for help
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showKeyboardHelp();
            }
        });
    }

    focusSearch() {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search"]');
        if (searchInput) {
            searchInput.focus();
        }
    }

    showKeyboardHelp() {
        const shortcuts = [
            'Alt + M: Toggle mobile menu',
            'Ctrl/Cmd + K: Focus search',
            'Ctrl/Cmd + /: Show this help',
            'Tab: Navigate between elements',
            'Escape: Close modals/menus'
        ];

        app.accessibility.announce(`Keyboard shortcuts: ${shortcuts.join(', ')}`);
    }

    initializeCustomCursor() {
        if (Utils.getDeviceCapabilities().isMobile) return;

        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        cursor.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, var(--primary), transparent);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            transition: transform 0.1s ease;
            mix-blend-mode: difference;
            opacity: 0;
        `;

        document.body.appendChild(cursor);

        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursor.style.opacity = '1';
        });

        document.addEventListener('mouseleave', () => {
            cursor.style.opacity = '0';
        });

        // Smooth cursor following
        const animateCursor = () => {
            cursorX += (mouseX - cursorX) * 0.1;
            cursorY += (mouseY - cursorY) * 0.1;
            
            cursor.style.left = cursorX - 10 + 'px';
            cursor.style.top = cursorY - 10 + 'px';
            
            requestAnimationFrame(animateCursor);
        };

        animateCursor();

        // Cursor interactions
        const interactiveElements = document.querySelectorAll('a, button, .btn, input, textarea, select');
        
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.transform = 'scale(1.5)';
            });
            
            el.addEventListener('mouseleave', () => {
                cursor.style.transform = 'scale(1)';
            });
        });
    }
}

// ================================
// FORM COMPONENT
// ================================

class FormManager {
    constructor() {
        this.validationRules = new Map();
        this.forms = new Map();
    }

    async init() {
        this.setupFormValidation();
        this.setupFormSubmission();
        this.enhanceFormExperience();
    }

    setupFormValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            this.initializeForm(form);
        });
    }

    initializeForm(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Real-time validation
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
            
            // Auto-save for text inputs (optional)
            if (input.type === 'text' || input.type === 'email' || input.tagName === 'TEXTAREA') {
                input.addEventListener('input', 
                    Utils.debounce(() => this.autoSaveField(input), 1000)
                );
            }
        });

        // Form submission
        form.addEventListener('submit', (e) => this.handleFormSubmission(e));
        
        this.forms.set(form.id || `form-${Date.now()}`, {
            element: form,
            inputs: inputs,
            isValid: false
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        const required = field.hasAttribute('required');
        
        this.clearFieldError(field);
        
        // Required validation
        if (required && !value) {
            this.showFieldError(field, 'שדה זה הוא חובה');
            return false;
        }
        
        // Type-specific validation
        if (value) {
            switch (type) {
                case 'email':
                    if (!this.isValidEmail(value)) {
                        this.showFieldError(field, 'כתובת אימייל לא תקינה');
                        return false;
                    }
                    break;
                    
                case 'tel':
                    if (!this.isValidPhone(value)) {
                        this.showFieldError(field, 'מספר טלפון לא תקין');
                        return false;
                    }
                    break;
                    
                case 'url':
                    if (!this.isValidURL(value)) {
                        this.showFieldError(field, 'כתובת אתר לא תקינה');
                        return false;
                    }
                    break;
            }
        }
        
        // Custom validation rules
        const customRule = this.validationRules.get(field.name || field.id);
        if (customRule && !customRule.test(value)) {
            this.showFieldError(field, customRule.message);
            return false;
        }
        
        return true;
    }

    showFieldError(field, message) {
        field.classList.add('error');
        field.setAttribute('aria-invalid', 'true');
        
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.setAttribute('role', 'alert');
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        const errorId = `error-${field.name || field.id || Math.random().toString(36).substr(2, 9)}`;
        errorElement.id = errorId;
        field.setAttribute('aria-describedby', errorId);
    }

    clearFieldError(field) {
        field.classList.remove('error');
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
        
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    async handleFormSubmission(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
        
        // Validate all fields
        const inputs = form.querySelectorAll('input, select, textarea');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            app.accessibility.announce('הטופס מכיל שגיאות, אנא תקן אותן', 'assertive');
            return;
        }
        
        // Show loading state
        const originalText = submitButton.textContent;
        submitButton.textContent = 'שולח...';
        submitButton.disabled = true;
        submitButton.setAttribute('aria-busy', 'true');
        
        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            const response = await this.submitForm(form.action || '/api/contact', data);
            
            if (response.ok) {
                this.showSuccessMessage('הטופס נשלח בהצלחה!');
                form.reset();
                app.accessibility.announce('הטופס נשלח בהצלחה');
            } else {
                throw new Error('שגיאה בשליחת הטופס');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showErrorMessage('אירעה שגיאה בשליחת הטופס. אנא נסה שוב.');
            app.accessibility.announce('שגיאה בשליחת הטופס', 'assertive');
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            submitButton.removeAttribute('aria-busy');
        }
    }

    async submitForm(url, data) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification--${type} show`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        
        notification.innerHTML = `
            <div class="notification__content">
                <span class="notification__message">${message}</span>
                <button class="notification__close" aria-label="סגור הודעה">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Close functionality
        const closeBtn = notification.querySelector('.notification__close');
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    autoSaveField(field) {
        const key = `autosave_${field.name || field.id}`;
        try {
            localStorage.setItem(key, field.value);
        } catch (e) {
            // localStorage might be disabled
            console.warn('Could not save field value:', e);
        }
    }

    restoreAutoSavedFields() {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
        
        inputs.forEach(input => {
            const key = `autosave_${input.name || input.id}`;
            try {
                const savedValue = localStorage.getItem(key);
                if (savedValue && !input.value) {
                    input.value = savedValue;
                }
            } catch (e) {
                // localStorage might be disabled
            }
        });
    }

    enhanceFormExperience() {
        // Auto-focus first invalid field
        document.addEventListener('invalid', (e) => {
            e.target.focus();
        }, true);

        // Restore auto-saved fields
        this.restoreAutoSavedFields();

        // Character count for textareas
        const textareas = document.querySelectorAll('textarea[maxlength]');
        textareas.forEach(textarea => {
            this.addCharacterCounter(textarea);
        });
    }

    addCharacterCounter(textarea) {
        const maxLength = textarea.getAttribute('maxlength');
        if (!maxLength) return;

        const counter = document.createElement('div');
        counter.className = 'character-counter';
        counter.setAttribute('aria-live', 'polite');
        
        const updateCounter = () => {
            const remaining = maxLength - textarea.value.length;
            counter.textContent = `${remaining} תווים נותרו`;
            counter.style.color = remaining < 20 ? 'red' : '';
        };

        textarea.addEventListener('input', updateCounter);
        updateCounter();

        textarea.parentNode.appendChild(counter);
    }

    // Validation helper methods
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^[\d\-\+\(\)\s]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 9;
    }

    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // Add custom validation rule
    addValidationRule(fieldName, test, message) {
        this.validationRules.set(fieldName, { test, message });
    }
}

// ================================
// MAIN APPLICATION
// ================================

class Application {
    constructor() {
        this.performance = new PerformanceMonitor();
        this.componentManager = new ComponentManager();
        this.accessibility = new AccessibilityManager();
        this.navigation = new NavigationManager();
        this.animations = new AnimationManager();
        this.interactions = new InteractionManager();
        this.forms = new FormManager();
        
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            // Register components
            this.componentManager.register('performance', this.performance);
            this.componentManager.register('accessibility', this.accessibility);
            this.componentManager.register('navigation', this.navigation);
            this.componentManager.register('animations', this.animations);
            this.componentManager.register('interactions', this.interactions);
            this.componentManager.register('forms', this.forms);

            // Initialize all components
            await this.componentManager.initialize();

            // Setup global error handling
            this.setupErrorHandling();

            // Setup service worker
            this.registerServiceWorker();

            this.isInitialized = true;
            
            console.log(`🚀 Application initialized in ${performance.now() - this.performance.startTime}ms`);
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    }

    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('JavaScript error:', e.error);
            // Could send to analytics service
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            // Could send to analytics service
        });
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    // Public API methods
    announce(message, priority = 'polite') {
        this.accessibility.announce(message, priority);
    }

    showNotification(message, type = 'info') {
        this.forms.showNotification(message, type);
    }

    getMetrics() {
        return this.performance.getMetrics();
    }
}

// ================================
// INITIALIZATION
// ================================

// Create global app instance
const app = new Application();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// CSS Animation Keyframes (injected via JavaScript for better performance)
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export for testing and external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Application, Utils, PerformanceMonitor };
} else {
    window.CoacheeApp = app;
}