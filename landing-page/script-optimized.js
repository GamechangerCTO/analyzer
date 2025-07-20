// Optimized High-Performance JavaScript
// מותאם למהירות מקסימלית ונגישות מושלמת

// Performance monitoring
const performance = {
    startTime: Date.now(),
    metrics: {
        scriptsLoaded: 0,
        animationsActive: 0,
        scrollListeners: 0
    }
};

// Utility functions
const utils = {
    // Debounce function for performance
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    // Throttle function for scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Check if element is in viewport
    isInViewport(element, threshold = 0.1) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        return (
            rect.top >= -threshold * windowHeight &&
            rect.left >= -threshold * windowWidth &&
            rect.bottom <= windowHeight + threshold * windowHeight &&
            rect.right <= windowWidth + threshold * windowWidth
        );
    },

    // Prefers reduced motion check
    prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    // Get user agent info
    getUserAgent() {
        const ua = navigator.userAgent;
        return {
            isMobile: /Mobile|Android|iPhone|iPad/.test(ua),
            isIOS: /iPhone|iPad|iPod/.test(ua),
            isAndroid: /Android/.test(ua),
            isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
            isChrome: /Chrome/.test(ua),
            isFirefox: /Firefox/.test(ua)
        };
    }
};

// Core initialization
document.addEventListener('DOMContentLoaded', function() {
    performance.metrics.scriptsLoaded++;
    
    // Initialize all components
    initializeAccessibility();
    initializeNavigation();
    initializeCounters();
    initializeCharts();
    initializeScrollAnimations();
    initializeContactForm();
    initializeLazyLoading();
    initializePerformanceOptimizations();
    
    // Mark as ready
    document.body.classList.add('js-loaded');
    
    console.log(`Landing page loaded in ${Date.now() - performance.startTime}ms`);
});

// Accessibility enhancements
function initializeAccessibility() {
    // Add skip to content link
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'דילוג לתוכן העיקרי';
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add main content ID
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        heroSection.id = 'main-content';
        heroSection.setAttribute('tabindex', '-1');
    }

    // Enhance form accessibility
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const label = form.querySelector(`label[for="${input.id}"]`);
            if (!label && input.previousElementSibling?.tagName === 'LABEL') {
                const labelText = input.previousElementSibling.textContent;
                input.setAttribute('aria-label', labelText);
            }
            
            // Add required indicator
            if (input.hasAttribute('required')) {
                input.setAttribute('aria-required', 'true');
                const label = input.previousElementSibling;
                if (label && !label.textContent.includes('*')) {
                    label.innerHTML += ' <span class="required" aria-label="שדה חובה">*</span>';
                }
            }
        });
    });

    // Add ARIA labels to buttons without text
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach(button => {
        if (!button.textContent.trim()) {
            // Try to infer from class name or context
            if (button.classList.contains('mobile-menu-toggle')) {
                button.setAttribute('aria-label', 'פתח תפריט');
                button.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Announce dynamic content changes
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.id = 'announcer';
    document.body.appendChild(announcer);
}

// Navigation functionality
function initializeNavigation() {
    const header = document.querySelector('.header');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Header scroll behavior
    let lastScrollY = window.scrollY;
    const handleScroll = utils.throttle(() => {
        const currentScrollY = window.scrollY;
        
        // Add scrolled class for styling
        if (currentScrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScrollY = currentScrollY;
    }, 16); // ~60fps

    window.addEventListener('scroll', handleScroll, { passive: true });
    performance.metrics.scrollListeners++;

    // Mobile menu toggle
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.contains('mobile-open');
            
            navMenu.classList.toggle('mobile-open');
            mobileToggle.classList.toggle('active');
            mobileToggle.setAttribute('aria-expanded', !isOpen);
            
            // Announce state change
            const announcer = document.getElementById('announcer');
            if (announcer) {
                announcer.textContent = isOpen ? 'התפריט נסגר' : 'התפריט נפתח';
            }
            
            // Trap focus in mobile menu when open
            if (!isOpen) {
                trapFocusInElement(navMenu);
            } else {
                removeFocusTrap();
            }
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target) && navMenu.classList.contains('mobile-open')) {
                navMenu.classList.remove('mobile-open');
                mobileToggle.classList.remove('active');
                mobileToggle.setAttribute('aria-expanded', 'false');
                removeFocusTrap();
            }
        });

        // Close mobile menu on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('mobile-open')) {
                navMenu.classList.remove('mobile-open');
                mobileToggle.classList.remove('active');
                mobileToggle.setAttribute('aria-expanded', 'false');
                mobileToggle.focus();
                removeFocusTrap();
            }
        });
    }

    // Smooth scroll for anchor links
    navLinks.forEach(link => {
        if (link.getAttribute('href')?.startsWith('#')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const headerHeight = header.offsetHeight;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: utils.prefersReducedMotion() ? 'auto' : 'smooth'
                    });
                    
                    // Close mobile menu if open
                    navMenu.classList.remove('mobile-open');
                    mobileToggle.classList.remove('active');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    
                    // Focus target for accessibility
                    targetElement.focus();
                }
            });
        }
    });
}

