     // Security measures
     document.addEventListener('contextmenu', event => event.preventDefault());
     document.addEventListener('keydown', (event) => {
         if (event.key === 'F12' || event.key === 'F2' ||
             (event.ctrlKey && event.shiftKey && event.key === 'I') ||
             (event.ctrlKey && event.key === 'u') ||
             (event.metaKey && event.altKey && event.key === 'I') ||
             (event.ctrlKey && event.key === 'l')) {
             event.preventDefault();
         }
     });
