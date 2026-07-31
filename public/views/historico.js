const sb = window.__supabase;

async function apiFetch(url, opts = {}) {
  const token = await sb.auth.getSession().then(({ data }) => data.session?.access_token);
  const res = await fetch(url, {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token}` }
  });
  return res.json();
}

function renderStars(notaRef) {
  const container = document.createElement('div');
  container.className = 'stars';
  const getNota = () => typeof notaRef === 'object' ? notaRef.value : notaRef;

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
    const nota = getNota();
    const fill = Math.max(0, Math.min(1, nota - (i - 1)));
    overlay.style.width = (fill * 100) + '%';
    slot.appendChild(overlay);

    container.appendChild(slot);
  }

  return container;
}

function initHistorico() {
  const container = document.createElement('div');

  const title = document.createElement('h2');
  title.className = 'sub-heading';
  title.textContent = 'Histórico';
  title.style.marginBottom = 'var(--space-5)';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'historico-list';
  container.appendChild(list);

  loadHistorico(list);

  return container;
}

async function loadHistorico(list) {
  list.innerHTML = '<p class="caption text-muted" style="text-align:center;padding:40px 0;">Carregando...</p>';

  const quinzenas = await apiFetch('/api/quinzenas');

  if (!Array.isArray(quinzenas) || quinzenas.length === 0) {
    list.innerHTML = '<p class="caption text-muted" style="text-align:center;padding:40px 0;">Nenhum filme assistido ainda.</p>';
    return;
  }

  list.innerHTML = '';

  quinzenas.forEach(q => {
    const card = document.createElement('div');
    card.className = 'historico-card';
    card.style.cursor = 'pointer';

    const poster = document.createElement('div');
    poster.className = 'historico-poster';
    if (q.filmes?.poster_url) {
      const img = document.createElement('img');
      img.src = q.filmes.poster_url;
      img.alt = q.filmes.titulo;
      img.loading = 'lazy';
      poster.appendChild(img);
    } else {
      poster.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:2rem;background:var(--charcoal-04);';
    }

    const info = document.createElement('div');
    info.className = 'historico-info';

    const filmTitle = document.createElement('h3');
    filmTitle.className = 'card-title';
    filmTitle.textContent = q.filmes?.titulo || 'Filme';

    const periodo = document.createElement('p');
    periodo.className = 'caption text-muted';
    periodo.textContent = `${q.data_inicio} — ${q.data_fim}`;

    const escolhido = document.createElement('p');
    escolhido.className = 'caption';
    escolhido.textContent = `Escolhido por ${q.usuarios?.nome || '—'}`;

    info.appendChild(filmTitle);
    info.appendChild(periodo);
    info.appendChild(escolhido);

    const media = q.avaliacoes?.length
      ? (q.avaliacoes.reduce((s, a) => s + a.nota, 0) / q.avaliacoes.length).toFixed(1)
      : null;

    if (media) {
      const mediaEl = document.createElement('p');
      mediaEl.className = 'caption';
      mediaEl.innerHTML = `<span class="star-filled">★</span> ${media}`;
      info.appendChild(mediaEl);
    }

    card.appendChild(poster);
    card.appendChild(info);

    card.addEventListener('click', () => abrirDetalhes(q));
    list.appendChild(card);
  });
}

function buildReviewCard(av) {
  const card = document.createElement('div');
  card.className = 'review-card';

  const header = document.createElement('div');
  header.className = 'review-header';

  const avatar = document.createElement('div');
  avatar.className = 'review-avatar';
  if (av.usuarios?.avatar_url) {
    const img = document.createElement('img');
    img.src = av.usuarios.avatar_url;
    avatar.appendChild(img);
  } else {
    avatar.textContent = (av.usuarios?.nome || '?').charAt(0).toUpperCase();
  }

  const meta = document.createElement('div');
  meta.className = 'review-meta';
  const nome = document.createElement('span');
  nome.className = 'card-title';
  nome.textContent = av.usuarios?.nome || 'Desconhecido';
  const stars = renderStars(av.nota);
  meta.appendChild(nome);
  meta.appendChild(stars);

  header.appendChild(avatar);
  header.appendChild(meta);
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'review-body';

  if (av.comentario) {
    const texto = document.createElement('p');
    texto.className = 'review-text';
    texto.textContent = av.comentario;

    if (av.spoiler) {
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

  card.appendChild(body);

  const reactions = document.createElement('div');
  reactions.className = 'review-reactions';

  const grupos = {};
  (av.reacoes || []).forEach(r => {
    if (!grupos[r.emoji]) grupos[r.emoji] = [];
    grupos[r.emoji].push(r);
  });

  Object.entries(grupos).forEach(([emoji, reacs]) => {
    const nomes = reacs.map(r => r.usuarios?.nome || 'Usuário').join(', ');
    const btn = document.createElement('button');
    btn.className = 'reaction-btn';
    btn.textContent = `${emoji} ${reacs.length}`;
    btn.title = nomes;
    reactions.appendChild(btn);
  });

  card.appendChild(reactions);
  return card;
}

async function abrirDetalhes(q) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal-detalhes';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.addEventListener('click', () => overlay.remove());
  modal.appendChild(closeBtn);

  const content = document.createElement('div');
  content.className = 'modal-detalhes-content';
  content.innerHTML = '<p class="caption text-muted" style="text-align:center;padding:40px 0;">Carregando...</p>';
  modal.appendChild(content);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const [detalhes, avaliacoes] = await Promise.all([
    q.filmes?.tmdb_id ? apiFetch(`/api/tmdb/detalhes/${q.filmes.tmdb_id}`) : null,
    apiFetch(`/api/avaliacoes/${q.id}`)
  ]);

  const filme = q.filmes;
  const media = avaliacoes?.length
    ? (avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)
    : null;

  content.innerHTML = '';

  const hero = document.createElement('div');
  hero.className = 'detalhes-hero';

  if (filme?.poster_url) {
    const posterDiv = document.createElement('div');
    posterDiv.className = 'detalhes-poster';
    const img = document.createElement('img');
    img.src = filme.poster_url;
    img.alt = filme.titulo;
    posterDiv.appendChild(img);
    hero.appendChild(posterDiv);
  }

  const infoDiv = document.createElement('div');
  infoDiv.className = 'detalhes-info';

  const title = document.createElement('h2');
  title.className = 'sub-heading';
  title.textContent = filme?.titulo || 'Filme';
  if (detalhes?.ano) title.textContent += ` (${detalhes.ano})`;
  infoDiv.appendChild(title);

  if (media) {
    const starsDiv = renderStars(Number(media));
    const mediaText = document.createElement('span');
    mediaText.className = 'caption';
    mediaText.textContent = ` ${media} de 5`;
    starsDiv.appendChild(mediaText);
    infoDiv.appendChild(starsDiv);
  }

  const metaItems = [];
  metaItems.push(`Escolhido por <strong>${q.usuarios?.nome || '—'}</strong>`);
  if (detalhes?.diretor) metaItems.push(`Diretor: ${detalhes.diretor}`);
  if (detalhes?.generos?.length) metaItems.push(detalhes.generos.join(' · '));
  metaItems.push(`${q.data_inicio} até ${q.data_fim}`);

  metaItems.forEach(text => {
    const p = document.createElement('p');
    p.className = 'caption';
    p.innerHTML = text;
    infoDiv.appendChild(p);
  });

  if (detalhes?.sinopse) {
    const sinopse = document.createElement('p');
    sinopse.className = 'body-large';
    sinopse.style.cssText = 'margin-top:16px;color:var(--charcoal-82);';
    sinopse.textContent = detalhes.sinopse;
    infoDiv.appendChild(sinopse);
  }

  hero.appendChild(infoDiv);
  content.appendChild(hero);

  const reviewsSection = document.createElement('div');
  reviewsSection.className = 'detalhes-reviews';

  const reviewsTitle = document.createElement('h3');
  reviewsTitle.className = 'card-title';
  reviewsTitle.textContent = 'Resenhas';
  reviewsTitle.style.marginBottom = 'var(--space-4)';
  reviewsSection.appendChild(reviewsTitle);

  const reviewsList = document.createElement('div');
  reviewsList.className = 'reviews-list';

  if (avaliacoes?.length) {
    avaliacoes.forEach(av => {
      reviewsList.appendChild(buildReviewCard(av));
    });
  } else {
    const empty = document.createElement('p');
    empty.className = 'caption text-muted';
    empty.textContent = 'Nenhuma resenha ainda.';
    reviewsList.appendChild(empty);
  }

  reviewsSection.appendChild(reviewsList);
  content.appendChild(reviewsSection);
}

export { initHistorico };
