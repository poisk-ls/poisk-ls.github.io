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
