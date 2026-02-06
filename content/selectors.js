// Quick-DAT selectors
// Defines: window.QD.selectors, window.QD.state.debug
// Expects: window.QD
window.QD = window.QD || {};
window.QD.state = window.QD.state || {};
window.QD.state.debug = window.QD.state.debug ?? false;
window.QD.selectors = {
  popup: {
    root: 'dat-load-details',
    actionsArea: [
      '[data-test="details-header-actions"]',
      '.details-header_actions',
      '.details-header',
      '.details-actions'
    ],
    time: {
      originBase: ['[data-test="route-origin"]', '.route-origin'],
      destinationBase: ['[data-test="route-destination"]', '.route-destination'],
      date: ['[data-test="route-date"]', '.date'],
      hours: ['.hours']
    },
    origin: [
      '[data-test="route-origin"] .city',
      '.trip-place div:first-child',
      '.route-origin .city',
      '.city.city-table',
      '.route-flex .route-origin .city'
    ],
    destination: [
      '[data-test="route-destination"] .city',
      '.trip-place div:last-child',
      '.route-destination .city',
      '.city.align.city-table',
      '.route-flex .route-destination .city'
    ],
    date: ['[data-test="route-date"]', '.date', '.route-origin .date', '.route-flex .date'],
    phone: ['a[href^="tel:"]', '.contacts__phone', '.company-data-container a[href^="tel:"]'],
    email: [
      'a[href^="mailto:"]',
      '.contacts__email a[href^="mailto:"]',
      '.contacts__email',
      '.contact-methods a[href^="mailto:"]',
      '.contacts a[href^="mailto:"]',
      '[href^="mailto:"]'
    ],
    rate: [
      '[data-test="load-rate-cell"] .rate-container',
      '.data-item-total',
      '.rate-data',
      '.data-item.data-item-total',
      '.rate-details-container .data-item:first-child',
      '.rate-detail-label:first-child + .rate-data .data-item'
    ],
    commodity: ['.data-item.multiline', '.equipment-data .data-item.multiline', '.equipment-data .data-item'],
    weight: ['.equipment-data .data-item:nth-child(4)', '.data-item:contains("Weight")'],
    reference: ['.equipment-data .data-item:last-child', '.data-item:last-child'],
    equipment: {
      container: '.data-container',
      labels: '.equipment-label .data-label',
      dataItems: '.equipment-data .data-item'
    },
    notes: '.notes-contents, .notes-contents.multiline',
    rateCells: '[data-test="load-rate-cell"]'
  },
  header: {
    originLocation: 'dat-search-location[formcontrolname="origin"]',
    destinationLocation: 'dat-search-location[formcontrolname="destination"]',
    originInput: 'input[data-test="origin-input"][formcontrolname="locationInput"]',
    destinationInput: 'input[data-test="destination-input"][formcontrolname="locationInput"]'
  },
  ui: {
    iconsContainer: '.quick-dat-icons',
    emailIcon: '[title="Email Broker"]'
  },
  rpm: {
    calculatedRateText: '.calculated-rate span',
    rateContainer: '.rate-container'
  }
};
