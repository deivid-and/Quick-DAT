// Background script for context menu handling
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
  chrome.contextMenus.create({
    id: "emailBroker",
    title: "📧 Email Broker",
    contexts: ["all"],
    documentUrlPatterns: ["https://one.dat.com/*"]
  });

  chrome.contextMenus.create({
    id: "viewRoute",
    title: "🗺️ View Route on Maps",
    contexts: ["all"],
    documentUrlPatterns: ["https://one.dat.com/*"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "emailBroker") {
    // Send message to content script to extract load data and open email
    chrome.tabs.sendMessage(tab.id, { action: "emailBroker" });
  } else if (info.menuItemId === "viewRoute") {
    // Send message to content script to extract route data and open maps
    chrome.tabs.sendMessage(tab.id, { action: "viewRoute" });
  }
});
