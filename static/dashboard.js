// Dashboard JavaScript - HUB TRAINING

let currentUser = null;
let currentToken = null;
let quizQuestions = [];
let currentQuestionIndex = 0;
let quizAnswers = [];
let quizAttemptInfo = { used: 0, max: 3, remaining: 3 };

// ========================
// AUTHENTICATION
// ========================
function checkAuth() {
  // Aceita a chave padrão das telas de login/cadastro (hub_token/hub_user)
  // + a chave legada (token/user) para sessões já existentes.
  const token = localStorage.getItem('hub_token') || localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('hub_user') || localStorage.getItem('user') || 'null');
  
  if (!token || !user) {
    showLoginModal();
    return false;
  }
  
  currentToken = token;
  currentUser = user;
  updateUserInfo();
  return true;
}

function showLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.add('active');
  } else {
    // Create login modal if it doesn't exist
    createLoginModal();
  }
}

function createLoginModal() {
  const modal = document.createElement('div');
  modal.id = 'loginModal';
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Login</h2>
        <p>Entre com suas credenciais para acessar o treinamento</p>
      </div>
      <form id="loginForm">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" required placeholder="seu@email.com">
        </div>
        <div class="form-group">
          <label for="password">Senha</label>
          <input type="password" id="password" required placeholder="••••••••">
        </div>
        <div class="error-message" id="loginError"></div>
        <div class="modal-footer">
          <button type="submit" class="btn btn-primary btn-full">Entrar</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('hub_token', data.token);
      localStorage.setItem('hub_user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      currentToken = data.token;
      currentUser = data.user;
      
      document.getElementById('loginModal').classList.remove('active');
      updateUserInfo();
      loadDashboardData();
    } else {
      errorDiv.textContent = data.error || 'Erro ao fazer login';
      errorDiv.classList.add('show');
    }
  } catch (error) {
    errorDiv.textContent = 'Erro de conexão';
    errorDiv.classList.add('show');
  }
}

function logout() {
  localStorage.removeItem('hub_token');
  localStorage.removeItem('hub_user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentToken = null;
  currentUser = null;
  window.location.href = '/';
}

function updateUserInfo() {
  if (currentUser) {
    document.getElementById('userName').textContent = currentUser.name || 'Usuário';
    const role = currentUser.role === 'ADMIN' ? 'Administrador'
      : currentUser.role === 'TECHNICAL_EVALUATOR' ? 'Avaliador Técnico' : 'Operador';
    document.getElementById('userRole').textContent = role;
    document.body.classList.toggle('is-admin', currentUser.role === 'ADMIN');
    document.body.classList.toggle('is-evaluator', currentUser.role === 'TECHNICAL_EVALUATOR' || currentUser.role === 'ADMIN');
  } else {
    document.body.classList.remove('is-admin');
    document.body.classList.remove('is-evaluator');
  }
}

// ========================
// NAVIGATION
// ========================
function updateBreadcrumb(segments) {
  const box = document.getElementById('topBreadcrumbs');
  if (!box || !Array.isArray(segments) || !segments.length) return;
  const parts = segments.map((s, i) => {
    const isLast = i === segments.length - 1;
    const safe = escHtml(s);
    return isLast ? `<span>${safe}</span>` : `<span>${safe}</span><i class="fas fa-chevron-right" aria-hidden="true"></i>`;
  });
  box.innerHTML = parts.join('');
}

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });
  
  // Update pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  
  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  // Update breadcrumb
  switch(page) {
    case 'dashboard':
      updateBreadcrumb(['Início']);
      break;
    case 'study':
      updateBreadcrumb(['Início', 'Estudar Cartilha']);
      break;
    case 'modules':
      updateBreadcrumb(['Início', 'Módulos']);
      break;
    case 'progress':
      updateBreadcrumb(['Início', 'Progresso']);
      break;
    case 'quiz':
      updateBreadcrumb(['Início', 'Simulado Final']);
      break;
    case 'certificate':
      updateBreadcrumb(['Início', 'Certificado']);
      break;
    case 'help':
      updateBreadcrumb(['Início', 'Ajuda']);
      break;
    case 'admin':
      updateBreadcrumb(['Início', 'Área Administrativa']);
      break;
  }
  
  // Load page-specific data
  switch(page) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'modules':
      loadAllModules();
      break;
    case 'progress':
      loadProgressDetail();
      break;
    case 'quiz':
      loadMyAttempts();
      break;
    case 'study':
      loadStudy();
      break;
    case 'certificate':
      loadCertificate();
      break;
    case 'practical':
      updateBreadcrumb(['Início', 'Avaliação Prática']);
      loadPractical();
      break;
    case 'admin':
      if (currentUser && currentUser.role === 'ADMIN') {
        loadAdmin();
      } else {
        navigateTo('dashboard');
      }
      break;
  }
}

// ========================
// API CALLS
// ========================
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }
  
  const response = await fetch(endpoint, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      logout();
      return null;
    }
    let serverMsg = '';
    let retryAfter = 0;
    try { retryAfter = Number(response.headers.get('Retry-After')) || 0; } catch (e) { /* noop */ }
    try { const eb = await response.json(); serverMsg = (eb && eb.error) || ''; } catch (e) { /* noop */ }
    if (response.status === 429) {
      const wait = retryAfter > 0 ? ` Tente de novo em ~${Math.ceil(retryAfter / 60)} min.` : ' Aguarde alguns minutos sem clicar e tente de novo.';
      const err = new Error((serverMsg || 'Muitas requisições.') + wait);
      err.status = 429;
      err.retryAfter = retryAfter;
      throw err;
    }
    throw new Error(serverMsg || `API error: ${response.status}`);
  }
  
  return response.json();
}

// ========================
// DASHBOARD DATA
// ========================
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function modStatus(m) {
  if (m.status === 'COMPLETED') return { icon: 'check-circle', text: 'Concluído', cls: '' };
  if (m.status === 'IN_PROGRESS') return { icon: 'clock', text: 'Em andamento', cls: '' };
  return { icon: 'circle', text: 'Não iniciado', cls: '' };
}

