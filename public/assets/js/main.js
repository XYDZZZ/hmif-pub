// assets/js/main.js
// Perilaku yang dipakai bersama di semua halaman publik: toggle nav
// mobile, animasi header saat scroll, dan reveal-on-scroll untuk
// elemen ber-class "reveal" (termasuk kartu yang dirender belakangan
// oleh karya.js/galeri.js/artikel.js/profil.js setelah fetch data).
// Semua pakai API bawaan browser, tanpa library tambahan.

let revealObserver = null;

function getRevealObserver() {
  if (revealObserver) return revealObserver;
  if (!('IntersectionObserver' in window)) return null;

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  return revealObserver;
}

/**
 * Cari semua elemen ber-class "reveal" yang belum diamati, lalu amati
 * supaya muncul (fade + naik) begitu masuk viewport. Aman dipanggil
 * berkali-kali — elemen yang sudah "is-visible" otomatis dilewati.
 * Dipanggil ulang oleh halaman lain setelah merender kartu baru dari
 * Supabase, supaya animasi tetap "satu per satu saat discroll", bukan
 * langsung muncul semua begitu data selesai dimuat.
 */
function initScrollReveal(root = document) {
  const items = root.querySelectorAll('.reveal:not(.is-visible)');
  if (items.length === 0) return;

  const observer = getRevealObserver();
  if (!observer) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  items.forEach((el) => observer.observe(el));
}

// Ekspos ke halaman lain (karya.js, galeri.js, artikel.js, profil.js)
window.initScrollReveal = initScrollReveal;

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('navLinks');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initHeaderScrollBehavior();
  initScrollReveal();
});

/**
 * Kapsul header jadi tembus-pandang + blur begitu discroll sedikit
 * (lihat .site-header.is-scrolled di global.css). Sengaja HANYA
 * berdasar posisi scroll (bukan arah scroll) supaya tidak "geter" saat
 * scroll naik-turun kecil-kecil — satu ambang batas, satu transisi halus.
 */
function initHeaderScrollBehavior() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let ticking = false;

  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
    ticking = false;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );

  onScroll();
}
