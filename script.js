
  (function(){
    var els = document.querySelectorAll('.reveal, .reveal-group');
    if(!('IntersectionObserver' in window)){
      els.forEach(function(el){ el.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function(el){ observer.observe(el); });
  })();

  // Header стискається при скролі
  (function(){
    var header = document.querySelector('header');
    if(!header) return;
    var onScroll = function(){
      if(window.scrollY > 24){ header.classList.add('is-scrolled'); }
      else{ header.classList.remove('is-scrolled'); }
    };
    window.addEventListener('scroll', onScroll, { passive:true });
    onScroll();
  })();

  // Цифри статистики "рахуються" вгору при появі hero
  (function(){
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nums = document.querySelectorAll('.stat-num');
    if(reduceMotion || !nums.length) return;
    nums.forEach(function(el){
      var full = el.textContent;
      var match = full.match(/^(\d+)/);
      if(!match) return;
      var target = parseInt(match[1], 10);
      var suffixEl = el.querySelector('.accent');
      var suffix = suffixEl ? suffixEl.outerHTML : '';
      var duration = 900;
      var start = null;
      function step(ts){
        if(start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var current = Math.round(progress * target);
        el.innerHTML = current + suffix;
        if(progress < 1){ requestAnimationFrame(step); }
      }
      el.innerHTML = '0' + suffix;
      setTimeout(function(){ requestAnimationFrame(step); }, 500);
    });
  })();

// Форми заявки: honeypot anti-spam + відправка на /api/send-lead
(function(){
  var forms = document.querySelectorAll('.lead-form');
  forms.forEach(function(form){
    var submitBtn = form.querySelector('button[type="button"]');
    if(!submitBtn) return;

    var messageEl = document.createElement('div');
    messageEl.className = 'form-message';
    messageEl.setAttribute('role', 'status');
    messageEl.setAttribute('aria-live', 'polite');
    form.appendChild(messageEl);

    function showMessage(text, type){
      messageEl.textContent = text;
      messageEl.className = type ? 'form-message ' + type : 'form-message';
    }

    submitBtn.addEventListener('click', function(){
      var honeypot = form.querySelector('.hp-field');
      if(honeypot && honeypot.value.trim() !== ''){
        // Поле заповнене — це бот. Мовчки ігноруємо, боту показуємо "успіх",
        // щоб він не намагався обійти захист інакше.
        console.log('Odrzucono (honeypot).');
        return;
      }

      var nameField = form.querySelector('[name="name"]');
      var phoneField = form.querySelector('[name="phone"]');
      var emailField = form.querySelector('[name="email"]');
      var commentField = form.querySelector('[name="comment"]');

      var name = nameField ? nameField.value.trim() : '';
      var phone = phoneField ? phoneField.value.trim() : '';

      if(!name || !phone){
        showMessage('Podaj imię i telefon.', 'error');
        return;
      }

      var payload = {
        name: name,
        phone: phone,
        comment: commentField ? commentField.value.trim() : '',
        company_website: honeypot ? honeypot.value : ''
      };
      if(emailField){ payload.email = emailField.value.trim(); }

      var originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Wysyłanie...';
      showMessage('', '');

      fetch('/api/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function(res){
          return res.json().then(function(data){ return { ok: res.ok, data: data }; });
        })
        .then(function(result){
          if(result.ok && result.data && result.data.ok){
            showMessage('Dziękujemy! Zgłoszenie przyjęte — odezwiemy się wkrótce.', 'success');
            form.reset();
            // Konwersja: zgłoszenie leada (tylko gdy GA załadowane po zgodzie)
            if(window.gtag){ window.gtag('event', 'generate_lead'); }
          } else {
            showMessage('Nie udało się wysłać. Spróbuj ponownie lub zadzwoń: +48 886 645 244.', 'error');
          }
        })
        .catch(function(){
          showMessage('Błąd połączenia. Spróbuj ponownie lub zadzwoń: +48 886 645 244.', 'error');
        })
        .finally(function(){
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        });
    });
  });
})();

// Zgoda na cookies (GDPR) + Google Analytics (GA4) — ładowane WYŁĄCZNIE po akceptacji
(function(){
  var GA_ID = 'G-PKWXLKMBMQ';
  var KEY = 'zinvero_cookie_consent'; // 'granted' | 'denied'
  var gaLoaded = false;

  function readConsent(){
    try { return localStorage.getItem(KEY); } catch(e){ return null; }
  }
  function saveConsent(v){
    try { localStorage.setItem(KEY, v); } catch(e){}
  }

  function loadGA(){
    if(gaLoaded || !GA_ID) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  function buildBanner(){
    var wrap = document.createElement('div');
    wrap.className = 'cookie-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'Zgoda na pliki cookie');

    var p = document.createElement('p');
    p.innerHTML = 'Ta strona używa plików cookie do anonimowej analizy ruchu (Google Analytics), aby stale ją ulepszać. Możesz zaakceptować lub odrzucić.';

    var actions = document.createElement('div');
    actions.className = 'cookie-actions';

    var reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'cookie-btn cookie-reject';
    reject.textContent = 'Odrzuć';

    var accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'cookie-btn cookie-accept';
    accept.textContent = 'Akceptuję';

    function close(){ if(wrap.parentNode){ wrap.parentNode.removeChild(wrap); } }

    accept.addEventListener('click', function(){ saveConsent('granted'); close(); loadGA(); });
    reject.addEventListener('click', function(){ saveConsent('denied'); close(); });

    actions.appendChild(reject);
    actions.appendChild(accept);
    wrap.appendChild(p);
    wrap.appendChild(actions);
    document.body.appendChild(wrap);
  }

  var consent = readConsent();
  if(consent === 'granted'){
    loadGA();
  } else if(consent !== 'denied'){
    if(document.body){ buildBanner(); }
    else { document.addEventListener('DOMContentLoaded', buildBanner); }
  }
})();
