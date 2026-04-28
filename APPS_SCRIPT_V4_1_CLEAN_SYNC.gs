const SHEET_ID = '1farVdLYv8ApL44yAe-_c6UvPJQjA5P-jvwY6h2h4FGU';
const ADMIN_KEY = 'hggl2026-hiscock-drexler';
const SCRIPT_VERSION = 'hggl-v4-1-clean-mobile-sync';

const SHEETS = {
  teams: 'Teams',
  players: 'Players',
  schedule: 'Schedule',
  results: 'Results',
  standings: 'Standings',
  note: 'CommissionerNote',
  settings: 'Settings'
};

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = String(params.action || 'getLeagueData');
    const callback = params.callback || '';

    let payload = {};
    if (params.payload) {
      try {
        payload = JSON.parse(params.payload || '{}');
      } catch (jsonErr) {
        throw new Error('Invalid payload JSON: ' + jsonErr.message);
      }
    }

    payload = {
      ...payload,
      adminKey: payload.adminKey || params.adminKey || '',
      note: payload.note || params.note || '',
      resultId: payload.resultId || params.resultId || '',
      result: payload.result || null
    };

    let response;

    if (action === 'version') {
      response = { ok: true, version: SCRIPT_VERSION };
    } else if (action === 'getLeagueData') {
      response = { ok: true, data: getLeagueData_() };
    } else {
      if (!isValidAdminKey_(payload.adminKey)) {
        response = {
          ok: false,
          error: 'Invalid admin key.',
          submittedLength: normalizeKey_(payload.adminKey).length,
          expectedLength: normalizeKey_(ADMIN_KEY).length
        };
      } else if (action === 'saveCommissionerNote') {
        response = { ok: true, note: saveCommissionerNote_(payload.note) };
      } else if (action === 'saveResult') {
        response = { ok: true, result: saveResult_(payload.result) };
      } else if (action === 'updateResult') {
        response = { ok: true, result: updateResult_(payload.resultId, payload.result) };
      } else if (action === 'deleteResult') {
        response = { ok: true, deleted: deleteResult_(payload.resultId) };
      } else {
        response = { ok: false, error: 'Unknown GET action: ' + action };
      }
    }

    return outputResponse_(response, callback);
  } catch (err) {
    const callback = e && e.parameter && e.parameter.callback ? e.parameter.callback : '';
    return outputResponse_({ ok: false, error: err.message || String(err) }, callback);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = payload.action || '';

    if (!isValidAdminKey_(payload.adminKey)) {
      return jsonResponse({
        ok: false,
        error: 'Invalid admin key.',
        submittedLength: normalizeKey_(payload.adminKey).length,
        expectedLength: normalizeKey_(ADMIN_KEY).length
      });
    }

    if (action === 'saveCommissionerNote') return jsonResponse({ ok: true, note: saveCommissionerNote_(payload.note) });
    if (action === 'saveResult') return jsonResponse({ ok: true, result: saveResult_(payload.result) });
    if (action === 'updateResult') return jsonResponse({ ok: true, result: updateResult_(payload.resultId, payload.result) });
    if (action === 'deleteResult') return jsonResponse({ ok: true, deleted: deleteResult_(payload.resultId) });

    return jsonResponse({ ok: false, error: 'Unknown POST action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message || String(err) });
  }
}

function getLeagueData_() {
  return {
    teams: sheetToObjects_(SHEETS.teams),
    players: sheetToObjects_(SHEETS.players),
    schedule: sheetToObjects_(SHEETS.schedule),
    results: sheetToObjects_(SHEETS.results),
    standings: sheetToObjects_(SHEETS.standings),
    commissionerNote: getCommissionerNote_(),
    settings: sheetToObjects_(SHEETS.settings)
  };
}

function saveResult_(result) {
  if (!result) throw new Error('Missing result payload.');

  const sheet = getSheet_(SHEETS.results);
  const headers = getHeaders_(sheet);
  const resultId = result.resultId || Utilities.getUuid();
  const submittedAt = new Date();

  const scoreJson = JSON.stringify(result.playerScores || {
    playersSnapshot: result.playersSnapshot || [],
    scoreSnapshot: result.scoreSnapshot || {}
  });

  const rowObject = {
    ResultID: resultId,
    MatchID: result.matchId || result.MatchID || '',
    Week: result.week || '',
    Date: result.date || '',
    'Match #': result.matchNumber || result.matchNo || result['Match #'] || '',
    Side: result.side || '',
    Team1: result.team1 || '',
    'Team 1': result.team1 || '',
    Team2: result.team2 || '',
    'Team 2': result.team2 || '',
    Team1HolesWon: Number(result.team1HolesWon || 0),
    'Team 1 Holes Won': Number(result.team1HolesWon || 0),
    Team2HolesWon: Number(result.team2HolesWon || 0),
    'Team 2 Holes Won': Number(result.team2HolesWon || 0),
    Winner: result.winner || '',
    MatchResult: result.matchResult || '',
    'Result Text': result.matchResult || '',
    CombinedNetTiebreaker: result.combinedNetTiebreaker || '',
    HardestHolesTiebreaker: result.hardestHolesTiebreaker || '',
    NetBirdiesTiebreaker: result.netBirdiesTiebreaker || '',
    GrossParsTiebreaker: result.grossParsTiebreaker || '',
    PlayerScoresJSON: scoreJson,
    'Score Snapshot JSON': scoreJson,
    SubmittedBy: result.submittedBy || '',
    'Entered By': result.submittedBy || '',
    SubmittedAt: submittedAt,
    'Entered At': submittedAt,
    UpdatedAt: '',
    Notes: result.notes || ''
  };

  sheet.appendRow(headers.map(h => rowObject[h] !== undefined ? rowObject[h] : ''));
  recalcStandingsFromResults_();
  return rowObject;
}

function updateResult_(resultId, result) {
  if (!resultId) throw new Error('Missing resultId.');
  if (!result) throw new Error('Missing result payload.');

  const sheet = getSheet_(SHEETS.results);
  const headers = getHeaders_(sheet);
  const idCol = headers.indexOf('ResultID') + 1;
  if (idCol < 1) throw new Error('Results sheet must include ResultID header.');

  const rowNum = findRowByValue_(sheet, idCol, resultId);
  if (!rowNum) throw new Error('Result not found: ' + resultId);

  const existing = rowToObject_(sheet, rowNum, headers);
  const scoreJson = JSON.stringify(result.playerScores || {
    playersSnapshot: result.playersSnapshot || [],
    scoreSnapshot: result.scoreSnapshot || {}
  });

  const updated = {
    ...existing,
    ResultID: resultId,
    MatchID: result.matchId || result.MatchID || existing.MatchID || '',
    Week: result.week || existing.Week || '',
    Date: result.date || existing.Date || '',
    'Match #': result.matchNumber || result.matchNo || result['Match #'] || existing['Match #'] || '',
    Side: result.side || existing.Side || '',
    Team1: result.team1 || existing.Team1 || existing['Team 1'] || '',
    'Team 1': result.team1 || existing['Team 1'] || existing.Team1 || '',
    Team2: result.team2 || existing.Team2 || existing['Team 2'] || '',
    'Team 2': result.team2 || existing['Team 2'] || existing.Team2 || '',
    Team1HolesWon: Number(result.team1HolesWon || existing.Team1HolesWon || existing['Team 1 Holes Won'] || 0),
    'Team 1 Holes Won': Number(result.team1HolesWon || existing['Team 1 Holes Won'] || existing.Team1HolesWon || 0),
    Team2HolesWon: Number(result.team2HolesWon || existing.Team2HolesWon || existing['Team 2 Holes Won'] || 0),
    'Team 2 Holes Won': Number(result.team2HolesWon || existing['Team 2 Holes Won'] || existing.Team2HolesWon || 0),
    Winner: result.winner || existing.Winner || '',
    MatchResult: result.matchResult || existing.MatchResult || existing['Result Text'] || '',
    'Result Text': result.matchResult || existing['Result Text'] || existing.MatchResult || '',
    CombinedNetTiebreaker: result.combinedNetTiebreaker || existing.CombinedNetTiebreaker || '',
    HardestHolesTiebreaker: result.hardestHolesTiebreaker || existing.HardestHolesTiebreaker || '',
    NetBirdiesTiebreaker: result.netBirdiesTiebreaker || existing.NetBirdiesTiebreaker || '',
    GrossParsTiebreaker: result.grossParsTiebreaker || existing.GrossParsTiebreaker || '',
    PlayerScoresJSON: scoreJson,
    'Score Snapshot JSON': scoreJson,
    SubmittedBy: result.submittedBy || existing.SubmittedBy || existing['Entered By'] || '',
    'Entered By': result.submittedBy || existing['Entered By'] || existing.SubmittedBy || '',
    UpdatedAt: new Date()
  };

  sheet.getRange(rowNum, 1, 1, headers.length).setValues([headers.map(h => updated[h] !== undefined ? updated[h] : '')]);
  return updated;
}

function deleteResult_(resultId) {
  if (!resultId) throw new Error('Missing resultId.');
  const sheet = getSheet_(SHEETS.results);
  const headers = getHeaders_(sheet);
  const idCol = headers.indexOf('ResultID') + 1;
  if (idCol < 1) throw new Error('Results sheet must include ResultID header.');
  const rowNum = findRowByValue_(sheet, idCol, resultId);
  if (!rowNum) throw new Error('Result not found: ' + resultId);
  sheet.deleteRow(rowNum);
  recalcStandingsFromResults_();
  return resultId;
}

function getCommissionerNote_() {
  const sheet = getSheet_(SHEETS.note);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return '';
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const settingCol = headers.indexOf('setting');
  const valueCol = headers.indexOf('value');

  if (settingCol !== -1 && valueCol !== -1) {
    for (let i = 1; i < values.length; i++) {
      const setting = String(values[i][settingCol] || '').trim().toLowerCase();
      if (setting === 'commissionernote' || setting === 'commissioner note') return values[i][valueCol] || '';
    }
  }

  const noteCol = headers.indexOf('note');
  if (noteCol !== -1) return values[1][noteCol] || '';
  return values[1][1] || values[1][0] || '';
}

function saveCommissionerNote_(note) {
  const sheet = getSheet_(SHEETS.note);
  const values = sheet.getDataRange().getValues();

  if (values.length === 0) {
    sheet.appendRow(['Setting', 'Value', 'UpdatedAt']);
    sheet.appendRow(['CommissionerNote', note || '', new Date()]);
    return note || '';
  }

  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const settingCol = headers.indexOf('setting');
  const valueCol = headers.indexOf('value');
  const updatedCol = headers.indexOf('updatedat');

  if (settingCol !== -1 && valueCol !== -1) {
    for (let i = 1; i < values.length; i++) {
      const setting = String(values[i][settingCol] || '').trim().toLowerCase();
      if (setting === 'commissionernote' || setting === 'commissioner note') {
        sheet.getRange(i + 1, valueCol + 1).setValue(note || '');
        if (updatedCol !== -1) sheet.getRange(i + 1, updatedCol + 1).setValue(new Date());
        return note || '';
      }
    }

    const newRow = new Array(headers.length).fill('');
    newRow[settingCol] = 'CommissionerNote';
    newRow[valueCol] = note || '';
    if (updatedCol !== -1) newRow[updatedCol] = new Date();
    sheet.appendRow(newRow);
    return note || '';
  }

  const noteCol = headers.indexOf('note');
  const updatedAtCol = headers.indexOf('updatedat');
  if (noteCol !== -1) {
    if (sheet.getLastRow() < 2) {
      const newRow = new Array(headers.length).fill('');
      newRow[noteCol] = note || '';
      if (updatedAtCol !== -1) newRow[updatedAtCol] = new Date();
      sheet.appendRow(newRow);
    } else {
      sheet.getRange(2, noteCol + 1).setValue(note || '');
      if (updatedAtCol !== -1) sheet.getRange(2, updatedAtCol + 1).setValue(new Date());
    }
    return note || '';
  }

  sheet.getRange(2, 2).setValue(note || '');
  return note || '';
}

function isValidAdminKey_(adminKey) {
  return normalizeKey_(adminKey) === normalizeKey_(ADMIN_KEY);
}

function normalizeKey_(value) {
  return String(value || '').trim().replace(/\s+/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

function sheetToObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(h => String(h).trim());
  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => { obj[header] = row[i]; });
      return obj;
    });
}

