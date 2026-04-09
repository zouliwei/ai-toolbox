# AI Navigator Directory

A purely static web directory built with Vite, React, and TypeScript. This repository showcases various AI Apps, Companies, and Models linked to a specific design system (Editorial Brutalism).

## Deployment to GitHub Pages

Since this project has no backend and outputs static HTML/CSS/JS files, deploying to GitHub Pages is entirely straightforward.

### Manual Deployment

1. Make sure you have installed all dependencies:
   ```bash
   npm install
   ```

2. Generate the dynamic `data.json` from the CSV files:
   ```bash
   npm run data
   ```

3. Build the production application bundle:
   ```bash
   npm run build
   ```

4. A `dist` directory is generated. This directory contains your static web app.
5. Push the repository to GitHub.
6. Open your repository's **Settings > Pages**.
7. Change the **Source** under Build and deployment to `GitHub Actions`.
8. GitHub provides a default Action workflow to deploy static content via Vite. You can create a file `.github/workflows/deploy.yml` with the contents from Vite's official GitHub Pages deployment guide.

Alternatively, you can just use `gh-pages` library:
```bash
npm install -g gh-pages
npm run build
gh-pages -d dist
```

## Local Development

```bash
# Extract the CSVs and bundle to src/data.json
npm run data

# Run the dev server
npm run dev
```
