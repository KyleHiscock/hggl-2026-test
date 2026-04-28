// V2.6 polish layer: cleaner dashboard language + playoff matchups + update notes
const COMMISSIONER_NOTE = 'Week 1 starts Tuesday, May 5. Please arrive early, check in with your group, and make sure GHIN scores are posted after the round.';

function formatLastUpdated() {
  if (!RESULTS || !RESULTS.length) return 'Standings update after Week 1 results are entered.';
  const lastWeek = Math.max(...RESULTS.map(r => parseInt(r.week) || 0));
  return 'Updated through Week ' + lastWeek + '.';
}

function buildDashboard() {
  const container = document.getElementById('dashboard-container');
  if(!container) return;
  const sorted = getSortedStandings();
  const leader = sorted[0];
  const nextWeek = SCHEDULE_WEEKS.find(w => !RESULTS.some(r => parseInt(r.week) === w.week)) || SCHEDULE_WEEKS[SCHEDULE_WEEKS.length-1];
  const lastResult = RESULTS[RESULTS.length-1];
  const miniRows = sorted.slice(0,4).map((t,i)=>`<div class="mini-standings-row">
    <div class="mini-rank">${i+1}</div>
    <div class="mini-team">${logoImg(t.name,'mini-logo','m-placeholder')}<div class="mini-team-name">${t.name}</div></div>
    <div class="mini-record">${t.w}-${t.l}</div>
  </div>`).join('');
  const nextHtml = nextWeek ? nextWeek.matchups.map(m=>`<div class="matchup-card">
    <span class="m-time">${m.time}</span>
    <div class="m-team right"><span class="m-name">${m.home}</span>${logoImg(m.home,'m-logo','m-placeholder')}</div>
    <div class="vs-badge">VS</div>
    <div class="m-team">${logoImg(m.away,'m-logo','m-placeholder')}<span class="m-name">${m.away}</span></div>
  </div>`).join('') : '<div class="dash-empty">Schedule coming soon.</div>';

  container.innerHTML = `
    <div class="dashboard-panel update-card">
      <div class="update-icon">📣</div>
      <div>
        <div class="update-title">Commissioner Note</div>
        <div class="update-copy">${COMMISSIONER_NOTE}</div>
      </div>
    </div>
    <div class="dashboard-grid dashboard-grid-two">
      <div class="dash-card"><div class="dash-label">Current #1 Seed</div><div class="dash-value">${leader ? leader.name : 'TBD'}</div><div class="dash-sub">${leader ? `${leader.w}-${leader.l} · ${formatLastUpdated()}` : 'No matches entered yet.'}</div></div>
      <div class="dash-card ice"><div class="dash-label">Latest Result</div><div class="dash-value">${lastResult ? lastResult.matchResult : 'TBD'}</div><div class="dash-sub">${lastResult ? `${lastResult.team1} vs ${lastResult.team2}` : 'Results will appear after Week 1.'}</div></div>
    </div>
    <div class="dashboard-two">
      <div class="dashboard-panel"><div class="panel-title">Next Matchups · Week ${nextWeek ? nextWeek.week : 'TBD'}</div>${nextHtml}</div>
      <div class="dashboard-panel"><div class="panel-title">Standings Snapshot</div>${miniRows || '<div class="dash-empty">Standings will populate after scores are entered.</div>'}</div>
    </div>
    <div class="dashboard-panel playoff-dashboard"><div class="panel-title">If Playoffs Started Today</div><div class="dash-empty" style="margin-bottom:10px">Opening-round bracket based on current standings. All 8 teams make it, then teams reseed after each round.</div><div id="playoff-picture-container"></div></div>`;
  buildPlayoffPicture();
}

function buildResults() {
  const container = document.getElementById('results-container');
  const updated = document.getElementById('results-updated');
  if(updated) updated.textContent = formatLastUpdated();
  if(!RESULTS.length) {
    container.innerHTML = `<div class="no-results"><div class="no-results-icon">🏌️</div><div class="no-results-text">No final results yet<br>Week 1 results will appear here after scorecards are saved.</div></div>`;
    return;
  }
  const byWeek = {};
  RESULTS.forEach(r => { if(!byWeek[r.week]) byWeek[r.week]=[]; byWeek[r.week].push(r); });
  container.innerHTML = Object.keys(byWeek).sort((a,b)=>b-a).map(week => `
    <div class="results-week">
      <div class="results-week-header">Week ${week} Results</div>
      ${byWeek[week].map(r => {
        const t1win = r.winner === r.team1;
        const t2win = r.winner === r.team2;
        return `<div class="result-card">
          <div class="result-teams">
            <div class="result-team">
              ${logoImg(r.team1,'result-logo','result-placeholder')}
              <span class="result-name${t1win?' winner':''}">${r.team1}</span>
            </div>
            <div class="result-score-block">
              <div class="result-matchplay">${r.matchResult}</div>
              <div class="result-side">${r.side}</div>
            </div>
            <div class="result-team right">
              <span class="result-name${t2win?' winner':''}">${r.team2}</span>
              ${logoImg(r.team2,'result-logo','result-placeholder')}
            </div>
          </div>
          <div class="result-detail">${r.playerLine}</div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

function buildSchedule() {
  const el = document.getElementById('schedule-container');
  if(!el) return;
  el.innerHTML = SCHEDULE_WEEKS.map(w => `
    <div class="week-block">
      <div class="week-label">Week ${w.week} · ${w.date} · ${w.side}</div>
      ${w.matchups.map(m => `
        <div class="matchup-card">
          <span class="m-time">${m.time}</span>
          <div class="m-team right"><span class="m-name">${m.home}</span>${logoImg(m.home,'m-logo','m-placeholder')}</div>
          <div class="vs-badge">VS</div>
          <div class="m-team">${logoImg(m.away,'m-logo','m-placeholder')}<span class="m-name">${m.away}</span></div>
        </div>`).join('')}
    </div>`).join('');
}

function polishSectionCopy() {
  const copy = {
    'dashboard-container':'Quick glance at the next tee times, current standings, latest result, and playoff matchups if the bracket started today.',
    'schedule-container':'Weekly matchups, tee times, and front/back nine assignments.',
    'results-container':'Final match results will show here once scores are saved.',
  };
  const standingsUpdated = document.getElementById('standings-updated');
  if(standingsUpdated) standingsUpdated.textContent = formatLastUpdated();
}

polishSectionCopy();
rebuildAll();