// Focus trap utility
let focusTrapElements = [];
let firstFocusableElement, lastFocusableElement;

function trapFocusInElement(element) {
    focusTrapElements = element.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    
    if (focusTrapElements.length > 0) {
        firstFocusableElement = focusTrapElements[0];
        lastFocusableElement = focusTrapElements[focusTrapElements.length - 1];
        
        document.addEventListener('keydown', handleFocusTrap);
        firstFocusableElement.focus();
    }
}

function removeFocusTrap() {
    document.removeEventListener('keydown', handleFocusTrap);
    focusTrapElements = [];
}

function handleFocusTrap(e) {
    if (e.key === 'Tab') {
        if (e.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
                lastFocusableElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusableElement) {
                firstFocusableElement.focus();
                e.preventDefault();
            }
        }
    }
}

// Counter animations
function initializeCounters() {
    const counters = document.querySelectorAll('[data-target]');
    const animatedCounters = document.querySelectorAll('[data-animate]');
    
    if (utils.prefersReducedMotion()) {
        // Show final values immediately
        counters.forEach(counter => {
            counter.textContent = counter.dataset.target;
        });
        animatedCounters.forEach(counter => {
            const suffix = counter.textContent.includes('%') ? '%' : '';
            counter.textContent = counter.dataset.animate + suffix;
        });
        return;
    }

    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.target);
                animateCounter(entry.target, target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const metricObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.animate);
                animateMetric(entry.target, target);
                metricObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    counters.forEach(counter => counterObserver.observe(counter));
    animatedCounters.forEach(counter => metricObserver.observe(counter));
}

function animateCounter(element, target) {
    let current = 0;
    const increment = target / 60; // 60 frames
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
            performance.metrics.animationsActive--;
        }
        element.textContent = Math.floor(current);
    }, 16); // ~60fps
    
    performance.metrics.animationsActive++;
}

function animateMetric(element, target) {
    let current = 0;
    const increment = target / 60;
    const suffix = element.textContent.includes('%') ? '%' : '';
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
            performance.metrics.animationsActive--;
        }
        element.textContent = Math.floor(current) + suffix;
    }, 16);
    
    performance.metrics.animationsActive++;
}

// Chart functionality
function initializeCharts() {
    const heroCanvas = document.getElementById('heroChart');
    const performanceCanvas = document.getElementById('performanceChart');
    const distributionCanvas = document.getElementById('distributionChart');

    // Use Intersection Observer to load charts only when visible
    const chartObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const canvas = entry.target;
                
                if (canvas.id === 'heroChart') {
                    createOptimizedChart(canvas, 'hero');
                } else if (canvas.id === 'performanceChart') {
                    createOptimizedChart(canvas, 'performance');
                } else if (canvas.id === 'distributionChart') {
                    createOptimizedChart(canvas, 'distribution');
                }
                
                chartObserver.unobserve(canvas);
            }
        });
    }, { threshold: 0.3 });

    [heroCanvas, performanceCanvas, distributionCanvas].forEach(canvas => {
        if (canvas) chartObserver.observe(canvas);
    });
}

function createOptimizedChart(canvas, type) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size for high DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Sample data based on chart type
    const data = {
        hero: [65, 72, 68, 75, 82, 78, 85, 89, 84, 91, 88, 94],
        performance: {
            sales: [45, 52, 48, 61, 69, 73, 78, 85, 82, 89, 87, 92],
            satisfaction: [60, 65, 62, 68, 74, 79, 81, 84, 88, 85, 91, 94]
        },
        distribution: [15, 25, 35, 45, 30, 20, 10, 8, 5, 2]
    };

    const labels = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

    switch (type) {
        case 'hero':
            drawLineChart(ctx, data.hero, labels, rect.width, rect.height);
            break;
        case 'performance':
            drawMultiLineChart(ctx, [data.performance.sales, data.performance.satisfaction], labels, rect.width, rect.height);
            break;
        case 'distribution':
            drawBarChart(ctx, data.distribution, ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'], rect.width, rect.height);
            break;
    }
}

