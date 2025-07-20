// Enhanced JavaScript - Revolutionary Interactive Effects
// מחוץ לקופסא - אפקטים אינטראקטיביים מרהיבים

// Import existing functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize existing functions
    initializeCounters();
    initializeCharts();
    initializeScrollAnimations();
    initializeMobileMenu();
    initializeContactForm();
    initializeHeaderScroll();
    
    // Initialize new enhanced effects
    initializeParticleSystem();
    initializeHolographicEffects();
    initializeLiquidMorphing();
    initializeQuantumInteractions();
    initializeNeuralNetwork();
    initializeMagneticElements();
    initializeCosmicBackground();
    initialize3DCursor();
});

// Revolutionary Particle System
function initializeParticleSystem() {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-system';
    particleContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
        overflow: hidden;
    `;
    document.body.appendChild(particleContainer);

    // Create floating orbs
    for (let i = 0; i < 20; i++) {
        createFloatingOrb(particleContainer, i);
    }

    // Mouse-following particles
    let particles = [];
    document.addEventListener('mousemove', (e) => {
        if (particles.length < 50) {
            createMouseParticle(e.clientX, e.clientY, particleContainer);
        }
    });
}

function createFloatingOrb(container, index) {
    const orb = document.createElement('div');
    const size = Math.random() * 8 + 4;
    const colors = ['#7C3AED', '#2563EB', '#059669', '#EC4899', '#F59E0B'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    orb.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, ${color}, transparent);
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: orbFloat ${8 + Math.random() * 10}s ease-in-out infinite;
        animation-delay: ${index * 0.2}s;
        opacity: 0.7;
        box-shadow: 0 0 20px ${color}50;
    `;
    
    container.appendChild(orb);
}

function createMouseParticle(x, y, container) {
    const particle = document.createElement('div');
    const colors = ['#7C3AED', '#2563EB', '#059669'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: ${color};
        border-radius: 50%;
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
        animation: particleFade 2s ease-out forwards;
        box-shadow: 0 0 10px ${color};
    `;
    
    container.appendChild(particle);
    
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, 2000);
}

// Holographic Text Effects
function initializeHolographicEffects() {
    const titles = document.querySelectorAll('.hero-title, .section-title');
    
    titles.forEach(title => {
        title.addEventListener('mouseenter', () => {
            title.style.animation = 'holographicGlitch 0.5s ease-in-out';
            createHolographicClones(title);
        });
        
        title.addEventListener('mouseleave', () => {
            removeHolographicClones(title);
        });
    });
}

function createHolographicClones(element) {
    const rect = element.getBoundingClientRect();
    const colors = ['#7C3AED', '#2563EB', '#059669'];
    
    colors.forEach((color, index) => {
        const clone = element.cloneNode(true);
        clone.className = 'holographic-clone';
        clone.style.cssText = `
            position: absolute;
            left: ${rect.left + (index - 1) * 2}px;
            top: ${rect.top + (index - 1) * 2}px;
            color: ${color};
            opacity: 0.3;
            pointer-events: none;
            z-index: -1;
            animation: holographicFloat 1s ease-in-out infinite;
            animation-delay: ${index * 0.1}s;
        `;
        document.body.appendChild(clone);
    });
}

function removeHolographicClones(element) {
    const clones = document.querySelectorAll('.holographic-clone');
    clones.forEach(clone => {
        clone.style.opacity = '0';
        setTimeout(() => {
            if (clone.parentNode) {
                clone.parentNode.removeChild(clone);
            }
        }, 300);
    });
}

// Liquid Morphing Background
function initializeLiquidMorphing() {
    const sections = document.querySelectorAll('.hero, .solution-section, .analytics-section');
    
    sections.forEach(section => {
        const liquidLayer = document.createElement('div');
        liquidLayer.className = 'liquid-morph-layer';
        liquidLayer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
            background: radial-gradient(ellipse at center,
                rgba(124, 58, 237, 0.05) 0%,
                rgba(37, 99, 235, 0.05) 50%,
                transparent 100%);
            animation: liquidTransform 20s ease-in-out infinite;
        `;
        section.appendChild(liquidLayer);
    });
}

