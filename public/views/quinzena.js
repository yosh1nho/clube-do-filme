const sb = window.__supabase;

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

function renderStars(notaRef, interactive = false, onChange = null) {
  const container = document.createElement('div');
  container.className = 'stars';
  const getNota = () => typeof notaRef === 'object' ? notaRef.value : notaRef;
  const setNota = (n) => {
    if (typeof notaRef === 'object') notaRef.value = n;
  };
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star' + (i <= getNota() ? ' star-filled' : '');
    star.textContent = '★';
    if (interactive) {
      star.style.cursor = 'pointer';
      star.addEventListener('click', () => {
        setNota(i);
        container.querySelectorAll('.star').forEach((s, idx) => {
          s.classList.toggle('star-filled', idx < i);
        });
        onChange?.(i);
      });
      star.addEventListener('mouseenter', () => {
        container.querySelectorAll('.star').forEach((s, idx) => {
          s.classList.toggle('star-filled', idx < i);
        });
      });
      star.addEventListener('mouseleave', () => {
        container.querySelectorAll('.star').forEach((s, idx) => {
          s.classList.toggle('star-filled', idx < getNota());
        });
      });
    }
    container.appendChild(star);
  }
  return container;
}

function initReviewCard(avaliacao, usuarioLogadoId, onRefresh, onEdit) {
  const div = document.createElement('div');
  div.className = 'review-card';

  const header = document.createElement('div');
  header.className = 'review-header';

  const avatar = document.createElement('div');
  avatar.className = 'review-avatar';
  if (avaliacao.usuarios?.avatar_url) {
    const img = document.createElement('img');
    img.src = avaliacao.usuarios.avatar_url;
    avatar.appendChild(img);
  } else {
    avatar.textContent = (avaliacao.usuarios?.nome || '?').charAt(0).toUpperCase();
  }

  const meta = document.createElement('div');
  meta.className = 'review-meta';
  const nome = document.createElement('span');
  nome.className = 'card-title';
  nome.textContent = avaliacao.usuarios?.nome || 'Desconhecido';
  const stars = renderStars(avaliacao.nota);
  meta.appendChild(nome);
  meta.appendChild(stars);

  header.appendChild(avatar);
  header.appendChild(meta);

  if (avaliacao.usuario_id === usuarioLogadoId) {
    const menuBtn = document.createElement('button');
    menuBtn.className = 'review-menu-btn';
    menuBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (document.querySelector('.review-menu')) {
        document.querySelector('.review-menu').remove();
        return;
      }
      const menu = document.createElement('div');
      menu.className = 'review-menu';
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Editar resenha';
      editBtn.addEventListener('click', () => {
        menu.remove();
        onEdit?.(avaliacao);
      });
      menu.appendChild(editBtn);
      menuBtn.style.position = 'relative';
      menuBtn.appendChild(menu);
      const closeHandler = (ev) => {
        if (!menu.contains(ev.target) && ev.target !== menuBtn) {
          menu.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      setTimeout(() => document.addEventListener('click', closeHandler), 0);
    });
    header.appendChild(menuBtn);
  }

  div.appendChild(header);

  const body = document.createElement('div');
  body.className = 'review-body';

  if (avaliacao.comentario) {
    const texto = document.createElement('p');
    texto.className = 'review-text';
    texto.textContent = avaliacao.comentario;

    if (avaliacao.spoiler) {
      texto.classList.add('spoiler-blur');
      const btnSpoiler = document.createElement('button');
      btnSpoiler.className = 'btn btn-small btn-ghost spoiler-btn';
      btnSpoiler.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Revelar spoiler';
      let revelado = false;
      btnSpoiler.addEventListener('click', () => {
        revelado = !revelado;
        texto.classList.toggle('spoiler-blur', !revelado);
        btnSpoiler.innerHTML = revelado
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Esconder spoiler'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Revelar spoiler';
      });
      body.appendChild(texto);
      body.appendChild(btnSpoiler);
    } else {
      body.appendChild(texto);
    }
  }

  div.appendChild(body);

  const reactions = document.createElement('div');
  reactions.className = 'review-reactions';

  const grupos = {};
  (avaliacao.reacoes || []).forEach(r => {
    if (!grupos[r.emoji]) grupos[r.emoji] = [];
    grupos[r.emoji].push(r);
  });

  Object.entries(grupos).forEach(([emoji, reacoes]) => {
    const nomes = reacoes.map(r => r.usuarios?.nome || 'Usuário').join(', ');
    const btn = document.createElement('button');
    btn.className = 'reaction-btn' + (reacoes.some(r => r.usuario_id === usuarioLogadoId) ? ' reaction-active' : '');
    btn.textContent = `${emoji} ${reacoes.length}`;
    btn.title = nomes;
    btn.addEventListener('click', async () => {
      await apiFetch('/api/avaliacoes/reacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avaliacao_id: avaliacao.id, emoji })
      });
      onRefresh?.();
    });
    reactions.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'reaction-add';
  addBtn.textContent = '+';
  addBtn.title = 'Adicionar reação';
  addBtn.addEventListener('click', () => {
    if (document.querySelector('.emoji-popover')) return;

    const popover = document.createElement('div');
    popover.className = 'emoji-popover';

    const picker = document.createElement('emoji-picker');
    picker.style.cssText = 'width:320px;height:350px;';

    picker.addEventListener('emoji-click', async (e) => {
      const emoji = e.detail.unicode;
      await apiFetch('/api/avaliacoes/reacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avaliacao_id: avaliacao.id, emoji })
      });
      popover.remove();
      onRefresh?.();
    });

    popover.appendChild(picker);
    addBtn.style.position = 'relative';
    addBtn.appendChild(popover);

    const closeHandler = (e) => {
      if (!popover.contains(e.target) && e.target !== addBtn) {
        popover.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  });
  reactions.appendChild(addBtn);

  div.appendChild(reactions);
  return div;
}

async function initQuinzena() {
  const container = document.createElement('div');
  const data = await apiFetch('/api/quinzenas/atual');

  if (!data || data.error) {
    container.innerHTML = `<p class="caption" style="text-align:center;padding:80px 0;">Erro ao carregar: ${data?.error}</p>`;
    return container;
  }

  if (data.estado === 'em_cartaz') {
    return renderEmCartaz(data, container);
  }

  if (data.estado === 'aguardando') {
    return renderAguardando(data, container);
  }

  if (data.estado === 'escolhendo') {
    return renderEscolhendo(data, container);
  }

  return container;
}

function renderAguardando(data, container) {
  const div = document.createElement('div');
  div.style.cssText = 'text-align:center;padding:80px 0;max-width:500px;margin:0 auto;';

  const posterPlaceholder = document.createElement('div');
  posterPlaceholder.className = 'poster-placeholder';
  posterPlaceholder.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>';

  const title = document.createElement('h2');
  title.className = 'sub-heading';
  title.textContent = 'Aguardando...';

  const desc = document.createElement('p');
  desc.className = 'body-large text-muted';
  desc.style.marginTop = '16px';
  desc.textContent = `${data.proximoEscolhedor?.nome || 'Alguém'} está escolhendo o próximo filme.`;

  div.appendChild(posterPlaceholder);
  div.appendChild(title);
  div.appendChild(desc);

  if (data.ultimaQuinzena) {
    const btnVoltar = document.createElement('button');
    btnVoltar.className = 'btn btn-outline';
    btnVoltar.textContent = 'Ver filme em cartaz';
    btnVoltar.style.marginTop = '24px';
    btnVoltar.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = `#/historico/${data.ultimaQuinzena.id}`;
      window.location.hash = link.href;
      window.__navigate('historico');
    });
    div.appendChild(btnVoltar);

    const ultimoTitulo = document.createElement('p');
    ultimoTitulo.className = 'caption';
    ultimoTitulo.style.marginTop = '16px';
    ultimoTitulo.textContent = `Último filme: ${data.ultimaQuinzena.filmes?.titulo || '-'}`;
    div.appendChild(ultimoTitulo);
  }

  container.appendChild(div);
  return container;
}

