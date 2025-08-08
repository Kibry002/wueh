
        // Visual effects only (unchanged)
        function initWaveEffect() {
            const colors = [
                'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
                'brown', 'black', 'white', 'gray', 'cyan', 'magenta', 'indigo',
                'violet', 'turquoise', 'teal', 'maroon', 'olive', 'lime',
                'salmon', 'peach', 'coral', 'lavender', 'mint', 'navy',
                'burgundy', 'tan'
            ];

            function waveEffect() {
                const textElement = document.getElementById('waveText');
                if (!textElement) return;

                const originalText = textElement.textContent.trim();
                textElement.innerHTML = '';

                originalText.split('').forEach((char, index) => {
                    const span = document.createElement('span');
                    span.textContent = char;

                    if (char === ' ') {
                        span.style.width = '0.4em';
                        span.style.opacity = '1';
                    } else {
                        span.style.transition = `
                            opacity 0.6s ease ${index * 80}ms,
                            transform 0.6s ease ${index * 80}ms,
                            color 0.3s ease
                        `;
                        span.style.color = colors[index % colors.length];
                        span.style.opacity = '0';
                        span.style.transform = 'translateY(-20px)';

                        setTimeout(() => {
                            span.style.opacity = '1';
                            span.style.transform = 'translateY(0)';
                        }, 50);
                    }

                    textElement.appendChild(span);
                });

                setTimeout(() => {
                    textElement.querySelectorAll('span').forEach((span, index) => {
                        span.style.transition = `
                            opacity 0.5s ease ${index * 50}ms,
                            transform 0.5s ease ${index * 50}ms
                        `;
                        span.style.opacity = '0';
                        span.style.transform = 'translateY(15px)';
                    });

                    setTimeout(waveEffect, 800);
                }, originalText.length * 100 + 4000);
            }

            waveEffect();
        }

        function resetLoginButton() {
            const loader = document.getElementById('loader');
            const btnText = document.querySelector('.btn-text');
            loader.style.display = 'none';
            btnText.textContent = "LOGIN";
        }

        function addFadeAnimations() {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                @keyframes fadeOut {
                    from { opacity: 1; transform: translate(-50%, 0); }
                    to { opacity: 0; transform: translate(-50%, -20px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.addEventListener('DOMContentLoaded', () => {
            initWaveEffect();
            resetLoginButton();
            addFadeAnimations();

            // Security measures
            document.addEventListener('contextmenu', event => event.preventDefault());
            document.addEventListener('keydown', (event) => {
                if (
                    event.key === 'F12' ||
                    event.key === 'F2' ||
                    (event.ctrlKey && event.shiftKey && event.key === 'I') ||
                    (event.ctrlKey && event.key === 'u') ||
                    (event.metaKey && event.altKey && event.key === 'I') ||
                    (event.ctrlKey && event.key === 'l')
                ) {
                    event.preventDefault();
                }
            });
        });