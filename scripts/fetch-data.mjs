name: Update GvG Data

on:
  schedule:
    # 毎日 19:00 UTC = 04:00 JST
    - cron: '0 19 * * *'
  workflow_dispatch: # 手動実行も可能

jobs:
  fetch:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Fetch data from API
        run: node scripts/fetch-data.mjs

      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/
          if git diff --cached --quiet; then
            echo "No changes to commit"
          else
            git commit -m "Update GvG data $(date -u +%Y-%m-%dT%H:%M:%SZ)"
            git pull --rebase origin main
            git push
          fi
