// Quick-DAT Background Script
chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  chrome.storage.sync.set({
        emailTemplate: `Hello,

I'm interested in the load from {{ORIGIN}} to {{DESTINATION}}{{DATE}}.

Could you please confirm the following:
- Pickup time ({{PICKUP_TIME}})
- Delivery time ({{DELIVERY_TIME}})
- Weight and commodity ({{COMMODITY}}, {{WEIGHT}})
- Any special requirements
- Your best rate (posted: {{RATE}})

Reference ID: {{REFERENCE}}

Thank you,`
  });
});