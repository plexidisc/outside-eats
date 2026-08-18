/* ============================================================
   OAuth redirect catcher
   Google/Supabase can return the sign-in token to a page without the
   auth SDK (e.g. the Supabase "Site URL", usually the home page), where
   it just sits in the URL and never becomes a session. Forward any such
   token/code to restaurants.html, which loads the SDK and completes the
   sign-in. The session then persists site-wide via localStorage.
   ============================================================ */
(function () {
  try {
    var path = location.pathname;
    if (/(^|\/)restaurants\.html$/.test(path)) return;      // handled there natively
    var hashTok = location.hash && (location.hash.indexOf('access_token=') > -1 ||
                                    location.hash.indexOf('refresh_token=') > -1 ||
                                    location.hash.indexOf('error=') > -1);
    var codeTok = /[?&]code=/.test(location.search);
    if (hashTok || codeTok) {
      location.replace('/restaurants.html' + location.search + location.hash);
    }
  } catch (e) {}
})();

/* ============================================================
   Outside Eats — shared behaviors
   Click-to-play video facade: keeps thumbnails fast; on click,
   swaps in the YouTube player and plays IN PLACE (no navigation).
   ============================================================ */

/* Pull the 11-char video id out of any watch / shorts / youtu.be / embed URL */
function oeYtId(url){
  if(!url) return '';
  url = String(url);
  var m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if(m) return m[1];
  m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

/* Swap a facade for the live player. Replaces the thumbnail node if present,
   otherwise the element's contents. */
function oePlayVideo(el){
  var id = el.getAttribute('data-yt');
  if(!id) return;
  // The narrow home-page players (Shorts in a slim column) are too small for
  // YouTube to render its own fullscreen control, so add our own expand button.
  // Wide players (e.g. restaurant detail pages) keep YouTube's native button.
  var narrow = el.classList.contains('feature-video') || el.classList.contains('video-card');
  var fsBtn = narrow
    ? '<button type="button" class="oe-fs-btn" aria-label="Full screen" onclick="oeFsVideo(event,\'' + id + '\')">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>'
    : '';
  var player = '<div class="video-playing"><iframe src="https://www.youtube.com/embed/' + id +
    '?autoplay=1&rel=0&playsinline=1" title="Video" ' +
    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
    'allowfullscreen></iframe>' + fsBtn + '</div>';
  var slot = el.querySelector('.oe-thumb') || el.querySelector('.video-thumb');
  if(slot){ slot.outerHTML = player; }
  else { el.innerHTML = player; }
  el.classList.add('is-playing');
  el.removeAttribute('onclick');
}

/* Fullscreen the player box in place (no navigation to YouTube). Used by the
   custom expand button on narrow home-page players; degrades to the iframe's
   native fullscreen on older iOS where elements can't go fullscreen. */
// Open the video in a full-viewport overlay. This is a real "fullscreen" on
// every device (it just covers the screen) and does NOT use the Fullscreen API,
// which iPhone Safari refuses to run on a div/iframe. The large player also
// exposes YouTube's own fullscreen button for true OS fullscreen if wanted.
function oeFsVideo(e, id){
  if(e){ e.stopPropagation(); e.preventDefault(); }
  if(!id) return;
  var ov = document.getElementById('oeVideoOverlay');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'oeVideoOverlay';
    ov.className = 'oe-video-overlay';
    ov.innerHTML = '<button type="button" class="oe-video-overlay-close" aria-label="Close video">✕</button><div class="oe-video-overlay-inner"></div>';
    ov.addEventListener('click', function(ev){
      if(ev.target === ov || ev.target.classList.contains('oe-video-overlay-close')) oeCloseVideoOverlay();
    });
    document.body.appendChild(ov);
  }
  ov.querySelector('.oe-video-overlay-inner').innerHTML =
    '<iframe src="https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1" title="Video" ' +
    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
    'allowfullscreen></iframe>';
  ov.classList.add('open');
  document.documentElement.style.overflow = 'hidden';
}
function oeCloseVideoOverlay(){
  var ov = document.getElementById('oeVideoOverlay');
  if(!ov) return;
  ov.classList.remove('open');
  var inner = ov.querySelector('.oe-video-overlay-inner');
  if(inner) inner.innerHTML = '';   // unload the iframe so playback stops
  document.documentElement.style.overflow = '';
}
document.addEventListener('keydown', function(e){ if(e.key === 'Escape') oeCloseVideoOverlay(); });

/* ============================================================
   Shared sign-in state
   The Supabase session already lives in localStorage under an
   sb-<ref>-auth-token key (written by the sign-in flow on
   restaurants.html). Every page reads it from here, so the
   signed-in state and the account button persist site-wide
   without loading the auth SDK on each page. The button is
   INJECTED at runtime, so it never touches the saved HTML and
   the management tools can neither affect it nor be affected.
   ============================================================ */

