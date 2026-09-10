
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
