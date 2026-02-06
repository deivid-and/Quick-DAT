// Quick-DAT search inputs extraction
// Dependencies: window.QD.selectors
window.QD = window.QD || {};
window.QD.extractors = window.QD.extractors || {};
window.QD.extractors.extractUserSearchOrigin = function extractUserSearchOrigin() {
  // Extract user's search origin from DAT header
  // Find the first dat-search-location with formcontrolname="origin"
  const originLocation = document.querySelector(window.QD.selectors.header.originLocation);
  if (!originLocation) return '';

  // Find the input with data-test="origin-input" and formcontrolname="locationInput"
  const originInput = originLocation.querySelector(window.QD.selectors.header.originInput);
  if (!originInput) return '';

  const userOrigin = originInput.value ? originInput.value.trim() : '';
  return userOrigin;
};

window.QD.extractors.extractUserSearchDestination = function extractUserSearchDestination() {
  // Extract user's search destination from DAT header
  // Find the first dat-search-location with formcontrolname="destination"
  const destinationLocation = document.querySelector(window.QD.selectors.header.destinationLocation);
  if (!destinationLocation) return '';

  // Find the input with data-test="destination-input" and formcontrolname="locationInput"
  const destinationInput = destinationLocation.querySelector(window.QD.selectors.header.destinationInput);
  if (!destinationInput) return '';

  const userDestination = destinationInput.value ? destinationInput.value.trim() : '';
  return userDestination;
};
