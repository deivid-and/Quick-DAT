// Quick-DAT Gmail integration
// Defines: window.QD.integrations.gmail.openEmailDraft/createEmailBody
// Expects: window.QD.selectors, context.settings.emailTemplate/emptyBodyOption
window.QD = window.QD || {};
window.QD.integrations = window.QD.integrations || {};
window.QD.integrations.gmail = window.QD.integrations.gmail || {};

window.QD.integrations.gmail.openEmailDraft = function openEmailDraft(loadData, popup, context) {
  // Re-extract reference from popup if available (Angular async loading)
  // The reference may not be populated when icons are first added
  if (popup) {
    const equipmentContainer = popup.querySelector(window.QD.selectors.popup.equipment.container);
    if (equipmentContainer) {
      const labels = Array.from(equipmentContainer.querySelectorAll(window.QD.selectors.popup.equipment.labels));
      const dataItems = Array.from(equipmentContainer.querySelectorAll(window.QD.selectors.popup.equipment.dataItems));

      const refLabelIndex = labels.findIndex(label => {
        const text = label.textContent.trim().toLowerCase();
        return text.includes('reference');
      });

      if (refLabelIndex !== -1 && dataItems[refLabelIndex]) {
        const freshReference = dataItems[refLabelIndex].textContent.trim();
        // Only use if it's a valid reference (not dash)
        if (freshReference && freshReference !== '–' && freshReference !== '-' && freshReference !== '—') {
          loadData.reference = freshReference;
        }
      }
    }
  }

  // Build subject with reference ID if present
  let subject = `Load Inquiry: ${loadData.origin.trim()} → ${loadData.destination.trim()}${loadData.date ? ` (${loadData.date.trim()})` : ''}`;

  // Add reference ID if present and valid (not empty, not "-", not "–", not "—")
  const reference = loadData.reference ? loadData.reference.trim() : '';
  const isValidReference = reference &&
                           reference !== '-' &&
                           reference !== '–' &&
                           reference !== '—' &&
                           reference.length > 0;

  if (isValidReference) {
    subject += ` [Ref: ${reference}]`;
  }

  // Subject-only Gmail drafts are currently forced for reliability.
  setTimeout(() => {
    const gmailUrl = `https://mail.google.com/mail/u/0/?fs=1&tf=cm&to=${encodeURIComponent(loadData.email)}&su=${encodeURIComponent(subject)}`;
    window.open(gmailUrl, '_blank');
  }, 50);
};

window.QD.integrations.gmail.createEmailBody = function createEmailBody(loadData, popup, context) {
  // Currently unused: email templates are temporarily disabled for reliability.
  let body = context.settings.emailTemplate;

  // Safe value helper to prevent undefined/null issues
  const safe = v => v || '';

  body = body.replace(/\{\{ORIGIN\}\}/g, safe(loadData.origin));
  body = body.replace(/\{\{DESTINATION\}\}/g, safe(loadData.destination));
  body = body.replace(/\{\{DATE\}\}/g, loadData.date ? ` (${loadData.date})` : '');
  body = body.replace(/\{\{COMMODITY\}\}/g, loadData.commodity ? ` ${loadData.commodity}` : '');
  body = body.replace(/\{\{RATE\}\}/g, loadData.rate && loadData.rate !== '–' && !loadData.rate.includes('mi') ? `${loadData.rate}` : '');
  body = body.replace(/\{\{WEIGHT\}\}/g, loadData.weight ? `${loadData.weight}` : '');
  body = body.replace(/\{\{REFERENCE\}\}/g, loadData.reference ? `${loadData.reference}` : '');

  // Handle pickup and delivery times separately - check for late-loaded times
  const pickupTime = loadData.pickupTime || (popup ? popup.dataset.pickupTime : '') || '';
  const deliveryTime = loadData.deliveryTime || (popup ? popup.dataset.deliveryTime : '') || '';

  body = body.replace(/\{\{PICKUP_TIME\}\}/g, pickupTime);
  body = body.replace(/\{\{DELIVERY_TIME\}\}/g, deliveryTime);

  return body;
};
