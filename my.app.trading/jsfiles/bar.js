 document.addEventListener('DOMContentLoaded', () => {
        try {
            const messageIcon = document.querySelector('.message-icon');
            const socialLinks = document.querySelector('.social-links');

            const toggleSocialLinks = (event) => {
                event.stopPropagation();
                socialLinks.classList.toggle('active');
                const isExpanded = socialLinks.classList.contains('active');
                messageIcon.setAttribute('aria-expanded', isExpanded);
            };

            if (messageIcon) {
                messageIcon.addEventListener('click', toggleSocialLinks);
            }

            document.addEventListener('click', () => {
                if (socialLinks.classList.contains('active')) {
                    socialLinks.classList.remove('active');
                    messageIcon.setAttribute('aria-expanded', 'false');
                }
            });

            socialLinks.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        } catch (error) {
            console.error('Navigation error:', error);
        }
    });
