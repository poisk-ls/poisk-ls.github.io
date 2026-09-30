window.PostModules = window.PostModules || {};
window.PostModules.analytics = function () {
  const pageHits = document.getElementById('page-hits');
  if (!pageHits) return;
  const goatcounterCode = pageHits.getAttribute('usercode');
  if (!goatcounterCode) return;
  const requestURL = 'https://' + goatcounterCode + '.goatcounter.com/counter/' + encodeURIComponent(location.pathname) + '.json';
  fetch(requestURL).then(response => response.ok ? response.json() : Promise.reject()).then(data => { pageHits.textContent = data.count ?? '0'; }).catch(() => { pageHits.textContent = '0'; });
};
