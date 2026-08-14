function readSaved(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}
const legacyUser = readSaved("gj_user");
const savedUser = readSaved("gj_client_account") || legacyUser;
const savedProvider =
  readSaved("gj_provider_account") || readSaved("gj_provider");
const savedRole = localStorage.getItem("gj_last_role") || "client";
const clientLoggedIn = readSaved("gj_client_logged_in", Boolean(legacyUser));
const providerLoggedIn = readSaved(
  "gj_provider_logged_in",
  savedRole === "provider" && Boolean(savedProvider),
);
const initialState = {
  screen:
    savedRole === "provider" && savedProvider && providerLoggedIn
      ? "providerDashboard"
      : "home",
  user: clientLoggedIn ? savedUser : null,
  clientAccount: savedUser,
  clientLoggedIn,
  provider: savedProvider,
  providerLoggedIn,
  lastRole: savedRole,
  providerOnline: false,
  providerJob: null,
  request: null,
  rating: 0,
  history: JSON.parse(localStorage.getItem("gj_history") || "[]"),
};
let state = { ...initialState };
let locationRequestInProgress = false;
let currentLocationMap = null;
let currentLocationMarker = null;
let currentAccuracyCircle = null;
const problems = [
  ["pane", "Pneu furado"],
  ["motor", "Pane mecânica"],
  ["bateria", "Bateria"],
  ["acidente", "Acidente"],
  ["outro", "Outro"],
];
const vehicles = [
  ["carro", "🚗", "Carro"],
  ["moto", "🏍️", "Moto"],
  ["utilitario", "🚐", "Utilitário"],
];
const serviceAreas = [
  "São Paulo — Centro",
  "São Paulo — Zona Sul",
  "São Paulo — Extremo Sul",
  "São Paulo — Zona Leste",
  "São Paulo — Extremo Leste",
  "São Paulo — Zona Norte",
  "São Paulo — Extremo Norte",
  "São Paulo — Zona Oeste",
  "São Paulo — Extremo Oeste",
  "ABC — Santo André",
  "ABC — São Bernardo do Campo",
  "ABC — São Caetano do Sul",
  "ABC — Diadema",
  "ABC — Mauá",
  "ABC — Ribeirão Pires",
  "ABC — Rio Grande da Serra",
];
const icons = {
  pane: "🔧",
  motor: "⚙️",
  bateria: "🔋",
  acidente: "⚠️",
  outro: "•••",
};
function money(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function save() {
  try {
    localStorage.setItem("gj_user", JSON.stringify(state.user));
    localStorage.setItem(
      "gj_client_account",
      JSON.stringify(state.clientAccount),
    );
    localStorage.setItem(
      "gj_client_logged_in",
      JSON.stringify(state.clientLoggedIn),
    );
    localStorage.setItem("gj_provider", JSON.stringify(state.provider));
    localStorage.setItem("gj_provider_account", JSON.stringify(state.provider));
    localStorage.setItem(
      "gj_provider_logged_in",
      JSON.stringify(state.providerLoggedIn),
    );
    localStorage.setItem("gj_history", JSON.stringify(state.history));
    localStorage.setItem("gj_last_role", state.lastRole || "client");
    localStorage.setItem("gj_saved_at", new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}
function header(title = "GuincheJá", back = false) {
  return `<header class="topbar">${back ? `<button class="back" data-go="home">‹</button>` : "<div></div>"}<div class="logo">${title === "GuincheJá" ? "GUINCHE<span>JÁ</span>" : title}</div><button class="icon-btn" data-go="profile">👤</button></header>`;
}
function nav(active = "home") {
  return `<nav class="bottom-nav"><button class="nav-item ${active === "home" ? "active" : ""}" data-go="home"><b>⌂</b>Início</button><button class="nav-item ${active === "history" ? "active" : ""}" data-go="history"><b>☷</b>Chamados</button><button class="nav-item ${active === "profile" ? "active" : ""}" data-go="profile"><b>♙</b>Perfil</button></nav>`;
}
function home() {
  const name = state.user?.name?.split(" ")[0];
  return `${header()}<main class="content"><section class="hero"><div class="eyebrow">Atendimento 24 horas</div><div class="truck">🚛</div><h1>${name ? `Olá, ${name}.<br>` : ""}Imprevisto na estrada?</h1><p>Encontre um guincho próximo, acompanhe a chegada e saiba o preço antes de confirmar.</p><button class="btn primary" data-go="request">SOLICITAR GUINCHO</button></section><section class="card"><h2 class="section-title">Como funciona</h2><div class="summary-row"><span>📍 Informe sua localização</span><b>1</b></div><div class="summary-row"><span>🚛 Encontramos um parceiro</span><b>2</b></div><div class="summary-row"><span>✅ Acompanhe o atendimento</span><b>3</b></div></section><section class="card"><strong>Segurança em primeiro lugar</strong><p class="muted">Profissionais identificados, avaliação e dados do veículo antes da chegada.</p></section></main>${nav("home")}`;
}
function coverage() {
  const capital = serviceAreas.filter((x) => x.startsWith("São Paulo"));
  const abc = serviceAreas.filter((x) => x.startsWith("ABC"));
  return `${header("Área de atendimento", true)}<main class="content"><section class="coverage-hero"><b>📍 SÃO PAULO E GRANDE ABC</b><h1>Cobertura inicial</h1><p>Atendimento disponível nas regiões abaixo durante a fase de lançamento.</p></section><h2 class="section-title">Capital de São Paulo</h2><div class="area-grid">${capital.map((x) => `<div class="area-chip"><span>✓</span>${x.replace("São Paulo — ", "")}</div>`).join("")}</div><h2 class="section-title coverage-title">Grande ABC</h2><div class="area-grid">${abc.map((x) => `<div class="area-chip"><span>✓</span>${x.replace("ABC — ", "")}</div>`).join("")}</div><section class="security-note coverage-note"><b>Busca inteligente</b><span>O chamado começa pelos guincheiros da região selecionada e aumenta para áreas vizinhas quando necessário.</span></section><button class="btn primary" data-go="request">SOLICITAR GUINCHO NESTA ÁREA</button></main>`;
}
function profile() {
  if (!state.user) return state.clientAccount ? clientLogin() : signup();
  return `${header("Meu perfil", true)}<main class="content"><section class="card"><div class="driver"><div class="avatar">${state.user.name[0].toUpperCase()}</div><div class="driver-info"><strong>${state.user.name}</strong><span class="muted">${state.user.phone}</span></div><span class="badge">${state.user.verified ? "VERIFICADO" : "PENDENTE"}</span></div></section><section class="card"><div class="summary-row"><span>E-mail</span><b>${state.user.email}</b></div><div class="summary-row"><span>Veículo</span><b>${state.user.vehicle || "Não informado"}</b></div></section><button class="btn primary" data-go="clientVerification">VERIFICAR IDENTIDADE</button><button class="btn secondary login-link" data-go="payments">FORMAS DE PAGAMENTO</button><button class="btn danger login-link" id="logout">SAIR DA CONTA</button></main>${nav("profile")}`;
}
function securityNotice() {
  return `<section class="security-note"><b>🔒 Seus dados protegidos</b><span>Esta demonstração não envia nem guarda fotos, documentos ou dados completos de cartão.</span></section>`;
}
function clientVerification() {
  return `${header("Verificar identidade", true)}<main class="content"><h1 class="section-title">Confirme sua identidade</h1><p class="subtitle">Ajuda a proteger clientes e guincheiros.</p>${securityNotice()}<section class="card upload-list"><label><b>🤳 Foto do rosto</b><span>Selfie com prova de vida</span><input type="file" accept="image/*" capture="user" data-doc="selfie"></label><label><b>🪪 Documento com foto</b><span>CNH ou RG — frente e verso</span><input type="file" accept="image/*" capture="environment" data-doc="identity"></label></section><label class="check"><input type="checkbox" id="identity-consent"> Autorizo a análise dos documentos para segurança da plataforma.</label><button class="btn primary" id="submit-client-verification">ENVIAR PARA ANÁLISE</button></main>`;
}
function payments() {
  return `${header("Pagamentos", true)}<main class="content"><h1 class="section-title">Formas de pagamento</h1><p class="subtitle">Escolha como pagar os atendimentos.</p>${securityNotice()}<section class="card"><button class="payment-choice selected" data-payment="pix"><b>◆</b><span>Pix<small>QR Code ou copia e cola</small></span><strong>›</strong></button><button class="payment-choice" data-payment="card"><b>▣</b><span>Cartão<small>Crédito ou débito tokenizado</small></span><strong>›</strong></button></section><div id="payment-form"></div></main>`;
}
function signup() {
  return `${header("Criar conta", true)}<main class="content"><h1 class="section-title">Vamos começar</h1><p class="subtitle">Crie sua conta de cliente.</p><form id="signup"><label class="field"><span>Nome completo</span><input name="name" required minlength="3" placeholder="Seu nome" /></label><label class="field"><span>Celular</span><input name="phone" required inputmode="tel" placeholder="(11) 99999-9999" /></label><label class="field"><span>E-mail</span><input name="email" required type="email" placeholder="voce@email.com" /></label><label class="field"><span>Senha</span><input name="password" required type="password" minlength="4" placeholder="Mínimo de 4 caracteres" /></label><label class="field"><span>Veículo (opcional)</span><input name="vehicle" placeholder="Ex.: Astra 2.0" /></label><button class="btn primary">CRIAR CONTA</button><button type="button" class="btn secondary login-link" data-go="clientLogin">JÁ TENHO CADASTRO</button></form></main>`;
}
function clientLogin() {
  return `${header("Entrar como cliente", true)}<main class="content"><h1 class="section-title">Bem-vindo de volta</h1><p class="subtitle">Entre com o e-mail e a senha cadastrados.</p><form id="client-login"><label class="field"><span>E-mail</span><input name="email" required type="email" placeholder="voce@email.com" /></label><label class="field"><span>Senha</span><input name="password" required type="password" placeholder="Sua senha" /></label><button class="btn primary">ENTRAR</button><button type="button" class="btn secondary login-link" data-go="signup">CRIAR NOVA CONTA</button><p class="legal">Conta criada antes da versão 0.5? Use o celular cadastrado como senha.</p></form></main>`;
}
function request() {
  if (!state.user) return state.clientAccount ? clientLogin() : signup();
  return `${header("Novo chamado", true)}<main class="content"><div class="coverage-badge">✓ Atendimento em São Paulo e Grande ABC</div><h1 class="section-title">Onde você está?</h1><p class="subtitle">Permita o GPS para mostrar sua posição no mapa.</p><div id="current-location-map" class="real-map" role="application" aria-label="Mapa da localização atual"></div><div class="gps-status" id="gps-status"><b>📍 Localização do celular</b><span>${state.request?.latitude ? "Localização encontrada" : "Buscando sua posição atual…"}</span></div><label class="field"><span>Cidade e região</span><select id="service-area"><option value="">Selecione a área</option>${serviceAreas.map((x) => `<option ${state.request?.area === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><label class="field"><span>Ponto de partida</span><div class="location-row"><input id="origin" placeholder="Aguardando o GPS ou digite o endereço" value="${state.request?.origin || ""}"/><button id="locate" type="button" aria-label="Atualizar localização">◎</button></div></label><label class="field"><span>Destino do veículo</span><input id="destination" placeholder="Para onde vamos levar?" value="${state.request?.destination || ""}"/></label><button class="btn primary" id="to-problem">CONFIRMAR ÁREA E CONTINUAR</button><button class="btn ghost login-link" data-go="coverage">VER TODAS AS ÁREAS ATENDIDAS</button></main>`;
}
function initCurrentLocationMap() {
  const container = document.querySelector("#current-location-map");
  if (!container || typeof L === "undefined") return;
  currentLocationMarker = null;
  currentAccuracyCircle = null;
  const latitude = state.request?.latitude || -23.55052;
  const longitude = state.request?.longitude || -46.633308;
  currentLocationMap = L.map(container, { zoomControl: true }).setView(
    [latitude, longitude],
    state.request?.latitude ? 17 : 11,
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(currentLocationMap);
  if (state.request?.latitude)
    showCurrentPositionOnMap(latitude, longitude, state.request.accuracy || 0);
  setTimeout(() => currentLocationMap?.invalidateSize(), 50);
}
function showCurrentPositionOnMap(latitude, longitude, accuracy = 0) {
  if (!currentLocationMap || typeof L === "undefined") return;
  const position = [latitude, longitude];
  if (currentLocationMarker) currentLocationMarker.setLatLng(position);
  else
    currentLocationMarker = L.marker(position, {
      title: "Sua localização atual",
      alt: "Sua localização atual",
    })
      .addTo(currentLocationMap)
      .bindPopup("Você está aqui");
  if (currentAccuracyCircle) currentAccuracyCircle.remove();
  if (accuracy)
    currentAccuracyCircle = L.circle(position, {
      radius: accuracy,
      color: "#0b5cab",
      fillColor: "#4da3ff",
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(currentLocationMap);
  currentLocationMap.setView(position, 17);
  currentLocationMarker.openPopup();
}
function locateCurrentPosition(showError = true) {
  const input = document.querySelector("#origin");
  const locate = document.querySelector("#locate");
  const status = document.querySelector("#gps-status span");
  if (!input || locationRequestInProgress) return;
  if (!navigator.geolocation) {
    if (status) status.textContent = "GPS não disponível neste aparelho";
    if (showError) toast("Ative a localização do celular ou digite o endereço.");
    return;
  }
  locationRequestInProgress = true;
  locate.textContent = "…";
  locate.disabled = true;
  if (status) status.textContent = "Buscando sua posição atual…";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = Number(position.coords.latitude.toFixed(6));
      const longitude = Number(position.coords.longitude.toFixed(6));
      const accuracy = Math.round(position.coords.accuracy || 0);
      const origin = `Minha localização (${latitude}, ${longitude})`;
      input.value = origin;
      state.request = {
        ...(state.request || {}),
        origin,
        latitude,
        longitude,
        accuracy,
      };
      locate.textContent = "✓";
      locate.disabled = false;
      if (status)
        status.textContent = accuracy
          ? `Localização encontrada • precisão aproximada de ${accuracy} m`
          : "Localização encontrada";
      locationRequestInProgress = false;
      showCurrentPositionOnMap(latitude, longitude, accuracy);
      toast("Localização atual encontrada!");
    },
    (error) => {
      const messages = {
        1: "Permita o acesso à localização nas configurações do celular.",
        2: "Não foi possível encontrar sua posição. Verifique se o GPS está ligado.",
        3: "O GPS demorou para responder. Toque no botão para tentar novamente.",
      };
      locate.textContent = "◎";
      locate.disabled = false;
      if (status) status.textContent = messages[error.code] || "Localização indisponível";
      locationRequestInProgress = false;
      if (showError) toast(messages[error.code] || "Digite o endereço manualmente.");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
  );
}
function problem() {
  return `${header("Detalhes", true)}<main class="content"><h1 class="section-title">O que aconteceu?</h1><p class="subtitle">Selecione a opção que melhor descreve o problema.</p><div class="grid">${problems.map(([id, label]) => `<button class="choice ${state.request.problem === id ? "selected" : ""}" data-problem="${id}"><b>${icons[id]}</b>${label}</button>`).join("")}</div><h2 class="section-title" style="margin-top:22px">Qual é o veículo?</h2><div class="grid">${vehicles.map(([id, icon, label]) => `<button class="choice ${state.request.vehicle === id ? "selected" : ""}" data-vehicle="${id}"><b>${icon}</b>${label}</button>`).join("")}</div><button class="btn primary" id="to-quote" style="margin-top:18px">VER ESTIMATIVA</button></main>`;
}
function calcPrice() {
  const p =
    { carro: 149.9, moto: 99.9, utilitario: 189.9 }[state.request.vehicle] ||
    149.9;
  return p + Math.min(state.request.destination.length * 0.7, 35);
}
function quote() {
  const price = calcPrice();
  state.request.price = price;
  return `${header("Confirmar", true)}<main class="content"><div class="map"><div class="route"></div><div class="pin you"><span>●</span></div><div class="pin tow"><span>🚛</span></div></div><section class="card"><div class="eyebrow" style="color:var(--navy2)">VALOR ESTIMADO</div><div class="price">${money(price)}</div><p class="muted">Estimativa demonstrativa • chegada em 12–18 min</p><div class="summary-row"><span>Origem</span><b>${state.request.origin}</b></div><div class="summary-row"><span>Destino</span><b>${state.request.destination}</b></div><div class="summary-row"><span>Serviço</span><b>${problems.find((x) => x[0] === state.request.problem)?.[1]}</b></div></section><button class="btn primary" id="confirm">CONFIRMAR SOLICITAÇÃO</button><p class="legal">Nenhuma cobrança real será realizada neste MVP.</p></main>`;
}
function searching() {
  return `${header("Buscando guincho", true)}<main class="content"><section class="status"><div class="pulse">🚛</div><h1 class="section-title">Procurando parceiros próximos…</h1><p class="subtitle">Isso normalmente leva poucos segundos.</p><div class="progress"><span id="search-progress" style="width:15%"></span></div></section><button class="btn danger" id="cancel">CANCELAR SOLICITAÇÃO</button></main>`;
}
function tracking() {
  return `${header("Guincho a caminho", true)}<main class="content"><div class="map"><div class="route"></div><div class="pin you"><span>●</span></div><div class="pin tow"><span>🚛</span></div></div><section class="card"><div class="driver"><div class="avatar">JS</div><div class="driver-info"><strong>João Silva</strong><span class="muted">★ 4,9 • 327 atendimentos</span></div><span class="badge">VERIFICADO</span></div><div class="summary-row"><span>Guincho plataforma</span><b>ABC1D23</b></div><div class="summary-row"><span>Previsão de chegada</span><b>12 min</b></div></section><button class="btn primary" id="arrived">SIMULAR CHEGADA</button><button class="btn secondary" id="call" style="margin-top:10px">LIGAR PARA O MOTORISTA</button></main>`;
}
function service() {
  const step = state.request.step || 0;
  return `${header("Em atendimento", true)}<main class="content"><section class="card"><h1 class="section-title">Serviço em andamento</h1><p class="subtitle">Acompanhe cada etapa abaixo.</p><div class="timeline">${["Guincho chegou ao local", "Veículo carregado", "A caminho do destino", "Chegou ao destino"].map((x, i) => `<div class="step ${i < step ? "done" : i === step ? "active" : ""}">${x}</div>`).join("")}</div></section><button class="btn primary" id="next-step">${step < 3 ? "AVANÇAR ETAPA" : "FINALIZAR SERVIÇO"}</button></main>`;
}
function finish() {
  return `${header("Finalizado", true)}<main class="content"><section class="status"><div class="pulse">✓</div><h1 class="section-title">Serviço finalizado!</h1><p class="subtitle">O veículo chegou ao destino.</p></section><section class="card"><div class="summary-row"><span>Valor do serviço</span><strong class="price" style="font-size:24px">${money(state.request.price)}</strong></div><h2 style="text-align:center">Como foi sua experiência?</h2><div class="stars">${[1, 2, 3, 4, 5].map((i) => `<button class="star ${i <= state.rating ? "on" : ""}" data-rate="${i}">★</button>`).join("")}</div><label class="field"><textarea id="comment" rows="3" placeholder="Deixe um comentário (opcional)"></textarea></label></section><button class="btn primary" id="complete">FINALIZAR E PAGAR</button></main>`;
}
function installmentQuote(base, installments) {
  if (installments <= 2)
    return { total: base, installment: base / installments, interest: 0 };
  const demoMonthlyRate = 0.0249;
  const total = base * Math.pow(1 + demoMonthlyRate, installments);
  return { total, installment: total / installments, interest: total - base };
}
function checkout() {
  const base = state.request?.price || 150;
  return `${header("Pagamento", true)}<main class="content"><h1 class="section-title">Escolha como pagar</h1><p class="subtitle">Confira todas as condições antes de confirmar.</p><section class="card"><div class="summary-row"><span>Valor do serviço</span><strong>${money(base)}</strong></div><div class="summary-row"><span>Comissão GuincheJá — 15%</span><strong>${money(base * 0.15)}</strong></div><div class="summary-row"><span>Repasse ao guincheiro — 85%</span><strong>${money(base * 0.85)}</strong></div></section><section class="card"><button class="payment-choice selected" data-checkout-method="pix"><b>◆</b><span>Pix<small>Pagamento à vista</small></span><strong>›</strong></button><button class="payment-choice" data-checkout-method="card"><b>▣</b><span>Cartão de crédito<small>Até 12 parcelas</small></span><strong>›</strong></button></section><div id="checkout-options"><section class="card status"><b>Pix à vista</b><div class="price">${money(base)}</div><p class="muted">Sem juros</p></section></div><button class="btn primary" id="pay-now">PAGAR AGORA</button><p class="legal">Simulação: nenhuma cobrança real será realizada.</p></main>`;
}
function receipt() {
  const p = state.request.payment;
  return `${header("Comprovante", true)}<main class="content"><section class="status"><div class="pulse">✓</div><h1 class="section-title">Pagamento realizado!</h1><p class="subtitle">Transação demonstrativa aprovada.</p></section><section class="card"><div class="summary-row"><span>Forma de pagamento</span><strong>${p.label}</strong></div><div class="summary-row"><span>Total pago</span><strong class="price" style="font-size:24px">${money(p.total)}</strong></div>${p.interest ? `<div class="summary-row"><span>Juros do parcelamento</span><strong>${money(p.interest)}</strong></div>` : ""}<div class="summary-row"><span>Comissão da plataforma</span><strong>${money(state.request.price * 0.15)}</strong></div><div class="summary-row"><span>Repasse ao guincheiro</span><strong>${money(state.request.price * 0.85)}</strong></div></section><button class="btn primary" id="receipt-done">VOLTAR AO INÍCIO</button></main>`;
}
function history() {
  return `${header("Meus chamados", true)}<main class="content"><h1 class="section-title">Histórico</h1><p class="subtitle">Seus atendimentos concluídos neste aparelho.</p>${state.history.length ? state.history.map((h) => `<section class="card"><div class="summary-row"><strong>${h.problem}</strong><span class="badge">CONCLUÍDO</span></div><p>${h.origin} → ${h.destination}</p><div class="summary-row"><span>${h.date}</span><strong>${money(h.price)}</strong></div></section>`).join("") : `<div class="empty"><b>☷</b><h2>Nenhum chamado ainda</h2><p class="muted">Quando você concluir um atendimento, ele aparecerá aqui.</p></div>`}</main>${nav("history")}`;
}
function providerNav(active = "dashboard") {
  return `<nav class="bottom-nav"><button class="nav-item ${active === "dashboard" ? "active" : ""}" data-go="providerDashboard"><b>⌂</b>Início</button><button class="nav-item ${active === "jobs" ? "active" : ""}" data-go="providerJobs"><b>☷</b>Corridas</button><button class="nav-item ${active === "earnings" ? "active" : ""}" data-go="providerEarnings"><b>R$</b>Ganhos</button><button class="nav-item ${active === "account" ? "active" : ""}" data-go="providerAccount"><b>♙</b>Perfil</button></nav>`;
}
function providerSignup() {
  return `${header("Cadastro do guincheiro", true)}<main class="content"><h1 class="section-title">Trabalhe com o GuincheJá</h1><p class="subtitle">Cadastre o responsável e o guincho.</p><form id="provider-signup"><label class="field"><span>Nome completo</span><input name="name" required minlength="3" placeholder="Nome do responsável"></label><label class="field"><span>Celular</span><input name="phone" required inputmode="tel" placeholder="(11) 99999-9999"></label><label class="field"><span>CPF ou CNPJ</span><input name="document" required placeholder="Documento"></label><label class="field"><span>Senha</span><input name="password" required type="password" minlength="4" placeholder="Mínimo de 4 caracteres"></label><label class="field"><span>Tipo de guincho</span><select name="towType" required><option value="">Selecione</option><option>Guincho plataforma</option><option>Guincho lança</option><option>Guincho para motos</option></select></label><label class="field"><span>Placa</span><input name="plate" required maxlength="7" placeholder="ABC1D23"></label><button class="btn primary">CRIAR PERFIL DE GUINCHEIRO</button><button type="button" class="btn secondary login-link" data-go="providerLogin">JÁ TENHO CADASTRO</button><p class="legal">Cadastro demonstrativo. Na versão comercial, os documentos passarão por verificação.</p></form></main>`;
}
function providerLogin() {
  return `${header("Entrar como guincheiro", true)}<main class="content"><h1 class="section-title">Acesse seu painel</h1><p class="subtitle">Entre com o celular e a senha cadastrados.</p><form id="provider-login"><label class="field"><span>Celular</span><input name="phone" required inputmode="tel" placeholder="(11) 99999-9999"></label><label class="field"><span>Senha</span><input name="password" required type="password" placeholder="Sua senha"></label><button class="btn primary">ENTRAR</button><button type="button" class="btn secondary login-link" data-go="providerSignup">CRIAR NOVO CADASTRO</button><p class="legal">Cadastro antigo? Use o celular cadastrado como senha.</p></form></main>`;
}
function providerDashboard() {
  if (!state.providerLoggedIn)
    return state.provider ? providerLogin() : providerSignup();
  return `${header("Painel do guincheiro", true)}<main class="content"><section class="provider-status ${state.providerOnline ? "online" : ""}"><div><strong><span class="status-dot"></span>${state.providerOnline ? "Você está online" : "Você está offline"}</strong><small>${state.providerOnline ? "Recebendo solicitações próximas" : "Ative para começar a receber chamados"}</small></div><button id="toggle-online">${state.providerOnline ? "FICAR OFFLINE" : "FICAR ONLINE"}</button></section><h2 class="section-title">Resumo de hoje</h2><div class="metrics"><div class="metric"><b>3</b><span>Corridas</span></div><div class="metric"><b>R$ 427</b><span>Ganhos</span></div><div class="metric"><b>4,9 ★</b><span>Avaliação</span></div></div>${state.providerOnline ? `<section class="card incoming"><div class="eyebrow" style="color:var(--navy2)">NOVA SOLICITAÇÃO</div><h2>Pane mecânica</h2><p>🚗 Carro • 4,2 km</p><div class="summary-row"><span>Coleta</span><b>Av. Paulista, 1000</b></div><div class="summary-row"><span>Destino</span><b>Rua Vergueiro, 850</b></div><div class="summary-row"><span>Valor</span><strong class="price" style="font-size:23px">R$ 149,90</strong></div><div class="grid"><button class="btn danger" id="provider-decline">RECUSAR</button><button class="btn primary" id="provider-accept">ACEITAR</button></div></section>` : `<section class="empty"><b>🚛</b><h2>Pronto para trabalhar?</h2><p class="muted">Fique online para receber uma solicitação.</p></section>`}</main>${providerNav("dashboard")}`;
}
function providerTrip() {
  const step = state.providerJob?.step || 0;
  const labels = [
    "A caminho do cliente",
    "Cheguei ao local",
    "Veículo carregado",
    "A caminho do destino",
    "Serviço finalizado",
  ];
  const action = [
    "CHEGUEI AO LOCAL",
    "INICIAR SERVIÇO",
    "VEÍCULO CARREGADO",
    "CHEGUEI AO DESTINO",
    "FINALIZAR CORRIDA",
  ][step];
  return `${header("Corrida atual", true)}<main class="content"><div class="map"><div class="route"></div><div class="pin you"><span>🚗</span></div><div class="pin tow"><span>🚛</span></div></div><section class="card"><div class="driver"><div class="avatar">CM</div><div class="driver-info"><strong>Carlos Martins</strong><span class="muted">Cliente • ★ 4,8</span></div><button class="icon-btn provider-call" id="provider-call">☎</button></div></section><section class="card"><div class="timeline">${labels.map((x, i) => `<div class="step ${i < step ? "done" : i === step ? "active" : ""}">${x}</div>`).join("")}</div></section><button class="btn primary" id="provider-next">${action}</button></main>${providerNav("jobs")}`;
}
function providerDone() {
  return `${header("Corrida finalizada", true)}<main class="content"><section class="status"><div class="pulse">✓</div><h1 class="section-title">Serviço concluído!</h1><p class="subtitle">Pagamento registrado via Pix.</p></section><section class="card"><div class="summary-row"><span>Valor recebido</span><strong class="price" style="font-size:26px">R$ 149,90</strong></div><div class="summary-row"><span>Avaliação</span><strong>5,0 ★</strong></div><div class="summary-row"><span>Corrida</span><strong>#GJ1048</strong></div></section><button class="btn primary" id="provider-complete">VOLTAR AO PAINEL</button></main>`;
}
function providerJobs() {
  return `${header("Minhas corridas", true)}<main class="content"><h1 class="section-title">Corridas</h1><p class="subtitle">Atendimentos demonstrativos realizados hoje.</p>${["#GJ1047 • Pneu furado", "#GJ1046 • Bateria", "#GJ1045 • Pane mecânica"].map((x, i) => `<section class="card"><div class="summary-row"><strong>${x}</strong><span class="badge">CONCLUÍDA</span></div><div class="summary-row"><span>${10 + i}:2${i}</span><strong>${money([129.9, 112, 185.1][i])}</strong></div></section>`).join("")}</main>${providerNav("jobs")}`;
}
function providerEarnings() {
  return `${header("Meus ganhos", true)}<main class="content"><section class="card status"><span class="muted">Saldo disponível</span><div class="price">R$ 427,00</div><p class="muted">3 corridas concluídas hoje</p></section><div class="metrics"><div class="metric"><b>R$ 2.184</b><span>Esta semana</span></div><div class="metric"><b>16</b><span>Corridas</span></div></div><section class="card"><h2>Últimos recebimentos</h2><div class="summary-row"><span>#GJ1047</span><b>R$ 129,90</b></div><div class="summary-row"><span>#GJ1046</span><b>R$ 112,00</b></div><div class="summary-row"><span>#GJ1045</span><b>R$ 185,10</b></div></section></main>${providerNav("earnings")}`;
}
function providerAccount() {
  return `${header("Perfil do guincheiro", true)}<main class="content"><section class="card"><div class="driver"><div class="avatar">${state.provider.name[0].toUpperCase()}</div><div class="driver-info"><strong>${state.provider.name}</strong><span class="muted">★ 4,9 • ${state.provider.verified ? "Verificado" : "Perfil em análise"}</span></div></div></section><section class="card"><div class="summary-row"><span>Celular</span><b>${state.provider.phone}</b></div><div class="summary-row"><span>Guincho</span><b>${state.provider.towType}</b></div><div class="summary-row"><span>Placa</span><b>${state.provider.plate.toUpperCase()}</b></div></section><button class="btn primary" data-go="providerVerification">DOCUMENTOS E SEGURANÇA</button><button class="btn secondary login-link" data-go="providerPayout">CONTA PARA RECEBIMENTO</button><button class="btn secondary login-link" id="provider-logout">SAIR DA CONTA</button><button class="btn danger login-link" id="provider-delete">EXCLUIR PERFIL DE TESTE</button></main>${providerNav("account")}`;
}
function providerVerification() {
  return `${header("Segurança do guincheiro", true)}<main class="content"><h1 class="section-title">Verificação profissional</h1><p class="subtitle">Obrigatória antes de aceitar corridas reais.</p>${securityNotice()}<section class="card upload-list"><label><b>🤳 Selfie com prova de vida</b><input type="file" accept="image/*" capture="user" data-doc="selfie"></label><label><b>🪪 CNH válida</b><input type="file" accept="image/*" capture="environment" data-doc="cnh"></label><label><b>📄 Documento do guincho</b><input type="file" accept="image/*" capture="environment" data-doc="vehicle"></label><label><b>🚛 Foto do guincho e placa</b><input type="file" accept="image/*" capture="environment" data-doc="tow"></label></section><label class="check"><input type="checkbox" id="provider-consent"> Autorizo a análise para verificação e prevenção a fraudes.</label><button class="btn primary" id="submit-provider-verification">ENVIAR PARA APROVAÇÃO</button></main>`;
}
function providerPayout() {
  return `${header("Recebimentos", true)}<main class="content"><h1 class="section-title">Receber seus ganhos</h1><p class="subtitle">A titularidade deverá corresponder ao cadastro aprovado.</p>${securityNotice()}<form id="payout-form"><label class="field"><span>Tipo de chave Pix</span><select name="type"><option>CPF/CNPJ</option><option>Celular</option><option>E-mail</option><option>Chave aleatória</option></select></label><label class="field"><span>Chave Pix</span><input name="pix" required placeholder="Informe somente para demonstração"></label><button class="btn primary">SALVAR CHAVE PIX</button></form></main>`;
}
function render() {
  const views = {
    home,
    coverage,
    profile,
    clientVerification,
    payments,
    signup,
    clientLogin,
    request,
    problem,
    quote,
    searching,
    tracking,
    service,
    finish,
    checkout,
    receipt,
    history,
    providerSignup,
    providerLogin,
    providerDashboard,
    providerTrip,
    providerDone,
    providerJobs,
    providerEarnings,
    providerAccount,
    providerVerification,
    providerPayout,
  };
  document.querySelector("#app").innerHTML =
    `<div class="shell">${(views[state.screen] || home)()}</div>`;
  if (state.screen === "home") {
    const requestButton = document.querySelector('[data-go="request"]');
    requestButton.insertAdjacentHTML(
      "afterend",
      `${!state.user ? '<button class="btn home-login" data-go="clientLogin">JÁ TENHO CADASTRO</button>' : ""}<button class="btn provider-entry" data-go="providerDashboard">SOU GUINCHEIRO</button>`,
    );
    document
      .querySelector(".hero")
      .insertAdjacentHTML(
        "afterend",
        '<button class="coverage-link" data-go="coverage"><b>📍 Atendemos São Paulo e Grande ABC</b><span>Veja todas as regiões disponíveis ›</span></button>',
      );
  }
  bind();
  if (state.screen === "request") {
    initCurrentLocationMap();
    if (!state.request?.latitude)
      setTimeout(() => locateCurrentPosition(false), 250);
  }
}
function toast(msg) {
  const e = document.createElement("div");
  e.className = "toast";
  e.textContent = msg;
  document.body.appendChild(e);
  setTimeout(() => e.remove(), 2400);
}
function go(screen) {
  state.screen = screen;
  render();
}
function bind() {
  document
    .querySelectorAll("[data-go]")
    .forEach((b) => (b.onclick = () => go(b.dataset.go)));
  const form = document.querySelector("#signup");
  if (form)
    form.onsubmit = (e) => {
      e.preventDefault();
      state.user = Object.fromEntries(new FormData(form));
      state.clientAccount = state.user;
      state.clientLoggedIn = true;
      state.lastRole = "client";
      if (!save()) return toast("Não foi possível salvar o cadastro.");
      go("home");
      toast("Conta criada com sucesso!");
    };
  const logout = document.querySelector("#logout");
  if (logout)
    logout.onclick = () => {
      state.user = null;
      state.clientLoggedIn = false;
      save();
      go("home");
    };
  const clientLoginForm = document.querySelector("#client-login");
  if (clientLoginForm)
    clientLoginForm.onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(clientLoginForm));
      const account = state.clientAccount;
      const validPassword = account?.password
        ? data.password === account.password
        : data.password.replace(/\D/g, "") ===
          account?.phone?.replace(/\D/g, "");
      if (
        !account ||
        data.email.toLowerCase() !== account.email.toLowerCase() ||
        !validPassword
      )
        return toast("E-mail ou senha incorretos.");
      state.user = account;
      state.clientLoggedIn = true;
      state.lastRole = "client";
      save();
      go("home");
      toast("Login realizado!");
    };
  const locate = document.querySelector("#locate");
  if (locate)
    locate.onclick = () => locateCurrentPosition(true);
  const toProblem = document.querySelector("#to-problem");
  if (toProblem)
    toProblem.onclick = () => {
      const area = document.querySelector("#service-area").value;
      const origin = document.querySelector("#origin").value.trim(),
        destination = document.querySelector("#destination").value.trim();
      if (!area) return toast("Selecione a cidade e a região.");
      if (!origin || !destination)
        return toast("Informe a origem e o destino.");
      state.request = {
        ...(state.request || {}),
        area,
        origin,
        destination,
        problem: null,
        vehicle: null,
      };
      go("problem");
    };
  document.querySelectorAll("[data-problem]").forEach(
    (b) =>
      (b.onclick = () => {
        state.request.problem = b.dataset.problem;
        render();
      }),
  );
  document.querySelectorAll("[data-vehicle]").forEach(
    (b) =>
      (b.onclick = () => {
        state.request.vehicle = b.dataset.vehicle;
        render();
      }),
  );
  const toQuote = document.querySelector("#to-quote");
  if (toQuote)
    toQuote.onclick = () =>
      state.request.problem && state.request.vehicle
        ? go("quote")
        : toast("Selecione o problema e o veículo.");
  const confirm = document.querySelector("#confirm");
  if (confirm)
    confirm.onclick = () => {
      go("searching");
      let n = 15;
      const t = setInterval(() => {
        n += 17;
        const p = document.querySelector("#search-progress");
        if (p) p.style.width = Math.min(n, 100) + "%";
        if (n >= 100) {
          clearInterval(t);
          if (state.screen === "searching") go("tracking");
        }
      }, 450);
    };
  const cancel = document.querySelector("#cancel");
  if (cancel)
    cancel.onclick = () => {
      state.request = null;
      go("home");
      toast("Solicitação cancelada.");
    };
  const call = document.querySelector("#call");
  if (call) call.onclick = () => toast("Ligação simulada para o motorista.");
  const arrived = document.querySelector("#arrived");
  if (arrived)
    arrived.onclick = () => {
      state.request.step = 0;
      go("service");
    };
  const next = document.querySelector("#next-step");
  if (next)
    next.onclick = () => {
      if (state.request.step < 3) {
        state.request.step++;
        render();
      } else go("finish");
    };
  document.querySelectorAll("[data-rate]").forEach(
    (b) =>
      (b.onclick = () => {
        state.rating = Number(b.dataset.rate);
        render();
      }),
  );
  const complete = document.querySelector("#complete");
  if (complete)
    complete.onclick = () => {
      if (!state.rating) return toast("Escolha uma nota para continuar.");
      go("checkout");
    };
  const checkoutOptions = document.querySelector("#checkout-options");
  if (checkoutOptions)
    state.request.payment = {
      label: "Pix",
      total: state.request.price,
      interest: 0,
    };
  document.querySelectorAll("[data-checkout-method]").forEach((button) => {
    button.onclick = () => {
      document
        .querySelectorAll("[data-checkout-method]")
        .forEach((x) => x.classList.remove("selected"));
      button.classList.add("selected");
      const base = state.request.price;
      if (button.dataset.checkoutMethod === "pix") {
        state.request.payment = { label: "Pix", total: base, interest: 0 };
        checkoutOptions.innerHTML = `<section class="card status"><b>Pix à vista</b><div class="price">${money(base)}</div><p class="muted">Sem juros</p></section>`;
      } else {
        checkoutOptions.innerHTML = `<section class="card"><label class="field"><span>Número de parcelas</span><select id="installments">${Array.from(
          { length: 12 },
          (_, i) => i + 1,
        )
          .map(
            (n) =>
              `<option value="${n}">${n}x${n <= 2 ? " sem juros" : " com juros"}</option>`,
          )
          .join(
            "",
          )}</select></label><div id="installment-summary"></div><p class="legal">Taxa demonstrativa de 2,49% ao mês. Na versão real, a condição será enviada pelo processador.</p></section>`;
        const select = document.querySelector("#installments");
        const updateInstallment = () => {
          const n = Number(select.value),
            quote = installmentQuote(base, n);
          state.request.payment = { label: `${n}x no cartão`, ...quote };
          document.querySelector("#installment-summary").innerHTML =
            `<div class="summary-row"><span>Parcelas</span><strong>${n}x de ${money(quote.installment)}</strong></div><div class="summary-row"><span>Juros pagos pelo cliente</span><strong>${money(quote.interest)}</strong></div><div class="summary-row"><span>Total final</span><strong>${money(quote.total)}</strong></div>`;
        };
        select.onchange = updateInstallment;
        updateInstallment();
      }
    };
  });
  const payNow = document.querySelector("#pay-now");
  if (payNow) payNow.onclick = () => go("receipt");
  const receiptDone = document.querySelector("#receipt-done");
  if (receiptDone)
    receiptDone.onclick = () => {
      state.history.unshift({
        problem: problems.find((x) => x[0] === state.request.problem)[1],
        origin: state.request.origin,
        destination: state.request.destination,
        price: state.request.price,
        date: new Date().toLocaleDateString("pt-BR"),
        rating: state.rating,
      });
      state.request = null;
      state.rating = 0;
      save();
      go("home");
      toast("Pagamento demonstrativo concluído!");
    };
  const providerForm = document.querySelector("#provider-signup");
  if (providerForm)
    providerForm.onsubmit = (e) => {
      e.preventDefault();
      state.provider = Object.fromEntries(new FormData(providerForm));
      state.providerLoggedIn = true;
      state.lastRole = "provider";
      if (!save()) return toast("Não foi possível salvar o cadastro.");
      go("providerDashboard");
      toast("Perfil de guincheiro criado!");
    };
  const providerLoginForm = document.querySelector("#provider-login");
  if (providerLoginForm)
    providerLoginForm.onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(providerLoginForm));
      const account = state.provider;
      const samePhone =
        data.phone.replace(/\D/g, "") === account?.phone?.replace(/\D/g, "");
      const validPassword = account?.password
        ? data.password === account.password
        : data.password.replace(/\D/g, "") ===
          account?.phone?.replace(/\D/g, "");
      if (!account || !samePhone || !validPassword)
        return toast("Celular ou senha incorretos.");
      state.providerLoggedIn = true;
      state.lastRole = "provider";
      save();
      go("providerDashboard");
      toast("Login realizado!");
    };
  const online = document.querySelector("#toggle-online");
  if (online)
    online.onclick = () => {
      state.providerOnline = !state.providerOnline;
      render();
      toast(state.providerOnline ? "Você está online!" : "Você está offline.");
    };
  const decline = document.querySelector("#provider-decline");
  if (decline)
    decline.onclick = () => {
      state.providerOnline = false;
      render();
      toast("Solicitação recusada.");
    };
  const accept = document.querySelector("#provider-accept");
  if (accept)
    accept.onclick = () => {
      state.providerJob = { step: 0 };
      go("providerTrip");
    };
  const providerCall = document.querySelector("#provider-call");
  if (providerCall)
    providerCall.onclick = () => toast("Ligação simulada para o cliente.");
  const providerNext = document.querySelector("#provider-next");
  if (providerNext)
    providerNext.onclick = () => {
      if (state.providerJob.step < 4) {
        state.providerJob.step++;
        render();
      } else go("providerDone");
    };
  const providerComplete = document.querySelector("#provider-complete");
  if (providerComplete)
    providerComplete.onclick = () => {
      state.providerJob = null;
      state.providerOnline = true;
      go("providerDashboard");
      toast("Corrida adicionada aos ganhos!");
    };
  const providerLogout = document.querySelector("#provider-logout");
  if (providerLogout)
    providerLogout.onclick = () => {
      state.providerOnline = false;
      state.providerLoggedIn = false;
      state.lastRole = "client";
      save();
      go("home");
    };
  const providerDelete = document.querySelector("#provider-delete");
  if (providerDelete)
    providerDelete.onclick = () => {
      state.provider = null;
      state.providerOnline = false;
      state.providerLoggedIn = false;
      state.lastRole = "client";
      save();
      go("home");
      toast("Perfil de teste excluído.");
    };
  document.querySelectorAll("[data-doc]").forEach((input) => {
    input.onchange = () => {
      const label = input.closest("label");
      if (input.files?.length) label.classList.add("uploaded");
    };
  });
  const clientVerificationButton = document.querySelector(
    "#submit-client-verification",
  );
  if (clientVerificationButton)
    clientVerificationButton.onclick = () => {
      const files = [...document.querySelectorAll("[data-doc]")];
      if (
        !files.every((x) => x.files?.length) ||
        !document.querySelector("#identity-consent").checked
      )
        return toast("Adicione os documentos e confirme a autorização.");
      state.user.verified = false;
      state.clientAccount = state.user;
      save();
      toast("Enviado para análise. As imagens não foram salvas neste MVP.");
      setTimeout(() => go("profile"), 1200);
    };
  const providerVerificationButton = document.querySelector(
    "#submit-provider-verification",
  );
  if (providerVerificationButton)
    providerVerificationButton.onclick = () => {
      const files = [...document.querySelectorAll("[data-doc]")];
      if (
        !files.every((x) => x.files?.length) ||
        !document.querySelector("#provider-consent").checked
      )
        return toast("Adicione todos os documentos e confirme a autorização.");
      state.provider.verified = false;
      save();
      toast("Documentos enviados para aprovação do administrador.");
      setTimeout(() => go("providerAccount"), 1200);
    };
  const payoutForm = document.querySelector("#payout-form");
  if (payoutForm)
    payoutForm.onsubmit = (e) => {
      e.preventDefault();
      toast("Chave Pix validada em modo demonstração.");
      setTimeout(() => go("providerAccount"), 1000);
    };
  const paymentForm = document.querySelector("#payment-form");
  if (paymentForm)
    paymentForm.innerHTML =
      '<section class="card"><div class="status"><b style="font-size:34px">◆</b><h3>Pix</h3><p class="muted">O QR Code será gerado somente no momento do pagamento.</p></div></section>';
  document.querySelectorAll("[data-payment]").forEach((button) => {
    button.onclick = () => {
      document
        .querySelectorAll("[data-payment]")
        .forEach((x) => x.classList.remove("selected"));
      button.classList.add("selected");
      paymentForm.innerHTML =
        button.dataset.payment === "card"
          ? '<section class="card"><h3>Adicionar cartão</h3><p class="muted">No aplicativo real, os campos serão fornecidos pelo processador certificado. O GuincheJá receberá somente um token e os 4 últimos dígitos.</p><button class="btn primary" id="demo-card">SIMULAR CARTÃO TOKENIZADO</button></section>'
          : '<section class="card"><div class="status"><b style="font-size:34px">◆</b><h3>Pix</h3><p class="muted">O QR Code será gerado somente no momento do pagamento.</p></div></section>';
      const demoCard = document.querySelector("#demo-card");
      if (demoCard)
        demoCard.onclick = () => toast("Cartão de teste •••• 4242 adicionado.");
    };
  });
}
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("sw.js").catch(() => {});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") save();
});
window.addEventListener("pagehide", save);
render();
setTimeout(
  () => document.querySelector("#splash")?.classList.add("hide"),
  1600,
);
