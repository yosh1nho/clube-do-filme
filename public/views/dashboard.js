const supabase = window.__supabase;

let currentView = 'quinzena';

async function logout() {
  await supabase.auth.signOut();
}

function setActiveTab(viewName) {
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('nav-active', a.dataset.view === viewName);
  });
}

async function loadView(viewName) {
  const main = document.getElementById('main-content');
  main.innerHTML = '<p class="caption" style="text-align:center;padding:80px 0;">Carregando...</p>';
  
  try {
    let viewModule;
    switch (viewName) {
      case 'quinzena': viewModule = await import('./quinzena.js'); break;
      case 'historico': viewModule = await import('./historico.js'); break;
      case 'ranking': viewModule = await import('./ranking.js'); break;
      case 'perfil': viewModule = await import('./perfil.js'); break;
    }

    // 1. Aguarda a criação da tela e TODA a demora da rede (APIs) PRIMEIRO
    const viewNode = await viewModule[`init${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`]();
    
    // 2. O SEGREDO AQUI: Limpa a tela SÓ QUANDO o novo conteúdo já está em mãos, 
    // imediatamente antes de inseri-lo.
    main.innerHTML = '';
    main.appendChild(viewNode);
    
    currentView = viewName;
    setActiveTab(viewName);
  } catch (err) {
    main.innerHTML = `<p class="caption" style="text-align:center;padding:80px 0;">Erro ao carregar: ${err.message}</p>`;
  }
}

window.__navigate = loadView;

function initDashboard() {
  const nav = document.createElement('nav');
  nav.className = 'nav';

  const logo = document.createElement('span');
  logo.className = 'card-title';
  logo.textContent = 'Quinzena';
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', () => loadView('quinzena'));

  const navLinks = document.createElement('ul');
  navLinks.className = 'nav-links';

  const tabs = [
    { view: 'quinzena', label: 'Quinzena Atual' },
    { view: 'historico', label: 'Histórico' },
    { view: 'ranking', label: 'Ranking' },
    { view: 'perfil', label: 'Perfil' }
  ];

  tabs.forEach(tab => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.dataset.view = tab.view;
    a.textContent = tab.label;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      loadView(tab.view);
    });
    li.appendChild(a);
    navLinks.appendChild(li);
  });

  const btnLogout = document.createElement('button');
  btnLogout.className = 'btn btn-small btn-outline';
  btnLogout.textContent = 'Sair';
  btnLogout.addEventListener('click', logout);

  nav.appendChild(logo);
  nav.appendChild(navLinks);
  nav.appendChild(btnLogout);

  const main = document.createElement('main');
  main.className = 'container dashboard-main';
  main.id = 'main-content';

  const fragment = document.createDocumentFragment();
  fragment.appendChild(nav);
  fragment.appendChild(main);

  setTimeout(() => loadView('quinzena'), 0);

  return fragment;
}

export { initDashboard };