// Quantum Interactions
function initializeQuantumInteractions() {
    const cards = document.querySelectorAll('.feature-card, .problem-card, .testimonial-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', (e) => {
            createQuantumRipple(e.currentTarget, e.clientX, e.clientY);
            card.style.transform = 'translateY(-15px) rotateX(5deg) rotateY(5deg)';
            card.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) rotateX(0deg) rotateY(0deg)';
        });
        
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            const rotateY = (x - 0.5) * 10;
            const rotateX = (y - 0.5) * -10;
            
            card.style.transform = `translateY(-15px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
    });
}

function createQuantumRipple(element, x, y) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('div');
    const localX = x - rect.left;
    const localY = y - rect.top;
    
    ripple.style.cssText = `
        position: absolute;
        left: ${localX}px;
        top: ${localY}px;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(124, 58, 237, 0.3), transparent);
        animation: quantumRipple 0.8s ease-out;
        pointer-events: none;
        z-index: 1;
    `;
    
    element.appendChild(ripple);
    
    setTimeout(() => {
        if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
        }
    }, 800);
}

// Neural Network Visualization
function initializeNeuralNetwork() {
    const heroSection = document.querySelector('.hero');
    const networkCanvas = document.createElement('canvas');
    networkCanvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
        opacity: 0.3;
    `;
    
    heroSection.appendChild(networkCanvas);
    
    const ctx = networkCanvas.getContext('2d');
    let nodes = [];
    let connections = [];
    
    // Initialize neural network
    function initNetwork() {
        networkCanvas.width = heroSection.offsetWidth;
        networkCanvas.height = heroSection.offsetHeight;
        
        nodes = [];
        for (let i = 0; i < 30; i++) {
            nodes.push({
                x: Math.random() * networkCanvas.width,
                y: Math.random() * networkCanvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1
            });
        }
    }
    
    function drawNetwork() {
        ctx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);
        
        // Update nodes
        nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;
            
            if (node.x < 0 || node.x > networkCanvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > networkCanvas.height) node.vy *= -1;
        });
        
        // Draw connections
        ctx.strokeStyle = 'rgba(124, 58, 237, 0.2)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
                if (distance < 150) {
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }
        
        // Draw nodes
        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(37, 99, 235, 0.6)';
            ctx.fill();
        });
        
        requestAnimationFrame(drawNetwork);
    }
    
    initNetwork();
    drawNetwork();
    
    window.addEventListener('resize', initNetwork);
}

// Magnetic Elements Effect
function initializeMagneticElements() {
    const magneticElements = document.querySelectorAll('.cta-btn, .nav-link');
    
    magneticElements.forEach(element => {
        element.addEventListener('mousemove', (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            const strength = 0.3;
            element.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'translate(0, 0)';
        });
    });
}

// Cosmic Background Animation
function initializeCosmicBackground() {
    const cosmicLayer = document.createElement('div');
    cosmicLayer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -10;
        background: radial-gradient(ellipse at top left,
            rgba(124, 58, 237, 0.02) 0%,
            transparent 50%),
            radial-gradient(ellipse at bottom right,
            rgba(37, 99, 235, 0.02) 0%,
            transparent 50%);
        animation: cosmicShift 30s ease-in-out infinite;
    `;
    
    document.body.appendChild(cosmicLayer);
}

// 3D Cursor Effect
function initialize3DCursor() {
    const cursor = document.createElement('div');
    cursor.className = 'cursor-3d';
    cursor.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, rgba(124, 58, 237, 0.8), transparent);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transition: transform 0.1s ease;
        mix-blend-mode: difference;
    `;
    
    document.body.appendChild(cursor);
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    function animateCursor() {
        cursorX += (mouseX - cursorX) * 0.1;
        cursorY += (mouseY - cursorY) * 0.1;
        
        cursor.style.left = cursorX - 10 + 'px';
        cursor.style.top = cursorY - 10 + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    
    animateCursor();
    
    // Hide on mobile
    if ('ontouchstart' in window) {
        cursor.style.display = 'none';
    }
}

// Enhanced Charts with Particle Effects
function createEnhancedChart(canvas, data, type = 'line') {
    const ctx = canvas.getContext('2d');
    const particles = [];
    
    // Create particles for data points
    data.forEach((value, index) => {
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: (canvas.width / data.length) * index + Math.random() * 20 - 10,
                y: canvas.height - (value / 100) * canvas.height + Math.random() * 20 - 10,
                vx: Math.random() * 2 - 1,
                vy: Math.random() * 2 - 1,
                life: 1,
                decay: 0.01
            });
        }
    });
    
    function animateChart() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            
            if (particle.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            
            ctx.save();
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = '#7C3AED';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Draw main chart
        drawLineChart(ctx, data, [], '#7C3AED', canvas.width, canvas.height);
        
        if (particles.length > 0) {
            requestAnimationFrame(animateChart);
        }
    }
    
    animateChart();
}

