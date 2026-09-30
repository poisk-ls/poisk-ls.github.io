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

    const listItems = paginatedList.querySelectorAll('li');
    const nextButton = document.querySelector('#next-button');
    const prevButton = document.querySelector('#prev-button');
    const pageKey = 'pageKey=' + document.URL;
    const paginationLimit = 5;
    const pageCount = Math.max(1, Math.ceil(listItems.length / paginationLimit));
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
            button.classList.toggle('active', Number(button.getAttribute('page-index')) === currentPage);
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
    };

    const initialize = () => {
        const isHistoryRestore = Boolean(
            window.performance &&
            typeof window.performance.getEntriesByType === 'function' &&
            window.performance.getEntriesByType('navigation')[0]?.type === 'back_forward'
        ) || (window.performance && window.performance.navigation && window.performance.navigation.type === 2);

        // Only restore the saved page on a history restore, matching the original behavior.
        // Any malformed value is normalized to page 1 before rendering.
        currentPage = isHistoryRestore ? readSavedPage() : 1;
        getPaginationNumbers();
        setCurrentPage(currentPage);
    };

    prevButton?.addEventListener('click', () => setCurrentPage(currentPage - 1));
    nextButton?.addEventListener('click', () => setCurrentPage(currentPage + 1));

    if (document.readyState === 'complete') initialize();
    else window.addEventListener('load', initialize, { once: true });
});
