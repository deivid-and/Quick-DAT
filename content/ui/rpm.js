// Quick-DAT RPM UI helpers
// Dependencies: window.QD.selectors
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
  `;
  document.head.appendChild(style);
  state.rpmStylesInjected = true;
};

window.QD.ui.rpm.parseRpmFromCell = function parseRpmFromCell(cell) {
  if (!cell) return null;
  const text = cell.querySelector('.calculated-rate span')?.textContent?.trim() || '';
  const match = text.match(/\$?\s*([\d.,]+)\s*\*?\/\s*mi/i);
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

window.QD.ui.rpm.applyRpmHighlightToCell = function applyRpmHighlightToCell(cell, state) {
  const rateContainer = cell.querySelector('.rate-container') || cell;
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
    const rateContainer = cell.querySelector('.rate-container') || cell;
    rateContainer.classList.remove('quick-dat-rpm-hit');
  });
};

window.QD.ui.rpm.addPopupRpmBadge = function addPopupRpmBadge(popup, state) {
  if (!state.settings.rpmHighlightEnabled) return;
  const rateCell = popup.querySelector(window.QD.selectors.popup.rateCells);
  const rpm = window.QD.ui.rpm.parseRpmFromCell(rateCell);
  const target = state.settings.targetRpm ?? 2.0;

  const rateContainer = rateCell ? (rateCell.querySelector('.rate-container') || rateCell) : null;
  if (!rateContainer) return;

  rateContainer.classList.remove('quick-dat-rpm-hit');
  if (!rpm || rpm < target) {
    return;
  }

  window.QD.ui.rpm.ensureRpmStyles(state);
  rateContainer.classList.add('quick-dat-rpm-hit');
};
