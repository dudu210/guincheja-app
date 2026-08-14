const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
test("arquivos essenciais existem", () =>
  [
    "index.html",
    "styles.css",
    "main.js",
    "app.js",
    "manifest.json",
    "sw.js",
  ].forEach((f) => assert.ok(fs.existsSync(path.join(__dirname, "..", f)))));
test("fluxo principal está implementado", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  [
    "signup",
    "request",
    "quote",
    "searching",
    "tracking",
    "service",
    "finish",
    "history",
  ].forEach((screen) => assert.match(js, new RegExp(screen)));
});
test("fluxo do guincheiro está implementado", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  [
    "providerSignup",
    "providerDashboard",
    "providerTrip",
    "providerDone",
    "providerEarnings",
  ].forEach((screen) => assert.match(js, new RegExp(screen)));
});
test("cadastros e sessão são restaurados", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  [
    "gj_user",
    "gj_provider",
    "gj_last_role",
    "visibilitychange",
    "pagehide",
  ].forEach((item) => assert.match(js, new RegExp(item)));
});
test("login de cliente e guincheiro está implementado", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  [
    "clientLogin",
    "providerLogin",
    "client-login",
    "provider-login",
    "clientLoggedIn",
    "providerLoggedIn",
  ].forEach((item) => assert.match(js, new RegExp(item)));
});
test("verificação e pagamentos seguros estão implementados", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  [
    "clientVerification",
    "providerVerification",
    "providerPayout",
    "payments",
    "data-doc",
    "tokenizado",
  ].forEach((item) => assert.match(js, new RegExp(item)));
});
test("parcelamento e split financeiro estão implementados", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  [
    "installmentQuote",
    "checkout",
    "receipt",
    "12 parcelas",
    "0.15",
    "0.85",
  ].forEach((item) => assert.match(js, new RegExp(item)));
});
test("identidade visual e tela de abertura estão implementadas", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const config = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(html, /splash-screen/);
  assert.match(html, /O GUINCHO QUE CHEGA ATÉ VOCÊ!/);
  assert.match(config, /guincheja-app-icon-v2\.png/);
  assert.ok(
    fs.existsSync(
      path.join(__dirname, "..", "assets", "guincheja-app-icon-v2.png"),
    ),
  );
});
test("cobertura de São Paulo e Grande ABC está implementada", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  [
    "serviceAreas",
    "Extremo Sul",
    "Extremo Leste",
    "Extremo Norte",
    "Extremo Oeste",
    "Santo André",
    "São Bernardo do Campo",
    "Rio Grande da Serra",
    "coverage",
  ].forEach((item) => assert.match(js, new RegExp(item)));
});
test("HTML carrega CSS e JavaScript", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  assert.match(html, /styles\.css/);
  assert.match(html, /main\.js/);
});
test("localização atual do celular está integrada ao chamado", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  [
    "locateCurrentPosition",
    "navigator.geolocation",
    "enableHighAccuracy: true",
    "latitude",
    "longitude",
    "accuracy",
    "gps-status",
  ].forEach((item) => assert.match(js, new RegExp(item)));
});
