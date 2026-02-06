// Quick-DAT Content Script
// Defines: QuickDAT bootstrapping
// Expects: window.QD.* modules loaded via manifest order
window.QD = window.QD || {};

class QuickDAT {
  constructor() {
    this.debug = false; // Set to true for development debugging
    this.settings = {
      emailTemplate: window.QD.state.settings.getDefaultTemplate(),
      emptyBodyOption: true,
      rpmHighlightEnabled: false,
      targetRpm: 2.0
    };
    this.iconsAdded = new Set();
    this.observer = null; // Track observer to prevent multiple instances
    this.rpmStylesInjected = false;
    window.QD.dom.setupObserver(this);
    window.QD.state.settings.loadSettings(this);
    window.QD.state.settings.setupSettingsListener(this);
  }

 
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new QuickDAT());
} else {
  new QuickDAT();
}
