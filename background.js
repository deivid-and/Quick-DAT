// Quick-DAT Background Script
chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  chrome.storage.sync.set({
    emailTemplate: `Hello,

I'm interested in the load from {{ORIGIN}} to {{DESTINATION}}{{DATE}}.

Could you please provide the following details:
- Pickup and delivery times
- Weight and commodity details (Currently shows: {{COMMODITY}} , {{WEIGHT}})
- Any special requirements
- Your best rate (posted rate: {{RATE}})

Reference ID: {{REFERENCE}}

Is this load still available?

Thank you,`
  });
});