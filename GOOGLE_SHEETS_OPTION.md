# Optional Google Sheets Backend

You can use Google Sheets with a GitHub Pages website, but GitHub Pages itself cannot write directly to a private Google Sheet.

The usual free setup is:

1. GitHub Pages hosts the public website.
2. Google Sheets stores results.
3. Google Apps Script acts as a small web-app/API between the website and the Sheet.

## Pros

- Free for a small league.
- Easy to edit raw data from your phone.
- Score/results data is not only stored in one browser.
- You can keep a private master sheet.

## Cons

- More setup.
- Apps Script permissions/deployments can be annoying.
- The public endpoint still needs to be designed carefully if you want only commissioners to submit scores.
- A shared secret in front-end JavaScript is still not true security.

## Best Practical Approach

For this league, start with the included local-storage + export/import backup system.

If you want standings/results to sync automatically across every device, move to Google Sheets + Apps Script next.
