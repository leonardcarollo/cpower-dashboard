# CPower Project Dashboard

Interactive dashboard for CPower project pipeline data, built for ENFRA Solutions.

## What this is

A live, filterable web dashboard showing project sites, technology deployments, peak demand totals, and geographic distribution across ISO regions. Currently uses a static export of the Q1 project list.

## Live site

Once deployed, your dashboard will be available at:
`https://YOUR-GITHUB-USERNAME.github.io/cpower-dashboard/`

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Updating the data

The dashboard reads from `src/projects.json`. To update:
1. Run the export script against the latest Excel file
2. Replace `src/projects.json`
3. Commit and push — GitHub Actions will auto-deploy within a minute

## Roadmap

- Phase 1 (current): Static export of Excel data
- Phase 2: Authentication for team and client access
- Phase 3: Live connection to EaaS App API
