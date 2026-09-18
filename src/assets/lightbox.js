/* ==========================================================
   Lightbox — zoom por clique em todas as imagens de conteúdo
   Sem dependências. Emparelhado com /static/lightbox.css
   Uso: <script src="/static/lightbox.js" defer></script>
   ========================================================== */
(function () {
  'use strict';

  var SELECTOR = 'main img, figure img, .hero-photo img, .flowcard img, .photo-grid img';

  function captionFor(img) {
    // 1) figcaption irmão / pai figure
    var fig = img.closest('figure');
    if (fig) {
      var fc = fig.querySelector('figcaption');
      if (fc && fc.textContent.trim()) return fc.textContent.trim();
    }
    // 2) .caption irmão (hero-photo, flowcard p)
    var box = img.closest('.hero-photo, .flowcard, figure');
    if (box) {
      var cap = box.querySelector('.caption, figcaption, p');
      // evita pegar parágrafo longo demais do flowcard? mantém curto
      if (cap && cap.textContent.trim() && cap.textContent.trim().length < 300) {
        return cap.textContent.trim();
      }
    }
    // 3) fallback: alt
    return (img.getAttribute('alt') || '').trim();
  }

  function buildOverlay() {
    if (document.getElementById('lb-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'lb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Visualização ampliada da imagem');

    overlay.innerHTML =
      '<div id="lb-content">' +
        '<button id="lb-close" type="button" aria-label="Fechar (Esc)">&times;</button>' +
        '<img id="lb-img" alt="">' +
        '<div id="lb-caption" aria-live="polite"></div>' +
        '<div id="lb-hint">Clique na imagem ou pressione Esc para fechar</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var img = overlay.querySelector('#lb-img');
    var btn = overlay.querySelector('#lb-close');

    function close() { closeLightbox(); }

    btn.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    img.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    // clique no fundo fecha; clique no content (fora da img) também fecha
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('lb-open')) close();
    });
  }

  function openLightbox(src, caption, alt) {
    var overlay = document.getElementById('lb-overlay');
    var big = document.getElementById('lb-img');
    var capEl = document.getElementById('lb-caption');
    if (!overlay || !big) return;
    big.src = src;
    big.alt = alt || caption || 'Imagem ampliada';
    capEl.textContent = caption || '';
    capEl.style.display = caption ? '' : 'none';
    overlay.classList.add('lb-open');
    document.body.classList.add('lb-locked');
    var btn = document.getElementById('lb-close');
    if (btn) btn.focus({ preventScroll: true });
  }

  function closeLightbox() {
    var overlay = document.getElementById('lb-overlay');
    if (!overlay) return;
    overlay.classList.add('lb-closing');
    overlay.classList.remove('lb-open');
    document.body.classList.remove('lb-locked');
    setTimeout(function () { overlay.classList.remove('lb-closing'); }, 260);
  }

  function wire() {
    buildOverlay();
    var imgs = document.querySelectorAll(SELECTOR);
    imgs.forEach(function (img) {
      if (img.dataset.lbWired) return;
      img.dataset.lbWired = '1';
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('title', 'Clique para ampliar');
      // teclado: Enter / Espaço abre
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          img.click();
        }
      });
      img.addEventListener('click', function () {
        var src = img.currentSrc || img.src;
        openLightbox(src, captionFor(img), img.getAttribute('alt') || '');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