function oeAuthSession(){
  try {
    for (var i = 0; i < localStorage.length; i++){
      var k = localStorage.key(i);
      if (k && k.indexOf('sb-') === 0 && k.slice(-11) === '-auth-token'){
        var d = JSON.parse(localStorage.getItem(k));
        if (d && d.expires_at && (Date.now() / 1000) < d.expires_at) return d;
      }
    }
  } catch(e){}
  return null;
}
function oeAuthEmail(){
  var s = oeAuthSession();
  if (!s) return null;
  if (s.user && s.user.email) return s.user.email;
  try {
    var payload = JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return payload.email || null;
  } catch(e){ return null; }
}
function oeStartSignIn(){
  if (typeof openAuthModal === 'function') { openAuthModal(); }
  else { location.href = '/restaurants.html?signin=1'; }
}
function oeSignOut(){
  try {
    var rm = [];
    for (var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if (k && k.indexOf('sb-') === 0) rm.push(k); }
    rm.forEach(function(k){ localStorage.removeItem(k); });
    localStorage.removeItem('oe_favorites');
  } catch(e){}
  location.reload();
}
function oeToggleAuthMenu(e){
  if (e) e.stopPropagation();
  var m = document.getElementById('oeAuthMenu');
  if (m) m.classList.toggle('open');
}
function _oeEsc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function oeRenderAuth(){
  var email = oeAuthEmail();
  var local = email ? email.split('@')[0] : '';

  // Remove any legacy static Sign-In button (e.g. a stale-cached page) so it
  // can never appear alongside the injected one.
  var legacy = document.getElementById('btnSignIn');
  if (legacy && legacy.id !== 'oeAuthBtn') legacy.remove();

  // ── top-nav button (desktop everywhere; mobile only where there is no drawer) ──
  var navLinks = document.querySelector('.nav-links');
  var host = navLinks ? navLinks.parentNode
    : (document.querySelector('.bar1-inner') || document.querySelector('.bar1') || document.querySelector('header'));
  if (host){
    var wrap = document.getElementById('oeAuth');
    if (!wrap){
      wrap = document.createElement('div');
      wrap.id = 'oeAuth';
      wrap.className = 'oe-auth';
      wrap.innerHTML =
        '<button type="button" class="oe-auth-btn" id="oeAuthBtn"></button>' +
        '<div class="oe-auth-menu" id="oeAuthMenu">' +
          '<div class="oe-auth-email" id="oeAuthEmail"></div>' +
          '<button type="button" class="oe-auth-signout" onclick="oeSignOut()">Sign out</button>' +
        '</div>';
      if (navLinks) navLinks.insertAdjacentElement('afterend', wrap);
      else host.appendChild(wrap);
      if (document.querySelector('.slide-nav')) wrap.classList.add('has-drawer');
    }
    var btn = document.getElementById('oeAuthBtn');
    btn.textContent = email ? local : 'Sign In';
    btn.classList.toggle('signed-in', !!email);
    btn.onclick = email ? oeToggleAuthMenu : oeStartSignIn;
    var em = document.getElementById('oeAuthEmail'); if (em) em.textContent = email || '';
    if (!email){ var mm = document.getElementById('oeAuthMenu'); if (mm) mm.classList.remove('open'); }
  }

  // ── mobile drawer entry (skip on restaurants.html, which has its own account panel) ──
  var slideNav = document.querySelector('.slide-nav');
  if (slideNav && !document.getElementById('authPanelSection')){
    var d = document.getElementById('oeAuthDrawer');
    if (!d){
      d = document.createElement('div');
      d.id = 'oeAuthDrawer';
      d.className = 'oe-auth-drawer';
      slideNav.appendChild(d);
    }
    d.innerHTML = email
      ? '<div class="oe-auth-drawer-email">' + _oeEsc(email) + '</div>' +
        '<button type="button" class="slide-nav-item oe-auth-drawer-out" onclick="oeSignOut()">Sign out</button>'
      : '<button type="button" class="slide-nav-item" onclick="oeStartSignIn()">Sign in</button>';
  }
}

document.addEventListener('click', function(e){
  var wrap = document.getElementById('oeAuth');
  var m = document.getElementById('oeAuthMenu');
  if (m && wrap && !wrap.contains(e.target)) m.classList.remove('open');
});
window.addEventListener('storage', oeRenderAuth);
window.addEventListener('pageshow', oeRenderAuth);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', oeRenderAuth);
else oeRenderAuth();
