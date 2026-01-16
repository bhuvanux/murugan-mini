// Scroll Reveal Animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('scroll-active');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.scroll-reveal, .scroll-reveal-right').forEach(el => {
    observer.observe(el);
});

// Parallax Effect for Hero
window.addEventListener('scroll', () => {
    const scrollValue = window.scrollY;
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) {
        // Correct parallax to maintain centering
        const movement = scrollValue * 0.3;
        heroBg.style.transform = `translate(-50%, calc(-50% + ${movement}px)) scale(1.1)`;
    }

    // Navbar shadow on scroll
    const navbar = document.querySelector('.navbar');
    if (scrollValue > 50) {
        navbar.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
        navbar.style.height = '80px';
    } else {
        navbar.style.boxShadow = 'none';
        navbar.style.height = '90px';
    }
});

// Mobile Menu Toggle (if added later)
// Currently focusing on clean single page as per requirements.

// Smooth scroll for all links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80, // Navbar height offset
                behavior: 'smooth'
            });
        }
    });
});
