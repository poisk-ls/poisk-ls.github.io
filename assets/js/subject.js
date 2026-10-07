document.addEventListener('DOMContentLoaded', function () {
    // Loading page
    window.addEventListener('load', () => {
        const loadDiv = document.querySelector('#loading');
        if (loadDiv) {
            setTimeout(() => {
                loadDiv.style.transition = '.75s';
                loadDiv.style.opacity = '0';
                loadDiv.style.visibility = 'hidden';
            }, 800);
        }
    });

    const paginationNumbers = document.querySelector('#pagination-numbers');
    const paginatedList = document.querySelector('.paginated-list');
    if (!paginatedList || !paginationNumbers) return;

    const nextButton = document.querySelector('#next-button');
    const prevButton = document.querySelector('#prev-button');
    const pageKey = 'pageKey=' + location.origin + location.pathname;
    let paginationLimit = 5;
    const S = p => (window.siteUrl ? window.siteUrl(p) : p);
    const SETTINGS_URL = S('/assets/data/settings.json');
    const POSTS_URL = S('/assets/data/posts.json');
    const INDEX_URL = S('/assets/data/search-index.json');
    const FALLBACK_IMAGE = S('/assets/img/thumbnail/empty.jpg');

    // Only real list entries are paginated; the list is re-read after any
    // reconciliation so page counts always match what is in the DOM.
    const getItems = () => Array.from(paginatedList.querySelectorAll(':scope > li'));
    let listItems = getItems();
    let pageCount = 1;
    const computePageCount = () => Math.max(1, Math.ceil(listItems.length / paginationLimit));
    pageCount = computePageCount();
    let currentPage = 1;

    const clampPage = value => {
        const page = Number(value);
        if (!Number.isFinite(page) || !Number.isInteger(page) || page < 1 || page > pageCount) return 1;
        return page;
    };

    const readSavedPage = () => {
        let raw = null;
        try { raw = localStorage.getItem(pageKey); } catch (_) {}
        return clampPage(raw);
    };

    const savePage = page => {
        try { localStorage.setItem(pageKey, String(page)); } catch (_) {}
    };

    // The page number lives in the URL (?page=2) so refresh, back/forward and
    // shared links all land on the same page of the list.
    const readUrlPage = () => {
        try {
            const raw = new URLSearchParams(location.search).get('page');
            return raw === null ? null : clampPage(raw);
        } catch (_) { return null; }
    };

    const writeUrlPage = page => {
        try {
            const url = new URL(location.href);
            if (page > 1) url.searchParams.set('page', String(page));
            else url.searchParams.delete('page');
            history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        } catch (_) {}
    };

    const disableButton = button => {
        if (!button) return;
        button.classList.add('disabled');
        button.disabled = true;
    };

    const enableButton = button => {
        if (!button) return;
        button.classList.remove('disabled');
        button.disabled = false;
    };

    const handlePageButtonsStatus = () => {
        if (currentPage <= 1) disableButton(prevButton); else enableButton(prevButton);
        if (currentPage >= pageCount) disableButton(nextButton); else enableButton(nextButton);
    };

    const handleActivePageNumber = () => {
        paginationNumbers.querySelectorAll('.pagination-number').forEach(button => {
            const active = Number(button.getAttribute('page-index')) === currentPage;
            button.classList.toggle('active', active);
            if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
        });
    };

    const appendPageNumber = index => {
        const pageNumber = document.createElement('button');
        pageNumber.type = 'button';
        pageNumber.className = 'pagination-number';
        pageNumber.textContent = String(index);
        pageNumber.setAttribute('page-index', String(index));
        pageNumber.setAttribute('aria-label', 'Page ' + index);
        pageNumber.addEventListener('click', () => setCurrentPage(index));
        paginationNumbers.appendChild(pageNumber);
    };

    const getPaginationNumbers = () => {
        paginationNumbers.replaceChildren();
        for (let i = 1; i <= pageCount; i += 1) appendPageNumber(i);
    };

    const setCurrentPage = pageNum => {
        currentPage = clampPage(pageNum);
        handleActivePageNumber();
        handlePageButtonsStatus();

        const prevRange = (currentPage - 1) * paginationLimit;
        const currRange = currentPage * paginationLimit;
        listItems.forEach((item, index) => {
            item.classList.toggle('hidden', !(index >= prevRange && index < currRange));
        });

        savePage(currentPage);
        writeUrlPage(currentPage);
    };

    const initialize = () => {
        const isHistoryRestore = Boolean(
            window.performance &&
            typeof window.performance.getEntriesByType === 'function' &&
            window.performance.getEntriesByType('navigation')[0]?.type === 'back_forward'
        ) || (window.performance && window.performance.navigation && window.performance.navigation.type === 2);

        // Page from the URL wins (refresh / shared link); otherwise a history
        // restore returns to the saved page; anything malformed becomes page 1.
        const fromUrl = readUrlPage();
        currentPage = fromUrl !== null ? fromUrl : (isHistoryRestore ? readSavedPage() : 1);
        getPaginationNumbers();
        setCurrentPage(currentPage);
    };

    // Recount after the list changed while keeping the reader on the same page.
    const rebuild = () => {
        listItems = getItems();
        pageCount = computePageCount();
        getPaginationNumbers();
        setCurrentPage(currentPage);
    };

    /* ------------------------------------------------------------------
       Keep the list in step with the data source (posts.json).
       The markup is pre-rendered, so a post added to the data but missing
       from the HTML (or served from a stale cache) used to be invisible.
       Missing posts are added, duplicates removed, nothing else is touched.
       ------------------------------------------------------------------ */
    const canonicalKey = value => {
        let path = String(value || '');
        try {
            path = new URL(S(path), location.href).pathname;
            const rootPath = new URL(S('/'), location.href).pathname;
            if (path.indexOf(rootPath) === 0) path = '/' + path.slice(rootPath.length);
        } catch (_) { path = path.split(/[?#]/)[0]; }
        try { path = decodeURIComponent(path); } catch (_) { /* keep as-is */ }
        return (path.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '').replace(/\/+$/, '') || '/').toLowerCase();
    };

    const itemKey = li => {
        const link = li.querySelector('a.thumbnail_post, .box_contents a');
        return link ? canonicalKey(link.getAttribute('href')) : '';
    };

    const normalizePath = value => String(value || '').split('>').map(part => part.trim().toLowerCase()).filter(Boolean).join('>');

    const decodeEntities = text => {
        const doc = new DOMParser().parseFromString(String(text || ''), 'text/html');
        return (doc.body && doc.body.textContent) || '';
    };

    const fetchJson = async url => {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = window.setTimeout(() => controller && controller.abort(), 6000);
        try {
            const response = await fetch(url, { credentials: 'same-origin', cache: 'no-cache', signal: controller ? controller.signal : undefined });
            if (!response.ok) throw new Error(url + ' ' + response.status);
            return await response.json();
        } finally {
            window.clearTimeout(timer);
        }
    };

    const isValidPost = post => Boolean(
        post && post.title && post.url && post.type !== 'category' &&
        post.draft !== true && post.hidden !== true && post.published !== false
    );

    // posts.json is the primary source; search-index.json is merged in so a page
    // present in only one of the two is still listed. Each page appears once.
    const loadPosts = async () => {
        const results = await Promise.allSettled([fetchJson(POSTS_URL), fetchJson(INDEX_URL)]);
        const primary = results[0].status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : [];
        const secondary = results[1].status === 'fulfilled' && Array.isArray(results[1].value)
            ? results[1].value.filter(entry => entry && entry.type === 'post') : [];
        if (!primary.length && !secondary.length) throw new Error('No post data available');

        const merged = new Map();
        primary.concat(secondary).forEach(post => {
            if (!isValidPost(post)) return;
            const key = canonicalKey(post.url);
            if (!merged.has(key)) merged.set(key, post);
        });
        return Array.from(merged.values());
    };

    const loadItemsPerPage = async () => {
        try {
            const value = Number((await fetchJson(SETTINGS_URL))?.pagination?.itemsPerPage);
            return Number.isInteger(value) && value > 0 ? value : null;
        } catch (_) { return null; }
    };

    // Which posts belong in this list: everything on Home, or the posts inside
    // this category. Returns null when the category cannot be identified.
    const resolveScope = async () => {
        const here = canonicalKey(location.href);
        if (here === '/') return () => true;
        const index = await fetchJson(INDEX_URL);
        const category = Array.isArray(index) ? index.find(entry => entry && entry.type === 'category' && canonicalKey(entry.url) === here) : null;
        if (!category) return null;
        const base = normalizePath(category.path);
        return post => {
            const path = normalizePath(post.path);
            return path === base || path.startsWith(base + '>');
        };
    };

    const buildItem = post => {
        const title = String(post.title);
        const make = (tag, className) => { const el = document.createElement(tag); if (className) el.className = className; return el; };

        const li = make('li', 'paginated-item');
        const article = make('div', 'article_content');

        const zone = make('div', 'thumbnail_zone');
        const thumb = make('a', 'thumbnail_post');
        thumb.href = S(post.url);
        thumb.setAttribute('aria-label', title);
        const img = make('img');
        img.src = S(post.image || '') || FALLBACK_IMAGE;
        img.alt = title + ' thumbnail';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 800;
        img.height = 480;
        img.addEventListener('error', () => { if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE; }, { once: true });
        thumb.appendChild(img);
        zone.appendChild(thumb);

        const box = make('div', 'box_contents');
        const titleLink = make('a');
        titleLink.href = S(post.url);
        const heading = make('h1', 'title_post');
        heading.textContent = title;
        titleLink.appendChild(heading);

        const excerpt = make('a', 'txt_post');
        excerpt.href = S(post.url);
        excerpt.textContent = decodeEntities(post.excerpt || post.description || '');

        const info = make('div', 'info-post');
        const category = make('span', 'category');
        category.textContent = String(post.path || '').split('>')[0].trim();
        const date = make('span', 'date');
        date.textContent = '· ' + (post.date || '');
        info.append(category, date);

        box.append(titleLink, excerpt, info);
        article.append(zone, box);
        li.appendChild(article);
        return li;
    };

    const reconcile = async () => {
        const [posts, inScope] = await Promise.all([loadPosts(), resolveScope()]);
        if (!posts.length || !inScope) return false;

        let changed = false;
        let injected = false;
        const present = new Map();

        // A page must appear once: drop any repeated entry, keep the first.
        getItems().forEach(li => {
            const key = itemKey(li);
            if (!key) return;
            if (present.has(key)) { li.remove(); changed = true; } else present.set(key, li);
        });

        const dates = new Map();
        posts.filter(inScope).forEach(post => {
            const key = canonicalKey(post.url);
            dates.set(key, String(post.date || ''));
            if (present.has(key)) {
                // Pre-rendered excerpts that show literal entities ("&amp;", "&gt;")
                // are replaced by the decoded text from the data source.
                const excerpt = present.get(key).querySelector('.txt_post');
                if (excerpt && /&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i.test(excerpt.textContent)) {
                    excerpt.textContent = decodeEntities(post.excerpt || post.description || '');
                    changed = true;
                }
                return;
            }
            const li = buildItem(post);
            paginatedList.appendChild(li);
            present.set(key, li);
            changed = true;
            injected = true;
        });

        // Newest first, like the pre-rendered list. Only re-ordered when a post
        // was added, and stable so posts sharing a date keep their order.
        if (injected) {
            const dateOf = li => {
                const known = dates.get(itemKey(li));
                if (known) return known;
                const match = /\d{4}-\d{2}-\d{2}/.exec(li.querySelector('.date')?.textContent || '');
                return match ? match[0] : '';
            };
            getItems().sort((a, b) => dateOf(b).localeCompare(dateOf(a))).forEach(li => paginatedList.appendChild(li));
        }
        return changed;
    };

    prevButton?.addEventListener('click', () => setCurrentPage(currentPage - 1));
    nextButton?.addEventListener('click', () => setCurrentPage(currentPage + 1));

    // Paginate right away from the pre-rendered list (no flash of the whole
    // list), then reconcile with the data source in the background.
    initialize();
    Promise.all([
        loadItemsPerPage(),
        reconcile().catch(error => {
            console.warn('[posts] Could not reconcile the list with posts.json', error);
            return false;
        })
    ]).then(([perPage, changed]) => {
        const limitChanged = perPage !== null && perPage !== paginationLimit;
        if (limitChanged) paginationLimit = perPage;
        if (changed || limitChanged) rebuild();
    }).catch(error => {
        console.warn('[posts] Could not reconcile the list with posts.json', error);
    });
});
