// Auto-logout on window/tab close
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Supabase
  const supabase = supabase.createClient(
    'https://qzvtkquxsuprxovpalzd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dnRrcXV4c3VwcnhvdnBhbHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MTA3NzAsImV4cCI6MjA2MDQ4Njc3MH0.nHxK4z3WfIm9VEIpPpgiDVY1xQRAF0Mz0CxOD68AsgM'
  );

  // Set up beforeunload handler
  window.addEventListener('beforeunload', async (e) => {
    // Don't wait for logout to complete (browser may close too fast)
    supabase.auth.signOut().catch(e => console.error('Logout error:', e));
    
    // For Chrome/Edge (optional confirmation dialog)
    e.preventDefault();
    e.returnValue = '';
  });

  // Extra protection - clear session on page load
  const { error } = await supabase.auth.signOut();
  if (!error) {
    // If we successfully logged out, redirect to login
    if (!window.location.pathname.endsWith('index.html')) {
      window.location.replace('index.html');
    }
  }
});