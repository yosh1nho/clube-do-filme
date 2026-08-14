import { apiFetch, abrirModalDetalhesFilme } from './quinzena.js';
import { toggleWatchlistMovie, fetchWatchlist } from './watchlist.js';

function initExplorar() {
  const container = document.createElement('div');

  const title = document.createElement('h2');
  title.className = 'sub-heading';
  title.textContent = 'Explorar';
  title.style.marginBottom = 'var(--space-5)';
  container.appendChild(title);

  const searchGroup = document.createElement('div');
  searchGroup.className = 'search-group';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Buscar filme...';
  searchInput.className = 'search-input';

  const searchBtn = document.createElement('button');
  searchBtn.className = 'btn btn-primary';
  searchBtn.textContent = 'Buscar';

  searchGroup.appendChild(searchInput);
  searchGroup.appendChild(searchBtn);
  container.appendChild(searchGroup);

  const resultsGrid = document.createElement('div');
  resultsGrid.className = 'grid grid-4 movie-grid';
  resultsGrid.id = 'explorar-results';
  container.appendChild(resultsGrid);

  const statusMsg = document.createElement('p');
  statusMsg.className = 'caption text-muted';
  statusMsg.style.cssText = 'text-align:center;margin-top:32px;';
  statusMsg.id = 'explorar-status';
  statusMsg.textContent = 'Busque um filme para comecar';
  container.appendChild(statusMsg);

  const sugestoesSection = document.createElement('div');
  sugestoesSection.className = 'sugestoes-section';

  const sugestoesHead = document.createElement('div');
  sugestoesHead.className = 'sugestoes-head';

  const sugestoesTitle = document.createElement('h3');
  sugestoesTitle.className = 'sugestoes-title';
  sugestoesTitle.textContent = 'Recomendados para o clube';
  sugestoesHead.appendChild(sugestoesTitle);

  const nav = document.createElement('div');
  nav.className = 'sugestoes-nav';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'sugestoes-nav-btn';
  prevBtn.setAttribute('aria-label', 'Ver anteriores');
  prevBtn.innerHTML = '&larr;';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'sugestoes-nav-btn';
  nextBtn.setAttribute('aria-label', 'Ver próximos');
  nextBtn.innerHTML = '&rarr;';

  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);
  sugestoesHead.appendChild(nav);

  sugestoesSection.appendChild(sugestoesHead);

  const sugestoesGrid = document.createElement('div');
  sugestoesGrid.className = 'sugestoes-carousel';
  sugestoesGrid.innerHTML = '<p class="caption text-muted">Carregando recomendacoes...</p>';
  sugestoesSection.appendChild(sugestoesGrid);

  container.appendChild(sugestoesSection);

  // Armazena conjunto de IDs salvos na watchlist para sincronização visual
  let savedIds = new Set();

  function atualizarBotoesBookmark() {
    container.querySelectorAll('.card-bookmark-btn').forEach(btn => {
      const id = Number(btn.dataset.tmdbId);
      const isSaved = savedIds.has(id);
      btn.classList.toggle('active', isSaved);
      btn.title = isSaved ? 'Salvo em Quero Indicar (clique para remover)' : 'Guardar em Quero Indicar';
      btn.innerHTML = isSaved
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>';
    });
  }

  function criarBotaoBookmark(f) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-bookmark-btn';
    btn.dataset.tmdbId = f.tmdb_id;
    const isSaved = savedIds.has(Number(f.tmdb_id));
    btn.classList.toggle('active', isSaved);
    btn.title = isSaved ? 'Salvo em Quero Indicar' : 'Guardar em Quero Indicar';
    btn.innerHTML = isSaved
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>';

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      btn.disabled = true;
      try {
        const res = await toggleWatchlistMovie(f);
        if (res.saved) {
          savedIds.add(Number(f.tmdb_id));
        } else {
          savedIds.delete(Number(f.tmdb_id));
        }
        atualizarBotoesBookmark();
      } catch (err) {
        console.error('Erro ao alternar watchlist:', err);
      } finally {
        btn.disabled = false;
      }
    });

    return btn;
  }

  // Carrega lista salva inicialmente
  fetchWatchlist().then(items => {
    savedIds = new Set((items || []).map(i => Number(i.tmdb_id)));
    atualizarBotoesBookmark();
  }).catch(() => {});

  function scrollSugestoes(dir) {
    const card = sugestoesGrid.querySelector('.sugestao-card');
    const passo = card ? card.offsetWidth + 12 : 400;
    sugestoesGrid.scrollBy({ left: dir * passo * 4, behavior: 'smooth' });
  }

  function atualizarSetas() {
    const temOverflow = sugestoesGrid.scrollWidth > sugestoesGrid.clientWidth + 4;
    sugestoesHead.classList.toggle('sugestoes-nav-hidden', !temOverflow);
  }

  prevBtn.addEventListener('click', () => scrollSugestoes(-1));
  nextBtn.addEventListener('click', () => scrollSugestoes(1));
  window.addEventListener('resize', atualizarSetas);

  let isDragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragMoved = 0;

  sugestoesGrid.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    isDragging = true;
    dragMoved = 0;
    dragStartX = e.clientX;
    dragStartScroll = sugestoesGrid.scrollLeft;
    sugestoesGrid.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    dragMoved = Math.max(dragMoved, Math.abs(dx));
    sugestoesGrid.scrollLeft = dragStartScroll - dx;
  });

  function endDrag() {
    isDragging = false;
    sugestoesGrid.classList.remove('dragging');
  }

  window.addEventListener('mouseup', endDrag);
  sugestoesGrid.addEventListener('pointercancel', endDrag);

  // PREVINE O ARRASTO NATIVO DA IMAGEM E ELEMENTOS
  sugestoesGrid.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  sugestoesGrid.addEventListener('click', (e) => {
    if (dragMoved > 6) {
      e.stopPropagation();
      e.preventDefault();
    }
    dragMoved = 0;
  }, true);

  sugestoesGrid.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    const temOverflow = sugestoesGrid.scrollWidth > sugestoesGrid.clientWidth;
    if (temOverflow) {
      e.preventDefault();
      sugestoesGrid.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  async function handleSearch() {
    const q = searchInput.value.trim();
    if (!q) return;

    searchBtn.disabled = true;
    searchBtn.textContent = 'Buscando...';
    statusMsg.textContent = 'Buscando...';
    resultsGrid.innerHTML = '';

    try {
      const filmes = await apiFetch(`/api/tmdb/busca?q=${encodeURIComponent(q)}`);

      if (!Array.isArray(filmes) || filmes.length === 0) {
        statusMsg.textContent = 'Nenhum filme encontrado';
        return;
      }

      statusMsg.textContent = `${filmes.length} filme(s) encontrado(s)`;

      filmes.forEach(f => {
        const card = document.createElement('div');
        card.className = 'card movie-card';
        card.dataset.tmdbId = f.tmdb_id;

        const poster = document.createElement('div');
        poster.className = 'movie-poster';
        if (f.poster) {
          const img = document.createElement('img');
          img.src = f.poster;
          img.alt = f.titulo;
          img.loading = 'lazy';
          poster.appendChild(img);
        } else {
          poster.className += ' movie-poster-empty';
          poster.textContent = 'Sem poster';
        }

        // Botão de salvar na Watchlist
        const bookmarkBtn = criarBotaoBookmark(f);
        poster.appendChild(bookmarkBtn);

        const info = document.createElement('div');
        info.className = 'movie-info';

        const movieTitle = document.createElement('h3');
        movieTitle.className = 'card-title';
        movieTitle.textContent = f.titulo;

        const movieYear = document.createElement('p');
        movieYear.className = 'caption';
        movieYear.textContent = f.ano || 'Ano desconhecido';

        info.appendChild(movieTitle);
        info.appendChild(movieYear);

        card.appendChild(poster);
        card.appendChild(info);

        card.addEventListener('click', () => {
          abrirModalDetalhesFilme(f, {
            confirmavel: false,
            mostrarClose: true,
            onWatchlistChange: (saved) => {
              if (saved) savedIds.add(Number(f.tmdb_id));
              else savedIds.delete(Number(f.tmdb_id));
              atualizarBotoesBookmark();
            }
          });
        });

        resultsGrid.appendChild(card);
      });
    } catch (err) {
      statusMsg.textContent = 'Erro na busca';
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Buscar';
    }
  }

  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim() === '') {
      resultsGrid.innerHTML = '';
      statusMsg.textContent = 'Busque um filme para comecar';
    }
  });

  apiFetch('/api/tmdb/sugestoes').then(sugestoes => {
    sugestoesGrid.innerHTML = '';
    if (!Array.isArray(sugestoes) || sugestoes.length === 0) {
      sugestoesGrid.innerHTML = '<p class="caption text-muted">Nenhuma recomendacao no momento.</p>';
      return;
    }
    sugestoes.forEach(f => {
      const card = document.createElement('div');
      card.className = 'sugestao-card';
      card.dataset.tmdbId = f.tmdb_id;

      card.addEventListener('click', () => {
        abrirModalDetalhesFilme(f, {
          confirmavel: false,
          mostrarClose: true,
          onWatchlistChange: (saved) => {
            if (saved) savedIds.add(Number(f.tmdb_id));
            else savedIds.delete(Number(f.tmdb_id));
            atualizarBotoesBookmark();
          }
        });
      });

      if (f.poster) {
        const img = document.createElement('img');
        img.src = f.poster;
        img.alt = f.titulo;
        img.loading = 'lazy';
        img.draggable = false;
        card.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'width:100%;aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;background:var(--charcoal-04);color:var(--muted-gray);font-size:2rem;';
        placeholder.textContent = '?';
        card.appendChild(placeholder);
      }

      // Botão de salvar no card de sugestão
      const bookmarkBtn = criarBotaoBookmark(f);
      card.appendChild(bookmarkBtn);

      const info = document.createElement('div');
      info.className = 'sugestao-card-info';
      const t = document.createElement('p');
      t.className = 'sugestao-card-title';
      t.textContent = f.titulo;
      info.appendChild(t);
      if (f.ano) {
        const y = document.createElement('p');
        y.className = 'sugestao-card-ano';
        y.textContent = f.ano;
        info.appendChild(y);
      }
      card.appendChild(info);
      sugestoesGrid.appendChild(card);
    });
    atualizarSetas();
  }).catch(() => {
    sugestoesGrid.innerHTML = '<p class="caption text-muted">Nao foi possivel carregar recomendacoes.</p>';
    atualizarSetas();
  });

  return container;
}

export { initExplorar };