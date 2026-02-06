// Quick-DAT time extraction
// Defines: window.QD.extractors.extractTimeWithRetry
// Expects: window.QD.selectors, window.QD.state.debug (optional)
window.QD = window.QD || {};
window.QD.extractors = window.QD.extractors || {};
window.QD.extractors.extractTimeWithRetry = function extractTimeWithRetry(popup, type) {
  const baseSelectors = type === 'pickup'
    ? window.QD.selectors.popup.time.originBase
    : window.QD.selectors.popup.time.destinationBase;
  const dateSelectors = window.QD.selectors.popup.time.date;
  const hoursSelectors = window.QD.selectors.popup.time.hours;

  const extract = () => {
    let dateEl = null;
    for (const base of baseSelectors) {
      for (const dateSel of dateSelectors) {
        const found = popup.querySelector(`${base} ${dateSel}`);
        if (found) {
          dateEl = found;
          break;
        }
      }
      if (dateEl) break;
    }

    const hoursSet = new Set();
    for (const base of baseSelectors) {
      for (const hoursSel of hoursSelectors) {
        popup.querySelectorAll(`${base} ${hoursSel}`).forEach(el => hoursSet.add(el));
      }
    }

    const hoursEls = Array.from(hoursSet)
      .map(el => el.textContent.replace(/^@/, '').replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim())
      .filter(t => t && !/^$/.test(t)); // remove empty entries

    let parts = [];
    if (dateEl && dateEl.textContent.trim()) {
      const date = dateEl.textContent.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
      parts.push(date);
    }

    // Choose the best time candidate
    if (hoursEls.length > 0) {
      // For pickup: take first non-empty
      // For delivery: take last non-empty
      const chosen = type === 'pickup' ? hoursEls[0] : hoursEls[hoursEls.length - 1];
      parts.push(chosen);
    }

    const combined = parts.join('\n').trim();
    return combined;
  };

  let time = extract();
  if (time) return time;

  window.QD.utils.retryWithDelays([300, 800, 1500, 2500, 4000], (delay) => {
    requestAnimationFrame(() => {
      const delayedTime = extract();
      if (delayedTime) {
        const popupRef = popup.closest(window.QD.selectors.popup.root);
        if (!popupRef) return;
        const key = `${type}Time`;
        if (popupRef.dataset[key] !== delayedTime) {
          popupRef.dataset[key] = delayedTime;
          if (window.QD.state.debug)
            console.log(`Quick-DAT: Late-found ${type} time after ${delay}ms:`, delayedTime);
        }
      }
    });
  });

  return '';
};
