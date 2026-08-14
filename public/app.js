async function initSupabase() {
  const res = await fetch('/api/config');
  const config = await res.json();
  window.__supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

// Registro do Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}

// Captura do evento de instalação do PWA
window.__deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-installable'));
});

// Helper universal de instalação (Android, Desktop e iOS)
window.__promptInstallPWA = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isStandalone) {
    alert('O aplicativo já está instalado no seu dispositivo!');
    return;
  }

  if (window.__deferredPrompt) {
    window.__deferredPrompt.prompt();
    window.__deferredPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        window.__deferredPrompt = null;
      }
    });
  } else if (isIOS) {
    // Modal explicativo elegante para iPhone / iOS
    abrirModalInstalacaoIOS();
  } else {
    // Outros navegadores (ex: Chrome no Desktop / Safari macOS)
    alert('Para instalar o app, use o menu do navegador e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".');
  }
};

function abrirModalInstalacaoIOS() {
  const existente = document.querySelector('.modal-overlay-ios-install');
  if (existente) existente.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay modal-overlay-ios-install';

  const modal = document.createElement('div');
  modal.className = 'modal-detalhes modal-ios-install';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.addEventListener('click', () => overlay.remove());
  modal.appendChild(closeBtn);

  const content = document.createElement('div');
  content.className = 'modal-detalhes-content';

  const title = document.createElement('h3');
  title.className = 'sub-heading';
  title.textContent = 'Instalar no iPhone';
  title.style.marginBottom = 'var(--space-4)';
  content.appendChild(title);

  const stepsList = document.createElement('div');
  stepsList.className = 'ios-install-steps';

  const step1 = document.createElement('div');
  step1.className = 'ios-step-item';
  step1.innerHTML = `
    <div class="ios-step-number">1</div>
    <div class="ios-step-text">
      <strong>Toque no botão Compartilhar</strong>
      <p class="caption text-muted">Na barra inferior do Safari, clique no ícone com o quadrado e uma seta apontando para cima.</p>
    </div>
  `;

  const step2 = document.createElement('div');
  step2.className = 'ios-step-item';
  step2.innerHTML = `
    <div class="ios-step-number">2</div>
    <div class="ios-step-text">
      <strong>Selecione "Adicionar à Tela de Início"</strong>
      <p class="caption text-muted">Role as opções para baixo e toque em Adicionar à Tela de Início.</p>
    </div>
  `;

  const step3 = document.createElement('div');
  step3.className = 'ios-step-item';
  step3.innerHTML = `
    <div class="ios-step-number">3</div>
    <div class="ios-step-text">
      <strong>Toque em "Adicionar" no topo</strong>
      <p class="caption text-muted">O ícone do Quinzena será adicionado à tela do seu celular e abrirá em tela cheia.</p>
    </div>
  `;

  stepsList.appendChild(step1);
  stepsList.appendChild(step2);
  stepsList.appendChild(step3);
  content.appendChild(stepsList);

  const btnEntendido = document.createElement('button');
  btnEntendido.className = 'btn btn-primary';
  btnEntendido.style.width = '100%';
  btnEntendido.style.marginTop = 'var(--space-4)';
  btnEntendido.textContent = 'Entendi';
  btnEntendido.addEventListener('click', () => overlay.remove());
  content.appendChild(btnEntendido);

  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
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
