// Quick-DAT DOM observer
// Defines: window.QD.dom.setupObserver, window.QD.dom.handleAddedNode, window.QD.dom.scanExisting, window.QD.dom.scheduleRescan
// Expects: window.QD.selectors, window.QD.ui.icons, window.QD.ui.rpm
window.QD = window.QD || {};
window.QD.dom = window.QD.dom || {};

window.QD.dom.handleAddedNode = function handleAddedNode(node, context) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  // Check if this is a dat-load-details element
  if (node.matches && node.matches(window.QD.selectors.popup.root)) {
    window.QD.ui.icons.addIconsToPopup(node, context);
  }
  // Check for nested dat-load-details
  const loadDetails = node.querySelectorAll && node.querySelectorAll(window.QD.selectors.popup.root);
  if (loadDetails) {
    loadDetails.forEach(popup => window.QD.ui.icons.addIconsToPopup(popup, context));
  }
  // Scan for rate cells to apply RPM highlighting
  if (node.querySelectorAll) {
    const rateCells = node.querySelectorAll(window.QD.selectors.popup.rateCells);
    if (rateCells.length > 0) {
      window.QD.ui.rpm.highlightLoadRows(rateCells, context);
    }
  }
};

window.QD.dom.scanExisting = function scanExisting(context) {
  // Also check existing popups
  document.querySelectorAll(window.QD.selectors.popup.root).forEach(popup => {
    window.QD.ui.icons.addIconsToPopup(popup, context);
  });

  // Initial pass for RPM highlighting on existing rows
  const initialRateCells = document.querySelectorAll(window.QD.selectors.popup.rateCells);
  if (initialRateCells.length > 0) {
    window.QD.ui.rpm.highlightLoadRows(initialRateCells, context);
  }
};

window.QD.dom.scheduleRescan = function scheduleRescan(context) {
  // Final safety re-check for Angular re-renders
  setTimeout(() => {
    document.querySelectorAll(window.QD.selectors.popup.root).forEach(popup => {
      if (!popup.querySelector(window.QD.selectors.ui.iconsContainer)) {
        window.QD.ui.icons.addIconsToPopup(popup, context);
      }
      window.QD.ui.rpm.addPopupRpmBadge(popup, context);
    });
    const delayedRateCells = document.querySelectorAll(window.QD.selectors.popup.rateCells);
    if (delayedRateCells.length > 0) {
      window.QD.ui.rpm.highlightLoadRows(delayedRateCells, context);
    }
  }, 5000);
};

window.QD.dom.setupObserver = function setupObserver(context) {
  // Prevent multiple observers
  if (context.observer) {
    context.observer.disconnect();
  }

  // Watch for new load popups
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        window.QD.dom.handleAddedNode(node, context);
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  context.observer = observer;

  window.QD.dom.scanExisting(context);
  window.QD.dom.scheduleRescan(context);
};
