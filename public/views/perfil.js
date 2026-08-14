const sb = window.__supabase;

import { getConquistaSvg } from './ranking.js';

async function uploadAvatar(file) {
  const { data: { session } } = await sb.auth.getSession();
  const ext = file.name.split('.').pop();
  const path = `${session.user.id}.${ext}`;

  const { error } = await sb.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data: { publicUrl } } = sb.storage
    .from('avatars')
    .getPublicUrl(path);

  return publicUrl;
}

function initPerfil() {
  const container = document.createElement('div');
  container.className = 'perfil-container';

  const card = document.createElement('div');
  card.className = 'card perfil-card';

  const title = document.createElement('h2');
  title.className = 'sub-heading';
  title.textContent = 'Meu Perfil';

  const form = document.createElement('form');
  form.className = 'login-form';
  form.id = 'perfil-form';

  const avatarGroup = document.createElement('div');
  avatarGroup.className = 'perfil-avatar-group';

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'perfil-avatar-wrap';

  const avatar = document.createElement('div');
  avatar.className = 'perfil-avatar';

  const avatarImg = document.createElement('img');
  avatarImg.className = 'perfil-avatar-img';
  avatarImg.style.display = 'none';

  const avatarLetter = document.createElement('span');
  avatarLetter.className = 'perfil-avatar-letter';
  avatarLetter.textContent = '?';

  avatar.appendChild(avatarImg);
  avatar.appendChild(avatarLetter);

  const avatarOverlay = document.createElement('div');
  avatarOverlay.className = 'perfil-avatar-overlay';
  avatarOverlay.textContent = 'Alterar';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  avatarWrap.appendChild(avatar);
  avatarWrap.appendChild(avatarOverlay);
  avatarWrap.appendChild(fileInput);

  const avatarInfo = document.createElement('div');
  avatarInfo.className = 'perfil-avatar-info';

  const avatarName = document.createElement('p');
  avatarName.className = 'card-title';
  avatarName.id = 'perfil-nome-display';
  avatarName.textContent = 'Carregando...';

  const userBadgeDisplay = document.createElement('span');
  userBadgeDisplay.className = 'user-badge-tag perfil-active-badge-tag';
  userBadgeDisplay.style.display = 'none';

  const avatarEmail = document.createElement('p');
  avatarEmail.className = 'caption text-muted';
  avatarEmail.id = 'perfil-email';

  avatarInfo.appendChild(avatarName);
  avatarInfo.appendChild(userBadgeDisplay);
  avatarInfo.appendChild(avatarEmail);

  avatarGroup.appendChild(avatarWrap);
  avatarGroup.appendChild(avatarInfo);

  const nomeGroup = document.createElement('div');
  nomeGroup.className = 'input-group';
  const nomeLabel = document.createElement('label');
  nomeLabel.className = 'caption';
  nomeLabel.textContent = 'Nome';
  nomeLabel.htmlFor = 'perfil-nome';
  const nomeInput = document.createElement('input');
  nomeInput.type = 'text';
  nomeInput.id = 'perfil-nome';
  nomeInput.placeholder = 'Seu nome';
  nomeInput.required = true;
  nomeGroup.appendChild(nomeLabel);
  nomeGroup.appendChild(nomeInput);

  // Seletor de Título / Badge Ativa
  const badgeGroup = document.createElement('div');
  badgeGroup.className = 'input-group';
  badgeGroup.id = 'perfil-badge-selector-group';
  badgeGroup.style.display = 'none';

  const badgeLabel = document.createElement('label');
  badgeLabel.className = 'caption';
  badgeLabel.textContent = 'Título / Conquista em Exibição';
  badgeLabel.htmlFor = 'perfil-badge-select';

  const badgeSelect = document.createElement('select');
  badgeSelect.className = 'search-input perfil-badge-select';
  badgeSelect.id = 'perfil-badge-select';

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Nenhum título exibido';
  badgeSelect.appendChild(defaultOpt);

  badgeGroup.appendChild(badgeLabel);
  badgeGroup.appendChild(badgeSelect);

  const statusMsg = document.createElement('p');
  statusMsg.className = 'caption perfil-status';
  statusMsg.id = 'perfil-status';
  statusMsg.style.display = 'none';

  const btnSalvar = document.createElement('button');
  btnSalvar.type = 'submit';
  btnSalvar.className = 'btn btn-primary';
  btnSalvar.id = 'btn-salvar-perfil';
  btnSalvar.textContent = 'Salvar';

  form.appendChild(nomeGroup);
  form.appendChild(badgeGroup);
  form.appendChild(statusMsg);
  form.appendChild(btnSalvar);

  const divider = document.createElement('hr');
  divider.className = 'perfil-divider';

  const securityTitle = document.createElement('h3');
  securityTitle.className = 'card-title';
  securityTitle.textContent = 'Alterar Senha';
  securityTitle.style.marginBottom = 'var(--space-4)';

  const pwForm = document.createElement('div');
  pwForm.className = 'login-form';

  const statusPw = document.createElement('p');
  statusPw.className = 'caption perfil-status';
  statusPw.id = 'perfil-status-pw';
  statusPw.style.display = 'none';

  const pwGroup = document.createElement('div');
  pwGroup.className = 'input-group';
  const pwLabel = document.createElement('label');
  pwLabel.className = 'caption';
  pwLabel.textContent = 'Nova senha';
  pwLabel.htmlFor = 'perfil-password';
  const pwInput = document.createElement('input');
  pwInput.type = 'password';
  pwInput.id = 'perfil-password';
  pwInput.placeholder = 'Mínimo 6 caracteres';
  pwInput.minLength = 6;
  pwInput.required = true;
  pwGroup.appendChild(pwLabel);
  pwGroup.appendChild(pwInput);

  const confirmGroup = document.createElement('div');
  confirmGroup.className = 'input-group';
  const confirmLabel = document.createElement('label');
  confirmLabel.className = 'caption';
  confirmLabel.textContent = 'Confirmar senha';
  confirmLabel.htmlFor = 'perfil-confirm';
  const confirmInput = document.createElement('input');
  confirmInput.type = 'password';
  confirmInput.id = 'perfil-confirm';
  confirmInput.placeholder = 'Repita a senha';
  confirmInput.required = true;
  confirmGroup.appendChild(confirmLabel);
  confirmGroup.appendChild(confirmInput);

  const btnPw = document.createElement('button');
  btnPw.type = 'button';
  btnPw.className = 'btn btn-primary';
  btnPw.textContent = 'Alterar Senha';

  pwForm.appendChild(pwGroup);
  pwForm.appendChild(confirmGroup);
  pwForm.appendChild(statusPw);
  pwForm.appendChild(btnPw);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';
    statusMsg.style.display = 'none';

    const { data: { session } } = await sb.auth.getSession();
    const payload = {
      nome: nomeInput.value.trim(),
      badge_ativa: badgeSelect.value || null
    };

    const res = await fetch('/api/usuarios/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result && !result.error) {
      statusMsg.textContent = 'Perfil atualizado com sucesso!';
      statusMsg.style.display = 'block';
      avatarName.textContent = nomeInput.value;
      avatarLetter.textContent = nomeInput.value.charAt(0).toUpperCase();

      if (payload.badge_ativa) {
        userBadgeDisplay.textContent = payload.badge_ativa;
        userBadgeDisplay.style.display = 'inline-block';
      } else {
        userBadgeDisplay.style.display = 'none';
      }
    } else {
      statusMsg.textContent = result?.error || 'Erro ao salvar';
      statusMsg.style.display = 'block';
    }

    btnSalvar.disabled = false;
    btnSalvar.textContent = 'Salvar';
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    avatarOverlay.textContent = 'Enviando...';
    try {
      const url = await uploadAvatar(file);
      const { data: { session } } = await sb.auth.getSession();
      await sb.from('usuarios').upsert({ id: session.user.id, avatar_url: url });
      avatarImg.src = url;
      avatarImg.style.display = 'block';
      avatarLetter.style.display = 'none';
      avatarOverlay.textContent = 'Alterar';
    } catch (err) {
      console.error('Upload avatar:', err);
      avatarOverlay.textContent = 'Erro';
      if (err.message?.includes('policy') || err.message?.includes('bucket')) {
        alert('Configure o bucket "avatars" no Supabase Storage e as políticas SQL.');
      }
      setTimeout(() => { avatarOverlay.textContent = 'Alterar'; }, 2000);
    }
  });

  avatarOverlay.addEventListener('click', () => fileInput.click());

  btnPw.addEventListener('click', async () => {
    const newPw = pwInput.value;
    const confirm = confirmInput.value;

    if (newPw.length < 6) {
      statusPw.textContent = 'Mínimo 6 caracteres';
      statusPw.style.display = 'block';
      return;
    }
    if (newPw !== confirm) {
      statusPw.textContent = 'Senhas não conferem';
      statusPw.style.display = 'block';
      return;
    }

    btnPw.disabled = true;
    btnPw.textContent = 'Alterando...';
    statusPw.style.display = 'none';

    const { error } = await sb.auth.updateUser({ password: newPw });
    if (error) {
      statusPw.textContent = error.message;
      statusPw.style.display = 'block';
    } else {
      statusPw.textContent = 'Senha alterada com sucesso!';
      statusPw.style.display = 'block';
      pwInput.value = '';
      confirmInput.value = '';
    }
    btnPw.disabled = false;
    btnPw.textContent = 'Alterar Senha';
  });

  const pwaDivider = document.createElement('hr');
  pwaDivider.className = 'perfil-divider';

  const pwaTitle = document.createElement('h3');
  pwaTitle.className = 'card-title';
  pwaTitle.textContent = 'Aplicativo no Celular';
  pwaTitle.style.marginBottom = 'var(--space-2)';

  const pwaDesc = document.createElement('p');
  pwaDesc.className = 'caption text-muted';
  pwaDesc.textContent = 'Adicione o Quinzena na tela de início do seu iPhone ou Android para ter abertura instantânea em tela cheia.';
  pwaDesc.style.marginBottom = 'var(--space-4)';

  const btnInstall = document.createElement('button');
  btnInstall.type = 'button';
  btnInstall.className = 'btn btn-outline';
  btnInstall.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Instalar Aplicativo';
  btnInstall.addEventListener('click', () => {
    if (window.__promptInstallPWA) window.__promptInstallPWA();
  });

  cardBody.appendChild(avatarGroup);
  cardBody.appendChild(form);
  cardBody.appendChild(divider);
  cardBody.appendChild(securityTitle);
  cardBody.appendChild(pwForm);
  cardBody.appendChild(pwaDivider);
  cardBody.appendChild(pwaTitle);
  cardBody.appendChild(pwaDesc);
  cardBody.appendChild(btnInstall);

  card.appendChild(cardBody);
  container.appendChild(card);

  // Seção de Conquistas Pessoais e Afinidades no Perfil
  const statsSection = document.createElement('div');
  statsSection.className = 'perfil-stats-section';
  statsSection.style.marginTop = 'var(--space-6)';
  container.appendChild(statsSection);

  sb.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) return;
    const userId = session.user.id;
    const token = session.access_token;

    // Carrega dados do usuário
    const resUser = await fetch('/api/usuarios/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const user = await resUser.json();

    if (user && !user.error) {
      avatarEmail.textContent = user.email || '';
      if (user.nome) {
        nomeInput.value = user.nome;
        avatarName.textContent = user.nome;
        avatarLetter.textContent = user.nome.charAt(0).toUpperCase();
      }
      if (user.avatar_url) {
        avatarImg.src = user.avatar_url;
        avatarImg.style.display = 'block';
        avatarLetter.style.display = 'none';
      }
      if (user.badge_ativa) {
        userBadgeDisplay.textContent = user.badge_ativa;
        userBadgeDisplay.style.display = 'inline-block';
      }
    }

    // Carrega Conquistas Atuais e Afinidade
    try {
      const resRank = await fetch('/api/ranking', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resRank.json();

      if (data && !data.error) {
        // Conquistas desbloqueadas pelo usuário (prioriza inventário persistente do banco)
        const inventario = (data.inventarioUsuario && data.inventarioUsuario.length > 0)
          ? data.inventarioUsuario
          : (data.conquistas || []).filter(c => c.usuario?.id === userId).map(c => ({
              badge_id: c.id,
              titulo: c.titulo,
              descricao: c.descricao,
              tipo_icone: c.tipoIcone,
              destaque: c.destaque,
              ativa: true
            }));

        const minhasAfinidades = (data.afinidade || []).filter(af => af.usuario1.id === userId || af.usuario2.id === userId);

        // Popula seletor de títulos ativos no perfil
        if (inventario.length > 0) {
          badgeGroup.style.display = 'block';
          badgeSelect.innerHTML = '<option value="">Nenhum título exibido</option>';
          
          let badgeAindaValida = false;
          inventario.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.titulo;
            opt.textContent = `${c.titulo} ${c.destaque ? `(${c.destaque})` : ''} ${c.ativa ? '— Detentor Atual' : ''}`;
            if (user.badge_ativa === c.titulo) {
              opt.selected = true;
              badgeAindaValida = true;
            }
            badgeSelect.appendChild(opt);
          });

          if (user.badge_ativa && !badgeAindaValida) {
            userBadgeDisplay.style.display = 'none';
          }
        }

        if (inventario.length > 0 || minhasAfinidades.length > 0) {
          statsSection.innerHTML = '';

          // Card da Galeria de Conquistas do Usuário
          if (inventario.length > 0) {
            const conquistasCard = document.createElement('div');
            conquistasCard.className = 'card perfil-badges-card';
            
            const cTitle = document.createElement('h3');
            cTitle.className = 'card-title';
            cTitle.textContent = 'Suas Conquistas no Clube';
            cTitle.style.marginBottom = 'var(--space-4)';
            conquistasCard.appendChild(cTitle);

            const badgesGrid = document.createElement('div');
            badgesGrid.className = 'perfil-badges-grid';

            inventario.forEach(c => {
              const item = document.createElement('div');
              item.className = 'perfil-badge-item';
              item.innerHTML = `
                <div class="perfil-badge-icon">${getConquistaSvg(c.tipo_icone || c.tipoIcone)}</div>
                <div class="perfil-badge-info">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <strong>${c.titulo}</strong>
                    ${c.ativa ? '<span class="conquista-stat-badge" style="font-size:0.68rem;padding:1px 6px;">Atual</span>' : ''}
                  </div>
                  <span class="caption text-muted">${c.descricao}</span>
                  ${c.destaque ? `<span class="caption perfil-badge-tag">${c.destaque}</span>` : ''}
                </div>
              `;
              badgesGrid.appendChild(item);
            });

            conquistasCard.appendChild(badgesGrid);
            statsSection.appendChild(conquistasCard);
          }

          // Card de Afinidades com Amigos
          if (minhasAfinidades.length > 0) {
            const afinidadesCard = document.createElement('div');
            afinidadesCard.className = 'card perfil-badges-card';
            afinidadesCard.style.marginTop = 'var(--space-5)';

            const aTitle = document.createElement('h3');
            aTitle.className = 'card-title';
            aTitle.textContent = 'Sua Sintonia com os Amigos';
            aTitle.style.marginBottom = 'var(--space-4)';
            afinidadesCard.appendChild(aTitle);

            const afList = document.createElement('div');
            afList.className = 'perfil-afinidades-list';

            minhasAfinidades.forEach(af => {
              const outro = af.usuario1.id === userId ? af.usuario2 : af.usuario1;
              const row = document.createElement('div');
              row.className = 'perfil-afinidade-row';
              row.innerHTML = `
                <div class="perfil-afinidade-user">
                  <div class="perfil-afinidade-avatar">
                    ${outro.avatar_url ? `<img src="${outro.avatar_url}">` : outro.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>${outro.nome}</strong>
                    <p class="caption text-muted">${af.nivel}</p>
                  </div>
                </div>
                <div class="perfil-afinidade-bar-box">
                  <div class="afinidade-bar-track">
                    <div class="afinidade-bar-fill" style="width: ${af.porcentagem}%;"></div>
                  </div>
                  <span class="caption">${af.porcentagem}%</span>
                </div>
              `;
              afList.appendChild(row);
            });

            afinidadesCard.appendChild(afList);
            statsSection.appendChild(afinidadesCard);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas do perfil:', err);
    }
  });

  return container;
}

export { initPerfil };
