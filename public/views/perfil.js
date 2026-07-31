const sb = window.__supabase;

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

  const avatarEmail = document.createElement('p');
  avatarEmail.className = 'caption';
  avatarEmail.id = 'perfil-email';

  avatarInfo.appendChild(avatarName);
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
    const { error } = await sb
      .from('usuarios')
      .upsert({ id: session.user.id, nome: nomeInput.value.trim() })
      .select()
      .maybeSingle();

    if (error) {
      statusMsg.textContent = error.message;
      statusMsg.style.display = 'block';
    } else {
      statusMsg.textContent = 'Nome atualizado!';
      statusMsg.style.display = 'block';
      avatarName.textContent = nomeInput.value;
      avatarLetter.textContent = nomeInput.value.charAt(0).toUpperCase();
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

  card.appendChild(title);

  const cardBody = document.createElement('div');
  cardBody.appendChild(avatarGroup);
  cardBody.appendChild(form);
  cardBody.appendChild(divider);
  cardBody.appendChild(securityTitle);
  cardBody.appendChild(pwForm);

  card.appendChild(cardBody);
  container.appendChild(card);

  sb.auth.getSession().then(({ data: { session } }) => {
    if (!session) return;
    sb.from('usuarios')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data: user }) => {
        if (!user) {
          sb.from('usuarios')
            .insert({ id: session.user.id, email: session.user.email })
            .select()
            .maybeSingle()
            .then(({ data: novo }) => {
              if (novo) {
                avatarEmail.textContent = novo.email;
                avatarName.textContent = novo.email;
                avatarLetter.textContent = novo.email.charAt(0).toUpperCase();
              }
            });
          return;
        }
        avatarEmail.textContent = user.email;
        if (user.nome) {
          nomeInput.value = user.nome;
          avatarName.textContent = user.nome;
          avatarLetter.textContent = user.nome.charAt(0).toUpperCase();
        } else {
          avatarName.textContent = user.email;
          avatarLetter.textContent = user.email.charAt(0).toUpperCase();
        }
        if (user.avatar_url) {
          avatarImg.src = user.avatar_url;
          avatarImg.style.display = 'block';
          avatarLetter.style.display = 'none';
        }
      });
  });

  return container;
}

export { initPerfil };
