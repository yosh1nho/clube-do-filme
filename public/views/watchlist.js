const sb = window.__supabase;

import { abrirModalDetalhesFilme } from './quinzena.js';

function getToken() {
  return sb.auth.getSession().then(({ data }) => data.session?.access_token);
}

async function apiFetch(url, opts = {}) {
  const token = await getToken();
  const res = await fetch(url, {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token}` }
  });
  return res.json();
}

let _watchlistCache = null;

async function fetchWatchlist(forceReload = false) {
  if (_watchlistCache && !forceReload) return _watchlistCache;
  const data = await apiFetch('/api/watchlist');
  _watchlistCache = Array.isArray(data) ? data : [];
  return _watchlistCache;
}

async function toggleWatchlistMovie(filmeData) {
  const list = await fetchWatchlist();
  const tmdbId = Number(filmeData.tmdb_id);
  const exists = list.some(item => Number(item.tmdb_id) === tmdbId);

  if (exists) {
    await apiFetch(`/api/watchlist/${tmdbId}`, { method: 'DELETE' });
    _watchlistCache = list.filter(item => Number(item.tmdb_id) !== tmdbId);
    return { saved: false };
  } else {
    const payload = {
      tmdb_id: tmdbId,
      titulo: filmeData.titulo,
      poster_url: filmeData.poster || filmeData.poster_url,
      ano: filmeData.ano,
      sinopse: filmeData.sinopse,
      nota_tmdb: filmeData.nota_tmdb,
      generos: filmeData.generos,
      nota_pessoal: filmeData.nota_pessoal || null
    };
    const savedItem = await apiFetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (savedItem && !savedItem.error) {
      _watchlistCache = [savedItem, ...list];
    }
    return { saved: true, item: savedItem };
  }
}

async function isMovieInWatchlist(tmdbId) {
  const list = await fetchWatchlist();
  return list.some(item => Number(item.tmdb_id) === Number(tmdbId));
}

async function initWatchlist() {
  const container = document.createElement('div');
  container.className = 'watchlist-view';

  // Cabeçalho da visualização
  const header = document.createElement('div');
  header.className = 'watchlist-header';

  const titleRow = document.createElement('div');
  titleRow.className = 'watchlist-title-row';

  const title = document.createElement('h2');
  title.className = 'sub-heading';
  title.textContent = 'Quero Indicar';

  const countBadge = document.createElement('span');
  countBadge.className = 'watchlist-count-badge';
  countBadge.textContent = '0 filmes';

  titleRow.appendChild(title);
  titleRow.appendChild(countBadge);

  const desc = document.createElement('p');
  desc.className = 'body-large text-muted';
  desc.style.marginTop = '4px';
  desc.textContent = 'Sua lista privada de filmes salvos para lembrar de indicar na sua quinzena.';

  header.appendChild(titleRow);
  header.appendChild(desc);
  container.appendChild(header);

  // Barra de ferramentas (filtro e busca interna)
  const toolbar = document.createElement('div');
  toolbar.className = 'watchlist-toolbar';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Filtrar seus filmes guardados...';
  searchInput.className = 'search-input watchlist-search-input';

  toolbar.appendChild(searchInput);
  container.appendChild(toolbar);

  // Grid de filmes salvos
  const grid = document.createElement('div');
  grid.className = 'grid grid-4 movie-grid watchlist-grid';
  grid.id = 'watchlist-grid';
  container.appendChild(grid);

  // Mensagem de estado
  const statusMsg = document.createElement('div');
  statusMsg.className = 'watchlist-status-msg';
  container.appendChild(statusMsg);

  // Carregar dados
  renderWatchlistContent();

  async function renderWatchlistContent() {
    grid.innerHTML = '';
    statusMsg.innerHTML = '<p class="caption text-muted" style="text-align:center;padding:40px 0;">Carregando sua lista...</p>';

    const list = await fetchWatchlist(true);
    countBadge.textContent = `${list.length} ${list.length === 1 ? 'filme' : 'filmes'}`;

    if (!list || list.length === 0) {
      statusMsg.innerHTML = '';
      const emptyCard = document.createElement('div');
      emptyCard.className = 'card watchlist-empty-card';

      const emptyIcon = document.createElement('div');
      emptyIcon.className = 'watchlist-empty-icon';
      emptyIcon.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>';

      const emptyTitle = document.createElement('h3');
      emptyTitle.className = 'card-title';
      emptyTitle.textContent = 'Sua lista de indicações está vazia';

      const emptyText = document.createElement('p');
      emptyText.className = 'caption text-muted';
      emptyText.style.maxWidth = '400px';
      emptyText.style.margin = '8px auto 20px auto';
      emptyText.textContent = 'Guarde filmes enquanto navega na aba Explorar para nunca esquecer o que quer sugerir quando for a sua vez.';

      const btnExplorar = document.createElement('button');
      btnExplorar.className = 'btn btn-primary';
      btnExplorar.textContent = 'Explorar Filmes →';
      btnExplorar.addEventListener('click', () => {
        if (window.__navigate) window.__navigate('explorar');
      });

      emptyCard.appendChild(emptyIcon);
      emptyCard.appendChild(emptyTitle);
      emptyCard.appendChild(emptyText);
      emptyCard.appendChild(btnExplorar);
      statusMsg.appendChild(emptyCard);
      toolbar.style.display = 'none';
      return;
    }

    toolbar.style.display = 'flex';
    statusMsg.innerHTML = '';

    function filtrarEExibir() {
      const termo = searchInput.value.trim().toLowerCase();
      const filtrados = list.filter(f => 
        (f.titulo && f.titulo.toLowerCase().includes(termo)) ||
        (f.ano && String(f.ano).includes(termo))
      );

      grid.innerHTML = '';

      if (filtrados.length === 0) {
        statusMsg.innerHTML = '<p class="caption text-muted" style="text-align:center;padding:32px 0;">Nenhum filme corresponde à sua busca.</p>';
        return;
      }

      statusMsg.innerHTML = '';

      filtrados.forEach(f => {
        const card = document.createElement('div');
        card.className = 'card movie-card watchlist-card';
        card.dataset.tmdbId = f.tmdb_id;

        // Poster
        const poster = document.createElement('div');
        poster.className = 'movie-poster';
        if (f.poster_url) {
          const img = document.createElement('img');
          img.src = f.poster_url;
          img.alt = f.titulo;
          img.loading = 'lazy';
          poster.appendChild(img);
        } else {
          poster.className += ' movie-poster-empty';
          poster.textContent = 'Sem poster';
        }

        // Botão flutuante de remover
        const removeBtn = document.createElement('button');
        removeBtn.className = 'watchlist-card-remove-btn';
        removeBtn.title = 'Remover da lista';
        removeBtn.setAttribute('aria-label', 'Remover da lista');
        removeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        
        removeBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          removeBtn.disabled = true;
          await apiFetch(`/api/watchlist/${f.tmdb_id}`, { method: 'DELETE' });
          _watchlistCache = _watchlistCache.filter(item => Number(item.tmdb_id) !== Number(f.tmdb_id));
          renderWatchlistContent();
        });
        poster.appendChild(removeBtn);

        // Info do filme
        const info = document.createElement('div');
        info.className = 'movie-info';

        const movieTitle = document.createElement('h3');
        movieTitle.className = 'card-title';
        movieTitle.textContent = f.titulo;

        const metaRow = document.createElement('div');
        metaRow.className = 'watchlist-meta-row';

        const movieYear = document.createElement('span');
        movieYear.className = 'caption text-muted';
        movieYear.textContent = f.ano || 'Ano N/D';
        metaRow.appendChild(movieYear);

        if (f.nota_tmdb) {
          const notaBadge = document.createElement('span');
          notaBadge.className = 'watchlist-nota-badge';
          notaBadge.innerHTML = `★ ${Number(f.nota_tmdb).toFixed(1)}`;
          metaRow.appendChild(notaBadge);
        }

        info.appendChild(movieTitle);
        info.appendChild(metaRow);

        card.appendChild(poster);
        card.appendChild(info);

        card.addEventListener('click', () => {
          abrirModalDetalhesFilme({
            tmdb_id: f.tmdb_id,
            titulo: f.titulo,
            poster: f.poster_url,
            ano: f.ano,
            sinopse: f.sinopse,
            nota_tmdb: f.nota_tmdb
          }, {
            confirmavel: false,
            mostrarClose: true
          });
        });

        grid.appendChild(card);
      });
    }

    searchInput.addEventListener('input', filtrarEExibir);
    filtrarEExibir();
  }

  return container;
}

export { initWatchlist, toggleWatchlistMovie, isMovieInWatchlist, fetchWatchlist };