function drawLineChart(ctx, data, labels, width, height) {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const valueRange = maxValue - minValue;
    
    // Draw line
    ctx.strokeStyle = '#482EA6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    data.forEach((value, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#482EA6';
    data.forEach((value, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function drawMultiLineChart(ctx, datasets, labels, width, height) {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const allValues = datasets.flat();
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
    const valueRange = maxValue - minValue;
    
    const colors = ['#3EA621', '#482EA6'];
    
    datasets.forEach((data, datasetIndex) => {
        ctx.strokeStyle = colors[datasetIndex];
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = colors[datasetIndex];
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
    });
}

function drawBarChart(ctx, data, labels, width, height) {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const maxValue = Math.max(...data);
    const barWidth = chartWidth / data.length * 0.8;
    const barSpacing = chartWidth / data.length * 0.2;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#482EA6');
    gradient.addColorStop(1, '#8373BF');
    
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * (barWidth + barSpacing);
        const y = height - padding - barHeight;
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
    });
}

// Scroll animations
function initializeScrollAnimations() {
    if (utils.prefersReducedMotion()) return;

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                
                // Animate progress bars
                const progressBars = entry.target.querySelectorAll('.progress-fill');
                progressBars.forEach(bar => {
                    const width = bar.style.width;
                    if (width) {
                        bar.style.width = '0%';
                        setTimeout(() => {
                            bar.style.width = width;
                        }, 200);
                    }
                });
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll('section, .feature-card, .problem-card, .testimonial-card, .pricing-card');
    elements.forEach(el => observer.observe(el));
}

// Contact form
function initializeContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    // Real-time validation
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate all fields
        let isValid = true;
        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });

        if (!isValid) return;

        const submitBtn = form.querySelector('.form-submit');
        const originalText = submitBtn.textContent;
        
        // Show loading state
        submitBtn.textContent = 'שולח...';
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
        
        // Collect form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showNotification('הודעתך נשלחה בהצלחה! נחזור אליך בקרוב.', 'success');
                form.reset();
                
                // Announce success
                const announcer = document.getElementById('announcer');
                if (announcer) {
                    announcer.textContent = 'הטופס נשלח בהצלחה';
                }
            } else {
                throw new Error('שגיאה בשליחת הטופס');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            showNotification('אירעה שגיאה בשליחת הטופס. אנא נסה שוב.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            submitBtn.removeAttribute('aria-busy');
        }
    });
}

function validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const required = field.hasAttribute('required');
    
    clearFieldError(field);
    
    if (required && !value) {
        showFieldError(field, 'שדה זה הוא חובה');
        return false;
    }
    
    if (type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(field, 'כתובת אימייל לא תקינה');
            return false;
        }
    }
    
    if (type === 'tel' && value) {
        const phoneRegex = /^[\d\-\+\(\)\s]+$/;
        if (!phoneRegex.test(value)) {
            showFieldError(field, 'מספר טלפון לא תקין');
            return false;
        }
    }
    
    return true;
}

function showFieldError(field, message) {
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
    field.setAttribute('aria-describedby', errorElement.id = `error-${field.name}`);
}

function clearFieldError(field) {
    field.classList.remove('error');
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
    
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" aria-label="סגור הודעה">&times;</button>
        </div>
    `;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '100px',
        right: '20px',
        background: type === 'success' ? '#3EA621' : '#dc3545',
        color: 'white',
        padding: '16px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '9999',
        maxWidth: '400px',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Lazy loading
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => {
            img.classList.add('lazy');
            imageObserver.observe(img);
        });
    } else {
        // Fallback for browsers without IntersectionObserver
        images.forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

// Performance optimizations
function initializePerformanceOptimizations() {
    // Preconnect to external domains
    const preconnectDomains = [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://res.cloudinary.com'
    ];
    
    preconnectDomains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        document.head.appendChild(link);
    });

    // Critical resource hints
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = '/api/contact';
    document.head.appendChild(link);

    // Reduce animations on low-end devices
    if (navigator.hardwareConcurrency <= 2) {
        document.body.classList.add('reduced-animations');
    }

    // Monitor performance
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.entryType === 'largest-contentful-paint') {
                    console.log('LCP:', entry.startTime);
                }
            });
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }

    // Service Worker registration (if available)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .catch(err => console.log('SW registration failed'));
        });
    }

    console.log('Performance optimizations initialized');
}

// Error handling
window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
    // Could send to analytics service
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    // Could send to analytics service
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { utils, performance };
}