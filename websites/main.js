/* main.js: Dynamic Interactions and Micro-Animations for the Disruptive Site */

document.addEventListener("DOMContentLoaded", () => {
    
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 3D Tilt Effect on Feature Cards
    const cards = document.querySelectorAll('.tilt-card, .perspective-mockup');

    cards.forEach(card => {
        card.addEventListener('mousemove', handleMouseMove);
        card.addEventListener('mouseleave', handleMouseLeave);
    });

    function handleMouseMove(e) {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        
        // Calculate relative position 
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate rotation degrees limits (-10 to 10 deg)
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        card.style.transition = 'transform 0.1s ease';
    }

    function handleMouseLeave(e) {
        const card = e.currentTarget;
        // Keep the original state for the hero visual, but reset regular tilt cards to 0
        if (card.classList.contains('perspective-mockup')) {
            card.style.transform = `perspective(1200px) rotateY(-15deg) rotateX(5deg)`;
            card.style.transition = 'transform 0.5s ease';
        } else {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
            card.style.transition = 'transform 0.5s ease';
        }
    }

    // Scroll Reveal Animation via Intersection Observer
    const animTags = [
        ...document.querySelectorAll('.section-title'),
        ...document.querySelectorAll('.section-desc'),
        ...document.querySelectorAll('.feature-card'),
        ...document.querySelectorAll('.highlight-item'),
        ...document.querySelectorAll('.video-container'),
        ...document.querySelectorAll('.arch-section .glass-panel')
    ];

    // Give items an initial hidden style
    animTags.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px)';
        el.style.transition = 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
                observer.unobserve(el);
            }
        });
    }, {
        threshold: 0.1, 
        rootMargin: "0px 0px -50px 0px"
    });

    animTags.forEach(el => {
        revealObserver.observe(el);
    });

});
