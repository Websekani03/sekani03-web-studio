document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. Scroll Progress Bar
    // -------------------------------------------------------------------------
    const scrollProgress = document.getElementById('scroll-progress');
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolledPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        scrollProgress.style.width = scrolledPercent + '%';
    });

    // -------------------------------------------------------------------------
    // 2. Sticky Navbar & Mobile Menu Toggle
    // -------------------------------------------------------------------------
    const navbar = document.querySelector('.navbar');
    const navToggle = document.getElementById('nav-toggle');
    const navLinksList = document.getElementById('nav-links');
    const navLinks = document.querySelectorAll('.nav-links a');

    // Sticky Scroll Effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile Hamburger Toggle
    navToggle.addEventListener('click', () => {
        navbar.classList.toggle('mobile-active');
    });

    // Close Mobile Menu on link clicks
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navbar.classList.remove('mobile-active');
        });
    });

    // -------------------------------------------------------------------------
    // 3. Scroll Reveal Animations (Intersection Observer)
    // -------------------------------------------------------------------------
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // -------------------------------------------------------------------------
    // 4. Scroll-Spy (Highlight Active Nav Link)
    // -------------------------------------------------------------------------
    const sections = document.querySelectorAll('section, header');
    const spyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                if (!id) return;
                
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, {
        threshold: 0.4,
        rootMargin: '-80px 0px -40% 0px'
    });

    sections.forEach(section => spyObserver.observe(section));

    // -------------------------------------------------------------------------
    // 5. Dynamic Stats Counter
    // -------------------------------------------------------------------------
    const counterElements = document.querySelectorAll('.counter');
    const statsSection = document.getElementById('statistic');
    let countersAnimated = false;

    const animateCounters = () => {
        counterElements.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const duration = 2000; // 2 seconds animation
            const stepTime = Math.max(Math.floor(duration / target), 15);
            let current = 0;
            
            const timer = setInterval(() => {
                current += Math.ceil(target / (duration / stepTime));
                if (current >= target) {
                    counter.innerText = target + (target === 15 ? '+' : target === 24 ? '' : '%');
                    clearInterval(timer);
                } else {
                    counter.innerText = current;
                }
            }, stepTime);
        });
    };

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !countersAnimated) {
                animateCounters();
                countersAnimated = true;
            }
        });
    }, { threshold: 0.3 });

    if (statsSection) {
        statsObserver.observe(statsSection);
    }

    // -------------------------------------------------------------------------
    // 6. Testimonials Carousel Slider
    // -------------------------------------------------------------------------
    const feedbackWrapper = document.getElementById('feedback-wrapper');
    const slides = document.querySelectorAll('.feedback-slide');
    const prevBtn = document.getElementById('prev-slide');
    const nextBtn = document.getElementById('next-slide');
    const dotsContainer = document.getElementById('slider-dots');
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    let autoSlideInterval;

    if (totalSlides > 0) {
        // Build dots indicators
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('div');
            dot.classList.add('slider-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
        
        const dots = document.querySelectorAll('.slider-dot');

        const updateDots = () => {
            dots.forEach((dot, index) => {
                if (index === currentSlide) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        };

        const goToSlide = (index) => {
            currentSlide = (index + totalSlides) % totalSlides;
            feedbackWrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
            updateDots();
            resetAutoSlide();
        };

        prevBtn.addEventListener('click', () => {
            goToSlide(currentSlide - 1);
        });

        nextBtn.addEventListener('click', () => {
            goToSlide(currentSlide + 1);
        });

        // Auto slide functions
        const startAutoSlide = () => {
            autoSlideInterval = setInterval(() => {
                goToSlide(currentSlide + 1);
            }, 6000); // 6 seconds slide duration
        };

        const resetAutoSlide = () => {
            clearInterval(autoSlideInterval);
            startAutoSlide();
        };

        // Pause autoplay on mouse hover
        const sliderContainer = document.querySelector('.feedback-slider-container');
        sliderContainer.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
        sliderContainer.addEventListener('mouseleave', startAutoSlide);

        startAutoSlide();
    }

    // -------------------------------------------------------------------------
    // 7. Live Preview Modal
    // -------------------------------------------------------------------------
    const projectModal = document.getElementById('project-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const modalTitle = document.getElementById('modal-project-title');
    const modalClose = document.getElementById('modal-close');
    const previewBtns = document.querySelectorAll('.preview-project-btn');

    const openModal = (url, title) => {
        modalIframe.src = url;
        modalTitle.innerText = `${title} (Live Demo)`;
        projectModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling underlying page
    };

    const closeModal = () => {
        projectModal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            modalIframe.src = 'about:blank'; // Clear source to save memory / stop audio
        }, 400);
    };

    previewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const projectUrl = btn.getAttribute('data-project');
            const projectTitle = btn.getAttribute('data-title');
            openModal(projectUrl, projectTitle);
        });
    });

    modalClose.addEventListener('click', closeModal);

    // Close when clicking modal backdrop area
    projectModal.addEventListener('click', (e) => {
        if (e.target === projectModal) {
            closeModal();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && projectModal.classList.contains('active')) {
            closeModal();
        }
    });

    // -------------------------------------------------------------------------
    // 8. Contact Form Handling & Toast Alert Notification
    // -------------------------------------------------------------------------
    const contactForm = document.getElementById('contact-form');
    const toast = document.getElementById('toast-notification');
    const toastTitle = document.getElementById('toast-title');
    const toastMsg = document.getElementById('toast-message');
    const sendInquiryBtn = document.getElementById('b1');
    const bookConsultBtn = document.getElementById('b2');

    const showToast = (title, message, isSuccess = true) => {
        toastTitle.innerText = title;
        toastMsg.innerText = message;
        toast.style.borderColor = isSuccess ? '#10b981' : '#f59e0b';
        const icon = toast.querySelector('.toast-icon');
        icon.innerText = isSuccess ? '✓' : 'ℹ';
        icon.style.color = isSuccess ? '#10b981' : '#f59e0b';
        icon.style.backgroundColor = isSuccess ? 'rgba(16, 115, 81, 0.15)' : 'rgba(245, 158, 11, 0.15)';
        
        toast.classList.add('active');
        setTimeout(() => {
            toast.classList.remove('active');
        }, 5000);
    };

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const fullName = document.getElementById('fname').value.trim();
            const serviceSelected = document.getElementById('nservice').value;

            // Simple validation UI effect
            sendInquiryBtn.disabled = true;
            const originalText = sendInquiryBtn.innerText;
            sendInquiryBtn.innerText = 'Sending Inquiry...';

            // Simulate form submission process
            setTimeout(() => {
                showToast(
                    'Inquiry Sent!', 
                    `Thank you, ${fullName}! Your inquiry about "${serviceSelected}" has been successfully recorded.`,
                    true
                );
                
                contactForm.reset();
                
                // Reset select field floating labels
                document.querySelectorAll('.form-group select').forEach(sel => {
                    sel.value = '';
                });

                sendInquiryBtn.disabled = false;
                sendInquiryBtn.innerText = originalText;
            }, 1800);
        });
    }

    // Direct booking button handling
    if (bookConsultBtn) {
        bookConsultBtn.addEventListener('click', () => {
            const fullNameInput = document.getElementById('fname');
            const fullName = fullNameInput.value.trim();
            
            if (!fullName) {
                // Shake or alert to enter name first
                showToast(
                    'A Name is Required', 
                    'Please fill out your Full Name in the form before booking a consultation.',
                    false
                );
                fullNameInput.focus();
                return;
            }

            bookConsultBtn.disabled = true;
            const originalText = bookConsultBtn.innerText;
            bookConsultBtn.innerText = 'Booking Slot...';

            setTimeout(() => {
                showToast(
                    'Consultation Booked!', 
                    `Excellent choice, ${fullName}! We've saved a tentative slot for you. A scheduling email has been dispatched.`,
                    true
                );
                bookConsultBtn.disabled = false;
                bookConsultBtn.innerText = originalText;
            }, 1500);
        });
    }
});
