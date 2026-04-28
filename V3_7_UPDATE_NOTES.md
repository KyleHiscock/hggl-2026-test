# HGGL V3.7 Score + Results Fix

This update fixes two score-sync issues:

1. Results were being saved to camelCase/no-space column names like `Team1`, `Team1HolesWon`, and `MatchResult`, but the Google Sheet template uses headers like `Team 1`, `Team 1 Holes Won`, and `Result Text`. The Apps Script now writes to both naming styles so the sheet formulas work.

2. The admin scorecard was counting a match as incomplete if the match closed early, such as 4&3 or 5&2, even when all 9 holes were filled in. The admin scorecard now keeps counting completed holes after a match is mathematically closed, while preserving the official match result.

## Required steps

1. Replace all GitHub files with this package.
2. In Apps Script, replace your full Code.gs with `APPS_SCRIPT_V3_7_SCORE_FIX.gs`.
3. Save and redeploy Apps Script as a new version.
4. Delete any bad test rows in the Results tab that were created before this fix.
5. Test one match again.
