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
  var player = '<div class="video-playing"><iframe src="https://www.youtube.com/embed/' + id +
    '?autoplay=1&rel=0&playsinline=1" title="Video" ' +
    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
    'allowfullscreen></iframe></div>';
  var slot = el.querySelector('.oe-thumb') || el.querySelector('.video-thumb');
  if(slot){ slot.outerHTML = player; }
  else { el.innerHTML = player; }
  el.classList.add('is-playing');
  el.removeAttribute('onclick');
}
