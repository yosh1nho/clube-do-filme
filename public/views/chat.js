const sb = window.__supabase;

const activeChannels = new Set();
const usuariosCache = new Map();

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

function formatHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function criarAvatar(usuario) {
  const avatar = document.createElement('div');
  avatar.className = 'chat-message-avatar';
  if (usuario?.avatar_url) {
    const img = document.createElement('img');
    img.src = usuario.avatar_url;
    img.alt = usuario.nome || '';
    avatar.appendChild(img);
  } else {
    avatar.textContent = (usuario?.nome || '?').charAt(0).toUpperCase();
  }
  return avatar;
}

function criarBolha(mensagem, usuarioLogadoId) {
  let usuario = mensagem.usuarios || usuariosCache.get(mensagem.usuario_id);
  if (mensagem.usuarios) usuariosCache.set(mensagem.usuario_id, mensagem.usuarios);
  if (!usuario) usuario = { nome: 'Usuário' };

  const propria = mensagem.usuario_id === usuarioLogadoId;

  const div = document.createElement('div');
  div.className = 'chat-message' + (propria ? ' chat-message-own' : '');
  div.dataset.msgId = mensagem.id;

  const avatar = criarAvatar(usuario);
  div.appendChild(avatar);

  const body = document.createElement('div');
  body.className = 'chat-message-body';

  const meta = document.createElement('div');
  meta.className = 'chat-message-meta';

  const nome = document.createElement('span');
  nome.className = 'chat-message-author';
  nome.textContent = propria ? 'Você' : (usuario.nome || 'Usuário');

  const hora = document.createElement('span');
  hora.className = 'chat-message-time';
  hora.textContent = formatHora(mensagem.criado_em);
  hora.title = mensagem.criado_em ? new Date(mensagem.criado_em).toLocaleString('pt-BR') : '';

  meta.appendChild(nome);
  meta.appendChild(hora);
  body.appendChild(meta);

  const bubble = document.createElement('div');
  bubble.className = 'chat-message-bubble';
  bubble.textContent = mensagem.conteudo;
  body.appendChild(bubble);

  div.appendChild(body);
  return div;
}

async function initChat(quinzenaId, opts = {}) {
  const { readonly = false, usuarios } = opts;

  if (Array.isArray(usuarios)) {
    usuarios.forEach(u => usuariosCache.set(u.id, u));
  }

  const section = document.createElement('section');
  section.className = 'chat-section';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = 'Conversa';
  title.style.marginBottom = 'var(--space-4)';
  section.appendChild(title);

  const list = document.createElement('div');
  list.className = 'chat-list';
  list.innerHTML = '<p class="caption text-muted">Carregando conversa...</p>';
  section.appendChild(list);

  const renderedIds = new Set();
  const usuarioLogadoId = (await sb.auth.getSession()).data.session?.user?.id;

  function scrollToBottom() {
    list.scrollTop = list.scrollHeight;
  }

  function append(mensagem, scroll = true) {
    if (!mensagem || mensagem.id == null) return;
    if (renderedIds.has(mensagem.id)) return;
    renderedIds.add(mensagem.id);

    if (list.querySelector('.chat-empty')) list.innerHTML = '';

    list.appendChild(criarBolha(mensagem, usuarioLogadoId));
    if (scroll) scrollToBottom();
  }

  async function load() {
    const mensagens = await apiFetch(`/api/mensagens/${quinzenaId}`);
    list.innerHTML = '';
    if (!Array.isArray(mensagens)) {
      list.innerHTML = '<p class="caption text-muted">Nao foi possivel carregar a conversa.</p>';
      return;
    }
    if (mensagens.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'caption text-muted chat-empty';
      empty.textContent = 'Nenhuma mensagem ainda. Comece a conversa!';
      list.appendChild(empty);
    }
    mensagens.forEach(m => append(m, false));
    scrollToBottom();
  }

  const channel = sb.channel(`chat-${quinzenaId}`);
  channel
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_mensagens',
      filter: `quinzena_id=eq.${quinzenaId}`
    }, (payload) => {
      append(payload.new);
    })
    .subscribe();
  activeChannels.add(channel);

  if (!readonly) {
    const form = document.createElement('div');
    form.className = 'chat-form';

    const input = document.createElement('textarea');
    input.className = 'chat-input';
    input.placeholder = 'Escreva algo sobre o filme...';
    input.rows = 1;

    const btnSend = document.createElement('button');
    btnSend.className = 'btn btn-primary chat-send';
    btnSend.textContent = 'Enviar';

    function autoResize() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }
    input.addEventListener('input', autoResize);

    async function enviar() {
      const texto = input.value.trim();
      if (!texto || btnSend.disabled) return;

      btnSend.disabled = true;
      btnSend.textContent = 'Enviando...';
      const result = await apiFetch('/api/mensagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quinzena_id: quinzenaId, conteudo: texto })
      });

      btnSend.disabled = false;
      btnSend.textContent = 'Enviar';

      if (result?.error) {
        input.value = texto;
        input.focus();
        return;
      }

      input.value = '';
      input.style.height = 'auto';
      append(result);
      input.focus();
    }

    btnSend.addEventListener('click', enviar);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviar();
      }
    });

    form.appendChild(input);
    form.appendChild(btnSend);
    section.appendChild(form);
  }

  load();
  return section;
}

function cleanupChats() {
  activeChannels.forEach(channel => {
    try {
      channel.unsubscribe();
    } catch (err) {
      console.error('Erro ao sair do canal do chat:', err);
    }
  });
  activeChannels.clear();
}

export { initChat, cleanupChats };
