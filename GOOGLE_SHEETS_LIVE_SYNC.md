# HGGL Google Sheets Live Sync

This version is connected to the Google Apps Script web app endpoint:

https://script.google.com/macros/s/AKfycbz4eI7d0ynxp1CCwsCV5o9LNB_sTXLcO9lVY3LiDAK6/exec

## What changed

- Public site reads Teams, Players, Schedule, Results, Standings, CommissionerNote, and Settings from Google Sheets.
- Admin score entry saves match results to the Google Sheet through Apps Script.
- Admin Commissioner Note saves to the Google Sheet.
- Saved results can be removed from the Sheet.
- The site still falls back to local browser data if the Google Sheets request fails.

## Important

Use the `/exec` deployment URL for GitHub Pages. The `/dev` URL is for testing/latest code and generally should not be used on the public site.

## Admin key

The current default AdminKey in the site is:

hggl2026-hiscock-drexler

If you change the AdminKey in the Settings tab of the Google Sheet, enter the new key in the optional Admin API key field when logging into the admin page.
