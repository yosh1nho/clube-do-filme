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
    const star = document.createElement('span');
    star.className = 'star' + (i <= Math.round(nota) ? ' star-filled' : '');
    star.textContent = '★';
    container.appendChild(star);
  }
  return container;
}

function initRanking() {
  const container = document.createElement('div');

  const title = document.createElement('h2');
  title.className = 'sub-heading';
  title.textContent = 'Ranking';
  title.style.marginBottom = 'var(--space-5)';
  container.appendChild(title);

  const content = document.createElement('div');
  content.innerHTML = '<p class="caption text-muted" style="text-align:center;padding:40px 0;">Carregando...</p>';
  container.appendChild(content);

  loadRanking(content);

  return container;
}

async function loadRanking(content) {
  const data = await apiFetch('/api/ranking');

  if (!data || data.error) {
    content.innerHTML = `<p class="caption text-muted" style="text-align:center;padding:40px 0;">Erro ao carregar: ${data?.error}</p>`;
    return;
  }

  const { ranking, usuarioLogadoId } = data;

  if (!ranking.length) {
    content.innerHTML = '<p class="caption text-muted" style="text-align:center;padding:40px 0;">Nenhum dado disponível ainda.</p>';
    return;
  }

  content.innerHTML = '';

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

  content.appendChild(podium);

  if (resto.length) {
    const lista = document.createElement('div');
    lista.className = 'ranking-lista';

    resto.forEach(r => {
      const item = criarItemLista(r, usuarioLogadoId);
      lista.appendChild(item);
    });

    content.appendChild(lista);
  }
}

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

  const nome = document.createElement('h3');
  nome.className = 'card-title';
  nome.textContent = r.usuario.nome;

  const badgeVoce = document.createElement('span');
  badgeVoce.className = 'badge-voce';
  badgeVoce.textContent = 'Você';
  if (r.usuario.id === usuarioLogadoId) {
    nome.appendChild(badgeVoce);
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
  card.appendChild(nome);
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

  if (r.filmes.length) {
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

export { initRanking };
