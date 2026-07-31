async function initSupabase() {
  const res = await fetch('/api/config');
  const config = await res.json();
  window.__supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

async function main() {
  await initSupabase();

  const app = document.getElementById('app');
  let rendered = false;
  let lastSessionUserId = null;

  async function renderScreen(session) {
    const userId = session?.user?.id || null;
    if (rendered && userId === lastSessionUserId) return;
    rendered = true;
    lastSessionUserId = userId;

    if (session) {
      const { initDashboard } = await import('./views/dashboard.js');
      app.innerHTML = '';
      app.appendChild(initDashboard());
    } else {
      const { initLogin } = await import('./views/login.js');
      app.innerHTML = '';
      app.appendChild(initLogin());
    }
  }

  window.__supabase.auth.onAuthStateChange((event, session) => {
    if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
    renderScreen(session);
  });

  const { data: { session } } = await window.__supabase.auth.getSession();
  renderScreen(session);
}

main();
