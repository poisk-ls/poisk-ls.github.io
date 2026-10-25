# ρԾɿՏƙ-ʅՏ — static site

This project is a Jekyll-free static website migrated from the original source.

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- JSON data files
- SweetAlert2
- Font Awesome 6

## Structure

- `/index.html` — main entry point
- `/pages/` — generated content pages
- `/assets/css/` — browser-ready CSS
- `/assets/js/` — JavaScript modules
- `/assets/data/` — site/navigation/content/settings JSON
- `/assets/img/` — images and icons

No Jekyll, Liquid, Ruby, Sass source, `_site`, `_layouts`, `_includes`, `_posts`, or `_sass` directories are required.


## Running offline (file://)

The site works when you open the files straight from disk - no server, no internet:
double-click `index.html` (or open any file in `pages/`).

- `assets/js/file-compat.js` runs first on every page. On `file://` it points internal
  links at their real `.html` files and answers `fetch()` of the JSON data from
  `assets/js/offline-data.js`. On a web server it does nothing.
- Fonts, icons and SweetAlert2 are self-hosted in `assets/vendor/`.
- **After editing anything in `assets/data/*.json`, regenerate the offline copy:**
  `node tools/build-offline-data.js` (or `python tools/build-offline-data.py`).
- Open pages with their extension (`pages/about.html`). A browser cannot resolve a typed
  `.../pages/about` on `file://`; only a web server can.
- Still online-only: Giscus comments, Google Analytics, the Google Drive resume preview
  and the animated title banners on the repo posts.

## Deployment (automatic)

Every push to `main`/`master` runs `.github/workflows/deploy.yml`, which:

1. regenerates `assets/js/offline-data.js` from `assets/data/*.json`,
2. stamps the commit SHA into `service-worker.js` (`CACHE_VERSION`) and into every local
   `.css`/`.js` URL in the HTML (`?v=<sha>`) with `tools/stamp-version.js`,
3. publishes the result to GitHub Pages,
4. polls the live site until it serves that exact commit (the job fails if it does not).

**One-time setup:** repository *Settings -> Pages -> Build and deployment -> Source: GitHub Actions*.

You no longer bump `?v=` or `CACHE_VERSION` by hand. Do not run `stamp-version.js` on your
working copy; it is meant for the build output only.

### Why edits used to show up late

GitHub Pages sends `Cache-Control: max-age=600`, and the service worker served scripts
"stale-while-revalidate" (the old copy first). Now the worker revalidates every same-origin
request (`cache: 'no-cache'`), serves scripts network-first, every deploy installs a new worker,
and open pages reload once when the new worker takes over.
