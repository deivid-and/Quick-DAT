// Quick-DAT RPM UI helpers
// Defines: window.QD.ui.rpm.*
// Expects: window.QD.selectors
window.QD = window.QD || {};
window.QD.ui = window.QD.ui || {};
window.QD.ui.rpm = window.QD.ui.rpm || {};

window.QD.ui.rpm.ensureRpmStyles = function ensureRpmStyles(state) {
  if (state.rpmStylesInjected) return;
  const style = document.createElement('style');
  style.textContent = `
    .quick-dat-rpm-hit {
      background: #e7f5ec !important;
      border: 1px solid #c6e7d3 !important;
      border-radius: 6px;
      padding: 2px 6px;
    }

    .quick-dat-popup-rpms {
      position: absolute;
      top: 34px;
      right: 16px;
      padding: 9px 12px;
      border: 1px solid #c9d8ea;
      border-radius: 6px;
      background: linear-gradient(180deg, #fbfdff 0%, #f2f8ff 100%);
      box-shadow: 0 2px 8px rgba(0, 70, 224, 0.08);
      font-size: 12px;
      line-height: 1.45;
      font-weight: 600;
      color: #192129;
      white-space: nowrap;
      z-index: 2;
    }

    .quick-dat-popup-rpm-row {
      display: block;
      margin-top: 2px;
    }

    .quick-dat-popup-rpm-row:first-child {
      margin-top: 0;
    }

    .quick-dat-popup-rpm-row.tot {
      color: #636d78;
    }
  `;
  document.head.appendChild(style);
  state.rpmStylesInjected = true;
};

