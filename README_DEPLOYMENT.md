# Hockey Guys Golf League Site

## Files

- `index.html` — public league site
- `admin.html` — commissioner/admin score-entry page
- `style.css` — shared styling
- `script.js` — league data, standings, scoring, stats, backups
- `robots.txt` — asks search engines not to index the site

## Important Security Notes

This is still a static website. If hosted on GitHub Pages, anyone who has the public URL can technically open the files.

The admin page is separated from the public site and marked noindex, but the front-end password is not real security. It is a casual barrier only.

For real access control, use Cloudflare Access in front of the site or move score entry to a Google Sheet / Apps Script backend with better controls.

## Recommended GitHub Pages Setup

Upload these files to the root of your GitHub repository and enable GitHub Pages from the main branch.

Public URL:
- `/index.html`

Admin URL:
- `/admin.html`

## Weekly Use

1. Open `admin.html`
2. Sign in
3. Choose the scheduled match from the dropdown
4. Enter player names / GHIN indexes
5. Enter hole-by-hole scores
6. Save match result
7. Export a backup from the Manage tab

## Backup Routine

After every league night, click **Export Backup** and save the JSON file somewhere safe.
