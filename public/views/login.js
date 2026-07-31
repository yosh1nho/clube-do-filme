const supabase = window.__supabase;

function initLogin() {
  const wrapper = document.createElement('div');
  wrapper.className = 'login-wrapper';

  const card = document.createElement('div');
  card.className = 'login-card';

  const title = document.createElement('h1');
  title.className = 'display-alt login-title';
  title.textContent = 'Quinzena';

  const subtitle = document.createElement('p');
  subtitle.className = 'caption login-subtitle';
  subtitle.textContent = 'Entre com seu email e senha';

  const form = document.createElement('form');
  form.className = 'login-form';
  form.id = 'login-form';

  const emailGroup = document.createElement('div');
  emailGroup.className = 'input-group';
  const emailLabel = document.createElement('label');
  emailLabel.className = 'caption';
  emailLabel.textContent = 'Email';
  emailLabel.htmlFor = 'login-email';
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'login-email';
  emailInput.placeholder = 'Digite seu email';
  emailInput.required = true;
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);

  const passwordGroup = document.createElement('div');
  passwordGroup.className = 'input-group';
  const passwordLabel = document.createElement('label');
  passwordLabel.className = 'caption';
  passwordLabel.textContent = 'Senha';
  passwordLabel.htmlFor = 'login-password';
  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.id = 'login-password';
  passwordInput.placeholder = 'sua senha';
  passwordInput.required = true;
  passwordGroup.appendChild(passwordLabel);
  passwordGroup.appendChild(passwordInput);

  const errorMsg = document.createElement('p');
  errorMsg.className = 'caption login-error';
  errorMsg.id = 'login-error';
  errorMsg.style.display = 'none';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary login-btn';
  submitBtn.textContent = 'Entrar';

  form.appendChild(emailGroup);
  form.appendChild(passwordGroup);
  form.appendChild(errorMsg);
  form.appendChild(submitBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorMsg.textContent = error.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos'
        : error.message;
      errorMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  });

  card.appendChild(title);
  card.appendChild(subtitle);
  card.appendChild(form);
  wrapper.appendChild(card);

  return wrapper;
}

export { initLogin };
