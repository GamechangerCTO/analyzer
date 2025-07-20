// Coachee Landing Page - JavaScript נקי ופונקציונלי
// מאת Claude Code

'use strict';

// הגדרות גלובליות
const CONFIG = {
    animationDuration: 1000,
    scrollOffset: 100,
    debounceTime: 100,
    apiEndpoints: {
        contact: '/api/contact'
    }
};

// יוטיליטיס
const Utils = {
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // בדיקה אם אלמנט בתוך הviewport
    isInViewport(element, offset = 0) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 - offset &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    // בדיקת preference for reduced motion
    prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    // animate number
    animateNumber(element, target, duration = 1000) {
        if (Utils.prefersReducedMotion()) {
            element.textContent = target;
            return;
        }

        const start = parseInt(element.textContent) || 0;
        const startTime = performance.now();

        function updateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            } else {
                element.textContent = target;
            }
        }
        
        requestAnimationFrame(updateNumber);
    }
};

// ניהול ניווט
class Navigation {
    constructor() {
        this.header = document.querySelector('.header');
        this.mobileToggle = document.querySelector('.mobile-menu-toggle');
        this.navMenu = document.querySelector('.nav-menu');
        this.navLinks = document.querySelectorAll('.nav-link');
        
        this.init();
    }

    init() {
        this.setupScrollBehavior();
        this.setupMobileMenu();
        this.setupSmoothScroll();
    }

    setupScrollBehavior() {
        let lastScrollY = window.scrollY;
        
        const handleScroll = Utils.debounce(() => {
            const currentScrollY = window.scrollY;
            
            // הוסף/הסר class לheader
            if (currentScrollY > CONFIG.scrollOffset) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }
            
            lastScrollY = currentScrollY;
        }, 16);

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    setupMobileMenu() {
        if (!this.mobileToggle || !this.navMenu) return;

        this.mobileToggle.addEventListener('click', () => {
            const isOpen = this.navMenu.classList.contains('mobile-open');
            
            this.navMenu.classList.toggle('mobile-open');
            this.mobileToggle.classList.toggle('active');
            this.mobileToggle.setAttribute('aria-expanded', !isOpen);
            
            // נעילת scroll כשהתפריט פתוח
            document.body.style.overflow = isOpen ? '' : 'hidden';
        });

        // סגירת תפריט בלחיצה מחוץ לו
        document.addEventListener('click', (e) => {
            if (!this.header.contains(e.target) && this.navMenu.classList.contains('mobile-open')) {
                this.closeMobileMenu();
            }
        });

        // סגירת תפריט ב ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.navMenu.classList.contains('mobile-open')) {
                this.closeMobileMenu();
                this.mobileToggle.focus();
            }
        });
    }

    closeMobileMenu() {
        this.navMenu.classList.remove('mobile-open');
        this.mobileToggle.classList.remove('active');
        this.mobileToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    setupSmoothScroll() {
        this.navLinks.forEach(link => {
            if (link.getAttribute('href')?.startsWith('#')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    const targetId = link.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        const headerHeight = this.header.offsetHeight;
                        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: Utils.prefersReducedMotion() ? 'auto' : 'smooth'
                        });
                        
                        // סגירת תפריט נייד
                        this.closeMobileMenu();
                        
                        // מיקוד באלמנט היעד
                        targetElement.focus();
                    }
                });
            }
        });
    }
}

// ניהול אנימציות מונים
class CounterAnimation {
    constructor() {
        this.counters = document.querySelectorAll('[data-target], [data-animate]');
        this.init();
    }

    init() {
        if (this.counters.length === 0) return;

        // אם משתמש מעדיף אנימציות מופחתות, הצג ערכים סופיים
        if (Utils.prefersReducedMotion()) {
            this.counters.forEach(counter => {
                const target = counter.dataset.target || counter.dataset.animate;
                const suffix = counter.textContent.includes('%') ? '%' : '';
                counter.textContent = target + suffix;
            });
            return;
        }

        this.setupIntersectionObserver();
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '0px 0px -50px 0px'
        });

        this.counters.forEach(counter => observer.observe(counter));
    }

    animateCounter(element) {
        const target = parseInt(element.dataset.target || element.dataset.animate);
        const suffix = element.textContent.includes('%') ? '%' : '';
        
        Utils.animateNumber(element, target, CONFIG.animationDuration);
        
        // הוסף suffix אם קיים
        if (suffix) {
            const originalUpdate = element.textContent;
            element.textContent = originalUpdate + suffix;
        }
    }
}