// Intersection Observer for Enhanced Animations
function initializeAdvancedScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add quantum fade-in effect
                entry.target.classList.add('quantum-fade-in');
                
                // Create energy burst effect
                createEnergyBurst(entry.target);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll('section, .feature-card, .problem-card');
    elements.forEach(el => observer.observe(el));
}

function createEnergyBurst(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        const angle = (i / 12) * Math.PI * 2;
        const distance = 100;
        
        particle.style.cssText = `
            position: fixed;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 4px;
            height: 4px;
            background: #7C3AED;
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            animation: energyBurst 1s ease-out forwards;
            animation-delay: ${i * 0.05}s;
        `;
        
        particle.style.setProperty('--end-x', Math.cos(angle) * distance + 'px');
        particle.style.setProperty('--end-y', Math.sin(angle) * distance + 'px');
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 1000);
    }
}

// Add CSS keyframes dynamically
function addEnhancedKeyframes() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes orbFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
            25% { transform: translateY(-30px) rotate(90deg); opacity: 1; }
            50% { transform: translateY(-20px) rotate(180deg); opacity: 0.5; }
            75% { transform: translateY(-40px) rotate(270deg); opacity: 0.8; }
        }
        
        @keyframes particleFade {
            0% { transform: scale(1) rotate(0deg); opacity: 1; }
            100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
        
        @keyframes holographicGlitch {
            0%, 100% { transform: skew(0deg); }
            25% { transform: skew(2deg); }
            50% { transform: skew(-1deg); }
            75% { transform: skew(1deg); }
        }
        
        @keyframes holographicFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
        }
        
        @keyframes liquidTransform {
            0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
            25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
            50% { border-radius: 70% 30% 40% 60% / 40% 70% 60% 30%; }
            75% { border-radius: 40% 70% 60% 30% / 70% 40% 50% 60%; }
        }
        
        @keyframes quantumRipple {
            0% { width: 0; height: 0; opacity: 1; }
            100% { width: 200px; height: 200px; opacity: 0; transform: translate(-50%, -50%); }
        }
        
        @keyframes cosmicShift {
            0%, 100% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
        }
        
        @keyframes energyBurst {
            0% { 
                transform: translate(-50%, -50%) scale(1); 
                opacity: 1; 
            }
            100% { 
                transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(0); 
                opacity: 0; 
            }
        }
        
        .quantum-fade-in {
            animation: quantumFadeIn 1s ease-out forwards;
        }
        
        @keyframes quantumFadeIn {
            from {
                opacity: 0;
                transform: translateY(50px) rotateX(10deg) scale(0.95);
                filter: blur(10px) hue-rotate(180deg);
            }
            to {
                opacity: 1;
                transform: translateY(0) rotateX(0deg) scale(1);
                filter: blur(0px) hue-rotate(0deg);
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize enhanced keyframes
addEnhancedKeyframes();

// Performance monitoring
function monitorPerformance() {
    let frameCount = 0;
    let lastTime = performance.now();
    
    function checkFPS() {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
            const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
            
            // Reduce effects if FPS is low
            if (fps < 30) {
                document.body.classList.add('reduced-effects');
            }
            
            frameCount = 0;
            lastTime = currentTime;
        }
        
        requestAnimationFrame(checkFPS);
    }
    
    checkFPS();
}

// Start performance monitoring
monitorPerformance();