// Quick-DAT settings
// Defines: window.QD.state.settings.getDefaultTemplate/loadSettings/setupSettingsListener
// Expects: window.QD.ui.showToast, window.QD.ui.rpm, window.QD.selectors
window.QD = window.QD || {};
window.QD.state = window.QD.state || {};
window.QD.state.settings = window.QD.state.settings || {};

window.QD.state.settings.getDefaultTemplate = function getDefaultTemplate() {
  return `Hello,

I'm interested in the load from {{ORIGIN}} to {{DESTINATION}}{{DATE}}.

Could you please confirm the following:
- Pickup time ({{PICKUP_TIME}})
- Delivery time ({{DELIVERY_TIME}})
- Weight and commodity ({{COMMODITY}}, {{WEIGHT}})
- Your best rate (posted: {{RATE}})

Reference ID: {{REFERENCE}}

Thank you,`;
};

window.QD.state.settings.loadSettings = async function loadSettings(context) {
  try {
    const result = await chrome.storage.sync.get(['emailTemplate', 'emptyBodyOption', 'rpmHighlightEnabled', 'targetRpm']);
    context.settings = {
      emailTemplate: result.emailTemplate ?? window.QD.state.settings.getDefaultTemplate(),
      emptyBodyOption: result.emptyBodyOption ?? true,
      rpmHighlightEnabled: result.rpmHighlightEnabled ?? false,
      targetRpm: typeof result.targetRpm === 'number' ? result.targetRpm : 2.0
    };
  } catch (error) {
    context.settings = {
      emailTemplate: window.QD.state.settings.getDefaultTemplate(),
      emptyBodyOption: true,
      rpmHighlightEnabled: false,
      targetRpm: 2.0
    };
  }

  // Apply RPM highlighting if enabled after settings load
  if (context.settings.rpmHighlightEnabled) {
    window.QD.ui.rpm.highlightLoadRows(null, context);
    document.querySelectorAll(window.QD.selectors.popup.root).forEach(popup => window.QD.ui.rpm.addPopupRpmBadge(popup, context));
  }
};

window.QD.state.settings.setupSettingsListener = function setupSettingsListener(context) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;

    const relevantKeys = new Set(['emailTemplate', 'emptyBodyOption', 'rpmHighlightEnabled', 'targetRpm']);
    const hasRelevantChanges = Object.keys(changes).some(key => relevantKeys.has(key));
    if (!hasRelevantChanges) return;

    const nextSettings = { ...context.settings };
    for (const [key, change] of Object.entries(changes)) {
      nextSettings[key] = change.newValue;
    }
    context.settings = {
      emailTemplate: nextSettings.emailTemplate ?? window.QD.state.settings.getDefaultTemplate(),
      emptyBodyOption: nextSettings.emptyBodyOption ?? true,
      rpmHighlightEnabled: nextSettings.rpmHighlightEnabled ?? false,
      targetRpm: typeof nextSettings.targetRpm === 'number' ? nextSettings.targetRpm : 2.0
    };

    window.QD.ui.showToast('Quick-DAT settings updated');

    if (!context.settings.rpmHighlightEnabled) {
      window.QD.ui.rpm.clearRpmHighlights();
      return;
    }

    window.QD.ui.rpm.highlightLoadRows(null, context);
    document.querySelectorAll(window.QD.selectors.popup.root).forEach(popup => window.QD.ui.rpm.addPopupRpmBadge(popup, context));
  });
};
