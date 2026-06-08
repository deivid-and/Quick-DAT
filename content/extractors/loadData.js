// Quick-DAT load data extraction
// Defines: window.QD.extractors.extractLoadData
// Expects: window.QD.selectors, window.QD.extractors.*
window.QD = window.QD || {};
window.QD.extractors = window.QD.extractors || {};
window.QD.extractors.extractReferenceFromPopup = function extractReferenceFromPopup(popup) {
  const equipmentContainer = popup.querySelector(window.QD.selectors.popup.equipment.container);
  if (!equipmentContainer) return '';

  const invalidValues = new Set(['', '-', '–', '—', 'ā€“', 'ā€”']);
  const rows = Array.from(equipmentContainer.querySelectorAll(window.QD.selectors.popup.equipment.dataRows));

  for (const row of rows) {
    const labelEl = row.querySelector(window.QD.selectors.popup.equipment.label);
    const itemEl = row.querySelector(window.QD.selectors.popup.equipment.item);
    if (!labelEl || !itemEl) continue;

    const label = labelEl.textContent.trim().toLowerCase();
    if (!label.includes('reference')) continue;

    const value = itemEl.textContent.trim();
    if (invalidValues.has(value)) return '';

    if (window.QD.state.debug) {
      console.log('[Quick-DAT DEBUG] reference extracted', value);
    }

    return value;
  }

  return '';
};

window.QD.extractors.extractLoadData = function extractLoadData(popup, context) {
  // Extract data from specific popup element
  const pickupTime = window.QD.extractors.extractTimeWithRetry(popup, 'pickup');
  const deliveryTime = window.QD.extractors.extractTimeWithRetry(popup, 'delivery');

  const loadData = {
    origin: window.QD.extractors.extractTextFromElement(popup, window.QD.selectors.popup.origin),
    destination: window.QD.extractors.extractTextFromElement(popup, window.QD.selectors.popup.destination),
    date: window.QD.extractors.extractTextFromElement(popup, window.QD.selectors.popup.date),
    phone: window.QD.extractors.extractTextFromElement(popup, window.QD.selectors.popup.phone),
    email: window.QD.extractors.extractEmailFromElement(popup, window.QD.selectors.popup.email, context),
    rate: window.QD.extractors.extractTextFromElement(popup, window.QD.selectors.popup.rate, { skipMiles: true }),
    commodity: window.QD.extractors.extractTextFromElement(popup, window.QD.selectors.popup.commodity),
    weight: window.QD.extractors.extractTextFromElement(popup, window.QD.selectors.popup.weight),
    reference: window.QD.extractors.extractReferenceFromPopup(popup),
    pickupTime,
    deliveryTime
  };

  // Debug log for pickup/delivery times
  if (window.QD.state.debug) {
    console.log('Quick-DAT: Debug - Looking for times in popup:', popup);
    const pickupHours = window.QD.selectors.popup.time.originBase
      .flatMap(base => window.QD.selectors.popup.time.hours.map(hours => `${base} ${hours}`));
    const deliveryHours = window.QD.selectors.popup.time.destinationBase
      .flatMap(base => window.QD.selectors.popup.time.hours.map(hours => `${base} ${hours}`));

    console.log('Quick-DAT: Debug - Found pickup elements:', popup.querySelectorAll(pickupHours.join(', ')));
    console.log('Quick-DAT: Debug - Found delivery elements:', popup.querySelectorAll(deliveryHours.join(', ')));
    console.log('Quick-DAT: Debug - All hours elements:', popup.querySelectorAll(window.QD.selectors.popup.time.hours.join(', ')));

    if (pickupTime || deliveryTime) {
      console.log('Quick-DAT: Extracted times:', { pickupTime, deliveryTime });
    } else {
      console.log('Quick-DAT: No times extracted - checking all hours elements');
      popup.querySelectorAll(window.QD.selectors.popup.time.hours.join(', ')).forEach((el, index) => {
        console.log(`Quick-DAT: Hours element ${index}:`, {
          textContent: el.textContent.trim(),
          innerHTML: el.innerHTML.trim(),
          classes: el.className
        });
      });
    }
  }

  return loadData;
};