window.QD.ui.rpm.parseMoney = function parseMoney(text) {
  if (!text) return null;
  const match = text.match(/([\d,]+(?:\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

window.QD.ui.rpm.parseMiles = function parseMiles(text) {
  if (!text) return null;
  const match = text.match(/(\d+(?:,\d+)?(?:\.\d+)?)\s*mi/i);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

window.QD.ui.rpm.parseDeadheadFromCity = function parseDeadheadFromCity(text) {
  if (!text) return null;
  const match = text.match(/\((\d+(?:,\d+)?(?:\.\d+)?)\)\s*$/);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

window.QD.ui.rpm.calculatePopupRealRpms = function calculatePopupRealRpms(popup) {
  const rateText = popup.querySelector(window.QD.selectors.rpm.popupRateTotal)?.textContent?.trim() || '';
  const loadedMilesText = popup.querySelector(window.QD.selectors.rpm.popupLoadedMiles)?.textContent?.trim() || '';
  const originCityText = popup.querySelector(window.QD.selectors.rpm.popupOriginCity)?.textContent?.trim() || '';
  const destinationCityText = popup.querySelector(window.QD.selectors.rpm.popupDestinationCity)?.textContent?.trim() || '';

  const totalRate = window.QD.ui.rpm.parseMoney(rateText);
  const loadedMiles = window.QD.ui.rpm.parseMiles(loadedMilesText);
  const originDeadhead = window.QD.ui.rpm.parseDeadheadFromCity(originCityText);
  const destinationDeadhead = window.QD.ui.rpm.parseDeadheadFromCity(destinationCityText);

  if (!totalRate || !loadedMiles || originDeadhead == null) {
    return null;
  }

  const puDenominator = loadedMiles + originDeadhead;
  if (!puDenominator) return null;

  const puRpm = totalRate / puDenominator;
  const hasTot = destinationDeadhead != null;
  const totDenominator = hasTot ? (loadedMiles + originDeadhead + destinationDeadhead) : null;
  const totRpm = hasTot && totDenominator ? (totalRate / totDenominator) : null;

  return {
    puRpm,
    totRpm
  };
};

window.QD.ui.rpm.renderPopupRealRpms = function renderPopupRealRpms(popup, values) {
  const rateDetailsContainer = popup.querySelector('[data-test="rate-details-container"]');
  if (!rateDetailsContainer) return;

  rateDetailsContainer.style.position = 'relative';

  const existing = rateDetailsContainer.querySelector(window.QD.selectors.rpm.popupRealRpmContainer);
  if (!values) {
    if (existing) existing.remove();
    return;
  }

  let container = existing;
  if (!container) {
    container = document.createElement('div');
    container.className = window.QD.selectors.rpm.popupRealRpmContainer.slice(1);
    rateDetailsContainer.appendChild(container);
  }

  const rows = [
    `<div class="quick-dat-popup-rpm-row">PU RPM: $${values.puRpm.toFixed(2)}</div>`
  ];

  if (values.totRpm != null) {
    rows.push(`<div class="quick-dat-popup-rpm-row tot">TOT RPM: $${values.totRpm.toFixed(2)}</div>`);
  }

  container.innerHTML = rows.join('');
};

window.QD.ui.rpm.parseRpmFromCell = function parseRpmFromCell(cell) {
  if (!cell) return null;
  const text = cell.querySelector(window.QD.selectors.rpm.calculatedRateText)?.textContent?.trim() || '';
  const match = text.match(/\$?\s*([\d.,]+)\s*\*?\/\s*mi/i);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

window.QD.ui.rpm.applyRpmHighlightToCell = function applyRpmHighlightToCell(cell, state) {
  const rateContainer = cell.querySelector(window.QD.selectors.rpm.rateContainer) || cell;
  if (!state.settings.rpmHighlightEnabled) {
    rateContainer.classList.remove('quick-dat-rpm-hit');
    return;
  }
  const rpm = window.QD.ui.rpm.parseRpmFromCell(cell);
  const target = state.settings.targetRpm ?? 2.0;

  if (!rpm || rpm < target) {
    rateContainer.classList.remove('quick-dat-rpm-hit');
    return;
  }

  window.QD.ui.rpm.ensureRpmStyles(state);
  rateContainer.classList.add('quick-dat-rpm-hit');
};

window.QD.ui.rpm.highlightLoadRows = function highlightLoadRows(rateCells, state) {
  if (!state.settings.rpmHighlightEnabled) return;
  const cells = rateCells
    ? Array.from(rateCells)
    : Array.from(document.querySelectorAll(window.QD.selectors.popup.rateCells));
  cells.forEach(cell => window.QD.ui.rpm.applyRpmHighlightToCell(cell, state));
};

window.QD.ui.rpm.clearRpmHighlights = function clearRpmHighlights() {
  const cells = Array.from(document.querySelectorAll(window.QD.selectors.popup.rateCells));
  cells.forEach(cell => {
    const rateContainer = cell.querySelector(window.QD.selectors.rpm.rateContainer) || cell;
    rateContainer.classList.remove('quick-dat-rpm-hit');
  });
};

window.QD.ui.rpm.addPopupRpmBadge = function addPopupRpmBadge(popup, state) {
  const rateCell = popup.querySelector(window.QD.selectors.popup.rateCells);
  const rateContainer = rateCell ? (rateCell.querySelector(window.QD.selectors.rpm.rateContainer) || rateCell) : null;
  if (state.settings.rpmHighlightEnabled && rateContainer) {
    const rpm = window.QD.ui.rpm.parseRpmFromCell(rateCell);
    const target = state.settings.targetRpm ?? 2.0;

    rateContainer.classList.remove('quick-dat-rpm-hit');
    if (rpm && rpm >= target) {
      window.QD.ui.rpm.ensureRpmStyles(state);
      rateContainer.classList.add('quick-dat-rpm-hit');
    }
  } else if (rateContainer) {
    rateContainer.classList.remove('quick-dat-rpm-hit');
  }

  const values = window.QD.ui.rpm.calculatePopupRealRpms(popup);
  if (!values) {
    window.QD.ui.rpm.renderPopupRealRpms(popup, null);
    return;
  }

  window.QD.ui.rpm.ensureRpmStyles(state);
  window.QD.ui.rpm.renderPopupRealRpms(popup, values);
};
