// Quick-DAT text extraction
// Dependencies: none
window.QD = window.QD || {};
window.QD.extractors = window.QD.extractors || {};
window.QD.extractors.extractTextFromElement = function extractTextFromElement(element, selectors, options = {}) {
  for (const selector of selectors) {
    const found = element.querySelector(selector);
    if (found) {
      // Try textContent first, then innerHTML as fallback
      let text = found.textContent.trim();
      if (!text) {
        text = found.innerHTML.trim();
      }

      if (text) {
        // Filter out trip miles from rate extraction
        if (options.skipMiles && text.includes('mi')) {
          continue;
        }
        // Debug for time-related selectors
        if (selector.includes('hours') && window.QD.debug) {
          console.log(`Quick-DAT: Found time with selector "${selector}":`, text);
        }
        return text;
      }
    }
  }
  return '';
};