function renderEscolhendo(data, container) {
  const header = document.createElement('div');
  header.style.cssText = 'text-align:center;margin-bottom:40px;';

  const title = document.createElement('h2');
  title.className = 'sub-heading';
  title.textContent = 'Escolha o próximo filme';

  const desc = document.createElement('p');
  desc.className = 'body-large text-muted';
  desc.style.marginTop = '8px';
  desc.textContent = 'Busque o filme que você quer assistir nesta quinzena';

  header.appendChild(title);
  header.appendChild(desc);

  if (data.quinzenaAtual || data.ultimaQuinzena) {
    const btnVoltar = document.createElement('button');
    btnVoltar.className = 'btn btn-outline';
    btnVoltar.textContent = 'Ver filme em cartaz';
    btnVoltar.style.cssText = 'margin-top:16px;';
    btnVoltar.addEventListener('click', () => {
      const quinzena = data.quinzenaAtual || data.ultimaQuinzena;
      container.innerHTML = '';
      renderEmCartaz({
        estado: 'em_cartaz',
        quinzena: quinzena,
        usuarios: data.usuarios
      }, container);
    });
    header.appendChild(btnVoltar);
  }

  const searchGroup = document.createElement('div');
  searchGroup.className = 'search-group';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'search-movie';
  searchInput.placeholder = 'Buscar filme...';
  searchInput.className = 'search-input';

  const searchBtn = document.createElement('button');
  searchBtn.className = 'btn btn-primary';
  searchBtn.textContent = 'Buscar';

  searchGroup.appendChild(searchInput);
  searchGroup.appendChild(searchBtn);

  const resultsGrid = document.createElement('div');
  resultsGrid.className = 'grid grid-4 movie-grid';
  resultsGrid.id = 'movie-results';

  const statusMsg = document.createElement('p');
  statusMsg.className = 'caption text-muted';
  statusMsg.style.cssText = 'text-align:center;margin-top:32px;';
  statusMsg.id = 'search-status';
  statusMsg.textContent = 'Faça uma busca para encontrar filmes';

  container.appendChild(header);
  container.appendChild(searchGroup);
  container.appendChild(statusMsg);
  container.appendChild(resultsGrid);

  let modalAberto = null;

  function fecharModal() {
    modalAberto?.remove();
    modalAberto = null;
  }

  function abrirModal(filme) {
    fecharModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-confirm';

    const modalPoster = document.createElement('div');
    modalPoster.className = 'modal-poster';
    if (filme.poster) {
      const img = document.createElement('img');
      img.src = filme.poster.replace('w500', 'w780');
      img.alt = filme.titulo;
      modalPoster.appendChild(img);
    } else {
      modalPoster.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>';
      modalPoster.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--charcoal-04);';
    }

    const modalInfo = document.createElement('div');
    modalInfo.className = 'modal-info';

    const modalTitle = document.createElement('h3');
    modalTitle.className = 'sub-heading';
    modalTitle.textContent = filme.titulo;
    if (filme.ano) modalTitle.textContent += ` (${filme.ano})`;

    const modalSub = document.createElement('p');
    modalSub.className = 'caption';
    modalSub.textContent = 'Este será o filme da quinzena. Confirma?';

    const modalActions = document.createElement('div');
    modalActions.className = 'modal-actions';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-outline';
    btnCancel.textContent = 'Cancelar';
    btnCancel.addEventListener('click', () => {
      resultsGrid.querySelectorAll('.movie-card').forEach(c => c.classList.remove('selected'));
      fecharModal();
    });

    const btnConfirm = document.createElement('button');
    btnConfirm.className = 'btn btn-primary';
    btnConfirm.textContent = 'Confirmar';
    btnConfirm.addEventListener('click', async () => {
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Criando...';
      const result = await apiFetch('/api/quinzenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: filme.tmdb_id,
          titulo: filme.titulo,
          poster_url: filme.poster,
          ano: filme.ano,
          sinopse: filme.sinopse
        })
      });
      if (result.error) {
        btnConfirm.textContent = 'Erro, tente de novo';
        btnConfirm.disabled = false;
        return;
      }
      fecharModal();
      window.__navigate('quinzena');
    });

    modalActions.appendChild(btnCancel);
    modalActions.appendChild(btnConfirm);

    modalInfo.appendChild(modalTitle);
    modalInfo.appendChild(modalSub);
    modalInfo.appendChild(modalActions);

    modal.appendChild(modalPoster);
    modal.appendChild(modalInfo);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modalAberto = overlay;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        resultsGrid.querySelectorAll('.movie-card').forEach(c => c.classList.remove('selected'));
        fecharModal();
      }
    });
  }

  function selecionarFilme(f) {
    resultsGrid.querySelectorAll('.movie-card').forEach(c => c.classList.remove('selected'));
    const card = resultsGrid.querySelector(`[data-tmdb-id="${f.tmdb_id}"]`);
    if (card) card.classList.add('selected');
    abrirModal(f);
  }

  async function handleSearch() {
    const q = searchInput.value.trim();
    if (!q) return;

    searchBtn.disabled = true;
    searchBtn.textContent = 'Buscando...';
    statusMsg.textContent = 'Buscando...';
    resultsGrid.innerHTML = '';
    fecharModal();

    const filmes = await apiFetch(`/api/tmdb/busca?q=${encodeURIComponent(q)}`);

    searchBtn.disabled = false;
    searchBtn.textContent = 'Buscar';

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
        poster.textContent = 'Sem pôster';
      }

      const info = document.createElement('div');
      info.className = 'movie-info';

      const movieTitle = document.createElement('h3');
      movieTitle.className = 'card-title';
      movieTitle.textContent = f.titulo;

      const movieYear = document.createElement('p');
      movieYear.className = 'caption';
      movieYear.textContent = f.ano || 'Ano desconhecido';

      const selectBtn = document.createElement('button');
      selectBtn.className = 'btn btn-small btn-primary select-btn';
      selectBtn.textContent = 'Escolher';

      selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selecionarFilme(f);
      });

      card.addEventListener('click', () => selecionarFilme(f));

      info.appendChild(movieTitle);
      info.appendChild(movieYear);
      info.appendChild(selectBtn);

      card.appendChild(poster);
      card.appendChild(info);
      resultsGrid.appendChild(card);
    });
  }

  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  return container;
}

