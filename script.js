/* ===========================
   CONFIG
=========================== */
const CONFIG = {
  gcalBookingUrl: "https://calendar.app.google/x5CmzMjfJHdPk5wH9", // ex: "https://calendar.app.google/xxxxxx" (link do evento de agendamento)
  fadeInThreshold: 0.1,
};
const WHATSAPP = {
  phoneE164: "5516993733143", // ex: 5584999999999 (DDD + número)
  baseMessage:
    "Oi! Acabei de agendar uma aula pelo site. Pode confirmar, por favor:\n" +
    "• Valor da aula\n" +
    "• Disponibilidade no horário que escolhi\n" +
    "• Ponto de encontro (local exato em Pipa)\n\n" +
    "Meu nome: ",
};
/* ===========================
   HELPERS
=========================== */
function $(id) {
  return document.getElementById(id);
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function isValidUrl(url) {
  if (typeof url !== "string") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/* ===========================
   FOOTER YEAR
=========================== */
function initFooterYear() {
  setText("year", String(new Date().getFullYear()));
}

/* ===========================
   FADE IN ON SCROLL
=========================== */
function initFadeIn() {
  const els = document.querySelectorAll(".fade-in");
  if (!els.length) return;

  const obs = new IntersectionObserver(
    (entries) => {
      let delayIndex = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        setTimeout(() => el.classList.add("visible"), delayIndex * 80);
        delayIndex += 1;
        obs.unobserve(el);
      }
    },
    { threshold: CONFIG.fadeInThreshold }
  );

  els.forEach((el) => obs.observe(el));
}

/* ===========================
   GOOGLE CALENDAR (button + fallback)
=========================== */
function initGoogleBooking() {
  const target = $("gcal-booking-btn");
  const fallbackLink = $("gcal-booking-link");

  if (!target && !fallbackLink) return;

  const url = isValidUrl(CONFIG.gcalBookingUrl)
    ? CONFIG.gcalBookingUrl
    : "https://calendar.google.com/";

  if (fallbackLink) fallbackLink.href = url;
  if (!target) return;

  function tryLoadSchedulingButton() {
    const api = window.calendar?.schedulingButton;
    if (!api?.load) return false;

    api.load({
      url,
      color: "#e8724a",
      label: "Agendar pelo Google Calendar",
      target,
    });
    return true;
  }

  window.addEventListener("load", () => {
    if (tryLoadSchedulingButton()) return;

    let tries = 0;
    const maxTries = 20; // ~4s
    const timer = setInterval(() => {
      tries += 1;
      if (tryLoadSchedulingButton() || tries >= maxTries) clearInterval(timer);
    }, 200);
  });
}

/* ===========================
   INSTAGRAM CAROUSEL
=========================== */
function initInstagramCarousel() {
  const scroller = $("ig-scroll");
  if (!scroller) return;

  const leftBtn = document.querySelector(".ig-btn.ig-left");
  const rightBtn = document.querySelector(".ig-btn.ig-right");
  if (!leftBtn || !rightBtn) return;

  const getStep = () => Math.max(240, Math.floor(scroller.clientWidth * 0.9));

  leftBtn.addEventListener("click", () => {
    scroller.scrollBy({ left: -getStep(), behavior: "smooth" });
  });

  rightBtn.addEventListener("click", () => {
    scroller.scrollBy({ left: getStep(), behavior: "smooth" });
  });
}

/* ===========================
   INIT
=========================== */
function init() {
  initFooterYear();
  initFadeIn();
  initGoogleBooking();
  initInstagramCarousel();
  initInfoCarousel();
  initWhatsAppConfirm();
}

document.addEventListener("DOMContentLoaded", init);

function initInfoCarousel() {
  const scroller = document.getElementById("info-scroll");
  if (!scroller) return;

  const leftBtn = document.querySelector(".info-btn.info-left");
  const rightBtn = document.querySelector(".info-btn.info-right");
  if (!leftBtn || !rightBtn) return;

  const getStep = () => Math.max(240, Math.floor(scroller.clientWidth * 0.9));

  leftBtn.addEventListener("click", () => {
    scroller.scrollBy({ left: -getStep(), behavior: "smooth" });
  });

  rightBtn.addEventListener("click", () => {
    scroller.scrollBy({ left: getStep(), behavior: "smooth" });
  });
}
function initWhatsAppConfirm() {
  const btn = document.getElementById("whats-confirm-btn");
  if (!btn) return;

  const name = ""; // opcional: você pode deixar vazio ou puxar de um input
  const text = encodeURIComponent(WHATSAPP.baseMessage + name);
  const url = `https://wa.me/${WHATSAPP.phoneE164}?text=${text}`;

  btn.href = url;
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => console.log("Service Worker registrado com sucesso"))
      .catch((error) => console.log("Erro ao registrar SW:", error));
  });
}
