const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
});

document.querySelectorAll('.mobile-link, .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        if (link.getAttribute('href').startsWith('#')) {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
            
            mobileMenu.classList.remove('active');
        }
    });
});

const chartBars = document.querySelectorAll('.chart-bar');
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'growBar 1s ease forwards';
        }
    });
}, observerOptions);

chartBars.forEach(bar => {
    bar.style.height = '0';
    observer.observe(bar);
});

const style = document.createElement('style');
style.textContent = `
    @keyframes growBar {
        to {
            height: var(--target-height);
        }
    }
`;
document.head.appendChild(style);

chartBars.forEach(bar => {
    bar.style.setProperty('--target-height', bar.style.height);
});
