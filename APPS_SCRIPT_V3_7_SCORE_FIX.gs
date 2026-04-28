const SHEET_ID = '1farVdLYv8ApL44yAe-_c6UvPJQjA5P-jvwY6h2h4FGU';
const ADMIN_KEY = 'hggl2026-hiscock-drexler';
const SCRIPT_VERSION = 'hggl-v3-7-score-results-fix';

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
