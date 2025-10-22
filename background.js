// Quick-DAT Background Script
chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  chrome.storage.sync.set({
        emailTemplate: `Hello,

I'm interested in the load from {{ORIGIN}} to {{DESTINATION}}{{DATE}}.

Could you please provide the following details:
{{PICKUP_DELIVERY}}
- Weight and commodity details (currently shows: {{COMMODITY}} , {{WEIGHT}})
- Any special requirements
- Your best rate (posted rate: {{RATE}})

Reference ID: {{REFERENCE}}

Thank you,`
  });
});