function getSheet_(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing sheet tab: ' + sheetName);
  return sheet;
}

function getHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) throw new Error('Sheet has no headers: ' + sheet.getName());
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
}

function rowToObject_(sheet, rowNum, headers) {
  const row = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  const obj = {};
  headers.forEach((header, i) => { obj[header] = row[i]; });
  return obj;
}

function findRowByValue_(sheet, colNum, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const values = sheet.getRange(2, colNum, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(value)) return i + 2;
  }
  return null;
}

function outputResponse_(response, callback) {
  if (callback) {
    const safeCallback = String(callback).replace(/[^\w.$]/g, '');
    return ContentService
      .createTextOutput(safeCallback + '(' + JSON.stringify(response) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(response);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


function recalcStandingsNow() {
  return recalcStandingsFromResults_();
}

function recalcStandingsFromResults_() {
  const teamsSheet = getSheet_(SHEETS.teams);
  const standingsSheet = getSheet_(SHEETS.standings);
  const teams = getActiveTeamNames_(teamsSheet);
  const results = sheetToObjects_(SHEETS.results);

  const standings = {};

  teams.forEach(team => {
    standings[team] = {
      Team: team,
      W: 0,
      L: 0,
      HW: 0,
      HL: 0,
      HDiff: 0,
      Matches: 0,
      WinPct: ''
    };
  });

  results.forEach(row => {
    const team1 = normalizeTeamNameForStandings_(row['Team 1'] || row.Team1 || '');
    const team2 = normalizeTeamNameForStandings_(row['Team 2'] || row.Team2 || '');
    const winner = normalizeTeamNameForStandings_(row.Winner || '');
    const team1HolesWon = Number(row['Team 1 Holes Won'] || row.Team1HolesWon || 0);
    const team2HolesWon = Number(row['Team 2 Holes Won'] || row.Team2HolesWon || 0);

    if (!team1 || !team2) return;

    if (!standings[team1]) standings[team1] = { Team: team1, W: 0, L: 0, HW: 0, HL: 0, HDiff: 0, Matches: 0, WinPct: '' };
    if (!standings[team2]) standings[team2] = { Team: team2, W: 0, L: 0, HW: 0, HL: 0, HDiff: 0, Matches: 0, WinPct: '' };

    standings[team1].Matches += 1;
    standings[team2].Matches += 1;
    standings[team1].HW += team1HolesWon;
    standings[team1].HL += team2HolesWon;
    standings[team2].HW += team2HolesWon;
    standings[team2].HL += team1HolesWon;

    if (winner === team1) {
      standings[team1].W += 1;
      standings[team2].L += 1;
    } else if (winner === team2) {
      standings[team2].W += 1;
      standings[team1].L += 1;
    }
  });

  let rows = Object.values(standings).map(team => {
    team.HDiff = team.HW - team.HL;
    team.WinPct = team.Matches ? team.W / team.Matches : '';
    return team;
  });

  rows.sort((a, b) => {
    if (b.W !== a.W) return b.W - a.W;
    if (a.L !== b.L) return a.L - b.L;
    if (b.HW !== a.HW) return b.HW - a.HW;
    return a.Team.localeCompare(b.Team);
  });

  const outputHeaders = [
    'Rank',
    'Team',
    'W',
    'L',
    'HW',
    'HL',
    'HDiff',
    'Matches',
    'Win %',
    'Opening Round If Playoffs Started Today'
  ];

  const playoffMatchups = {};
  rows.forEach((team, index) => {
    const rank = index + 1;
    const opponentRank = 9 - rank;
    const opponent = rows[opponentRank - 1];
    playoffMatchups[team.Team] = opponent ? 'vs ' + opponent.Team : '';
  });

  const outputRows = rows.map((team, index) => [
    index + 1,
    team.Team,
    team.W,
    team.L,
    team.HW,
    team.HL,
    team.HDiff,
    team.Matches,
    team.WinPct,
    playoffMatchups[team.Team] || ''
  ]);

  standingsSheet.clearContents();
  standingsSheet.getRange(1, 1, 1, outputHeaders.length).setValues([outputHeaders]);

  if (outputRows.length) {
    standingsSheet.getRange(2, 1, outputRows.length, outputHeaders.length).setValues(outputRows);
  }

  standingsSheet.setFrozenRows(1);
  standingsSheet.autoResizeColumns(1, outputHeaders.length);

  return outputRows;
}

function getActiveTeamNames_(teamsSheet) {
  const values = teamsSheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h).trim());
  const displayNameCol = headers.indexOf('Display Name');
  const shortNameCol = headers.indexOf('Short Name');
  const statusCol = headers.indexOf('Status');

  return values.slice(1)
    .filter(row => {
      if (statusCol === -1) return true;
      return String(row[statusCol] || '').trim().toLowerCase() === 'active';
    })
    .map(row => {
      const name = displayNameCol !== -1 ? row[displayNameCol] : shortNameCol !== -1 ? row[shortNameCol] : '';
      return normalizeTeamNameForStandings_(name);
    })
    .filter(Boolean);
}

function normalizeTeamNameForStandings_(team) {
  const value = String(team || '').trim();
  if (!value) return '';

  const lower = value.toLowerCase();
  if (
    lower === 'the putter goons' ||
    lower === 'putter goons' ||
    lower === 'the putting goons' ||
    lower === 'putting goons'
  ) {
    return 'Putting Goons';
  }

  return value;
}
