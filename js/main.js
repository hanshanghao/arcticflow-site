(function () {
  'use strict';

  var nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener(
      'scroll',
      function () {
        nav.classList.toggle('scrolled', window.scrollY > 10);
      },
      { passive: true }
    );
  }

  var burger = document.getElementById('burger');
  var navLinks = document.getElementById('navLinks');
  if (burger && navLinks) {
    burger.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  function formatValue(el, v) {
    var d = parseInt(el.dataset.decimals || '0', 10);
    var num = d ? v.toFixed(d) : Math.round(v).toLocaleString();
    return (el.dataset.prefix || '') + num + (el.dataset.suffix || '');
  }

  function animateCounter(el) {
    var target = parseFloat(el.dataset.count);
    var duration = 1700;
    var start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      el.textContent = formatValue(el, target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var counters = document.querySelectorAll('.counter');
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var co = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              animateCounter(e.target);
              co.unobserve(e.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach(function (el) {
        co.observe(el);
      });
    } else {
      counters.forEach(animateCounter);
    }
  }

  var snow = document.getElementById('snow');
  if (snow) {
    for (var i = 0; i < 44; i++) {
      var f = document.createElement('i');
      var s = 2 + Math.random() * 3;
      f.style.cssText =
        'left:' +
        Math.random() * 100 +
        '%;width:' +
        s +
        'px;height:' +
        s +
        'px;opacity:' +
        (0.12 + Math.random() * 0.3) +
        ';animation-duration:' +
        (9 + Math.random() * 14) +
        's;animation-delay:-' +
        Math.random() * 20 +
        's;--sway:' +
        ((Math.random() * 120 - 60) | 0) +
        'px';
      snow.appendChild(f);
    }
  }

  var toTop = document.getElementById('toTop');
  if (toTop) {
    window.addEventListener(
      'scroll',
      function () {
        toTop.classList.toggle('show', window.scrollY > 400);
      },
      { passive: true }
    );
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