// ניהול גרפים
class ChartManager {
    constructor() {
        this.charts = document.querySelectorAll('canvas');
        this.init();
    }

    init() {
        if (this.charts.length === 0) return;
        this.setupIntersectionObserver();
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.createChart(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '0px 0px -100px 0px'
        });

        this.charts.forEach(chart => observer.observe(chart));
    }

    createChart(canvas) {
        const ctx = canvas.getContext('2d');
        const chartType = canvas.id;
        
        // התאמה למסכי Retina
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        // בחירת סוג גרף
        switch (chartType) {
            case 'heroChart':
                this.drawLineChart(ctx, rect.width, rect.height);
                break;
            case 'performanceChart':
                this.drawPerformanceChart(ctx, rect.width, rect.height);
                break;
            case 'distributionChart':
                this.drawBarChart(ctx, rect.width, rect.height);
                break;
        }
    }

    drawLineChart(ctx, width, height) {
        const data = [65, 72, 68, 75, 82, 78, 85, 89, 84, 91, 88, 94];
        const padding = 30;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const valueRange = maxValue - minValue;
        
        // ציור הקו
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
        
        // ציור נקודות
        ctx.fillStyle = '#482EA6';
        data.forEach((value, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    drawPerformanceChart(ctx, width, height) {
        const salesData = [45, 52, 48, 61, 69, 73, 78, 85, 82, 89, 87, 92];
        const satisfactionData = [60, 65, 62, 68, 74, 79, 81, 84, 88, 85, 91, 94];
        const datasets = [salesData, satisfactionData];
        const colors = ['#3EA621', '#482EA6'];
        
        const padding = 30;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        const allValues = datasets.flat();
        const maxValue = Math.max(...allValues);
        const minValue = Math.min(...allValues);
        const valueRange = maxValue - minValue;
        
        datasets.forEach((data, datasetIndex) => {
            ctx.strokeStyle = colors[datasetIndex];
            ctx.lineWidth = 2;
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
        });
    }

    drawBarChart(ctx, width, height) {
        const data = [15, 25, 35, 45, 30, 20, 10, 8, 5, 2];
        const padding = 30;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        const maxValue = Math.max(...data);
        const barWidth = chartWidth / data.length * 0.8;
        const barSpacing = chartWidth / data.length * 0.2;
        
        // Gradient
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
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
}

// ניהול אנימציות scroll
class ScrollAnimations {
    constructor() {
        this.elements = document.querySelectorAll('section, .feature-card, .problem-card, .testimonial-card, .pricing-card');
        this.init();
    }

    init() {
        if (this.elements.length === 0 || Utils.prefersReducedMotion()) return;
        this.setupIntersectionObserver();
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    
                    // אנימציה של פסי התקדמות
                    const progressBars = entry.target.querySelectorAll('.progress-fill');
                    progressBars.forEach(bar => {
                        const width = bar.style.width;
                        if (width) {
                            bar.style.width = '0%';
                            setTimeout(() => {
                                bar.style.width = width;
                            }, 300);
                        }
                    });
                    
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        this.elements.forEach(el => observer.observe(el));
    }
}

// ניהול טופס יצירת קשר
class ContactForm {
    constructor() {
        this.form = document.getElementById('contactForm');
        this.init();
    }

    init() {
        if (!this.form) return;
        
        this.setupValidation();
        this.setupSubmission();
    }

    setupValidation() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    setupSubmission() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // בדיקת תקינות כל השדות
            const inputs = this.form.querySelectorAll('input, select, textarea');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!this.validateField(input)) {
                    isValid = false;
                }
            });

            if (!isValid) return;

            const submitBtn = this.form.querySelector('.form-submit');
            const originalText = submitBtn.textContent;
            
            // מצב טעינה
            submitBtn.textContent = 'שולח...';
            submitBtn.disabled = true;
            
            // איסוף נתוני הטופס
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData.entries());
            
            try {
                // כאן תהיה קריאה לשרת
                // const response = await fetch(CONFIG.apiEndpoints.contact, {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(data)
                // });
                
                // סימולציה של קריאת שרת
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                this.showNotification('הודעתך נשלחה בהצלחה! נחזור אליך בקרוב.', 'success');
                this.form.reset();
                
            } catch (error) {
                console.error('Form submission error:', error);
                this.showNotification('אירעה שגיאה בשליחת הטופס. אנא נסה שוב.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        const required = field.hasAttribute('required');
        
        this.clearFieldError(field);
        
        if (required && !value) {
            this.showFieldError(field, 'שדה זה הוא חובה');
            return false;
        }
        
        if (type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.showFieldError(field, 'כתובת אימייל לא תקינה');
                return false;
            }
        }
        
        if (type === 'tel' && value) {
            const phoneRegex = /^[\d\-\+\(\)\s]+$/;
            if (!phoneRegex.test(value)) {
                this.showFieldError(field, 'מספר טלפון לא תקין');
                return false;
            }
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
            errorElement.style.color = '#dc2626';
            errorElement.style.fontSize = '0.875rem';
            errorElement.style.marginTop = '0.25rem';
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
    }

    clearFieldError(field) {
        field.classList.remove('error');
        field.removeAttribute('aria-invalid');
        
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    showNotification(message, type = 'info') {
        // הסרת הודעות קיימות
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.setAttribute('role', 'alert');
        
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#3EA621' : '#dc2626'};
                color: white;
                padding: 16px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                max-width: 400px;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            ">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    margin-right: 10px;
                    cursor: pointer;
                    float: left;
                ">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // אנימציה
        setTimeout(() => {
            notification.firstElementChild.style.transform = 'translateX(0)';
        }, 100);
        
        // הסרה אוטומטית
        setTimeout(() => {
            if (notification.parentNode) {
                notification.firstElementChild.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// סגנונות CSS לאנימציות
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* אנימציות Fade In */
        section, .feature-card, .problem-card, .testimonial-card, .pricing-card {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        section.fade-in, .feature-card.fade-in, .problem-card.fade-in, .testimonial-card.fade-in, .pricing-card.fade-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        /* שדות שגויים */
        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error {
            border-color: #dc2626;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }
        
        /* Skip to content */
        .skip-to-content {
            position: absolute;
            top: -40px;
            left: 6px;
            background: #482EA6;
            color: white;
            padding: 8px;
            border-radius: 4px;
            text-decoration: none;
            z-index: 10000;
            transition: top 0.3s;
        }
        
        .skip-to-content:focus {
            top: 6px;
        }
        
        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// נגישות
function setupAccessibility() {
    // הוספת Skip to content
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'דילוג לתוכן העיקרי';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // הוספת ID לתוכן הראשי
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        heroSection.id = 'main-content';
        heroSection.setAttribute('tabindex', '-1');
    }
    
    // הוספת ARIA labels לכפתורים ללא טקסט
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach(button => {
        if (!button.textContent.trim()) {
            if (button.classList.contains('mobile-menu-toggle')) {
                button.setAttribute('aria-label', 'פתח תפריט ניווט');
                button.setAttribute('aria-expanded', 'false');
            }
        }
    });
}

// אינטגרציה אתחילה
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Coachee Landing Page מתחיל לטעון...');
    
    // הוספת סגנונות אנימציה
    addAnimationStyles();
    
    // הגדרת נגישות
    setupAccessibility();
    
    // אתחול רכיבים
    new Navigation();
    new CounterAnimation();
    new ChartManager();
    new ScrollAnimations();
    new ContactForm();
    
    // סימון שהטעינה הושלמה
    document.body.classList.add('loaded');
    
    console.log('✅ הדף נטען בהצלחה!');
});

// טיפול בשגיאות
window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});