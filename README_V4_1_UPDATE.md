# HGGL 2026 Website v4.1

## What changed

- Public site and admin site now use JSONP for Google Sheets sync instead of browser fetch/POST.
- `sync-hotfix.js` is no longer loaded by `index.html`.
- `index.html` and `admin.html` include cache-busted CSS/JS references using `?v=4.1` for mobile browsers.
- Team-name normalization now keeps the official name `Putting Goons` across public/admin sync.
- The visible “Data source” troubleshooting line is removed from the dashboard.
- Apps Script file included: `APPS_SCRIPT_V4_1_CLEAN_SYNC.gs`.
- Apps Script recalculates standings after save/update/delete result.

## Upload to GitHub

Replace these files in the repo root:

- `index.html`
- `admin.html`
- `public.js`
- `admin.js`
- `polish.js`
- `style.css`
- `theme-polished.css`
- `robots.txt`

Do not upload or reference `sync-hotfix.js` anymore.

## Apps Script

If your current Apps Script is already working and standings recalculate correctly, you can leave it. If you want the clean version, replace Code.gs with the contents of:

`APPS_SCRIPT_V4_1_CLEAN_SYNC.gs`

Then deploy a new version.

## Test URLs

Public:
https://kylehiscock.github.io/hggl-2026-test/?v=4.1-mobile-test

Admin:
https://kylehiscock.github.io/hggl-2026-test/admin.html?v=4.1-mobile-test
