# Apps Script V3.5 Patch — Admin Writes via JSONP

The public Google Sheets read is working, but browser POST requests from GitHub Pages can fail with `Failed to fetch` because Apps Script web-app responses do not behave like a normal CORS API.

Replace your current `doGet(e)` function in Apps Script with the version below. This allows both reads and admin writes through the same JSONP callback method that is already working for the public site.

```javascript
function doGet(e) {
  try {
    const action = (e.parameter.action || 'getLeagueData').toString();
    const callback = e.parameter.callback;
    let payload = {};

    if (e.parameter.payload) {
      payload = JSON.parse(e.parameter.payload || '{}');
    }

    let response;

    if (action === 'getLeagueData') {
      response = {
        ok: true,
        data: getLeagueData_()
      };
    } else {
      if (!isValidAdminKey_(payload.adminKey)) {
        response = {
          ok: false,
          error: 'Invalid admin key.'
        };
      } else if (action === 'saveResult') {
        response = {
          ok: true,
          result: saveResult_(payload.result)
        };
      } else if (action === 'updateResult') {
        response = {
          ok: true,
          result: updateResult_(payload.resultId, payload.result)
        };
      } else if (action === 'deleteResult') {
        response = {
          ok: true,
          deleted: deleteResult_(payload.resultId)
        };
      } else if (action === 'saveCommissionerNote') {
        response = {
          ok: true,
          note: saveCommissionerNote_(payload.note)
        };
      } else {
        response = {
          ok: false,
          error: 'Unknown GET action: ' + action
        };
      }
    }

    if (callback) {
      const safeCallback = String(callback).replace(/[^\w.$]/g, '');
      return ContentService
        .createTextOutput(safeCallback + '(' + JSON.stringify(response) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return jsonResponse(response);

  } catch (err) {
    const callback = e && e.parameter && e.parameter.callback;
    const response = {
      ok: false,
      error: err.message || String(err)
    };

    if (callback) {
      const safeCallback = String(callback).replace(/[^\w.$]/g, '');
      return ContentService
        .createTextOutput(safeCallback + '(' + JSON.stringify(response) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return jsonResponse(response);
  }
}
```

After replacing `doGet(e)`:

1. Click **Save**.
2. Click **Deploy → Manage deployments**.
3. Click the pencil/edit icon.
4. Choose **New version**.
5. Click **Deploy**.
6. Upload the V3.5 website files to GitHub.