async function loadDashboardData() {
  try {
    // Indicadores reais calculados pelo backend (valores por usuário logado)
    const summary = await apiCall('/api/dashboard/summary');
    if (summary && summary.modules) {
      // Home preview: somente os 4 primeiros módulos como acesso rápido
      const homePreview = summary.modules.slice(0, 4);
      renderModules(homePreview, 'modulesGrid');
      updateProgressCards(summary);
      updateHero(summary);
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function updateHero(summary) {
  const elig = summary.indicators && summary.indicators.eligible_for_quiz;
  const title = document.getElementById('heroTitle');
  const sub = document.getElementById('heroSub');
  const done = document.getElementById('bannerComplete');
  if (elig) {
    if (title) title.textContent = 'Treinamento Completo!';
    if (sub) sub.textContent = 'Você concluiu todos os módulos do curso. Agora realize o simulado final para obter seu certificado de conclusão.';
    if (done) done.hidden = false;
  } else {
    if (title) title.textContent = 'Treinamento de Manutenção Elétrica';
    if (done) done.hidden = true;
  }
}

function renderModules(modules, gridId) {
  const grid = document.getElementById(gridId || 'modulesGrid');
  if (!grid) return;
  
  grid.innerHTML = modules.map((module) => {
    const st = modStatus(module);
    return `
    <div class="module-card" onclick="navigateToModule(${module.id})" role="button" tabindex="0" onkeydown="if(event.key==='Enter')navigateToModule(${module.id})" aria-label="Módulo ${module.number}: ${escHtml(module.title)} — ${module.progress}% concluído">
      <div class="module-number">${module.number}</div>
      <div class="module-info">
        <div class="module-title">${escHtml(module.title)}</div>
        <div class="module-status">
          <i class="fas fa-${st.icon}"></i>
          ${st.text} · ${module.progress}%
        </div>
      </div>
      <div class="module-arrow">
        <i class="fas fa-chevron-right"></i>
      </div>
    </div>`;
  }).join('');
}

function setCard(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateProgressCards(summary) {
  const ind = summary.indicators || {};
  const modules = summary.modules || [];
  const doneMods = modules.filter(m => m.status === 'COMPLETED').length;
  const pctL = ind.lessons ? Math.round(((ind.completed_lessons || 0) / ind.lessons) * 100) : 0;
  
  setCard('modulesValue', `${doneMods} / ${modules.length}`);
  setCard('lessonsValue', `${pctL}%`);
  const cpAns = ind.checkpoints_answered ?? ind.checkpoints ?? 0;
  const cpTot = ind.checkpoints_total ?? ind.checkpoints ?? 0;
  const cpLabel = `${cpAns} / ${cpTot}`;
  setCard('checkpointsValue', cpLabel);
  setCard('generalValue', `${ind.progress || 0}%`);
  
  // Update right sidebar
  setCard('rightModules', `${doneMods} / ${modules.length}`);
  setCard('rightLessons', `${pctL}%`);
  setCard('rightCheckpoints', cpLabel);
  setCard('rightGeneral', `${ind.progress || 0}%`);
  
  setCard('summaryLessons', `${pctL}%`);
  setCard('summaryCheckpoints', cpLabel);
  
  const statusBadge = document.getElementById('summaryStatus');
  if (statusBadge) {
    if (ind.eligible_for_quiz) {
      statusBadge.textContent = 'Concluído';
      statusBadge.className = 'status-badge completed';
    } else {
      statusBadge.textContent = 'Em andamento';
      statusBadge.className = 'status-badge in-progress';
    }
  }
}

function updateProgressSummary(progress) {
  // Update progress summary based on actual progress data
  const completedLessons = progress.filter(p => p.status === 'COMPLETED').length;
  const totalLessons = progress.length;
  
  if (totalLessons > 0) {
    const percentage = Math.round((completedLessons / totalLessons) * 100);
    setCard('lessonsValue', `${percentage}%`);
    setCard('generalValue', `${percentage}%`);
  }
}

// ========================
// STUDY: Estudar Cartilha (índice + navegação entre módulos)
// ========================
let studyModules = [];

async function loadStudy() {
  try {
    const summary = await apiCall('/api/dashboard/summary');
    if (!summary || !summary.modules) return;
    studyModules = summary.modules;
    const done = studyModules.filter(m => m.status === 'COMPLETED').length;
    const doing = studyModules.filter(m => m.status === 'IN_PROGRESS').length;
    const todo = studyModules.length - done - doing;
    setCard('studyDone', done);
    setCard('studyDoing', doing);
    setCard('studyTodo', todo);
    const pct = studyModules.length ? Math.round((done / studyModules.length) * 100) : 0;
    const bar = document.getElementById('studyBar');
    const fill = document.getElementById('studyFill');
    if (bar) bar.setAttribute('aria-valuenow', pct);
    if (fill) fill.style.width = pct + '%';
    renderStudyIndex('');
    const si = document.getElementById('studySearch');
    if (si) si.value = '';
  } catch (error) {
    console.error('Error loading study index:', error);
  }
}

function renderStudyIndex(filter) {
  const box = document.getElementById('studyIndex');
  if (!box) return;
  const f = (filter || '').toLowerCase();
  const list = studyModules.filter(m => m.title.toLowerCase().includes(f));
  box.innerHTML = list.map(m => {
    const st = modStatus(m);
    return `
    <button class="study-row${m.status === 'COMPLETED' ? ' done' : ''}" onclick="navigateToModule(${m.id})" aria-label="Módulo ${m.number}: ${escHtml(m.title)} — ${st.text}, ${m.progress}%">
      <span class="study-num" aria-hidden="true">${m.number}</span>
      <span class="study-info">
        <span class="study-title">${escHtml(m.title)}</span><br>
        <span class="study-meta">${st.text} · ${m.progress}% concluído</span>
      </span>
      <i class="fas fa-chevron-right" aria-hidden="true"></i>
    </button>`;
  }).join('') || '<p class="muted-text">Nenhum módulo encontrado.</p>';
}

function filterStudy() {
  renderStudyIndex(document.getElementById('studySearch').value);
}

async function ensureStudyModules() {
  if (studyModules.length) return studyModules;
  const summary = await apiCall('/api/dashboard/summary');
  studyModules = (summary && summary.modules) || [];
  return studyModules;
}

async function goSiblingModule(dir) {
  if (currentModuleId == null) return;
  const mods = await ensureStudyModules();
  const ids = mods.map(m => m.id);
  const ix = ids.indexOf(Number(currentModuleId));
  const nx = ids[ix + dir];
  if (nx) { navigateToModule(nx); return; }
  // Nos extremos: Próximo no último módulo -> simulado; Anterior no primeiro -> índice
  if (dir > 0) navigateTo('quiz');
  else navigateTo('study');
}

async function goSiblingLesson(dir) {
  if (currentLessonId == null || currentModuleId == null) return;
  try {
    const data = await apiCall(`/api/training/module/${currentModuleId}`);
    const ids = ((data && data.lessons) || []).map(l => l.id);
    const ix = ids.indexOf(Number(currentLessonId));
    const nx = ids[ix + dir];
    if (nx) { navigateToLesson(nx); return; }
    // Fim/início do módulo: atravessa para o módulo vizinho (cada módulo tem 1 aula,
    // então sem isso o Próximo/Anterior da aula nunca funciona).
    const mods = await ensureStudyModules();
    const mids = mods.map(m => m.id);
    const mix = mids.indexOf(Number(currentModuleId));
    const nm = mids[mix + dir];
    if (nm == null) {
      // Fim da cartilha -> simulado; início -> índice
      if (dir > 0) navigateTo('quiz');
      else navigateTo('study');
      return;
    }
    const ndata = await apiCall(`/api/training/module/${nm}`);
    const nlessons = ((ndata && ndata.lessons) || []).map(l => l.id);
    if (!nlessons.length) { navigateToModule(nm); return; }
    navigateToLesson(dir > 0 ? nlessons[0] : nlessons[nlessons.length - 1]);
  } catch (error) {
    console.error('Error navigating lessons:', error);
  }
}

// ========================
// MODULES PAGE
// ========================
async function loadAllModules() {
  try {
    const summary = await apiCall('/api/dashboard/summary');
    if (summary && summary.modules) {
      renderModules(summary.modules, 'allModulesGrid');
    }
  } catch (error) {
    console.error('Error loading modules:', error);
  }
}

let currentModuleId = null;
let currentLessonId = null;

async function navigateToModule(moduleId) {
  try {
    const data = await apiCall(`/api/training/module/${moduleId}`);
    if (!data || !data.module) return;
    currentModuleId = moduleId;
    const m = data.module;
    const lessons = data.lessons || [];
    const moduleLabel = `Módulo ${String(m.order_num).padStart(2,'0')}`;
    document.getElementById('moduleCrumb').textContent = `${moduleLabel} — ${m.title}`;
    document.getElementById('moduleKicker').textContent = `MÓDULO ${String(m.order_num).padStart(2,'0')}`;
    document.getElementById('moduleTitle').textContent = m.title;
    document.getElementById('moduleDesc').textContent = m.description || '';
    updateBreadcrumb(['Início', 'Estudar Cartilha', moduleLabel]);
    document.getElementById('moduleLessons').innerHTML = lessons.length
      ? lessons.map((l, i) => `
        <button class="lesson-row" onclick="navigateToLesson(${l.id})" aria-label="Aula ${i + 1}: ${escHtml(l.title)}">
          <span class="lesson-num">${i + 1}</span>
          <span class="lesson-info">
            <span class="lesson-title">${escHtml(l.title)}</span><br>
            <span class="lesson-obj">${escHtml(l.objective || '')}</span>
          </span>
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>`).join('')
      : '<p class="muted-text">Nenhuma aula neste módulo.</p>';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-module').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === 'study'));
    window.scrollTo(0, 0);
  } catch (error) {
    console.error('Error loading module:', error);
  }
}

async function navigateToLesson(lessonId) {
  try {
    const data = await apiCall(`/api/training/lesson/${lessonId}`);
    if (!data || !data.lesson) return;
    const l = data.lesson;
    currentLessonId = lessonId;
    currentModuleId = l.module_id;
    document.getElementById('lessonCrumb').textContent = l.title;
    document.getElementById('lessonTitle').textContent = l.title;
    document.getElementById('lessonObjective').textContent = l.objective || '';
    document.getElementById('lessonBadge').textContent = (l.classification || 'Aula').replace(/_/g, ' ');
    document.getElementById('lessonContent').innerHTML = l.content;
    try {
      const md = await apiCall(`/api/training/module/${l.module_id}`);
      const mm = md && md.module;
      const kick = document.getElementById('lessonKicker');
      const modLink = document.getElementById('lessonModLink');
      if (mm) {
        const modNum = String(mm.order_num || '').padStart(2,'0');
        const modLabel = `Módulo ${modNum}`;
        if (kick) kick.textContent = `MÓDULO ${modNum} — ${(mm.title || '').toUpperCase()}`;
        if (modLink) { modLink.textContent = mm.title; modLink.onclick = () => { navigateToModule(l.module_id); return false; }; }
        updateBreadcrumb(['Início', 'Estudar Cartilha', modLabel, l.title]);
      }
      const fig = document.getElementById('lessonFig');
      if (fig) fig.hidden = !(mm && mm.order_num === 1);
    } catch (e) {
      console.error('Error loading lesson module:', e);
    }
    const cps = await apiCall(`/api/training/lesson/${lessonId}/checkpoints`);
    const box = document.getElementById('lessonCheckpoints');
    const list = (cps && cps.checkpoints) || [];
    // Busca já respondidos para travar (uma vez respondida, não pode mudar)
    let answeredMap = {};
    try {
      const my = await apiCall(`/api/checkpoints/my-answers?lesson_id=${lessonId}`);
      (my && my.answered || []).forEach(a => { answeredMap[a.checkpoint_id] = a.selected_option_id; });
    } catch (e) { /* sem trava prévia se falhar */ }
    box.innerHTML = list.length
      ? '<p class="muted-text" style="margin-bottom:8px">Após responder, a alternativa trava e não pode ser alterada.</p>' + list.map((cp, i) => {
        const lockedId = answeredMap[cp.id];
        const isLocked = lockedId != null;
        return `
        <div class="cp-box" data-cp="${cp.id}">
          <div class="cp-q">${i + 1}. ${escHtml(cp.question)}</div>
          ${(cp.options || []).map(o => `
            <label class="cp-opt${isLocked && Number(o.id) === Number(lockedId) ? ' selected' : ''}${isLocked ? ' locked' : ''}"><input type="radio" name="cp${cp.id}" value="${o.id}" ${isLocked ? 'disabled' : ''}${Number(o.id) === Number(lockedId) ? ' checked' : ''}> <span>${escHtml(o.option_text)}</span></label>`).join('')}
          <div style="margin-top:8px">
            <button class="btn btn-secondary" onclick="answerCheckpoint(${cp.id})" ${isLocked ? 'disabled' : ''}>${isLocked ? 'Respondida (travada)' : 'Responder'}</button>
            <span class="cp-feedback" id="cpfb${cp.id}" role="status">${isLocked ? 'Resposta registrada e travada.' : ''}</span>
          </div>
        </div>`;
      }).join('')
      : '<p class="muted-text">Sem checkpoints nesta aula.</p>';
    // Estado de conclusão da aula (para o aluno saber o que falta)
    try {
      const st = await apiCall(`/api/progress/lesson/${lessonId}/user/${currentUser.id}`);
      setLessonCompleteBtn(st && st.progress && st.progress.status === 'COMPLETED');
    } catch (e) { setLessonCompleteBtn(false); }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-lesson').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === 'study'));
    window.scrollTo(0, 0);
  } catch (error) {
    console.error('Error loading lesson:', error);
  }
}

async function answerCheckpoint(cpId) {
  const sel = document.querySelector(`input[name=cp${cpId}]:checked`);
  const fb = document.getElementById('cpfb' + cpId);
  const boxEl = document.querySelector(`.cp-box[data-cp="${cpId}"]`);
  if (!sel) {
    if (fb) { fb.textContent = 'Escolha uma alternativa.'; fb.className = 'cp-feedback no'; }
    return;
  }
  // Trava imediata no front (não deixa trocar enquanto envia)
  const lockBox = () => {
    if (boxEl) {
      boxEl.querySelectorAll('input[type=radio]').forEach(r => { r.disabled = true; });
      const btn = boxEl.querySelector('button');
      if (btn) { btn.disabled = true; btn.textContent = 'Respondida (travada)'; }
    }
  };
  try {
    const r = await apiCall(`/api/checkpoints/${cpId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ selected_option_id: Number(sel.value) })
    });
    lockBox();
    if (r && fb) {
      fb.textContent = (r.correct ? '✓ Resposta correta!' : '✕ Resposta incorreta.') + ' Travada — não pode ser alterada.';
      fb.className = 'cp-feedback ' + (r.correct ? 'ok' : 'no');
    }
  } catch (error) {
    if (/já registrada|travada|locked/i.test(error.message)) {
      lockBox();
      if (fb) { fb.textContent = 'Resposta já registrada e travada — não pode ser alterada.'; fb.className = 'cp-feedback no'; }
      return;
    }
    if (error.status === 429 || /requisições|429|aguarde/i.test(error.message)) {
      // 429: não travar a resposta, mas impor espera para não agravar o limite
      if (fb) { fb.textContent = error.message + ' Não clique repetidamente.'; fb.className = 'cp-feedback no'; }
      if (boxEl) {
        const btn = boxEl.querySelector('button');
        if (btn) {
          btn.disabled = true;
          const orig = 'Responder';
          let s = 60;
          btn.textContent = `Aguarde ${s}s...`;
          const t = setInterval(() => {
            s -= 1;
            if (s <= 0) { clearInterval(t); btn.disabled = false; btn.textContent = orig; }
            else btn.textContent = `Aguarde ${s}s...`;
          }, 1000);
        }
      }
      return;
    }
    console.error('Error answering checkpoint:', error);
    if (fb) { fb.textContent = 'Erro ao responder. Tente novamente.'; fb.className = 'cp-feedback no'; }
  }
}

function setLessonCompleteBtn(done) {
  const btn = document.getElementById('completeLessonBtn');
  if (!btn) return;
  if (done) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Aula concluída ✓';
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Marcar aula como concluída';
  }
}

async function completeLesson() {
  if (!currentLessonId) return;
  const btn = document.getElementById('completeLessonBtn');
  try {
    const r = await apiCall(`/api/training/lesson/${currentLessonId}/complete`, { method: 'POST' });
    if (r) {
      setLessonCompleteBtn(true);
      loadDashboardData();
      alert('Aula concluída com sucesso! Use "Próximo" para avançar.');
    }
  } catch (error) {
    if (error.status === 429 || /requisições|429|aguarde/i.test(error.message)) {
      alert(error.message);
      if (btn) {
        btn.disabled = true;
        const orig = btn.innerHTML;
        let s = 60;
        const t = setInterval(() => {
          s -= 1;
          if (s <= 0) { clearInterval(t); btn.disabled = false; btn.innerHTML = orig; }
        }, 1000);
      }
      return;
    }
    console.error('Error completing lesson:', error);
    alert('Erro ao concluir a aula.');
  }
}

// ========================
// PROGRESS PAGE
// ========================
async function loadProgressDetail() {
  try {
    const progressData = await apiCall(`/api/progress/user/${currentUser.id}`);
    if (progressData) {
      const container = document.getElementById('progressDetail');
      if (container) {
        container.innerHTML = progressData.progress.map(p => `
          <div class="card">
            <div class="module-title">${p.lesson_title}</div>
            <div class="module-status">
              <i class="fas fa-${p.status === 'COMPLETED' ? 'check-circle' : 'clock'}"></i>
              ${p.status === 'COMPLETED' ? 'Concluído' : 'Em andamento'}
            </div>
            <div class="card-value">${p.progress}%</div>
          </div>
        `).join('');
      }
    }
  } catch (error) {
    console.error('Error loading progress:', error);
  }
}

// ========================
// QUIZ
// ========================
async function startQuiz() {
  try {
    // Verifica limite de tentativas (1 inicial + 2 chances = 3)
    try {
      const att = await apiCall('/api/quiz/my-attempts');
      const used = (att && att.used) ?? ((att && att.attempts) || []).length;
      const max = (att && att.max_attempts) || 3;
      const alreadyPassed = (att && att.already_passed) || ((att && att.attempts) || []).some(a => a.result === 'APROVADO');
      quizAttemptInfo = { used, max, remaining: Math.max(0, max - used) };
      if (alreadyPassed) {
        alert('Você já foi APROVADO. Acesse seu Certificado.');
        navigateTo('certificate');
        return;
      }
      if (used >= max) {
        alert(`Limite de ${max} tentativas esgotado (1 + 2 chances). Procure o administrador.`);
        return;
      }
    } catch (e) { /* segue sem bloquear se falhar a checagem */ }
    // Load quiz questions
    const quizData = await apiCall('/api/quiz/questions');
    if (quizData && quizData.questions && quizData.questions.length > 0) {
      quizQuestions = quizData.questions;
      currentQuestionIndex = 0;
      quizAnswers = [];
      showQuizQuestion();
    } else {
      alert('Simulado não disponível no momento. As questões estão sendo preparadas.');
    }
  } catch (error) {
    console.error('Error starting quiz:', error);
    alert('Erro ao carregar simulado. Tente novamente mais tarde.');
  }
}

function answeredCount() {
  return quizQuestions.filter(q => quizAnswers.some(a => a.questionId === q.id)).length;
}

function showQuizQuestion() {
  const container = document.getElementById('quizContainer');
  if (!container || currentQuestionIndex >= quizQuestions.length) {
    showQuizResults();
    return;
  }
  
  const question = quizQuestions[currentQuestionIndex];
  const isLast = currentQuestionIndex === quizQuestions.length - 1;
  const prev = quizAnswers.find(a => a.questionId === question.id);
  const locked = !!prev;
  
  container.innerHTML = `
    <div class="quiz-question">
      <div class="quiz-header">
        <div class="quiz-progress">
          Questão ${currentQuestionIndex + 1} de ${quizQuestions.length}
          <span class="quiz-count">${answeredCount()} de ${quizQuestions.length} respondidas</span>
          <span class="quiz-count">Tentativa ${Math.min(quizAttemptInfo.used + 1, quizAttemptInfo.max)} de ${quizAttemptInfo.max}</span>
        </div>
        <div class="quiz-progress-bar" role="progressbar" aria-label="Progresso do simulado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100)}">
          <div class="progress-fill" style="width: ${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%"></div>
        </div>
        <p class="muted-text" style="margin:6px 0 0">Após confirmar a alternativa, não é possível alterar. É obrigatório responder todas até o final.</p>
      </div>
      
      <div class="question-content">
        <span class="badge-ok" style="margin-bottom:8px">${escHtml(question.category || 'Simulado')}</span>
        <h3>${escHtml(question.question)}</h3>
      </div>
      
      <div class="question-options" role="group" aria-label="Alternativas da questão ${currentQuestionIndex + 1}">
        ${question.options.map((option, index) => `
          <button class="option-btn${prev && prev.selectedOptionId === option.id ? ' selected locked' : ''}" ${locked ? 'disabled aria-disabled="true"' : ''} onclick="selectAnswer(${option.id}, event)" aria-pressed="${prev && prev.selectedOptionId === option.id ? 'true' : 'false'}">
            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
            <span class="option-text">${escHtml(option.option_text)}</span>
          </button>
        `).join('')}
      </div>
      ${locked ? '<p class="muted-text" role="status">Resposta registrada e travada — não pode ser alterada.</p>' : ''}

      <div class="quiz-review" aria-label="Revisão das questões">
        ${quizQuestions.map((q, i) => `<button class="dot${quizAnswers.some(a => a.questionId === q.id) ? ' done' : ''}${i === currentQuestionIndex ? ' current' : ''}" onclick="goQuestion(${i})" aria-label="Ir para a questão ${i + 1}">${i + 1}</button>`).join('')}
      </div>
      
      <div class="quiz-footer quiz-sticky">
        <button class="btn btn-secondary" onclick="previousQuestion()" ${currentQuestionIndex === 0 ? 'disabled' : ''}>
          <i class="fas fa-arrow-left"></i> Anterior
        </button>
        <button class="btn btn-primary" onclick="nextQuestion()" ${!prev ? 'disabled title="Responda esta questão para avançar"' : ''}>
          ${isLast ? 'Finalizar avaliação' : 'Próximo'} <i class="fas fa-arrow-right"></i>
        </button>
      </div>
      ${!prev ? '<p class="muted-text">Selecione uma alternativa para liberar o avanço. A escolha trava na hora.</p>' : ''}
    </div>
  `;
}

function goQuestion(i) {
  if (i >= 0 && i < quizQuestions.length) {
    currentQuestionIndex = i;
    showQuizQuestion();
  }
}

function selectAnswer(optionId, evt) {
  const currentQuestion = quizQuestions[currentQuestionIndex];
  // Trava: uma vez respondida, não pode mudar
  if (quizAnswers.some(a => a.questionId === currentQuestion.id)) {
    return;
  }
  
  // Add new answer (sem remover — primeira escolha vale)
  quizAnswers.push({
    questionId: currentQuestion.id,
    selectedOptionId: optionId
  });
  
  // Update UI e trava tudo da questão atual
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
  });
  const btn = evt && evt.target ? evt.target.closest('.option-btn') : null;
  if (btn) {
    btn.classList.add('selected', 'locked');
    btn.setAttribute('aria-pressed', 'true');
  }
  const counter = document.querySelector('.quiz-count');
  if (counter) counter.textContent = `${answeredCount()} de ${quizQuestions.length} respondidas`;
  // Re-render para liberar o botão Próximo/Finalizar e mostrar aviso de trava
  showQuizQuestion();
}

function nextQuestion() {
  const currentQuestion = quizQuestions[currentQuestionIndex];
  if (!quizAnswers.some(a => a.questionId === currentQuestion.id)) {
    alert('Responda esta questão antes de avançar. Após confirmar, não será possível alterar.');
    return;
  }
  if (currentQuestionIndex < quizQuestions.length - 1) {
    currentQuestionIndex++;
    showQuizQuestion();
  } else {
    submitQuiz();
  }
}

function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    showQuizQuestion();
  }
}

async function submitQuiz() {
  try {
    // Obrigatório responder todas antes de finalizar
    if (answeredCount() < quizQuestions.length) {
      const missing = quizQuestions.length - answeredCount();
      alert(`Faltam ${missing} questão(ões). É obrigatório ir até o final e validar todas as respostas.`);
      // leva para a primeira não respondida
      const idx = quizQuestions.findIndex(q => !quizAnswers.some(a => a.questionId === q.id));
      if (idx >= 0) { currentQuestionIndex = idx; showQuizQuestion(); }
      return;
    }
    // Backend calcula o score exclusivamente no servidor (regra 23/30).
    // Formato exigido: objeto { questionId: optionId }.
    const answers = {};
    quizAnswers.forEach(a => { answers[a.questionId] = a.selectedOptionId; });
    let response;
    try {
      response = await apiCall('/api/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
    } catch (err) {
      const msg = (err && err.message) || '';
      if (err.status === 429 || /requisições excedido|aguarde/i.test(msg)) {
        alert(msg + ' Suas respostas estão salvas na tela — não recarregue, só aguarde.');
        return;
      }
      if (/Limite de .* tentativas|já foi APROVADO/i.test(msg)) {
        alert(msg);
        loadMyAttempts();
        return;
      }
      if (/obrigatório responder|Faltam/i.test(msg)) {
        alert(msg);
        return;
      }
      throw err;
    }
    
    if (response) {
      quizAttemptInfo.used = response.attempt_number || (quizAttemptInfo.used + 1);
      quizAttemptInfo.remaining = (response.remaining ?? Math.max(0, quizAttemptInfo.max - quizAttemptInfo.used));
      showQuizResults(response);
    }
  } catch (error) {
    console.error('Error submitting quiz:', error);
    alert('Erro ao submeter simulado. Tente novamente.');
  }
}

function showQuizResults(results) {
  const container = document.getElementById('quizContainer');
  if (!container) return;
  if (!results || !results.result) {
    // chamada sem resultado (fim sem submit) — volta ao início
    startQuiz();
    return;
  }
  // O profissional recebe SOMENTE APROVADO / NÃO APROVADO (sem score detalhado).
  const ok = results.result === 'APROVADO';
  const attNum = results.attempt_number || quizAttemptInfo.used || 1;
  const maxAtt = results.max_attempts || quizAttemptInfo.max || 3;
  const remaining = (results.remaining ?? Math.max(0, maxAtt - attNum));
  
  container.innerHTML = `
    <div class="quiz-results ${ok ? 'passed' : 'failed'}">
      <div class="results-icon">
        <i class="fas fa-${ok ? 'check-circle' : 'times-circle'}"></i>
      </div>
      ${ok ? '<h2>AVALIAÇÃO TEÓRICA — APROVADO</h2><p><strong>Próxima etapa: avaliação prática presencial.</strong></p>' : '<h2>NÃO APROVADO</h2>'}
      <p>${ok ? 'A aprovação no simulado não gera certificado. O certificado continua bloqueado até a avaliação prática APTO e a emissão exclusiva do administrador.' : 'O profissional não atingiu o aproveitamento mínimo definido para esta avaliação.'}</p>
      <p>Critério: mínimo de 23 acertos em 30.</p>
      <div id="completionStats"><p class="muted-text">Carregando resumo…</p></div>
      <p class="muted-text">Tentativa ${attNum} de ${maxAtt}.${!ok && remaining > 0 ? ` Você tem mais ${remaining} chance(s).` : ''}${!ok && remaining <= 0 ? ' Suas 3 tentativas foram esgotadas.' : ''}</p>
      ${ok
        ? `<button class="btn btn-primary" onclick="navigateTo('certificate')">ACOMPANHAR CERTIFICAÇÃO</button>`
        : (remaining > 0
          ? `<button class="btn btn-primary" onclick="navigateTo('quiz'); setTimeout(startQuiz, 100)">Tentar Novamente (${remaining} restante(s))</button>
             <button class="btn btn-secondary" onclick="navigateTo('study')" style="margin-top:8px">Revisar Cartilha</button>`
          : `<button class="btn btn-secondary" onclick="navigateTo('study')">Voltar a Estudar Cartilha</button>`)}
    </div>
  `;
  loadMyAttempts();
  if (ok) {
    // Tela de conclusão: busca status real (backend) — teórica APROVADO ≠ certificado.
    apiCall('/api/certificates/my').then(d => {
      const el = document.getElementById('completionStats');
      if (!el) return;
      const a = (d && d.academic) || {};
      const q = (d && d.quiz) || {};
      const li = (v, t) => `${v || 0}/${t || 0}`;
      el.innerHTML = `
        <div class="cert-progress-list">
          <div class="cert-progress-row"><span>Módulos</span><strong>${li(a.modules && a.modules.done, a.modules && a.modules.total)}</strong></div>
          <div class="cert-progress-row"><span>Lições</span><strong>${li(a.lessons && a.lessons.done, a.lessons && a.lessons.total)}</strong></div>
          <div class="cert-progress-row"><span>Checkpoints</span><strong>${li(a.checkpoints && a.checkpoints.done, a.checkpoints && a.checkpoints.total)}</strong></div>
          <div class="cert-progress-row"><span>Questões</span><strong>30/30</strong></div>
          <div class="cert-progress-row"><span>Avaliação teórica</span><strong class="badge-ok">APROVADO${q.score != null ? ` — ${q.score}/30` : ''}</strong></div>
          <div class="cert-progress-row"><span>Status</span><strong>${escHtml(CERT_STATUS_LABEL[(d && d.status)] || '')}</strong></div>
        </div>
        <p class="muted-text">Sistema: AGUARDANDO AVALIAÇÃO PRÁTICA.</p>`;
    }).catch(() => {});
  }
}

async function loadMyAttempts() {
  const box = document.getElementById('myAttempts');
  if (!box) return;
  try {
    // Histórico do aluno: somente resultado final e data (sem score/gabarito).
    const data = await apiCall('/api/quiz/my-attempts');
    const list = (data && data.attempts) || [];
    const max = (data && data.max_attempts) || 3;
    if (data) quizAttemptInfo = { used: data.used ?? list.length, max, remaining: data.remaining ?? Math.max(0, max - list.length) };
    box.innerHTML = (list.length
      ? list.map(a => `
        <div class="attempt-row">
          <span>Tentativa ${a.attempt_number} de ${max} · ${escHtml(a.completed_at || '—')}</span>
          <span class="${a.result === 'APROVADO' ? 'badge-ok' : 'badge-warn'}">${a.result}</span>
        </div>`).join('')
      : '<p class="muted-text">Nenhuma tentativa registrada ainda.</p>')
      + `<p class="muted-text">Limite: ${max} tentativas (1 + 2 chances).${quizAttemptInfo.remaining > 0 ? ` Restam ${quizAttemptInfo.remaining}.` : ' Limite esgotado.'}</p>`;
  } catch (error) {
    console.error('Error loading attempts:', error);
  }
}

// ========================
// CERTIFICATE
// ========================
const CERT_STATUS_LABEL = {
  TRAINING_IN_PROGRESS: 'EM ANDAMENTO',
  THEORY_NOT_COMPLETED: 'EM ANDAMENTO',
  THEORY_FAILED: 'AVALIAÇÃO TEÓRICA — NÃO APROVADO',
  THEORY_APPROVED: 'AVALIAÇÃO TEÓRICA — APROVADO',
  PRACTICAL_EVALUATION_PENDING: 'AGUARDANDO AVALIAÇÃO PRÁTICA',
  PRACTICAL_NOT_APPROVED: 'AVALIAÇÃO PRÁTICA — NÃO APTO',
  PRACTICAL_APPROVED: 'AVALIAÇÃO PRÁTICA — APTO',
  READY_FOR_ADMIN_CERTIFICATION: 'PRONTO PARA CERTIFICAÇÃO',
  CERTIFICATE_ISSUED: 'CERTIFICADO EMITIDO',
  CERTIFICATE_REVOKED: 'CERTIFICADO REVOGADO',
};

async function loadCertificate() {
  const container = document.getElementById('certificatePlaceholder');
  if (!container) return;
  container.innerHTML = '<p class="muted-text">Carregando…</p>';
  try {
    const data = await apiCall('/api/certificates/my');
    if (data && data.status === 'CERTIFICATE_ISSUED' && data.certificate) {
      renderCertificate(container, data.certificate);
      return;
    }
    if (data && data.status === 'CERTIFICATE_REVOKED') {
      container.innerHTML = `
        <div class="cert-locked-card">
          <h2>CERTIFICADO REVOGADO</h2>
          <p class="muted-text">Este certificado foi revogado e não é mais válido. Procure o administrador.</p>
        </div>`;
      return;
    }
    const a = (data && data.academic) || {};
    const q = (data && data.quiz) || {};
    const p = (data && data.practical) || null;
    const st = (data && data.status) || 'TRAINING_IN_PROGRESS';
    const revoked = (data && data.revoked) || [];
    const done = (d, t) => (d || 0) >= (t || 0) && (t || 0) > 0;
    const badge = (ok, txtOk, txtNo) => `<strong class="${ok ? 'badge-ok' : 'badge-warn'}">${ok ? txtOk : txtNo}</strong>`;
    const li = (v, t) => `${v || 0}/${t || 0}`;
    let banner = '';
    if (st === 'THEORY_APPROVED' || st === 'PRACTICAL_EVALUATION_PENDING') {
      banner = `<div class="cert-progress-row"><span>AVALIAÇÃO TEÓRICA — APROVADO (${q.score}/30)</span></div>
        <p class="muted-text"><strong>Próxima etapa: avaliação prática presencial.</strong> Procure o técnico responsável designado. O certificado continua bloqueado.</p>`;
    } else if (st === 'THEORY_FAILED') {
      banner = `<p class="muted-text"><strong>AVALIAÇÃO TEÓRICA — NÃO APROVADO.</strong> Utilize suas tentativas restantes no Simulado Final.</p>`;
    } else if (st === 'PRACTICAL_NOT_APPROVED') {
      banner = `<p class="muted-text"><strong>A avaliação prática não foi aprovada (NÃO APTO) e o processo de certificação permanece bloqueado.</strong> Fale com o técnico responsável sobre os próximos passos.</p>`;
    } else if (st === 'PRACTICAL_APPROVED' || st === 'READY_FOR_ADMIN_CERTIFICATION') {
      banner = `<p class="muted-text"><strong>✓ Avaliação prática APTO.</strong> Você está apto para certificação. A emissão do certificado será realizada <strong>exclusivamente pelo administrador</strong>.</p>`;
    }
    container.innerHTML = `
      <div class="cert-locked-card">
        <h2>🔒 CERTIFICADO BLOQUEADO</h2>
        <p class="muted-text">Status: <strong>${escHtml(CERT_STATUS_LABEL[st] || st)}</strong> · Aprovação no simulado não gera certificado; a emissão é exclusiva do administrador após avaliação prática APTO.</p>
        ${revoked.length ? `<p class="muted-text">Certificado(s) anterior(es) revogado(s): <strong class="mono">${revoked.map(escHtml).join(', ')}</strong> — complete as etapas para nova emissão.</p>` : ''}
        ${banner}
        <div class="cert-progress-list">
          <div class="cert-progress-row"><span>✓/○ 17/17 módulos</span>${badge(done(a.modules && a.modules.done, a.modules && a.modules.total), '✓', '○')} <strong>${li(a.modules && a.modules.done, a.modules && a.modules.total)}</strong></div>
          <div class="cert-progress-row"><span>17/17 lições</span><strong>${li(a.lessons && a.lessons.done, a.lessons && a.lessons.total)}</strong></div>
          <div class="cert-progress-row"><span>Checkpoints concluídos</span><strong>${li(a.checkpoints && a.checkpoints.done, a.checkpoints && a.checkpoints.total)}</strong></div>
          <div class="cert-progress-row"><span>Simulado realizado (30/30)</span><strong>${li(q.answered, q.total)}</strong></div>
          <div class="cert-progress-row"><span>Avaliação teórica APROVADA (mín. 23/30)</span>${badge(!!q.approved, q.approved ? `✓ ${q.score}/30` : '○', '○ PENDENTE')}</div>
          <div class="cert-progress-row"><span>Avaliação prática (APTO)</span>${badge(!!(p && p.result === 'APTO'), '✓ APTO', p && p.result === 'NAO_APTO' ? '✕ NÃO APTO' : '○ PENDENTE')}</div>
          <div class="cert-progress-row"><span>Emissão administrativa</span>${badge(false, '✓', '○ PENDENTE')}</div>
        </div>
        <div class="cert-actions">
          <button class="btn btn-secondary" onclick="navigateTo('study')">Estudar Cartilha</button>
          <button class="btn btn-primary" onclick="navigateTo('quiz')">Ir para o Simulado</button>
        </div>
      </div>`;
  } catch (error) {
    console.error('Error loading certificate:', error);
    container.innerHTML = `
      <i class="fas fa-certificate"></i>
      <p>Complete o simulado final para obter seu certificado.</p>
    `;
  }
}

function fmtDateBR(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch (e) { return iso; }
}

function renderCertificate(container, c) {
  const pct = (v) => String(v == null ? '' : v).replace('.', ',');
  const th = c.theory || {};
  const pr = c.practical || null;
  const thLabel = `${th.result === 'NÃO APROVADO' ? 'NÃO APROVADO' : 'APROVADO'} — ${escHtml(String(th.score))}/${escHtml(String(th.total))} — ${escHtml(pct(th.percentage))}%`;
  const prLabel = !pr ? '—' : (pr.result === 'NAO_APTO' ? 'NÃO APTO' : 'APTO');
  const infoRow = (ic, k, v, mono) => `<div class="cert-info-row"><span class="ic">${ic}</span><span class="k">${k}</span><span class="v${mono ? ' mono' : ''}">${v}</span></div>`;
  container.innerHTML = `
    <div class="cert-ready-card">
      <h2>🏆 CERTIFICADO DE CONCLUSÃO</h2>
      <p class="muted-text">Código <strong class="mono">${escHtml(c.certificate_number)}</strong> · RESULTADO FINAL: TREINAMENTO CONCLUÍDO${c.exceptional ? ' · <span class="badge-warn">LIBERAÇÃO EXCEPCIONAL DO ADMIN</span>' : ''}</p>
      <div class="cert-actions">
        <button class="btn btn-primary" onclick="document.getElementById('certSheet').scrollIntoView({behavior:'smooth',block:'center'})">VISUALIZAR CERTIFICADO</button>
        <button class="btn btn-secondary" onclick="printCertificate()">GERAR PDF</button>
        <button class="btn btn-secondary" onclick="window.open('${escHtml(c.validation_url)}', '_blank')">VERIFICAR AUTENTICIDADE</button>
      </div>
    </div>
    <div class="cert-sheet" id="certSheet">
      <div class="cert-head">
        <div>
          <div class="cert-brand"><span class="bolt">⚡</span><div><h1>HUB TRAINING</h1><div class="sub">Treinamento Profissional em Infraestrutura Elétrica</div></div></div>
          <div class="cert-areas">MANUTENÇÃO ELÉTRICA • HUBs • SITES • DATA CENTERS</div>
        </div>
        <div class="cert-slogan">CONHECIMENTO TÉCNICO<br>PARA UM FUTURO<br>MAIS SEGURO</div>
      </div>
      <div class="cert-title-row"><div class="cert-medal">🎓</div><h2>CERTIFICADO DE CONCLUSÃO</h2></div>
      <div class="cert-main">
        <div class="cert-left">
          <div class="cert-certify">Certificamos que</div>
          <div class="cert-name">${escHtml(c.participant)}</div>
          <p class="cert-text">concluiu o Treinamento de Manutenção Elétrica — HUBs, Sites e Data Centers, cumprindo as etapas de estudo da cartilha digital, atividades de fixação, avaliação teórica e avaliação prática previstas no programa de treinamento.</p>
          <div><span class="cert-pill">✓ TREINAMENTO CONCLUÍDO</span></div>
          <div class="cert-perf">Avaliação teórica: <strong>${thLabel}</strong></div>
          <div class="cert-perf">Avaliação prática: <strong>${escHtml(prLabel)}</strong>${pr && pr.evaluator_name ? ` — ${escHtml(pr.evaluator_name)}` : ''}</div>
        </div>
        <div class="cert-info">
          ${infoRow('👤', 'Participante', escHtml(c.participant))}
          ${infoRow('📖', 'Treinamento', 'Manutenção Elétrica — HUBs, Sites e Data Centers')}
          ${infoRow('🖥', 'Modalidade', escHtml(c.modality || '—'))}
          ${infoRow('⏱', 'Carga horária', escHtml(c.workload_hours || '—'))}
          ${infoRow('📅', 'Conclusão', escHtml(fmtDateBR(c.completion_date)))}
          ${infoRow('📅', 'Emissão', escHtml(fmtDateBR(c.issue_date)))}
          ${infoRow('✅', 'Resultado final', 'TREINAMENTO CONCLUÍDO')}
          ${infoRow('📊', 'Avaliação teórica', thLabel)}
          ${infoRow('🤝', 'Avaliação prática', escHtml(prLabel))}
          ${infoRow('🔖', 'Código do certificado', escHtml(c.certificate_number), true)}
        </div>
      </div>
      <div class="cert-bottom3">
        <div class="cert-panel syllabus"><div class="cert-panel-tab">CONTEÚDO PROGRAMÁTICO</div><div class="cols"><div id="certSyllL"></div><div id="certSyllR"></div></div></div>
        <div class="cert-panel qr">
          <h4>VERIFICAÇÃO DE AUTENTICIDADE</h4>
          <p>Escaneie o QR Code para verificar este certificado.</p>
          <img alt="QR Code de validação" src="${escHtml(c.qr_data_url || '')}">
          <div class="code">Código: ${escHtml(c.certificate_number)}</div>
          <p>Documento verificável eletronicamente.</p>
        </div>
        <div class="cert-sigs">
          <div class="cert-sig"><div class="sign">${escHtml(c.signer1_name || '')}</div><div class="line">RESPONSÁVEL PELO TREINAMENTO</div><div class="who">${escHtml(c.signer1_name || 'Nome do responsável')}<br>${escHtml(c.signer1_role || 'Cargo / Função')}</div></div>
          <div class="cert-sig"><div class="sign">${escHtml(c.signer2_name || '')}</div><div class="line">RESPONSÁVEL TÉCNICO / ADMINISTRATIVO</div><div class="who">${escHtml(c.signer2_name || 'Nome do responsável')}<br>${escHtml(c.signer2_role || 'Cargo / Função')}</div></div>
        </div>
      </div>
      <div class="cert-foot">
        <span class="info-ic">i</span>
        <span>Documento de conclusão de treinamento profissional interno. Este certificado não constitui diploma, certificado de curso técnico ou certificação oficial reconhecida pelo MEC e não substitui requisitos legais, regulamentares, normativos, treinamentos obrigatórios, autorizações profissionais ou procedimentos corporativos aplicáveis.</span>
        <span class="cert-foot-right"><span class="code">${escHtml(c.certificate_number)}</span><br>Emitido em ${escHtml(fmtDateBR(c.issue_date))}</span>
      </div>
    </div>
    <div class="cert-sheet2" id="certSheet2">
      <h2>HISTÓRICO ACADÊMICO</h2>
      <div class="sub">CONTEÚDO PROGRAMÁTICO E CARGA HORÁRIA</div>
      <div class="cert-hist-info">
        <div><div class="k">Participante</div><div class="v">${escHtml(c.participant)}</div></div>
        <div><div class="k">Treinamento</div><div class="v">Manutenção Elétrica — HUBs, Sites e Data Centers</div></div>
        <div><div class="k">Modalidade</div><div class="v">${escHtml(c.modality || '—')}</div></div>
        <div><div class="k">Data de conclusão</div><div class="v">${escHtml(fmtDateBR(c.completion_date))}</div></div>
        <div><div class="k">Resultado</div><div class="v">TREINAMENTO CONCLUÍDO (Teórica ${escHtml(String(th.score))}/${escHtml(String(th.total))} · Prática ${escHtml(prLabel)})</div></div>
        <div><div class="k">Código do certificado</div><div class="v mono">${escHtml(c.certificate_number)}</div></div>
      </div>
      <table class="cert-hist-table"><thead><tr><th class="num">MÓDULO</th><th>TEMA</th><th class="num">CARGA HORÁRIA</th></tr></thead>
      <tbody id="certHistBody"></tbody></table>
    </div>`;
  // Conteúdo programático (pág. 1) + histórico (pág. 2) a partir do snapshot do certificado
  const wd = Array.isArray(c.workload_detail) ? c.workload_detail.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  const half = Math.ceil(wd.length / 2);
  const col = (arr) => arr.map(m => `<p><strong>M${String(m.order).padStart(2, '0')}</strong> — ${escHtml(m.title)}</p>`).join('') || '<p>—</p>';
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  if (wd.length) {
    set('certSyllL', col(wd.slice(0, half)));
    set('certSyllR', col(wd.slice(half)));
    set('certHistBody', wd.map(m => `<tr><td class="num">M${String(m.order).padStart(2, '0')}</td><td>${escHtml(m.title)}</td><td class="num">${escHtml(m.hours || '—')}</td></tr>`).join('')
      + `<tr class="total"><td class="num">TOTAL</td><td></td><td class="num">${escHtml(c.workload_hours || '—')}</td></tr>`);
  } else {
    // Fallback: títulos ao vivo (antes da emissão com snapshot)
    apiCall('/api/training/modules').then(d => {
      const mods = ((d && d.modules) || []).slice().sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
      const h = Math.ceil(mods.length / 2);
      const cc = (arr) => arr.map(m => `<p><strong>M${String(m.order_num).padStart(2, '0')}</strong> — ${escHtml(m.title)}</p>`).join('');
      set('certSyllL', cc(mods.slice(0, h))); set('certSyllR', cc(mods.slice(h)));
      set('certHistBody', mods.map(m => `<tr><td class="num">M${String(m.order_num).padStart(2, '0')}</td><td>${escHtml(m.title)}</td><td class="num">—</td></tr>`).join(''));
    }).catch(() => {});
  }
}

function doPrint(adminMode) {
  document.body.classList.remove('printing-cert', 'printing-admin');
  document.body.classList.add(adminMode ? 'printing-admin' : 'printing-cert');
  window.print();
}
window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing-cert', 'printing-admin');
});

async function printCertificate() {
  try { await apiCall('/api/certificates/my/downloaded', { method: 'POST' }); }
  catch (e) { /* auditoria best-effort */ }
  doPrint(false);
}

// ADMIN: visualiza e imprime o PDF do certificado de qualquer aluno
async function adminPrintCertificate(id) {
  const wrap = document.getElementById('adminPrintWrap');
  if (!wrap) return;
  wrap.innerHTML = '<p class="muted-text">Carregando certificado…</p>';
  try {
    const d = await apiCall('/api/admin/certificates/' + id + '/preview');
    if (!d || !d.certificate) { alert('Certificado não encontrado.'); return; }
    renderCertificate(wrap, d.certificate);
    setTimeout(() => doPrint(true), 300);
  } catch (e) { alert(e.message || 'Erro ao carregar.'); }
}

// ========================
// ADMIN (visível e acessível somente para ADMIN — RBAC no backend)
// ========================
async function loadAdmin() {
  try {
    const d = await apiCall('/api/admin/dashboard');
    const box = document.getElementById('adminKpis');
    if (d && box) {
      const items = [
        ['Módulos', d.modules], ['Aulas', d.lessons], ['Checkpoints', d.checkpoints],
        ['Tentativas', d.attempts], ['Aprovados', d.passed], ['Não aprovados', d.failed]
      ];
      box.innerHTML = items.map(([k, v]) => `
        <div class="card progress-card">
          <div class="card-content">
            <span class="card-label">${k}</span>
            <span class="card-value">${v}</span>
          </div>
        </div>`).join('');
    }
    queryAttempts();
    queryCertificates();
    queryPipeline();
    loadCertSettings();
    loadModuleWorkload();
  } catch (error) {
    console.error('Error loading admin:', error);
  }
}

async function queryAttempts() {
  const wrap = document.getElementById('adminTableWrap');
  document.getElementById('adminDetail').innerHTML = '';
  try {
    const u = document.getElementById('admUser').value;
    const rs = document.getElementById('admResult').value;
    let qs = '?user=' + encodeURIComponent(u);
    if (rs === 'APROVADO') qs += '&result=APROVADO';
    if (rs === 'NAO_APROVADO') qs += '&result=NAO_APROVADO';
    const x = await apiCall('/api/admin/attempts' + qs);
    const list = (x && x.attempts) || [];
    wrap.innerHTML = list.length
      ? `<table class="admin-table"><thead><tr><th>Profissional</th><th>Data</th><th>Score</th><th>Acertos</th><th>Erros</th><th>Resultado</th><th></th></tr></thead><tbody>` +
        list.map(a => `<tr>
          <td>${escHtml(a.user_name)}<br><span class="muted-text">${escHtml(a.user_email || '')}</span></td>
          <td>${escHtml(a.date || '—')}</td><td>${a.score}/${a.total}</td><td>${a.correct}</td><td>${a.wrong}</td>
          <td><span class="${a.result === 'APROVADO' ? 'badge-ok' : 'badge-warn'}">${a.result}</span></td>
          <td><button class="btn btn-secondary" onclick="viewAttempt(${a.id})">Ver análise</button></td>
        </tr>`).join('') + `</tbody></table>`
      : '<p class="muted-text">Nenhuma tentativa encontrada.</p>';
  } catch (error) {
    console.error('Error querying attempts:', error);
    wrap.innerHTML = '<p class="muted-text">Acesso negado ou erro na consulta.</p>';
  }
}

async function viewAttempt(id) {
  try {
    const dd = await apiCall('/api/admin/attempt/' + id);
    if (!dd || !dd.attempt) return;
    const rows = (dd.answers || []).map((a, i) => `<tr>
      <td>${i + 1}</td><td>${escHtml(a.question_text)}<br><span class="muted-text">${escHtml(a.category || '')}</span></td>
      <td>${escHtml(a.given_text || '—')}</td><td>${escHtml(a.correct_text || '—')}</td>
      <td>${a.is_correct ? '<span class="badge-ok">✓</span>' : '<span class="badge-warn">✕</span>'}</td>
    </tr>`).join('');
    document.getElementById('adminDetail').innerHTML = `
      <h3 style="margin:16px 0 8px">Análise — ${escHtml(dd.attempt.user)} (${dd.attempt.score} acertos · ${dd.attempt.result})</h3>
      <div class="table-wrap"><table class="admin-table"><thead><tr><th>#</th><th>Questão</th><th>Resposta do profissional</th><th>Resposta correta</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    document.getElementById('adminDetail').scrollIntoView();
  } catch (error) {
    console.error('Error loading attempt:', error);
  }
}

// ========================
// ADMIN — CERTIFICAÇÕES (pipeline + emissão exclusiva)
// ========================
const PIPE_STATUS_LABEL = {
  TRAINING_IN_PROGRESS: 'EM ANDAMENTO', THEORY_NOT_COMPLETED: 'EM ANDAMENTO',
  THEORY_FAILED: 'TEORIA NÃO APROVADO', THEORY_APPROVED: 'TEORIA APROVADO',
  PRACTICAL_EVALUATION_PENDING: 'AGUARD. PRÁTICA', PRACTICAL_NOT_APPROVED: 'PRÁTICA NÃO APTO',
  PRACTICAL_APPROVED: 'PRÁTICA APTO', READY_FOR_ADMIN_CERTIFICATION: 'PRONTO PARA EMISSÃO',
  CERTIFICATE_ISSUED: 'EMITIDO', CERTIFICATE_REVOKED: 'REVOGADO',
};
let issueTarget = null;

async function queryPipeline() {
  const wrap = document.getElementById('pipeTableWrap');
  if (!wrap) return;
  try {
    const p = new URLSearchParams();
    const n = (document.getElementById('pipeName') || {}).value || '';
    const s = (document.getElementById('pipeStatus') || {}).value || '';
    if (n) p.set('name', n);
    if (s) p.set('status', s);
    const x = await apiCall('/api/admin/certification-pipeline?' + p.toString());
    const list = (x && x.pipeline) || [];
    wrap.innerHTML = list.length
      ? `<table class="admin-table"><thead><tr><th>PROFISSIONAL</th><th>MÓDULOS</th><th>AVALIAÇÃO TEÓRICA</th><th>AVALIAÇÃO PRÁTICA</th><th>STATUS</th><th>DATA</th><th>AÇÃO</th></tr></thead><tbody>` +
        list.map(r => `<tr>
          <td>${escHtml(r.user_name)}${r.certificate_number ? `<br><span class="mono muted-text">${escHtml(r.certificate_number)}</span>` : ''}${(!r.certificate_number && r.revoked && r.revoked.length) ? `<br><span class="muted-text">revogado: ${r.revoked.map(escHtml).join(', ')}</span>` : ''}</td>
          <td>${r.lessons.done}/${r.lessons.total}</td>
          <td>${r.theory ? `${r.theory.score}/30 — APROVADO` : '<span class="badge-warn">PENDENTE</span>'}</td>
          <td>${r.practical ? (r.practical.result === 'APTO' ? `<span class="badge-ok">APTO</span><br><span class="muted-text">${escHtml(r.practical.evaluator_name || '')}</span>` : '<span class="badge-warn">NÃO APTO</span>') : '<span class="badge-warn">PENDENTE</span>'}</td>
          <td><span class="${r.status === 'CERTIFICATE_ISSUED' ? 'badge-ok' : r.status === 'READY_FOR_ADMIN_CERTIFICATION' ? 'badge-ok' : 'badge-warn'}">${escHtml(PIPE_STATUS_LABEL[r.status] || r.status)}</span></td>
          <td>${escHtml(r.date ? fmtDateBR(r.date) : '—')}</td>
          <td style="white-space:nowrap"><button class="btn btn-secondary" onclick="manageUser(${r.user_id})">Gerenciar</button>
          ${r.status === 'READY_FOR_ADMIN_CERTIFICATION' ? ` <button class="btn btn-primary" onclick='openIssueModal(${r.user_id}, ${JSON.stringify(r.user_name)})'>EMITIR CERTIFICADO</button>` : ''}</td>
        </tr>`).join('') + `</tbody></table>`
      : '<p class="muted-text">Nenhum profissional encontrado.</p>';
  } catch (e) {
    console.error(e);
    wrap.innerHTML = '<p class="muted-text">Erro na consulta.</p>';
  }
}

async function openIssueModal(userId, userName) {
  issueTarget = userId;
  const body = document.getElementById('issueModalBody');
  body.innerHTML = '<p class="muted-text">Carregando dados…</p>';
  document.getElementById('issueModal').classList.add('active');
  try {
    const x = await apiCall('/api/admin/certification-pipeline?name=' + encodeURIComponent(userName));
    const r = ((x && x.pipeline) || [])[0];
    if (!r) { body.innerHTML = '<p>Profissional não está pronto.</p>'; return; }
    body.innerHTML = `
      <p><strong>CONFIRMAR EMISSÃO DO CERTIFICADO</strong></p>
      <div class="cert-progress-list">
        <div class="cert-progress-row"><span>Participante</span><strong>${escHtml(r.user_name)}</strong></div>
        <div class="cert-progress-row"><span>Treinamento</span><strong>Manutenção Elétrica — HUBs, Sites e Data Centers</strong></div>
        <div class="cert-progress-row"><span>Avaliação teórica</span><strong>${r.theory.score}/30 — ${Math.round(r.theory.score / 30 * 1000) / 10}% — APROVADO</strong></div>
        <div class="cert-progress-row"><span>Avaliação prática</span><strong>${r.practical.result}</strong></div>
        <div class="cert-progress-row"><span>Técnico responsável</span><strong>${escHtml(r.practical.evaluator_name || '—')}</strong></div>
        <div class="cert-progress-row"><span>Data da avaliação prática</span><strong>${escHtml(fmtDateBR(r.practical.evaluation_date))}</strong></div>
        <div class="cert-progress-row"><span>Status</span><strong>PRONTO PARA CERTIFICAÇÃO</strong></div>
      </div>
      <p class="muted-text">Após a confirmação, o sistema emitirá um certificado com código único e registro eletrônico.</p>`;
  } catch (e) { body.innerHTML = '<p>Erro ao carregar.</p>'; }
}

function closeIssueModal() {
  issueTarget = null;
  document.getElementById('issueModal').classList.remove('active');
}

let manageTarget = null;

async function manageUser(userId) {
  manageTarget = userId;
  const box = document.getElementById('pipeDetail');
  box.innerHTML = '<p class="muted-text">Carregando…</p>';
  box.scrollIntoView();
  try {
    const [mods, prog, pract] = await Promise.all([
      apiCall('/api/training/modules'),
      apiCall(`/api/progress/user/${userId}`),
      apiCall(`/api/practical/user/${userId}`).catch(() => null),
    ]);
    const doneSet = new Set(((prog && prog.progress) || []).filter(p => p.status === 'COMPLETED').map(p => p.lesson_id));
    // lições com módulo de origem
    const lessonsByModule = [];
    for (const m of ((mods && mods.modules) || [])) {
      try {
        const md = await apiCall(`/api/training/module/${m.id}`);
        for (const l of ((md && md.lessons) || [])) lessonsByModule.push({ module: m.title, id: l.id, title: l.title });
      } catch (e) { /* noop */ }
    }
    const ev = pract && pract.evaluation;
    box.innerHTML = `
      <h3 style="margin:16px 0 8px">Gerenciar — progresso e certificação (user #${userId})</h3>
      <div class="cert-progress-list" id="manageLessons">
        ${lessonsByModule.map(l => `<label class="cert-progress-row"><span><input type="checkbox" data-lesson-toggle="${l.id}" ${doneSet.has(l.id) ? 'checked' : ''}> ${escHtml(l.title)}</span><span class="muted-text">${escHtml(l.module)}</span></label>`).join('')}
      </div>
      <div class="cert-actions"><button class="btn btn-primary" onclick="saveManagedLessons()">Salvar cartilha</button>
      <button class="btn btn-secondary" onclick="markManagedCheckpoints()">Marcar checkpoints verificados</button></div>
      <p class="muted-text">Pré-requisito da liberação excepcional: cartilha 17/17 <strong>e</strong> checkpoints (use os dois botões acima).</p>
      <h3 style="margin:16px 0 8px">Avaliação prática (como ADMIN)</h3>
      <div class="admin-filters" style="flex-direction:column;align-items:stretch">
        <label>Data <input type="date" id="mngDate" value="${escHtml((ev && ev.evaluation_date) || new Date().toISOString().slice(0, 10))}"></label>
        <label>Resultado <select id="mngResult">
          <option value="APTO" ${ev && ev.result === 'APTO' ? 'selected' : ''}>APTO</option>
          <option value="NAO_APTO" ${ev && ev.result === 'NAO_APTO' ? 'selected' : ''}>NÃO APTO</option>
        </select></label>
        <label>Observações <textarea id="mngObs" rows="2">${escHtml((ev && ev.observations) || '')}</textarea></label>
        <div class="cert-actions"><button class="btn btn-primary" onclick="saveManagedPractical()">Salvar avaliação prática</button></div>
      </div>
      <h3 style="margin:16px 0 8px">Emissão</h3>
      <div class="cert-actions">
        <button class="btn btn-primary" onclick="queryPipeline().then(() => openIssueModalRefresh(${userId}))">Emitir (se pronto)</button>
        <button class="btn btn-secondary" onclick="openForceModal()">Liberar excepcional</button>
        <button class="btn btn-secondary" onclick="resetManagedAttempts()">Zerar tentativas do simulado</button>
      </div>
      <div id="forceBox" hidden>
        <label>Justificativa da liberação excepcional (mín. 10 caracteres — fica na auditoria)<textarea id="forceReason" rows="3"></textarea></label>
        <div class="cert-actions"><button class="btn btn-primary" onclick="confirmForce()">CONFIRMAR LIBERAÇÃO</button></div>
      </div>`;
  } catch (e) {
    box.innerHTML = '<p class="muted-text">Erro ao carregar.</p>';
  }
}

async function openIssueModalRefresh(userId) {
  const x = await apiCall('/api/admin/certification-pipeline');
  const r = ((x && x.pipeline) || []).find(p => p.user_id === userId);
  if (r && r.status === 'READY_FOR_ADMIN_CERTIFICATION') openIssueModal(userId, r.user_name);
  else alert('Profissional ainda não está PRONTO PARA CERTIFICAÇÃO. Use a liberação excepcional com justificativa.');
}

async function saveManagedLessons() {
  if (!manageTarget) return;
  const boxes = Array.from(document.querySelectorAll('[data-lesson-toggle]'));
  try {
    for (const b of boxes) {
      await apiCall('/api/progress', {
        method: 'POST',
        body: JSON.stringify({ user_id: manageTarget, lesson_id: Number(b.dataset.lessonToggle), status: b.checked ? 'COMPLETED' : 'IN_PROGRESS', progress: b.checked ? 100 : 0 }),
      });
    }
    alert('Cartilha atualizada.');
    queryPipeline();
  } catch (e) { alert(e.message || 'Erro ao salvar.'); }
}

async function saveManagedPractical() {
  if (!manageTarget) return;
  try {
    await apiCall('/api/practical', {
      method: 'POST',
      body: JSON.stringify({
        user_id: manageTarget,
        evaluation_date: document.getElementById('mngDate').value,
        result: document.getElementById('mngResult').value,
        observations: document.getElementById('mngObs').value,
      }),
    });
    alert('Avaliação prática salva.');
    queryPipeline();
  } catch (e) { alert(e.message || 'Erro ao salvar.'); }
}

async function markManagedCheckpoints() {
  if (!manageTarget) return;
  if (!confirm('Marcar todos os checkpoints deste profissional como verificados pelo ADMIN?')) return;
  try {
    const r = await apiCall('/api/admin/checkpoints/complete', { method: 'POST', body: JSON.stringify({ user_id: manageTarget }) });
    alert(`Checkpoints verificados: ${(r && r.completed) || 0} registrado(s).`);
    queryPipeline();
  } catch (e) { alert(e.message || 'Erro ao marcar.'); }
}

async function resetManagedAttempts() {
  if (!manageTarget) return;
  if (!confirm('Zerar TODAS as tentativas do simulado deste profissional? Ele poderá refazer a prova (auditoria registra).')) return;
  try {
    const r = await apiCall(`/api/admin/users/${manageTarget}/reset-attempts`, { method: 'POST' });
    alert(`Tentativas zeradas: ${(r && r.deleted) || 0}.`);
    queryPipeline();
  } catch (e) { alert(e.message || 'Erro.'); }
}

function openForceModal() {
  const f = document.getElementById('forceBox');
  if (f) { f.hidden = false; f.scrollIntoView(); }
}

async function confirmForce() {
  if (!manageTarget) return;
  const reason = (document.getElementById('forceReason') || {}).value || '';
  if (reason.trim().length < 10) { alert('Justificativa com mín. 10 caracteres.'); return; }
  if (!confirm('Confirmar LIBERAÇÃO EXCEPCIONAL? Ficará registrada na auditoria com sua justificativa.')) return;
  try {
    const r = await apiCall('/api/admin/certificates/issue', { method: 'POST', body: JSON.stringify({ user_id: manageTarget, force: true, reason }) });
    alert(`Certificado liberado: ${(r && r.certificate && r.certificate.certificate_number) || ''}`);
    queryPipeline();
    queryCertificates();
    manageUser(manageTarget);
  } catch (e) { alert(e.message || 'Erro ao liberar.'); }
}

async function confirmIssue() {
  if (!issueTarget) return;
  try {
    const r = await apiCall('/api/admin/certificates/issue', { method: 'POST', body: JSON.stringify({ user_id: issueTarget }) });
    closeIssueModal();
    alert(`Certificado emitido: ${(r && r.certificate && r.certificate.certificate_number) || ''}`);
    queryPipeline();
    queryCertificates();
  } catch (e) { alert(e.message || 'Erro ao emitir.'); }
}

async function loadModuleWorkload() {
  const wrap = document.getElementById('moduleHoursWrap');
  if (!wrap) return;
  try {
    const d = await apiCall('/api/admin/module-workload');
    const mods = (d && d.modules) || [];
    wrap.innerHTML = mods.map(m => `
      <label style="display:flex;gap:8px;align-items:center;margin:4px 0">
        <span style="min-width:280px">M${String(m.order_num).padStart(2, '0')} — ${escHtml(m.title)}</span>
        <input type="text" data-module-hours="${m.id}" value="${escHtml(m.hours || '')}" placeholder="Ex.: 2 horas" style="max-width:140px">
      </label>`).join('') || '<p class="muted-text">Sem módulos.</p>';
  } catch (e) { wrap.innerHTML = '<p class="muted-text">Erro ao carregar.</p>'; }
}

async function saveModuleWorkload() {
  const hours = {};
  document.querySelectorAll('[data-module-hours]').forEach(el => { hours[el.dataset.moduleHours] = el.value; });
  try {
    await apiCall('/api/admin/module-workload', { method: 'PUT', body: JSON.stringify({ hours }) });
    alert('Carga horária por módulo salva.');
  } catch (e) { alert('Erro ao salvar.'); }
}

// ========================
// ADMIN — CERTIFICADOS
// ========================
async function queryCertificates() {
  const wrap = document.getElementById('certTableWrap');
  if (!wrap) return;
  const det = document.getElementById('certDetail');
  if (det) det.innerHTML = '';
  try {
    const p = new URLSearchParams();
    const v = (id) => (document.getElementById(id) || {}).value || '';
    if (v('certName')) p.set('name', v('certName'));
    if (v('certCode')) p.set('code', v('certCode'));
    if (v('certFrom')) p.set('from', v('certFrom'));
    if (v('certTo')) p.set('to', v('certTo'));
    if (v('certStatus')) p.set('status', v('certStatus'));
    const x = await apiCall('/api/admin/certificates?' + p.toString());
    const list = (x && x.certificates) || [];
    wrap.innerHTML = list.length
      ? `<table class="admin-table"><thead><tr><th>Código</th><th>Profissional</th><th>Data</th><th>Resultado</th><th>Status</th><th></th></tr></thead><tbody>` +
        list.map(c => `<tr>
          <td class="mono">${escHtml(c.certificate_number)}</td>
          <td>${escHtml(c.user_name)}</td>
          <td>${escHtml(fmtDateBR(c.issue_date))}</td>
          <td>${escHtml(c.result)} (${c.score}/${c.total})</td>
          <td><span class="${c.status === 'VALID' ? 'badge-ok' : 'badge-warn'}">${c.status === 'VALID' ? 'VÁLIDO' : 'REVOGADO'}</span></td>
          <td style="white-space:nowrap">
            <button class="btn btn-secondary" onclick="viewCertificate(${c.id})">Visualizar</button>
            <button class="btn btn-secondary" onclick="adminPrintCertificate(${c.id})">PDF</button>
            <button class="btn btn-secondary" onclick="window.open('/validar/${escHtml(c.certificate_number)}', '_blank')">Verificar</button>
            ${c.status === 'VALID' ? `<button class="btn btn-secondary" onclick="revokeCertificate(${c.id})">Revogar</button>` : ''}
          </td>
        </tr>`).join('') + `</tbody></table>`
      : '<p class="muted-text">Nenhum certificado encontrado.</p>';
  } catch (error) {
    console.error('Error querying certificates:', error);
    wrap.innerHTML = '<p class="muted-text">Acesso negado ou erro na consulta.</p>';
  }
}

async function viewCertificate(id) {
  try {
    const d = await apiCall('/api/admin/certificates/' + id);
    const c = d && d.certificate;
    if (!c) return;
    document.getElementById('certDetail').innerHTML = `
      <h3 style="margin:16px 0 8px">Certificado ${escHtml(c.certificate_number)} — ${escHtml(c.user_name || '')}</h3>
      <div class="cert-progress-list">
        <div class="cert-progress-row"><span>Treinamento</span><strong>${escHtml(c.training_name)}</strong></div>
        <div class="cert-progress-row"><span>Resultado</span><strong>${c.score}/${c.total} (${escHtml(String(c.percentage)).replace('.', ',')}%)</strong></div>
        <div class="cert-progress-row"><span>Conclusão / Emissão</span><strong>${escHtml(fmtDateBR(c.completion_date))} / ${escHtml(fmtDateBR(c.issue_date))}</strong></div>
        <div class="cert-progress-row"><span>Status</span><strong>${escHtml(c.status)}</strong></div>
        <div class="cert-progress-row"><span>Validar</span><strong><a href="/validar/${escHtml(c.certificate_number)}" target="_blank">/validar/${escHtml(c.certificate_number)}</a></strong></div>
      </div>`;
    document.getElementById('certDetail').scrollIntoView();
  } catch (error) { console.error('Error viewing certificate:', error); }
}

async function revokeCertificate(id) {
  if (!confirm('Revogar este certificado? Ele passará a constar como REVOGADO na validação pública.')) return;
  try {
    await apiCall('/api/admin/certificates/' + id + '/revoke', { method: 'POST' });
    alert('Certificado revogado.');
    queryCertificates();
  } catch (error) { alert('Erro ao revogar.'); }
}

async function loadCertSettings() {
  try {
    const d = await apiCall('/api/admin/certificate-settings');
    const s = (d && d.settings) || {};
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    set('cfgWorkload', s.workload_hours); set('cfgModality', s.modality);
    set('cfgS1n', s.signer1_name); set('cfgS1r', s.signer1_role);
    set('cfgS2n', s.signer2_name); set('cfgS2r', s.signer2_role);
  } catch (error) { console.error('Error loading cert settings:', error); }
}

async function saveCertSettings() {
  const v = (id) => (document.getElementById(id) || {}).value || '';
  try {
    await apiCall('/api/admin/certificate-settings', {
      method: 'PUT',
      body: JSON.stringify({
        workload_hours: v('cfgWorkload'), modality: v('cfgModality'),
        signer1_name: v('cfgS1n'), signer1_role: v('cfgS1r'),
        signer2_name: v('cfgS2n'), signer2_role: v('cfgS2r'),
      }),
    });
    alert('Configurações salvas. Valem para os próximos certificados emitidos.');
  } catch (error) { alert('Erro ao salvar.'); }
}

// ========================
// AVALIAÇÃO PRÁTICA (TECHNICAL_EVALUATOR + ADMIN; RBAC real no backend)
// ========================
const PRACTICAL_CRITERIA_LABELS = {
  infra_understanding: 'Compreensão da infraestrutura elétrica',
  equipment_identification: 'Identificação dos principais equipamentos',
  energy_path: 'Compreensão do caminho da energia',
  panels_systems: 'Identificação dos quadros e sistemas',
  measurements_understanding: 'Compreensão das medições elétricas',
  instruments_use: 'Utilização adequada dos instrumentos apresentados',
  abnormality_identification: 'Identificação de anormalidades',
  procedures_understanding: 'Compreensão dos procedimentos apresentados',
  safety_attention: 'Atenção aos procedimentos de segurança',
  follow_guidance: 'Capacidade de seguir procedimentos e orientações',
};
let practicalTarget = null;

async function loadPractical() {
  if (!currentUser || !['TECHNICAL_EVALUATOR', 'ADMIN'].includes(currentUser.role)) {
    document.getElementById('practicalPendingWrap').innerHTML = '<p class="muted-text">Acesso restrito ao avaliador técnico e ao administrador.</p>';
    const aw = document.getElementById('practicalAllWrap');
    if (aw) aw.innerHTML = '';
    document.getElementById('practicalMineWrap').innerHTML = '';
    return;
  }
  document.getElementById('pevCriteria').innerHTML = '<strong>ASPECTOS OBSERVADOS</strong><br>' + Object.keys(PRACTICAL_CRITERIA_LABELS).map(k =>
    `<label><input type="checkbox" name="pevCrit" value="${escHtml(k)}"> ${escHtml(PRACTICAL_CRITERIA_LABELS[k])}</label>`).join('<br>');
  try {
    const d = await apiCall('/api/practical/pending');
    const list = (d && d.pending) || [];
    const crit = (d && d.criteria) || Object.keys(PRACTICAL_CRITERIA_LABELS);
    document.getElementById('pevCriteria').innerHTML = '<strong>ASPECTOS OBSERVADOS</strong><br>' + crit.map(k =>
      `<label><input type="checkbox" name="pevCrit" value="${escHtml(k)}"> ${escHtml(PRACTICAL_CRITERIA_LABELS[k] || k)}</label>`).join('<br>');
    document.getElementById('practicalPendingWrap').innerHTML = list.length
      ? `<table class="admin-table"><thead><tr><th>Profissional</th><th>Módulos</th><th>Teórica</th><th>Prática</th><th></th></tr></thead><tbody>` +
        list.map(p => `<tr>
          <td>${escHtml(p.user_name)}</td>
          <td>${p.lessons.done}/${p.lessons.total}</td>
          <td>${p.theory.score}/30 APROVADO</td>
          <td>${p.practical === 'NAO_APTO' ? '<span class="badge-warn">NÃO APTO (reavaliar)</span>' : '<span class="badge-warn">PENDENTE</span>'}</td>
          <td><button class="btn btn-secondary" onclick="openPracticalForm(${p.user_id}, '${escHtml(p.user_name).replace(/'/g, "\\'")}')">Avaliar</button></td>
        </tr>`).join('') + `</tbody></table>`
      : '<p class="muted-text">Nenhum profissional aguardando avaliação (ninguém com teoria aprovada e sem APTO no momento).</p>';
  } catch (e) {
    document.getElementById('practicalPendingWrap').innerHTML = '<p class="muted-text">Erro ao carregar.</p>';
  }
  try {
    const o = await apiCall('/api/practical/overview');
    const all = (o && o.professionals) || [];
    const wrapAll = document.getElementById('practicalAllWrap');
    if (wrapAll) {
      wrapAll.innerHTML = all.length
        ? `<table class="admin-table"><thead><tr><th>Profissional</th><th>Cartilha</th><th>Teórica</th><th>Prática</th><th></th></tr></thead><tbody>` +
          all.map(p => `<tr>
            <td>${escHtml(p.user_name)}</td>
            <td>${p.lessons.done}/${p.lessons.total}</td>
            <td>${p.theory ? `${p.theory.score}/30 APROVADO` : '<span class="badge-warn">PENDENTE</span>'}</td>
            <td>${p.practical ? (p.practical.result === 'APTO' ? '<span class="badge-ok">APTO</span>' : '<span class="badge-warn">NÃO APTO</span>') : '<span class="badge-warn">—</span>'}</td>
            <td><button class="btn btn-secondary" onclick="openPracticalForm(${p.user_id}, '${escHtml(p.user_name).replace(/'/g, "\\'")}')">${p.practical ? 'Reavaliar' : 'Avaliar'}</button></td>
          </tr>`).join('') + `</tbody></table>`
        : '<p class="muted-text">Nenhum profissional cadastrado.</p>';
    }
  } catch (e) { /* noop */ }
  try {
    const m = await apiCall('/api/practical/mine');
    const rows = (m && m.evaluations) || [];
    document.getElementById('practicalMineWrap').innerHTML = rows.length
      ? `<table class="admin-table"><thead><tr><th>Profissional</th><th>Data</th><th>Resultado</th></tr></thead><tbody>` +
        rows.map(r => `<tr><td>${escHtml(r.user_name || '')}</td><td>${escHtml(fmtDateBR(r.evaluation_date))}</td><td>${r.result === 'APTO' ? '<span class="badge-ok">APTO</span>' : '<span class="badge-warn">NÃO APTO</span>'}</td></tr>`).join('') + `</tbody></table>`
      : '<p class="muted-text">Nenhuma avaliação registrada.</p>';
  } catch (e) { /* noop */ }
}

function openPracticalForm(userId, userName) {
  practicalTarget = userId;
  document.getElementById('practicalUserName').textContent = userName;
  document.getElementById('pevDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('practicalFormCard').hidden = false;
  document.getElementById('practicalFormCard').scrollIntoView();
}

function closePracticalForm() {
  practicalTarget = null;
  document.getElementById('practicalFormCard').hidden = true;
}

async function submitPractical() {
  if (!practicalTarget) return;
  const date = document.getElementById('pevDate').value;
  const title = document.getElementById('pevTitle').value;
  const resEl = document.querySelector('input[name=pevResult]:checked');
  const obs = document.getElementById('pevObs').value;
  const crit = Array.from(document.querySelectorAll('input[name=pevCrit]:checked')).map(c => c.value);
  if (!resEl) { alert('Selecione APTO ou NÃO APTO.'); return; }
  try {
    await apiCall('/api/practical', {
      method: 'POST',
      body: JSON.stringify({ user_id: practicalTarget, evaluation_date: date, result: resEl.value, observations: obs, criteria: crit, evaluator_title: title }),
    });
    alert(`Avaliação ${resEl.value === 'APTO' ? 'APTO' : 'NÃO APTO'} registrada.`);
    closePracticalForm();
    loadPractical();
  } catch (e) { alert(e.message || 'Erro ao registrar.'); }
}

// ========================
// SEARCH
// ========================
function filterModules() {
  const searchTerm = document.getElementById('moduleSearch').value.toLowerCase();
  const moduleCards = document.querySelectorAll('.module-card');
  
  moduleCards.forEach(card => {
    const title = card.querySelector('.module-title').textContent.toLowerCase();
    if (title.includes(searchTerm)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// ========================
// SIDEBAR (recolher no desktop / abrir no mobile)
// ========================
function toggleSidebar() {
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  try { localStorage.setItem('hub_sidebar_collapsed', collapsed ? '1' : '0'); } catch (e) { /* noop */ }
}

function toggleMobileSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

function restoreSidebar() {
  try {
    if (localStorage.getItem('hub_sidebar_collapsed') === '1') {
      document.body.classList.add('sidebar-collapsed');
    }
  } catch (e) { /* noop */ }
  // No mobile, fechar o menu ao navegar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 900) document.querySelector('.sidebar').classList.remove('open');
    });
  });
}

// ========================
// INITIALIZATION
// ========================
document.addEventListener('DOMContentLoaded', () => {
  restoreSidebar();
  if (checkAuth()) {
    initNavigation();
    updateBreadcrumb(['Início']);
    loadDashboardData();
  }
});
