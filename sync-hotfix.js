(function(){
  const API_URL = 'https://script.google.com/macros/s/AKfycbz4eI7d0ynxp1CCwsCV5o9LNB_sTXLcO9lVY3LiDAK6/exec';

  function escapeHtml(value){
    return String(value || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;')
      .replace(/\n/g,'<br>');
  }

  function renderNote(note, source){
    const container = document.getElementById('dashboard-container');
    if(!container) return;
    const text = String(note || '').trim() || 'Week 1 starts Tuesday, May 5th. Please arrive early, check in with your group, and make sure GHIN scores are posted after the round.';
    let card = document.getElementById('commissioner-note-card');
    if(!card){
      card = document.createElement('div');
      card.id = 'commissioner-note-card';
      card.className = 'dashboard-panel update-card';
      container.insertBefore(card, container.firstChild);
    }
    const time = new Date().toLocaleString('en-US', { timeZone:'America/New_York' });
    card.innerHTML = '<div class="update-icon">📣</div><div><div class="update-title">Commissioner Note</div><div class="update-copy">' + escapeHtml(text) + '</div><div class="data-source-note">Data source: ' + escapeHtml(source || 'Google Sheets') + ' · Updated ' + escapeHtml(time) + '</div></div>';
  }

  function loadViaJSONP(){
    return new Promise((resolve, reject) => {
      const cb = 'hgglSyncHotfix_' + Date.now() + '_' + Math.floor(Math.random()*100000);
      const script = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('JSONP timeout')); }, 12000);
      function cleanup(){ clearTimeout(timer); try{ delete window[cb]; }catch(e){ window[cb]=undefined; } if(script.parentNode) script.parentNode.removeChild(script); }
      window[cb] = function(json){ cleanup(); resolve(json); };
      script.onerror = function(){ cleanup(); reject(new Error('JSONP load error')); };
      script.src = API_URL + '?action=getLeagueData&callback=' + encodeURIComponent(cb) + '&v=' + Date.now();
      document.head.appendChild(script);
    });
  }

  async function run(){
    try{
      const res = await fetch(API_URL + '?action=getLeagueData&v=' + Date.now(), { cache:'no-store' });
      const json = await res.json();
      if(json && json.ok){ renderNote(json.data && json.data.commissionerNote, 'Google Sheets'); return; }
      throw new Error((json && json.error) || 'API returned non-ok response');
    }catch(fetchErr){
      console.warn('Normal Sheet fetch failed. Trying JSONP hotfix.', fetchErr);
      try{
        const json = await loadViaJSONP();
        if(json && json.ok){ renderNote(json.data && json.data.commissionerNote, 'Google Sheets JSONP'); return; }
        throw new Error((json && json.error) || 'JSONP returned non-ok response');
      }catch(jsonpErr){
        console.warn('Sheet note hotfix failed.', jsonpErr);
        renderNote(localStorage.getItem('hggl2026_commissioner_note'), 'local fallback');
      }
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else setTimeout(run, 0);
})();