/* ===================================================
   MARÉ — StormGlass API
   Docs: https://docs.stormglass.io/#/tide
   Free: 10 req/dia · sem uso comercial

   SETUP:
   1. Cadastre-se em stormglass.io
   2. Copie sua API Key do dashboard
   3. Cole em STORMGLASS_KEY abaixo
=================================================== */

const STORMGLASS_KEY = "6f9f70d4-17d8-11f1-9211-0242ac120003-6f9f712e-17d8-11f1-9211-0242ac120003";

// Coordenadas de Pipa/RN
const LAT =  -6.2289;
const LON  = -35.0514;

// Cache key (evita gastar as 10 req/dia)
const CACHE_KEY  = "mare_cache";
const CACHE_TTL  = 6 * 60 * 60 * 1000; // 6 horas em ms

/* ── helpers ── */
const fmt = ts =>
  new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const fmtH = h => `${h >= 0 ? "+" : ""}${h.toFixed(2)}m`;

function tideLabel(type) {
  return type === "high"
    ? { icon: "🌊", text: "Maré Alta",  code: "alta"  }
    : { icon: "🏖️", text: "Maré Baixa", code: "baixa" };
}

function currentState(extremes) {
  const now = Date.now();
  // encontra o extremo anterior e o próximo
  const past = [...extremes].reverse().find(e => new Date(e.time) <= now);
  const next = extremes.find(e => new Date(e.time) > now);
  if (!past || !next) return null;

  const isPastHigh = past.type === "high";
  if (isPastHigh) {
    return { label: "↘️ Vazando (Pós-mar)", code: "vazando" };
  } else {
    return { label: "↗️ Enchendo (Pré-mar)", code: "enchendo" };
  }
}

/* ── renderiza o card ── */
function renderTideCard(extremes) {
  const card = document.getElementById("mare-card");
  const note = document.getElementById("mare-note");
  if (!card) return;

  const now  = Date.now();
  const upcoming = extremes
    .filter(e => new Date(e.time) > now)
    .slice(0, 4);

  const state  = currentState(extremes);
  const isGood = state?.code === "enchendo" || upcoming[0]?.type === "high";
  const rec    = isGood
    ? "✅ Boas condições para aula agora!"
    : "🏃 Aguarde a maré encher para melhor experiência";

  const rows = upcoming.map(e => {
    const { icon, text } = tideLabel(e.type);
    return `
      <div class="mare-row">
        <span class="mare-row-label">${icon} ${text}</span>
        <div style="display:flex;align-items:center;gap:.6rem">
          <span class="mare-row-time">${fmt(e.time)}</span>
          <span class="mare-row-type">${fmtH(e.height)}</span>
        </div>
      </div>`;
  }).join("");

  card.innerHTML = `
    <div class="mare-now">
      <div class="mare-dot"></div>
      <div>
        <div class="mare-now-label">Agora · ${fmt(now)}</div>
        <div class="mare-now-value">${state?.label ?? "Calculando..."}</div>
        <div class="mare-now-state">${rec}</div>
      </div>
    </div>
    <div class="mare-times">${rows}</div>`;

  note.textContent = "✅ Dados reais · StormGlass API · Pipa/RN";
}

/* ── fallback estimativa local ── */
function renderFallback(reason = "") {
  const card = document.getElementById("mare-card");
  const note = document.getElementById("mare-note");
  if (!card) return;

  const now      = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  const cycle    = 745; // ~12h25 em minutos
  const phase    = (totalMin % cycle) / cycle;
  const h        = Math.sin(phase * 2 * Math.PI);

  const [label, code] =
    h > 0.5  ? ["🌊 Maré Cheia",        "alta"]     :
    h > 0    ? ["↗️ Enchendo (Pré-mar)", "enchendo"] :
    h < -0.5 ? ["🏖️ Maré Baixa",        "baixa"]    :
               ["↘️ Vazando (Pós-mar)",  "vazando"];

  const toTime = m =>
    new Date(now.getTime() + m * 60000)
      .toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const minsTo = pct => Math.round((pct - phase + (pct < phase ? 1 : 0)) * cycle);
  const nextHigh = toTime(minsTo(phase < 0.25 ? 0.25 : phase < 0.75 ? 0.75 : 1.25));
  const nextLow  = toTime(minsTo(phase < 0.5 ? 0.5 : 1.0));
  const rec = (code === "alta" || code === "enchendo")
    ? "✅ Boas condições para aula agora!"
    : "🏃 Aguarde a maré encher para melhor experiência";

  card.innerHTML = `
    <div class="mare-now">
      <div class="mare-dot"></div>
      <div>
        <div class="mare-now-label">Estimativa local · ${toTime(0)}</div>
        <div class="mare-now-value">${label}</div>
        <div class="mare-now-state">${rec}</div>
      </div>
    </div>
    <div class="mare-times">
      <div class="mare-row">
        <span class="mare-row-label">🌊 Próxima Alta</span>
        <div style="display:flex;align-items:center;gap:.6rem">
          <span class="mare-row-time">${nextHigh}</span>
          <span class="mare-row-type">estimado</span>
        </div>
      </div>
      <div class="mare-row">
        <span class="mare-row-label">🏖️ Próxima Baixa</span>
        <div style="display:flex;align-items:center;gap:.6rem">
          <span class="mare-row-time">${nextLow}</span>
          <span class="mare-row-type">estimado</span>
        </div>
      </div>
    </div>`;

  if (note) note.textContent = reason
    ? `⚠️ ${reason} — exibindo estimativa local`
    : "Estimativa local (adicione sua chave StormGlass para dados reais)";
}

/* ── carrega da API ou do cache ── */
async function loadTides() {
  // sem chave → fallback direto
  if (!STORMGLASS_KEY || STORMGLASS_KEY.includes("COLE_")) {
    return renderFallback("Chave da API não configurada");
  }

  // verifica cache
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { ts, extremes } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) {
        return renderTideCard(extremes);
      }
    }
  } catch (_) {}

  // busca dados reais
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 86400000); // +2 dias

  const url =
    `https://api.stormglass.io/v2/tide/extremes/point` +
    `?lat=${LAT}&lng=${LON}` +
    `&start=${start.toISOString()}&end=${end.toISOString()}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: STORMGLASS_KEY },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const { data: extremes } = await res.json();

    // salva no cache
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), extremes }));

    renderTideCard(extremes);
  } catch (err) {
    console.warn("StormGlass error:", err.message);
    renderFallback("API indisponível");
  }
}

/* ── init ── */
loadTides();
// re-renderiza o estado atual a cada minuto (sem nova req. à API)
setInterval(() => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) renderTideCard(JSON.parse(raw).extremes);
  } catch (_) {
    renderFallback();
  }
}, 60_000);