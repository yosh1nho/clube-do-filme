const sb = window.__supabase;

async function apiFetch(url, opts = {}) {
  const token = await sb.auth.getSession().then(({ data }) => data.session?.access_token);
  const res = await fetch(url, {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token}` }
  });
  return res.json();
}

function renderStars(nota) {
  const container = document.createElement('div');
  container.className = 'stars';

  for (let i = 1; i <= 5; i++) {
    const slot = document.createElement('span');
    slot.className = 'star-slot';

    const base = document.createElement('span');
    base.className = 'star';
    base.textContent = '★';
    slot.appendChild(base);

    const overlay = document.createElement('span');
    overlay.className = 'star star-overlay';
    overlay.textContent = '★';
    const fill = Math.max(0, Math.min(1, nota - (i - 1)));
    overlay.style.width = (fill * 100) + '%';
    slot.appendChild(overlay);

    container.appendChild(slot);
  }

  return container;
}

function getConquistaSvg(tipo) {
  switch (tipo) {
    case 'crown':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/></svg>';
    case 'target':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>';
    case 'star':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    case 'zap':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    case 'clock':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    case 'edit':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    case 'film':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';
    case 'flame':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
    default:
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>';
  }
}

function exibirNotificacaoConquista(conquista) {
  const existente = document.querySelector('.toast-badge-notification');
  if (existente) existente.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-badge-notification';

  const iconBox = document.createElement('div');
  iconBox.className = 'toast-badge-icon';
  iconBox.innerHTML = getConquistaSvg(conquista.tipoIcone);

  const content = document.createElement('div');
  content.className = 'toast-badge-content';

  const titleRow = document.createElement('div');
  titleRow.className = 'toast-badge-title-row';

  const label = document.createElement('span');
  label.className = 'toast-badge-label';
  label.textContent = 'Nova Conquista Desbloqueada!';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-badge-close';
  closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.addEventListener('click', () => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 250);
  });

  titleRow.appendChild(label);
  titleRow.appendChild(closeBtn);

  const badgeName = document.createElement('strong');
  badgeName.className = 'toast-badge-name';
  badgeName.textContent = conquista.titulo;

  const badgeDesc = document.createElement('p');
  badgeDesc.className = 'caption text-muted toast-badge-desc';
  badgeDesc.textContent = conquista.descricao;

  const btnEquipar = document.createElement('button');
  btnEquipar.className = 'btn btn-small btn-outline toast-badge-action';
  btnEquipar.textContent = 'Ver no Perfil →';
  btnEquipar.addEventListener('click', () => {
    toast.remove();
    if (window.__navigate) window.__navigate('perfil');
  });

  content.appendChild(titleRow);
  content.appendChild(badgeName);
  content.appendChild(badgeDesc);
  content.appendChild(btnEquipar);

  toast.appendChild(iconBox);
  toast.appendChild(content);

  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 250);
    }
  }, 6000);
}

function verificarNovasConquistas(conquistas, usuarioLogadoId) {
  if (!conquistas || !usuarioLogadoId) return;
  const minhasConquistas = conquistas.filter(c => c.usuario?.id === usuarioLogadoId);
  if (!minhasConquistas.length) return;

  const storageKey = 'notified_conquistas_' + usuarioLogadoId;
  const notificadas = JSON.parse(localStorage.getItem(storageKey) || '[]');

  const nova = minhasConquistas.find(c => !notificadas.includes(c.id));
  if (nova) {
    exibirNotificacaoConquista(nova);
    notificadas.push(nova.id);
    localStorage.setItem(storageKey, JSON.stringify(notificadas));
  }
}

function initRanking() {
  const container = document.createElement('div');
  container.className = 'ranking-view-container';

  const title = document.createElement('h2');
  title.className = 'sub-heading';
  title.textContent = 'Ranking & Estatísticas';
  title.style.marginBottom = 'var(--space-4)';
  container.appendChild(title);

  // Subtabs Switcher
  const navTabs = document.createElement('div');
  navTabs.className = 'ranking-tabs-nav';

  const tabsConfig = [
    { id: 'classificacao', label: 'Classificação' },
    { id: 'conquistas', label: 'Conquistas' },
    { id: 'afinidade', label: 'Afinidade' },
    { id: 'estatisticas', label: 'Estatísticas' }
  ];

  let currentSubTab = 'classificacao';
  const tabButtons = [];

  const contentArea = document.createElement('div');
  contentArea.className = 'ranking-tab-content-area';
  contentArea.innerHTML = '<p class="caption text-muted" style="text-align:center;padding:40px 0;">Carregando...</p>';

  tabsConfig.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ranking-tab-btn' + (t.id === currentSubTab ? ' active' : '');
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      if (currentSubTab === t.id) return;
      currentSubTab = t.id;
      tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tabId === t.id));
      renderCurrentSubTab();
    });
    btn.dataset.tabId = t.id;
    tabButtons.push(btn);
    navTabs.appendChild(btn);
  });

  container.appendChild(navTabs);
  container.appendChild(contentArea);

  let cachedData = null;

  async function loadData() {
    const data = await apiFetch('/api/ranking');
    if (!data || data.error) {
      contentArea.innerHTML = `<p class="caption text-muted" style="text-align:center;padding:40px 0;">Erro ao carregar: ${data?.error || 'Desconhecido'}</p>`;
      return;
    }
    cachedData = data;
    verificarNovasConquistas(data.conquistas, data.usuarioLogadoId);
    renderCurrentSubTab();
  }

  function renderCurrentSubTab() {
    if (!cachedData) return;
    contentArea.innerHTML = '';

    switch (currentSubTab) {
      case 'classificacao':
        renderClassificacao(contentArea, cachedData);
        break;
      case 'conquistas':
        renderConquistas(contentArea, cachedData);
        break;
      case 'afinidade':
        renderAfinidade(contentArea, cachedData);
        break;
      case 'estatisticas':
        renderEstatisticas(contentArea, cachedData);
        break;
    }
  }

  loadData();

  return container;
}

// 1. Renderizador da Classificação (Pódio + Lista)
function renderClassificacao(container, data) {
  const { ranking, usuarioLogadoId } = data;

  if (!ranking || !ranking.length) {
    container.innerHTML = '<p class="caption text-muted" style="text-align:center;padding:40px 0;">Nenhum dado disponível ainda.</p>';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'ranking-classificacao-wrapper';

  const podium = document.createElement('div');
  podium.className = 'ranking-podium';

  const top3 = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  const ordemPodio = [1, 0, 2];
  ordemPodio.forEach(idx => {
    if (top3[idx]) {
      const card = criarCardPodio(top3[idx], usuarioLogadoId);
      podium.appendChild(card);
    }
  });

  wrapper.appendChild(podium);

  if (resto.length) {
    const lista = document.createElement('div');
    lista.className = 'ranking-lista';

    resto.forEach(r => {
      const item = criarItemLista(r, usuarioLogadoId);
      lista.appendChild(item);
    });

    wrapper.appendChild(lista);
  }

  container.appendChild(wrapper);
}

// 2. Renderizador das Conquistas & Badges (SVG elegante)
function renderConquistas(container, data) {
  const { conquistas, usuarioLogadoId } = data;

  if (!conquistas || !conquistas.length) {
    container.innerHTML = `
      <div class="card ranking-empty-section">
        <div class="ranking-empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>
        </div>
        <h3 class="card-title">Nenhuma conquista desbloqueada ainda</h3>
        <p class="caption text-muted" style="margin-top:4px;">À medida que os membros forem indicando e avaliando filmes nas quinzenas, os troféus serão distribuídos e disputados automaticamente.</p>
      </div>
    `;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid grid-3 conquistas-grid';

  conquistas.forEach(c => {
    const card = document.createElement('div');
    card.className = 'card conquista-card';

    const isWinnerMe = c.usuario?.id === usuarioLogadoId;
    if (isWinnerMe) card.classList.add('conquista-card-mine');

    const topRow = document.createElement('div');
    topRow.className = 'conquista-top-row';

    const iconBox = document.createElement('div');
    iconBox.className = 'conquista-icon-box';
    iconBox.innerHTML = getConquistaSvg(c.tipoIcone);

    const winnerAvatar = document.createElement('div');
    winnerAvatar.className = 'conquista-winner-avatar';
    winnerAvatar.title = `Detentor atual: ${c.usuario?.nome || '—'}`;

    if (c.usuario?.avatar_url) {
      winnerAvatar.innerHTML = `<img src="${c.usuario.avatar_url}" alt="${c.usuario.nome}">`;
    } else {
      winnerAvatar.textContent = (c.usuario?.nome || '?').charAt(0).toUpperCase();
    }

    topRow.appendChild(iconBox);
    topRow.appendChild(winnerAvatar);

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = c.titulo;

    const desc = document.createElement('p');
    desc.className = 'caption text-muted conquista-desc';
    desc.textContent = c.descricao;

    const footer = document.createElement('div');
    footer.className = 'conquista-footer';

    const winnerName = document.createElement('span');
    winnerName.className = 'conquista-winner-name';
    winnerName.textContent = isWinnerMe ? 'Você' : (c.usuario?.nome || '—');

    const highlightBadge = document.createElement('span');
    highlightBadge.className = 'conquista-stat-badge';
    highlightBadge.textContent = c.destaque;

    footer.appendChild(winnerName);
    footer.appendChild(highlightBadge);

    card.appendChild(topRow);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(footer);

    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// 3. Renderizador da Matriz de Afinidade
function renderAfinidade(container, data) {
  const { afinidade, usuarioLogadoId } = data;

  if (!afinidade || !afinidade.length) {
    container.innerHTML = `
      <div class="card ranking-empty-section">
        <div class="ranking-empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <h3 class="card-title">Afinidade em cálculo</h3>
        <p class="caption text-muted" style="margin-top:4px;">É necessário que os membros avaliem pelo menos uma quinzena em comum para calcular a sintonia de gosto entre vocês.</p>
      </div>
    `;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid grid-2 afinidade-grid';

  afinidade.forEach(af => {
    const card = document.createElement('div');
    card.className = 'card afinidade-card';

    const isParticipating = af.usuario1.id === usuarioLogadoId || af.usuario2.id === usuarioLogadoId;
    if (isParticipating) card.classList.add('afinidade-card-mine');

    // Header com avatares e match score
    const header = document.createElement('div');
    header.className = 'afinidade-header';

    const av1 = document.createElement('div');
    av1.className = 'afinidade-avatar';
    if (af.usuario1.avatar_url) av1.innerHTML = `<img src="${af.usuario1.avatar_url}" alt="${af.usuario1.nome}">`;
    else av1.textContent = af.usuario1.nome.charAt(0).toUpperCase();

    const matchBadge = document.createElement('div');
    matchBadge.className = 'afinidade-score-badge';
    matchBadge.innerHTML = `<span class="afinidade-score-num">${af.porcentagem}%</span><span class="caption">Sintonia</span>`;

    const av2 = document.createElement('div');
    av2.className = 'afinidade-avatar';
    if (af.usuario2.avatar_url) av2.innerHTML = `<img src="${af.usuario2.avatar_url}" alt="${af.usuario2.nome}">`;
    else av2.textContent = af.usuario2.nome.charAt(0).toUpperCase();

    header.appendChild(av1);
    header.appendChild(matchBadge);
    header.appendChild(av2);

    // Nomes
    const names = document.createElement('h3');
    names.className = 'card-title afinidade-names';
    const name1 = af.usuario1.id === usuarioLogadoId ? 'Você' : af.usuario1.nome;
    const name2 = af.usuario2.id === usuarioLogadoId ? 'Você' : af.usuario2.nome;
    names.textContent = `${name1} & ${name2}`;

    // Nível / Categoria
    const levelRow = document.createElement('div');
    levelRow.className = 'afinidade-level-row';
    levelRow.innerHTML = `<strong>${af.nivel}</strong> <span class="caption text-muted">(${af.filmesEmComumCount} filme${af.filmesEmComumCount !== 1 ? 's' : ''} em comum)</span>`;

    // Barra de Progresso
    const barTrack = document.createElement('div');
    barTrack.className = 'afinidade-bar-track';
    const barFill = document.createElement('div');
    barFill.className = 'afinidade-bar-fill';
    barFill.style.width = `${af.porcentagem}%`;
    barTrack.appendChild(barFill);

    // Curiosidades / Destaques
    const highlights = document.createElement('div');
    highlights.className = 'afinidade-highlights';

    if (af.maiorConcordancia?.filme) {
      const row = document.createElement('p');
      row.className = 'caption afinidade-highlight-row';
      row.innerHTML = `<strong>Maior sintonia:</strong> <em>${af.maiorConcordancia.filme.titulo}</em> (${af.maiorConcordancia.nota1}★ e ${af.maiorConcordancia.nota2}★)`;
      highlights.appendChild(row);
    }

    if (af.maiorDiscordancia?.filme && af.maiorDiscordancia.diff > 0.5) {
      const row = document.createElement('p');
      row.className = 'caption afinidade-highlight-row';
      row.innerHTML = `<strong>Maior divergência:</strong> <em>${af.maiorDiscordancia.filme.titulo}</em> (Diferença de ${af.maiorDiscordancia.diff}★)`;
      highlights.appendChild(row);
    }

    card.appendChild(header);
    card.appendChild(names);
    card.appendChild(levelRow);
    card.appendChild(barTrack);
    if (highlights.children.length) card.appendChild(highlights);

    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// 4. Renderizador das Estatísticas do Clube
function renderEstatisticas(container, data) {
  const { estatisticas } = data;

  if (!estatisticas || !estatisticas.totalAvaliacoes) {
    container.innerHTML = `
      <div class="card ranking-empty-section">
        <div class="ranking-empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        </div>
        <h3 class="card-title">Estatísticas em formação</h3>
        <p class="caption text-muted" style="margin-top:4px;">Após as primeiras avaliações, os gráficos de distribuição e gêneros aparecerão aqui.</p>
      </div>
    `;
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'ranking-stats-wrapper';

  // Cards de Totais
  const summaryRow = document.createElement('div');
  summaryRow.className = 'grid grid-2 stats-summary-row';

  const cardTotal = document.createElement('div');
  cardTotal.className = 'card stat-summary-card';
  cardTotal.innerHTML = `
    <span class="caption text-muted">Total de Avaliações</span>
    <strong class="stat-big-number">${estatisticas.totalAvaliacoes}</strong>
  `;

  const cardMedia = document.createElement('div');
  cardMedia.className = 'card stat-summary-card';
  cardMedia.innerHTML = `
    <span class="caption text-muted">Média Geral do Clube</span>
    <strong class="stat-big-number">${estatisticas.mediaGeral ? estatisticas.mediaGeral.toFixed(2) : '—'}★</strong>
  `;

  summaryRow.appendChild(cardTotal);
  summaryRow.appendChild(cardMedia);
  wrapper.appendChild(summaryRow);

  // Gráfico de Distribuição de Notas
  const distCard = document.createElement('div');
  distCard.className = 'card stats-chart-card';

  const distTitle = document.createElement('h3');
  distTitle.className = 'card-title';
  distTitle.textContent = 'Distribuição de Notas (Estrelas)';
  distTitle.style.marginBottom = 'var(--space-4)';
  distCard.appendChild(distTitle);

  const distBars = document.createElement('div');
  distBars.className = 'dist-bars-container';

  const maxCount = Math.max(...Object.values(estatisticas.distribuicaoNotas), 1);

  for (let estrelas = 5; estrelas >= 1; estrelas--) {
    const count = estatisticas.distribuicaoNotas[String(estrelas)] || 0;
    const pct = Math.round((count / maxCount) * 100);

    const row = document.createElement('div');
    row.className = 'dist-bar-row';
    row.innerHTML = `
      <span class="dist-star-label caption">${estrelas} ★</span>
      <div class="dist-bar-track">
        <div class="dist-bar-fill" style="width: ${pct}%;"></div>
      </div>
      <span class="dist-count-label caption">${count}</span>
    `;
    distBars.appendChild(row);
  }

  distCard.appendChild(distBars);
  wrapper.appendChild(distCard);

  // Ranking de Gêneros
  if (estatisticas.generosRanking && estatisticas.generosRanking.length) {
    const genCard = document.createElement('div');
    genCard.className = 'card stats-chart-card';

    const genTitle = document.createElement('h3');
    genTitle.className = 'card-title';
    genTitle.textContent = 'Desempenho por Gênero no Clube';
    genTitle.style.marginBottom = 'var(--space-4)';
    genCard.appendChild(genTitle);

    const genList = document.createElement('div');
    genList.className = 'stats-generos-list';

    estatisticas.generosRanking.forEach(g => {
      const item = document.createElement('div');
      item.className = 'stats-genero-item';
      item.innerHTML = `
        <div class="stats-genero-info">
          <strong>${g.genero}</strong>
          <span class="caption text-muted">${g.filmesCount} filme${g.filmesCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="stats-genero-media">
          <span class="caption">★ ${g.media.toFixed(1)}</span>
        </div>
      `;
      genList.appendChild(item);
    });

    genCard.appendChild(genList);
    wrapper.appendChild(genCard);
  }

  container.appendChild(wrapper);
}

// Helpers de Cards e Modais
function criarCardPodio(r, usuarioLogadoId) {
  const card = document.createElement('div');
  card.className = 'podio-card';
  card.style.cursor = 'pointer';

  const medalha = document.createElement('div');
  medalha.className = 'podio-medalha';
  if (r.posicao === 1) {
    medalha.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>';
    medalha.classList.add('ouro');
  } else if (r.posicao === 2) {
    medalha.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>';
    medalha.classList.add('prata');
  } else {
    medalha.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>';
    medalha.classList.add('bronze');
  }

  const avatar = document.createElement('div');
  avatar.className = 'podio-avatar';
  if (r.usuario.avatar_url) {
    avatar.innerHTML = `<img src="${r.usuario.avatar_url}" alt="${r.usuario.nome}">`;
  } else {
    avatar.textContent = r.usuario.nome.charAt(0).toUpperCase();
  }

  const nomeContainer = document.createElement('div');
  nomeContainer.style.display = 'flex';
  nomeContainer.style.flexDirection = 'column';
  nomeContainer.style.alignItems = 'center';
  nomeContainer.style.gap = '2px';

  const nome = document.createElement('h3');
  nome.className = 'card-title';
  nome.textContent = r.usuario.nome;

  const badgeVoce = document.createElement('span');
  badgeVoce.className = 'badge-voce';
  badgeVoce.textContent = 'Você';
  if (r.usuario.id === usuarioLogadoId) {
    nome.appendChild(badgeVoce);
  }

  nomeContainer.appendChild(nome);

  if (r.usuario.badge_ativa) {
    const badge = document.createElement('span');
    badge.className = 'user-badge-tag';
    badge.textContent = r.usuario.badge_ativa;
    nomeContainer.appendChild(badge);
  }

  const mediaContainer = document.createElement('div');
  mediaContainer.className = 'podio-media';

  if (r.media !== null) {
    const stars = renderStars(r.media);
    mediaContainer.appendChild(stars);
    const mediaNum = document.createElement('span');
    mediaNum.className = 'caption';
    mediaNum.textContent = ` ${r.media.toFixed(1)}`;
    mediaContainer.appendChild(mediaNum);
  } else {
    const semDados = document.createElement('span');
    semDados.className = 'caption text-muted';
    semDados.textContent = 'Sem avaliações';
    mediaContainer.appendChild(semDados);
  }

  if (r.trend) {
    const trendIcon = document.createElement('span');
    trendIcon.className = 'trend-icon';
    if (r.trend === 'up') {
      trendIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
      trendIcon.classList.add('trend-up');
    } else if (r.trend === 'down') {
      trendIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>';
      trendIcon.classList.add('trend-down');
    } else {
      trendIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14"/></svg>';
      trendIcon.classList.add('trend-same');
    }
    mediaContainer.appendChild(trendIcon);
  }

  const stats = document.createElement('div');
  stats.className = 'podio-stats';
  stats.innerHTML = `<span class="caption">${r.totalFilmes} filme${r.totalFilmes !== 1 ? 's' : ''}</span><span class="caption">·</span><span class="caption">${r.totalAvaliacoes} avaliaç${r.totalAvaliacoes !== 1 ? 'ões' : 'ão'}</span>`;

  if (r.melhorEscolha) {
    const badgeMelhor = document.createElement('div');
    badgeMelhor.className = 'badge-melhor';
    badgeMelhor.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg><span class="caption">Melhor: ' + (r.melhorEscolha.filme?.titulo || '—') + '</span>';
    card.appendChild(badgeMelhor);
  }

  if (r.piorEscolha) {
    const badgePior = document.createElement('div');
    badgePior.className = 'badge-pior';
    badgePior.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span class="caption">Pior: ' + (r.piorEscolha.filme?.titulo || '—') + '</span>';
    card.appendChild(badgePior);
  }

  card.appendChild(medalha);
  card.appendChild(avatar);
  card.appendChild(nomeContainer);
  card.appendChild(mediaContainer);
  card.appendChild(stats);

  card.addEventListener('click', () => abrirModalFilmes(r));

  return card;
}

function criarItemLista(r, usuarioLogadoId) {
  const item = document.createElement('div');
  item.className = 'ranking-item';
  item.style.cursor = 'pointer';

  const posicao = document.createElement('span');
  posicao.className = 'ranking-posicao';
  posicao.textContent = r.posicao;

  const avatar = document.createElement('div');
  avatar.className = 'ranking-avatar';
  if (r.usuario.avatar_url) {
    avatar.innerHTML = `<img src="${r.usuario.avatar_url}" alt="${r.usuario.nome}">`;
  } else {
    avatar.textContent = r.usuario.nome.charAt(0).toUpperCase();
  }

  const info = document.createElement('div');
  info.className = 'ranking-info';

  const nomeContainer = document.createElement('div');
  nomeContainer.className = 'ranking-nome';
  const nome = document.createElement('span');
  nome.className = 'card-title';
  nome.textContent = r.usuario.nome;
  nomeContainer.appendChild(nome);

  if (r.usuario.id === usuarioLogadoId) {
    const badgeVoce = document.createElement('span');
    badgeVoce.className = 'badge-voce';
    badgeVoce.textContent = 'Você';
    nomeContainer.appendChild(badgeVoce);
  }

  if (r.usuario.badge_ativa) {
    const badge = document.createElement('span');
    badge.className = 'user-badge-tag';
    badge.textContent = r.usuario.badge_ativa;
    nomeContainer.appendChild(badge);
  }

  info.appendChild(nomeContainer);

  const stats = document.createElement('div');
  stats.className = 'ranking-stats';
  stats.innerHTML = `<span class="caption">${r.totalFilmes} filme${r.totalFilmes !== 1 ? 's' : ''}</span><span class="caption">·</span><span class="caption">${r.totalAvaliacoes} avaliaç${r.totalAvaliacoes !== 1 ? 'ões' : 'ão'}</span>`;
  info.appendChild(stats);

  const mediaContainer = document.createElement('div');
  mediaContainer.className = 'ranking-media';

  if (r.media !== null) {
    const stars = renderStars(r.media);
    mediaContainer.appendChild(stars);
    const mediaNum = document.createElement('span');
    mediaNum.className = 'caption';
    mediaNum.textContent = ` ${r.media.toFixed(1)}`;
    mediaContainer.appendChild(mediaNum);
  } else {
    const semDados = document.createElement('span');
    semDados.className = 'caption text-muted';
    semDados.textContent = '—';
    mediaContainer.appendChild(semDados);
  }

  if (r.trend) {
    const trendIcon = document.createElement('span');
    trendIcon.className = 'trend-icon';
    if (r.trend === 'up') {
      trendIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
      trendIcon.classList.add('trend-up');
    } else if (r.trend === 'down') {
      trendIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>';
      trendIcon.classList.add('trend-down');
    } else {
      trendIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14"/></svg>';
      trendIcon.classList.add('trend-same');
    }
    mediaContainer.appendChild(trendIcon);
  }

  item.appendChild(posicao);
  item.appendChild(avatar);
  item.appendChild(info);
  item.appendChild(mediaContainer);

  item.addEventListener('click', () => abrirModalFilmes(r));

  return item;
}

async function abrirModalFilmes(r) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal-detalhes';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.addEventListener('click', () => overlay.remove());
  modal.appendChild(closeBtn);

  const content = document.createElement('div');
  content.className = 'modal-detalhes-content';

  const header = document.createElement('div');
  header.className = 'ranking-modal-header';

  const avatar = document.createElement('div');
  avatar.className = 'ranking-modal-avatar';
  if (r.usuario.avatar_url) {
    avatar.innerHTML = `<img src="${r.usuario.avatar_url}" alt="${r.usuario.nome}">`;
  } else {
    avatar.textContent = r.usuario.nome.charAt(0).toUpperCase();
  }

  const info = document.createElement('div');
  info.className = 'ranking-modal-info';

  const nome = document.createElement('h3');
  nome.className = 'sub-heading';
  nome.textContent = r.usuario.nome;
  if (r.usuario.id === (await sb.auth.getSession()).data.session?.user?.id) {
    const badgeVoce = document.createElement('span');
    badgeVoce.className = 'badge-voce';
    badgeVoce.textContent = 'Você';
    nome.appendChild(badgeVoce);
  }
  info.appendChild(nome);

  const stats = document.createElement('div');
  stats.className = 'ranking-modal-stats';
  stats.innerHTML = `<span class="caption">Média: ${r.media !== null ? r.media.toFixed(1) : '—'}</span><span class="caption">·</span><span class="caption">${r.totalFilmes} filme${r.totalFilmes !== 1 ? 's' : ''}</span><span class="caption">·</span><span class="caption">${r.totalAvaliacoes} avaliaç${r.totalAvaliacoes !== 1 ? 'ões' : 'ão'}</span>`;
  info.appendChild(stats);

  header.appendChild(avatar);
  header.appendChild(info);
  content.appendChild(header);

  const filmesTitle = document.createElement('h4');
  filmesTitle.className = 'card-title';
  filmesTitle.textContent = 'Filmes Escolhidos';
  filmesTitle.style.marginTop = 'var(--space-5)';
  filmesTitle.style.marginBottom = 'var(--space-3)';
  content.appendChild(filmesTitle);

  const filmesList = document.createElement('div');
  filmesList.className = 'ranking-filmes-list';

  if (r.filmes && r.filmes.length) {
    r.filmes.forEach(f => {
      const filmeItem = document.createElement('div');
      filmeItem.className = 'ranking-filme-item';

      const poster = document.createElement('div');
      poster.className = 'ranking-filme-poster';
      if (f.filme?.poster_url) {
        poster.innerHTML = `<img src="${f.filme.poster_url}" alt="${f.filme.titulo}">`;
      } else {
        poster.textContent = '—';
      }

      const filmeInfo = document.createElement('div');
      filmeInfo.className = 'ranking-filme-info';

      const titulo = document.createElement('h5');
      titulo.className = 'card-title';
      titulo.textContent = f.filme?.titulo || 'Filme';
      if (f.filme?.ano_lancamento) titulo.textContent += ` (${f.filme.ano_lancamento})`;
      filmeInfo.appendChild(titulo);

      const periodo = document.createElement('p');
      periodo.className = 'caption text-muted';
      periodo.textContent = `${f.data_inicio} — ${f.data_fim}`;
      filmeInfo.appendChild(periodo);

      if (f.media !== null) {
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'ranking-filme-media';
        const stars = renderStars(f.media);
        mediaContainer.appendChild(stars);
        const mediaNum = document.createElement('span');
        mediaNum.className = 'caption';
        mediaNum.textContent = ` ${f.media.toFixed(1)}`;
        mediaContainer.appendChild(mediaNum);
        filmeInfo.appendChild(mediaContainer);
      }

      if (r.melhorEscolha && r.melhorEscolha.quinzena_id === f.quinzena_id) {
        const badge = document.createElement('span');
        badge.className = 'badge-melhor-small';
        badge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg><span class="caption">Melhor</span>';
        filmeInfo.appendChild(badge);
      }

      if (r.piorEscolha && r.piorEscolha.quinzena_id === f.quinzena_id) {
        const badge = document.createElement('span');
        badge.className = 'badge-pior-small';
        badge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span class="caption">Pior</span>';
        filmeInfo.appendChild(badge);
      }

      filmeItem.appendChild(poster);
      filmeItem.appendChild(filmeInfo);
      filmesList.appendChild(filmeItem);
    });
  } else {
    const empty = document.createElement('p');
    empty.className = 'caption text-muted';
    empty.textContent = 'Nenhum filme escolhido ainda.';
    filmesList.appendChild(empty);
  }

  content.appendChild(filmesList);
  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

export { initRanking, getConquistaSvg, verificarNovasConquistas };
