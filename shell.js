'use strict';
(() => {
  const base = new URL('./',location.href);
  const themes = {
    forest:{name:'Семейный архив',text:'Монограмма М, хвойный и тёплая бумага.',color:'#245342',paper:'#eeeee5',ink:'#253e35'},
    clay:{name:'Дерево рода',text:'Терракота, песочный и знак дерева.',color:'#995d43',paper:'#efe2d4',ink:'#4b372e'},
    modern:{name:'Поколения',text:'Синий, молочный и связи поколений.',color:'#294b68',paper:'#e7edf3',ink:'#243c50'}
  };
  let theme='forest',bundle=null,appearance=null,install=null,report=null,deferredInstall=null;
  try { const saved=new URLSearchParams(location.search).get('theme')||localStorage.getItem('atlas-theme');if(themes[saved])theme=saved; } catch{/* хранилище недоступно — работаем без него */}
  function applyTheme(key){
    if(!themes[key])return;theme=key;document.documentElement.dataset.theme=key;
    try{localStorage.setItem('atlas-theme',key);}catch{/* хранилище недоступно — работаем без него */}
    document.querySelector('meta[name=theme-color]')?.setAttribute('content',themes[key].color);
    document.querySelector('link[rel=manifest]')?.setAttribute('href',new URL(`./${key}.webmanifest`,base).href);
    document.querySelector('link[rel=apple-touch-icon]')?.setAttribute('href',new URL(`./icons/${key}-180.png`,base).href);
    document.querySelector('link[rel=icon]')?.setAttribute('href',new URL(`./icons/${key}-48.png`,base).href);
    document.querySelectorAll('.app-emblem').forEach(el=>el.src=new URL(`./icons/${key}-192.png`,base).href);
    document.querySelectorAll('[data-theme-option]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.themeOption===key)));
  }
  function toast(text){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=text;document.body.append(el);setTimeout(()=>el.remove(),4500);}
  function createDialog(cls){const d=document.createElement('dialog');d.className=cls;document.body.append(d);d.addEventListener('click',e=>{if(e.target.closest('[data-dialog-close]'))d.close();});return d;}
  function showAppearance(){
    if(!appearance||!appearance.isConnected){appearance=createDialog('appearance-dialog');appearance.innerHTML='<div class="appearance-header"><span class="eyebrow">ЦВЕТА И ИКОНКА</span><button data-dialog-close aria-label="Закрыть оформление">×</button></div><h2>Три характера одной истории</h2><p>Выберите оформление перед добавлением на экран iPhone. Цвета и иконка будут сохранены на этом устройстве.</p><div class="design-options">'+Object.entries(themes).map(([key,t])=>`<button class="design-option" data-theme-option="${key}" aria-pressed="${theme===key}"><span class="design-preview" style="--preview-paper:${t.paper};--preview-ink:${t.ink};--preview-accent:${t.color}"><img src="${new URL(`./icons/${key}-192.png`,base).href}" alt="Иконка: ${t.name}"><span class="preview-line"></span><span class="preview-line short"></span></span><strong>${t.name}</strong><small>${t.text}</small></button>`).join('')+'</div><p>Если приложение уже добавлено на экран, для замены самой иконки добавьте его заново после выбора оформления.</p>';}
    applyTheme(theme);appearance.showModal();
  }
  function canInstall(){let framed=true;try{framed=window.top!==window;}catch{/* хранилище недоступно — работаем без него */}return 'serviceWorker' in navigator&&!framed;}
  async function showInstall(){
    if(deferredInstall){await deferredInstall.prompt();deferredInstall=null;return;}
    if(!install||!install.isConnected){install=createDialog('install-dialog');install.innerHTML='<div class="appearance-header"><span class="eyebrow">СЕМЕЙНЫЙ АТЛАС НА ТЕЛЕФОНЕ</span><button data-dialog-close aria-label="Закрыть инструкцию">×</button></div><h2>Всегда под рукой</h2><ol class="install-steps"><li>Откройте эту ссылку в Safari на iPhone.</li><li>Нажмите «Поделиться» в меню Safari.</li><li>Выберите «На экран „Домой“».</li><li>Если показан переключатель «Открывать как веб-приложение», включите его и нажмите «Добавить».</li></ol>'+(canInstall()?'<p>На экране появится иконка «Машинские». Атлас будет открываться отдельным приложением. После первого успешного открытия материалы доступны и без сети, с тем же паролем.</p>':'<p>На экране появится ярлык на атлас. Он открывается через интернет; без сети атлас недоступен.</p>')+'<button class="primary" data-appearance>Выбрать иконку и оформление</button>';}
    install.showModal();
  }
  function openReport(hash=''){
    if(!bundle)return;
    report?.remove();report=document.createElement('section');report.className='report-overlay';report.setAttribute('role','dialog');report.setAttribute('aria-modal','true');report.setAttribute('aria-label','Материалы исследования');
    report.innerHTML='<div class="report-top"><span>Материалы исследования · защищённая копия</span><button data-report-close>Вернуться к древу ×</button></div><iframe class="report-frame" title="Полные материалы семейного исследования" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"></iframe>';
    const anchor=hash.replace(/^#/,'');let doc=bundle.report;
    if(/^[A-Za-z0-9_-]+$/.test(anchor))doc=doc.replace('</body>','<meta name="atlas-anchor" content="'+anchor+'">'+REPORT_ANCHOR_SCRIPT+'</body>');
    report.querySelector('iframe').srcdoc=doc;document.body.append(report);report.querySelector('button').focus();
  }
  // Static script (no code built from data): reads the anchor id from a meta tag, opens parent <details>, scrolls to it.
  const REPORT_ANCHOR_SCRIPT='<script>addEventListener("load",()=>{const m=document.querySelector("meta[name=atlas-anchor]");const t=m&&document.getElementById(m.content);if(t){for(let p=t;p;p=p.parentElement)if(p.tagName==="DETAILS")p.open=true;t.scrollIntoView();}});<'+'/script>';

  // Правки от родственников: форма → веб-приложение Apps Script владельца (таблица + письмо). Сайт сам ничего не меняет.
  const FEEDBACK_URL='https://script.google.com/macros/s/AKfycbwYxYMUWCW7_cSMoWWr4L7x-KK-6zBhV44JJXeemuzSexEubz350jy0Lps77b8H2xy5/exec';
  let feedback=null;
  function shrinkPhoto(file){
    return new Promise((resolve,reject)=>{
      const img=new Image(),url=URL.createObjectURL(file);
      img.onload=()=>{const k=Math.min(1,1600/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',0.85));};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Не удалось прочитать фото.'));};
      img.src=url;
    });
  }
  function currentSubject(){
    const sel=document.querySelector('[aria-selected="true"] h2,[aria-selected="true"] h3,.selected h2,.selected h3,.person-card h2,.person h2,dialog[open] h2');
    return sel?sel.textContent.trim().slice(0,200):'';
  }
  function showFeedback(){
    if(!feedback||!feedback.isConnected){
      feedback=createDialog('install-dialog feedback-dialog');
      feedback.innerHTML='<div class="appearance-header"><span class="eyebrow">ПРАВКА В СЕМЕЙНЫЙ АТЛАС</span><button data-dialog-close aria-label="Закрыть">×</button></div><h2>Предложить правку</h2><p>Напишите, что неверно и как правильно. Тимур посмотрит и внесёт в атлас.</p><form class="feedback-form"><label>Ваше имя<input name="author" required maxlength="120" autocomplete="name"></label><label>О ком или о чём<input name="person" maxlength="300" placeholder="Например: Машинский Иван Петрович, 1890 г.р."></label><label>Что исправить<textarea name="text" required maxlength="5000" rows="5" placeholder="Что сейчас написано и как правильно; откуда известно"></textarea></label><label>Фото документа (необязательно)<input name="photo" type="file" accept="image/*"></label><button class="primary" type="submit">Отправить</button><p class="feedback-status" role="status" aria-live="polite"></p></form>';
      const form=feedback.querySelector('form'),status=feedback.querySelector('.feedback-status');
      form.addEventListener('submit',async e=>{
        e.preventDefault();const btn=form.querySelector('button[type=submit]');if(btn.disabled)return;btn.disabled=true;status.textContent='Отправляю…';
        try{
          const f=form.elements,file=f.photo.files[0];
          const body={author:f.author.value.trim(),person:f.person.value.trim(),text:f.text.value.trim(),page:location.pathname+location.hash};
          if(file)body.photo=await shrinkPhoto(file);
          try{localStorage.setItem('atlas-author',body.author);}catch{/* хранилище недоступно — работаем без него */}
          await fetch(FEEDBACK_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});
          form.reset();feedback.close();toast('Спасибо! Правка отправлена Тимуру.');
        }catch(err){status.textContent=(err&&err.message&&!/fetch/i.test(err.message)?err.message:'Не удалось отправить. Проверьте интернет и попробуйте ещё раз.');}
        finally{btn.disabled=false;if(status.textContent==='Отправляю…')status.textContent='';}
      });
    }
    const f=feedback.querySelector('form').elements;
    try{if(!f.author.value)f.author.value=localStorage.getItem('atlas-author')||'';}catch{/* хранилище недоступно — работаем без него */}
    if(!f.person.value)f.person.value=currentSubject();
    feedback.showModal();
  }
  function addFeedbackButton(){
    if(!FEEDBACK_URL||document.querySelector('.feedback-fab'))return;
    const b=document.createElement('button');b.type='button';b.className='feedback-fab';b.textContent='✎ Предложить правку';b.addEventListener('click',showFeedback);document.body.append(b);
  }
  const fromB64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  // Store a non-exportable device key only after the user opts in. Never store the password or decrypted archive.
  function deviceAccess(action,value){
    return new Promise((resolve,reject)=>{
      let db,tx,finished=false;
      const finish=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);db?.close();error?reject(error):resolve(result);};
      const timer=setTimeout(()=>{try{tx?.abort();}catch{/* хранилище недоступно — работаем без него */}finish(new Error('Хранилище устройства недоступно.'));},4000);
      let opening;
      try{opening=indexedDB.open('mashinsky-device-access',1);}catch(error){finish(error);return;}
      opening.onupgradeneeded=()=>opening.result.createObjectStore('access');
      opening.onerror=()=>finish(opening.error);
      opening.onblocked=()=>finish(new Error('Хранилище устройства занято.'));
      opening.onsuccess=()=>{
        db=opening.result;if(finished){db.close();return;}
        db.onversionchange=()=>db.close();
        try{
          tx=db.transaction('access',action==='get'?'readonly':'readwrite');
          const store=tx.objectStore('access');
          const request=action==='get'?store.get(base.pathname):action==='put'?store.put(value,base.pathname):store.delete(base.pathname);
          tx.oncomplete=()=>finish(null,request.result);
          tx.onerror=()=>finish(tx.error||new Error('Не удалось сохранить доступ.'));
          tx.onabort=()=>finish(tx.error||new Error('Сохранение доступа отменено.'));
        }catch(error){finish(error);}
      };
    });
  }
  const vaultKeyId=config=>[config.format,config.salt,config.iterations,config.hash].join(':');
  async function readVault(setStatus){
    if(!crypto.subtle||typeof DecompressionStream==='undefined')throw new Error('Откройте атлас в обновлённом Safari или другом современном браузере.');
    setStatus('Загружаю защищённые материалы…');
    const r=await fetch(new URL('./vault.json',base),{cache:'no-store'});if(!r.ok)throw new Error('Не удалось загрузить материалы. Проверьте подключение к сети.');
    const config=await r.json();
    if(config.format!=='MashinskyAtlas:1'||config.iterations!==600000||!/^\.\/vault\/atlas-[0-9a-f]{16}\.(bin|txt)$/.test(config.file))throw new Error('Формат материалов не поддерживается. Обновите страницу.');
    const file=await fetch(new URL(config.file,base));if(!file.ok)throw new Error('Не удалось загрузить материалы. Проверьте подключение к сети.');
    const ciphertext=config.file.endsWith('.txt')?fromB64((await file.text()).trim()).buffer:await file.arrayBuffer();setStatus('Открываю семейный архив…');
    return {config,ciphertext};
  }
  async function unlock(password,setStatus){
    const {config,ciphertext}=await readVault(setStatus);
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:fromB64(config.salt),iterations:config.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
    return {decoded:await decryptVault(key,config,ciphertext),key,keyId:vaultKeyId(config)};
  }
  async function decryptVault(key,config,ciphertext){
    let compressed;
    try{compressed=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(config.iv),additionalData:new TextEncoder().encode(config.format)},key,ciphertext);}catch(e){if(e.name==='OperationError'||e.name==='InvalidAccessError'){const error=new Error('Пароль не подошёл. Проверьте символы и попробуйте ещё раз.');error.code='STALE_ACCESS';throw error;}throw e;}
    const raw=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const decoded=JSON.parse(raw);if(!decoded.body||!decoded.script||!decoded.report||!decoded.model?.nodes)throw new Error('Материалы повреждены. Обновите страницу.');return decoded;
  }
  function boot(decoded){
    const reportPage=location.pathname.endsWith('/research.html'),initialHash=location.hash;
    bundle=decoded;document.body.classList.remove('locked');document.body.innerHTML=decoded.body;
    window.__atlasBootError=null;const onErr=ev=>{window.__atlasBootError=ev.error||ev.message;};window.addEventListener('error',onErr);
    const runtime=document.createElement('script');runtime.textContent=decoded.script;document.body.append(runtime);
    window.removeEventListener('error',onErr);
    if(window.__atlasBootError){console.error('atlas runtime',window.__atlasBootError);toast('Часть атласа не загрузилась. Обновите страницу; если повторится — сообщите Тимуру.');}
    applyTheme(theme);window.dispatchEvent(new CustomEvent('atlas-unlocked',{detail:decoded.model}));
    document.querySelector('.private')?.setAttribute('title','Доступ по семейному паролю');
    const logout=document.querySelector('[data-lock]');if(logout){logout.textContent='Выйти';logout.title='Закрыть атлас и удалить сохранённый доступ на этом устройстве';}
    if(reportPage)openReport(initialHash);addFeedbackButton();
  }
  document.addEventListener('click',async e=>{
    const target=e.target;
    if(target.closest('[data-appearance]')){e.preventDefault();install?.close();showAppearance();return;}
    const option=target.closest('[data-theme-option]');if(option){applyTheme(option.dataset.themeOption);toast('Выбрано: '+themes[theme].name);return;}
    if(target.closest('[data-install]')){e.preventDefault();await showInstall();return;}
    if(target.closest('[data-lock]')){e.preventDefault();try{await deviceAccess('delete');location.replace(new URL('./',base));}catch{toast('Не удалось удалить сохранённый доступ. Очистите данные этого сайта в браузере.');}return;}
    if(target.closest('[data-share]')){
      const link=base.href;
      try{if(navigator.share)await navigator.share({title:'Машинские · Семейный атлас',url:link});else {await navigator.clipboard.writeText(link);toast('Ссылка скопирована. Пароль передайте отдельно.');}}catch(e){if(e.name!=='AbortError')toast('Ссылка: '+link);}return;
    }
    if(target.closest('[data-report-close]')){report?.remove();report=null;return;}
    const a=target.closest('a[href]');if(bundle&&a){const href=new URL(a.getAttribute('href'),location.href);if(href.origin===location.origin&&href.pathname.endsWith('/research.html')){e.preventDefault();e.stopImmediatePropagation();openReport(href.hash);}}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&report){report.remove();report=null;}});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
  const form=document.getElementById('unlock-form');if(form){
    const input=document.getElementById('family-password'),status=document.getElementById('unlock-status'),button=document.getElementById('unlock-button'),show=document.getElementById('show-password');
    show.onclick=()=>{const visible=input.type==='password';input.type=visible?'text':'password';show.textContent=visible?'Скрыть':'Показать';show.setAttribute('aria-label',visible?'Скрыть пароль':'Показать пароль');};
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(button.disabled)return;button.disabled=true;status.classList.remove('error-status');const pass=input.value;
      try{
        const access=await unlock(pass,text=>status.textContent=text);input.value='';
        let saveFailed=false;
        if(document.getElementById('remember-device')?.checked){try{await deviceAccess('put',{key:access.key,keyId:access.keyId});}catch{saveFailed=true;}}
        boot(access.decoded);
        if(saveFailed)toast('Атлас открыт, но браузер не разрешил запомнить устройство. В следующий раз потребуется пароль.');
      }catch(err){status.textContent=err.message||'Не удалось открыть атлас. Обновите страницу.';status.classList.add('error-status');button.disabled=false;input.focus();}
    });
    // Restore opted-in access across reloads and browser restarts, including the installed web app.
    button.disabled=true;
    (async()=>{
      try{
        const saved=await deviceAccess('get');if(!saved)return;
        const {config,ciphertext}=await readVault(text=>status.textContent=text);
        if(saved.keyId!==vaultKeyId(config)){await deviceAccess('delete');status.textContent='Материалы обновлены. Введите семейный пароль ещё раз.';return;}
        boot(await decryptVault(saved.key,config,ciphertext));
      }catch(error){
        if(error.code==='STALE_ACCESS'){try{await deviceAccess('delete');}catch{/* хранилище недоступно — работаем без него */}status.textContent='Сохранённый доступ устарел. Введите семейный пароль.';}
        else if(status.textContent)status.textContent='Не удалось открыть сохранённый атлас. Проверьте сеть и обновите страницу или введите пароль.';
      }finally{if(!bundle)button.disabled=false;}
    })();
  }
  applyTheme(theme);
  if(canInstall())navigator.serviceWorker.register(new URL('./sw.js',base),{scope:base.pathname}).catch(()=>{});
})();
