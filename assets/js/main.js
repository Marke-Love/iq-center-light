(function () {
  'use strict';

  document.documentElement.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Яндекс.Метрика ---------- */
  var METRIKA_ID = (document.body.getAttribute('data-metrika') || '').trim();
  if (METRIKA_ID) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(Number(METRIKA_ID), 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }
  function goal(name) {
    if (METRIKA_ID && typeof window.ym === 'function') window.ym(Number(METRIKA_ID), 'reachGoal', name);
  }

  document.querySelectorAll('.js-phone').forEach(function (a) {
    a.addEventListener('click', function () { goal('phone_click'); });
  });

  /* ---------- Шапка и мобильная панель ---------- */
  var header = document.querySelector('.header');
  var dock = document.querySelector('.dock');
  var formSection = document.getElementById('form');
  var formInView = false;
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    dock.classList.toggle('is-visible', y > 520 && !formInView);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      formInView = entries[0].isIntersecting;
      onScroll();
    }, { threshold: 0.15 }).observe(formSection);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Бланк ответов в первом экране ---------- */
  var SHEETS = {
    math: { title: 'Математика профиль', kicker: 'БЛАНК ОТВЕТОВ № 1', time: 3 * 3600 + 55 * 60,
      rows: [['12', 1], ['-0,5', 1], ['0,35', 1], ['7', 0], ['64', 1], ['18', 1]] },
    rus: { title: 'Русский язык', kicker: 'БЛАНК ОТВЕТОВ № 1', time: 3 * 3600 + 30 * 60,
      rows: [['35', 1], ['ОДНАКО', 1], ['14', 1], ['ЗВОНИТ', 0], ['125', 1], ['63', 1]] },
    hist: { title: 'История', kicker: 'БЛАНК ОТВЕТОВ № 1', time: 3 * 3600 + 30 * 60,
      rows: [['2413', 1], ['3521', 1], ['1812', 1], ['2465', 1], ['4213', 0], ['65', 1]] },
    inf: { title: 'Информатика', kicker: 'РАБОТА НА КОМПЬЮТЕРЕ', time: 3 * 3600 + 55 * 60,
      rows: [['2100', 1], ['1131', 1], ['28', 1], ['465', 1], ['4', 1], ['63', 0]] }
  };
  var CELLS = 8;
  var tabs = document.querySelectorAll('.tab');
  var rowsEl = document.querySelector('.js-sheet-rows');
  var subjEl = document.querySelector('.js-sheet-subject');
  var kickerEl = document.querySelector('.js-sheet-kicker');
  var timerEl = document.querySelector('.js-timer');
  var stampEl = document.querySelector('.js-stamp');
  var scoreEl = document.querySelector('.js-score');
  var timers = [];
  var tick = null;
  var autoplay = !reduceMotion;
  var order = ['math', 'rus', 'hist', 'inf'];
  var current = 'math';

  function later(fn, ms) { timers.push(setTimeout(fn, reduceMotion ? 0 : ms)); }
  function clearAll() { timers.forEach(clearTimeout); timers = []; clearInterval(tick); }
  function fmt(s) {
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }
  function mark(ok) {
    return '<svg class="row__mark ' + (ok ? 'ok' : 'bad') + '" aria-hidden="true"><use href="#i-' + (ok ? 'check' : 'cross') + '"/></svg>';
  }

  function renderSheet(key) {
    clearAll();
    current = key;
    var s = SHEETS[key];
    subjEl.textContent = s.title;
    kickerEl.textContent = s.kicker;
    stampEl.classList.remove('is-on');
    tabs.forEach(function (t) {
      var on = t.dataset.subject === key;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    var left = s.time;
    timerEl.textContent = fmt(left);
    if (!reduceMotion) tick = setInterval(function () { left -= 1; timerEl.textContent = fmt(left); }, 1000);

    rowsEl.innerHTML = s.rows.map(function (r, i) {
      var cells = '';
      for (var c = 0; c < CELLS; c++) cells += '<i></i>';
      return '<li class="row"><span class="row__n">' + (i + 1) + '</span><span class="row__cells">' + cells + '</span>' + mark(r[1]) + '</li>';
    }).join('');

    var rowEls = rowsEl.querySelectorAll('.row');
    var t = 200;
    s.rows.forEach(function (r, i) {
      var chars = Array.from(r[0]);
      chars.forEach(function (ch, c) {
        later(function () {
          rowEls[i].classList.add('is-typing');
          rowEls[i].querySelectorAll('i')[c].textContent = ch;
        }, t);
        t += 70;
      });
      t += 120;
    });
    s.rows.forEach(function (r, i) {
      later(function () { rowEls[i].classList.add('is-checked'); }, t);
      t += 220;
    });
    var score = s.rows.filter(function (r) { return r[1]; }).length;
    later(function () { scoreEl.textContent = score + '/' + s.rows.length; stampEl.classList.add('is-on'); }, t + 150);
    if (autoplay) later(function () { renderSheet(order[(order.indexOf(current) + 1) % order.length]); }, t + 3400);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { autoplay = false; renderSheet(tab.dataset.subject); });
  });
  renderSheet('math');

  /* ---------- Сетка заданий в отчёте ---------- */
  var reportGrid = document.querySelector('.js-report-grid');
  // o — верно, p — частично, b — неверно (задания 4 и 15 — ошибки, 12 — снят балл)
  var results = 'ooobooooooopoobooooo'.slice(0, 19).split('');
  reportGrid.innerHTML = results.map(function (c, i) {
    var cls = c === 'o' ? 'ok' : c === 'p' ? 'part' : 'bad';
    return '<span class="' + cls + '">' + (i + 1) + '</span>';
  }).join('');

  /* ---------- Появление блоков ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var siblings = Array.prototype.indexOf.call(e.target.parentNode.children, e.target);
        e.target.style.transitionDelay = Math.min(siblings, 6) * 60 + 'ms';
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- FAQ: открыт только один вопрос ---------- */
  var qas = document.querySelectorAll('.qa');
  qas.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) qas.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------- UTM-метки из рекламы ---------- */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid'];
  var params = new URLSearchParams(location.search);
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('iq_utm') || '{}'); } catch (e) { utm = {}; }
  UTM_KEYS.forEach(function (k) { if (params.get(k)) utm[k] = params.get(k); });
  try { sessionStorage.setItem('iq_utm', JSON.stringify(utm)); } catch (e) { /* хранилище недоступно */ }

  /* ---------- Маска телефона ---------- */
  var form = document.querySelector('.js-form');
  var phone = form.elements.phone;
  function digits(v) {
    var d = v.replace(/\D/g, '');
    if (d[0] === '8' || d[0] === '7') d = d.slice(1);
    return d.slice(0, 10);
  }
  function formatPhone(d) {
    if (!d) return '';
    var out = '+7 (' + d.slice(0, 3);
    if (d.length >= 3) out += ') ' + d.slice(3, 6);
    if (d.length >= 6) out += '-' + d.slice(6, 8);
    if (d.length >= 8) out += '-' + d.slice(8, 10);
    return out;
  }
  phone.addEventListener('input', function () {
    phone.value = formatPhone(digits(phone.value));
    phone.closest('.field').classList.remove('is-invalid');
  });
  phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 ('; });
  phone.addEventListener('blur', function () { if (phone.value === '+7 (') phone.value = ''; });

  /* ---------- Отправка формы ---------- */
  var status = form.querySelector('.js-form-status');
  var submitBtn = form.querySelector('button[type="submit"]');
  var modal = document.querySelector('.js-modal');
  var agree = form.elements.agree;
  agree.addEventListener('change', function () { agree.closest('.agree').classList.remove('is-invalid'); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = '';
    status.classList.remove('is-error');

    var ok = true;
    if (digits(phone.value).length !== 10) { phone.closest('.field').classList.add('is-invalid'); ok = false; }
    if (!agree.checked) { agree.closest('.agree').classList.add('is-invalid'); ok = false; }
    if (!ok) { (ok = form.querySelector('.is-invalid input')) && ok.focus(); return; }

    UTM_KEYS.forEach(function (k) { if (form.elements[k]) form.elements[k].value = utm[k] || ''; });
    var data = new FormData(form);
    data.append('page', location.href.split('?')[0]);

    submitBtn.disabled = true;
    var label = submitBtn.firstChild.textContent;
    submitBtn.firstChild.textContent = 'Отправляем…';

    fetch(form.action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || 'send');
        goal('form_submit');
        form.reset();
        if (modal && modal.showModal) modal.showModal();
        else status.textContent = 'Заявка отправлена. Администратор перезвонит в рабочие часы.';
      })
      .catch(function (err) {
        status.classList.add('is-error');
        status.textContent = err.message && err.message !== 'send' && err.message.length < 140
          ? err.message
          : 'Заявка не отправилась. Позвоните нам: +7 906 255-68-86 — запишем по телефону.';
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.firstChild.textContent = label;
      });
  });

  /* ---------- Год в подвале ---------- */
  var year = document.querySelector('.js-year');
  if (year) year.textContent = new Date().getFullYear();
})();