async function renderEmCartaz(data, container) {
  const q = data.quinzena;
  const filme = q.filmes;
  const usuarioLogado = (await sb.auth.getSession()).data.session?.user;

  const detalhes = filme?.tmdb_id
    ? await apiFetch(`/api/tmdb/detalhes/${filme.tmdb_id}`)
    : null;

  const hero = document.createElement('div');
  hero.className = 'em-cartaz-hero';

  const posterDiv = document.createElement('div');
  posterDiv.className = 'em-cartaz-poster';
  if (filme?.poster_url) {
    const img = document.createElement('img');
    img.src = filme.poster_url;
    img.alt = filme.titulo;
    posterDiv.appendChild(img);
  } else {
    posterDiv.className += ' em-cartaz-poster-empty';
    posterDiv.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>';
  }

  const infoDiv = document.createElement('div');
  infoDiv.className = 'em-cartaz-info';

  const title = document.createElement('h2');
  title.className = 'sub-heading';
  title.textContent = filme?.titulo || 'Filme';
  if (detalhes?.ano) {
    title.textContent += ` (${detalhes.ano})`;
  }

  const meta = document.createElement('div');
  meta.className = 'em-cartaz-meta';

  const media = q.avaliacoes?.length
    ? (q.avaliacoes.reduce((s, a) => s + a.nota, 0) / q.avaliacoes.length).toFixed(1)
    : null;

  if (media) {
    const starsDiv = renderStars(Math.round(Number(media)));
    const mediaText = document.createElement('span');
    mediaText.className = 'caption';
    mediaText.textContent = ` ${media} de 5`;
    starsDiv.appendChild(mediaText);
    meta.appendChild(starsDiv);
  }

  const escolhido = document.createElement('p');
  escolhido.className = 'caption';
  escolhido.innerHTML = `Escolhido por <strong>${data.usuarios?.find(u => u.id === q.usuario_id)?.nome || '—'}</strong>`;

  meta.appendChild(escolhido);

  if (detalhes?.diretor) {
    const diretor = document.createElement('p');
    diretor.className = 'caption';
    diretor.textContent = `Diretor: ${detalhes.diretor}`;
    meta.appendChild(diretor);
  }

  if (detalhes?.generos?.length) {
    const generos = document.createElement('p');
    generos.className = 'caption';
    generos.textContent = detalhes.generos.join(' · ');
    meta.appendChild(generos);
  }

  const periodo = document.createElement('p');
  periodo.className = 'caption';
  periodo.textContent = `${q.data_inicio} até ${q.data_fim}`;
  meta.appendChild(periodo);

  infoDiv.appendChild(title);
  infoDiv.appendChild(meta);

  if (detalhes?.sinopse) {
    const sinopse = document.createElement('p');
    sinopse.className = 'body-large';
    sinopse.style.cssText = 'margin-top:24px;color:var(--charcoal-82);';
    sinopse.textContent = detalhes.sinopse;
    infoDiv.appendChild(sinopse);
  }

  hero.appendChild(posterDiv);
  hero.appendChild(infoDiv);
  container.appendChild(hero);

  const reviewsSection = document.createElement('div');
  reviewsSection.className = 'reviews-section';

  const reviewsTitle = document.createElement('h3');
  reviewsTitle.className = 'card-title';
  reviewsTitle.textContent = 'Resenhas';
  reviewsTitle.style.marginBottom = 'var(--space-4)';
  reviewsSection.appendChild(reviewsTitle);

  const minhaAvaliacao = (q.avaliacoes || []).find(a => a.usuario_id === usuarioLogado?.id);

  if (!minhaAvaliacao) {
    const btnNovaResenha = document.createElement('button');
    btnNovaResenha.className = 'btn btn-primary';
    btnNovaResenha.textContent = 'Faça sua resenha';
    btnNovaResenha.style.marginBottom = 'var(--space-4)';
    btnNovaResenha.addEventListener('click', () => abrirModalEditar(null));
    reviewsSection.appendChild(btnNovaResenha);
  }

  const reviewsList = document.createElement('div');
  reviewsList.className = 'reviews-list';
  reviewsList.id = 'reviews-list';

  function abrirModalEditar(avaliacaoExistente) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-confirm';
    modal.style.cssText = 'flex-direction:column;max-width:500px;';

    const modalTitle = document.createElement('h3');
    modalTitle.className = 'sub-heading';
    modalTitle.textContent = avaliacaoExistente ? 'Editar resenha' : 'Nova resenha';
    modal.appendChild(modalTitle);

    const notaRef = { value: avaliacaoExistente?.nota || 0 };
    const stars = renderStars(notaRef, true);
    stars.style.marginTop = '12px';
    modal.appendChild(stars);

    const commentArea = document.createElement('textarea');
    commentArea.className = 'review-textarea';
    commentArea.placeholder = 'Escreva seu comentário...';
    commentArea.value = avaliacaoExistente?.comentario || '';
    commentArea.style.cssText = 'width:100%;margin-top:12px;resize:vertical;min-height:80px;';
    modal.appendChild(commentArea);

    const spoilerLabel = document.createElement('label');
    spoilerLabel.className = 'spoiler-label caption';
    spoilerLabel.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:12px;';
    const spoilerCheck = document.createElement('input');
    spoilerCheck.type = 'checkbox';
    spoilerCheck.checked = avaliacaoExistente?.spoiler || false;
    spoilerLabel.appendChild(spoilerCheck);
    spoilerLabel.appendChild(document.createTextNode(' Contém spoiler'));
    modal.appendChild(spoilerLabel);

    const statusMsg = document.createElement('p');
    statusMsg.className = 'caption perfil-status';
    statusMsg.style.display = 'none';
    modal.appendChild(statusMsg);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.style.cssText = 'margin-top:16px;';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-outline';
    btnCancel.textContent = 'Cancelar';
    btnCancel.addEventListener('click', () => overlay.remove());

    const btnSave = document.createElement('button');
    btnSave.className = 'btn btn-primary';
    btnSave.textContent = avaliacaoExistente ? 'Atualizar' : 'Salvar';
    btnSave.addEventListener('click', async () => {
      btnSave.disabled = true;
      btnSave.textContent = 'Salvando...';
      statusMsg.style.display = 'none';

      const payload = {
        quinzena_id: q.id,
        nota: notaRef.value,
        comentario: commentArea.value.trim() || null,
        spoiler: spoilerCheck.checked
      };

      const result = avaliacaoExistente
        ? await apiFetch(`/api/avaliacoes/${avaliacaoExistente.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : await apiFetch('/api/avaliacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

      if (result.error) {
        statusMsg.textContent = result.error;
        statusMsg.style.display = 'block';
        btnSave.disabled = false;
        btnSave.textContent = avaliacaoExistente ? 'Atualizar' : 'Salvar';
      } else {
        overlay.remove();
        await refreshReviews();
      }
    });

    actions.appendChild(btnCancel);
    actions.appendChild(btnSave);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  async function refreshReviews() {
    const avaliacoes = await apiFetch(`/api/avaliacoes/${q.id}`);
    reviewsList.innerHTML = '';
    if (Array.isArray(avaliacoes)) {
      avaliacoes.forEach(av => {
        const isOwner = av.usuario_id === usuarioLogado?.id;
        reviewsList.appendChild(initReviewCard(av, usuarioLogado?.id, refreshReviews, isOwner ? abrirModalEditar : null));
      });
    }
  }

  await refreshReviews();
  reviewsSection.appendChild(reviewsList);
  container.appendChild(reviewsSection);
  return container;
}

export { initQuinzena, apiFetch, renderStars, initReviewCard };
