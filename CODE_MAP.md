# QUICK-DAT CODE MAP
## For AI Agent Reference - Quick Navigation Guide

---
## PROJECT OVERVIEW
**Type:** Chrome Extension (Manifest V3)
**Purpose:** DAT load board automation - email generation & route mapping
**Architecture:** Content script + Popup + Background service worker

---
## FILE INDEX (Quick Reference)

### Core Files
- `manifest.json` - Extension configuration & permissions
- `content.js` - Main logic (489 lines) - Class: QuickDAT
- `popup.js` - Settings UI (166 lines) - Class: QuickDATPopup  
- `popup.html` - Settings interface (432 lines)
- `background.js` - Lifecycle management (21 lines)

### Assets
- `icons/` - Extension icons (16px, 48px, 128px, mail-icon, map-icon)

---
## ARCHITECTURE FLOW

```
User opens DAT page
  ↓
content.js injects → QuickDAT class
  ↓
MutationObserver watches for <dat-load-details>
  ↓
Icons added → User clicks
  ↓
Email: openEmailDraft() → createEmailBody() → Gmail
Maps: openGoogleMaps() → Google Maps URL
```

---
## REUSABLE CODE PATTERNS

### 1. DATA EXTRACTION PATTERN
**Location:** `content.js:177-253` - `extractLoadData()`
**Pattern:** Multi-selector fallback strategy
**Reusable for:** Any DOM scraping task
```javascript
// Pattern: Try multiple selectors, return first match
const selectors = ['.primary', '.fallback', '.last-resort'];
for (const selector of selectors) {
  const found = element.querySelector(selector);
  if (found && found.textContent.trim()) return found.textContent.trim();
}
```

### 2. ASYNC DATA LOADING PATTERN
**Location:** `content.js:281-331` - `extractTimeWithRetry()`
**Pattern:** Retry with delays for Angular async content
**Reusable for:** Any dynamic content extraction
```javascript
// Pattern: Immediate try + delayed retries
let result = extract();
if (result) return result;
[300, 800, 1500, 2500, 4000].forEach(delay => {
  setTimeout(() => { /* retry */ }, delay);
});
```

### 3. TEMPLATE VARIABLE REPLACEMENT
**Location:** `content.js:415-437` - `createEmailBody()`
**Pattern:** Safe template variable substitution
**Reusable for:** Any templating system
```javascript
// Pattern: Safe replacement with fallback
const safe = v => v || '';
body = body.replace(/\{\{VAR\}\}/g, safe(data.var));
```

### 4. CHROME STORAGE PATTERN
**Location:** `popup.js:9-26` & `content.js:11-24` - `loadSettings()`
**Pattern:** Load with defaults fallback
**Reusable for:** All settings management
```javascript
// Pattern: Load settings with defaults
const result = await chrome.storage.sync.get(['key']);
const value = result.key ?? defaultValue;
```

### 5. MUTATION OBSERVER PATTERN
**Location:** `content.js:43-88` - `setupObserver()`
**Pattern:** Watch for dynamic DOM elements
**Reusable for:** Any SPA integration
```javascript
// Pattern: Watch for specific elements, prevent duplicates
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.matches('target-selector')) process(node);
    });
  });
});
```

---
## KEY FUNCTIONS BY TASK

### Task: Extract Load Data
**Primary:** `content.js:177` - `extractLoadData(popup)`
**Helpers:**
- `extractTextFromElement()` - `content.js:255`
- `extractTimeWithRetry()` - `content.js:281`
- `extractEmailFromElement()` - `content.js:333`

### Task: Generate Email
**Primary:** `content.js:383` - `openEmailDraft(loadData, popup)`
**Helper:** `content.js:415` - `createEmailBody(loadData, popup)`
**Uses:** Template from `this.settings.emailTemplate`

### Task: Open Maps
**Primary:** `content.js:454` - `openGoogleMaps(loadData)`
**Helper:** `content.js:440` - `extractUserSearchOrigin()`
**Logic:** User origin → Load origin → Load destination (3-way route)

### Task: Manage Settings
**Primary:** `popup.js:126` - `saveSettings()`
**Load:** `popup.js:9` - `loadSettings()`
**Storage:** `chrome.storage.sync` (keys: `emailTemplate`, `emptyBodyOption`)

### Task: Inject UI Icons
**Primary:** `content.js:90` - `addIconsToPopup(popup)`
**Helper:** `content.js:127` - `createIcon(iconType, title, onClick)`
**Trigger:** MutationObserver detects `<dat-load-details>`

---
## DATA STRUCTURES

### LoadData Object
**Defined:** `content.js:217-229`
```javascript
{
  origin: string,
  destination: string,
  date: string,
  phone: string,
  email: string,
  rate: string,
  commodity: string,
  weight: string,
  reference: string,
  pickupTime: string,
  deliveryTime: string
}
```

### Settings Object
**Defined:** `popup.js:138-141` & `content.js:14-17`
```javascript
{
  emailTemplate: string,  // Template with {{VARIABLES}}
  emptyBodyOption: boolean // If true, email has no body
}
```

---
## TEMPLATE VARIABLES
**Location:** `content.js:421-434` - Variable replacement logic
**Available:** `{{ORIGIN}}`, `{{DESTINATION}}`, `{{DATE}}`, `{{PICKUP_TIME}}`, `{{DELIVERY_TIME}}`, `{{RATE}}`, `{{COMMODITY}}`, `{{WEIGHT}}`, `{{REFERENCE}}`
**Default Template:** `popup.js:28-42` & `content.js:26-40`

---
## SELECTOR STRATEGIES
**Pattern:** Multiple fallback selectors per field
**Location:** `content.js:179-212`
- Origin: `.trip-place div:first-child`, `.route-origin .city`, etc.
- Destination: `.trip-place div:last-child`, `.route-destination .city`, etc.
- Email: `a[href^="mailto:"]`, `.contacts__email`, regex fallback
- Rate: `.data-item-total`, `.rate-data`, etc.

---
## INTEGRATION POINTS

### DAT Website Integration
- **Target Element:** `<dat-load-details>` custom element
- **Injection Point:** `.details-header_actions` or `.details-header`
- **Timing:** MutationObserver + 5s safety re-check (`content.js:80-87`)

### Chrome APIs Used
- `chrome.storage.sync` - Settings persistence
- `chrome.runtime.getURL()` - Icon paths
- `window.open()` - Gmail & Maps URLs

---
## COMMON TASKS → CODE PATHS

### "Add new data field extraction"
1. Add selector to array in `extractLoadData()` (`content.js:179-212`)
2. Add to LoadData object (`content.js:217-229`)
3. Add template variable if needed (`content.js:421-434`)
4. Update default template (`popup.js:28-42`)

### "Modify email template"
1. Edit `getDefaultTemplate()` in both `popup.js:28` and `content.js:26`
2. Update variable replacement in `createEmailBody()` (`content.js:415-437`)
3. Add variable tag in `popup.html:405-413` if new variable

### "Change icon behavior"
1. Modify `createIcon()` (`content.js:127-175`) for styling
2. Update `addIconsToPopup()` (`content.js:90-125`) for logic
3. Icon files in `icons/` directory

### "Add new feature button"
1. Create icon in `addIconsToPopup()` (`content.js:90-125`)
2. Add handler function
3. Follow pattern from `openEmailDraft()` or `openGoogleMaps()`

---
## DEBUGGING
**Debug Flag:** `content.js:4` - `this.debug = true`
**Debug Logs:** `content.js:232-250` - Time extraction debugging

---
## EDGE CASES HANDLED
- Angular async rendering delays (`content.js:311-328`)
- Email found after initial scan (`content.js:358-378`)
- Empty/invalid reference IDs (`content.js:388-397`)
- Missing origin/destination (`content.js:455-458`)
- Duplicate icon injection (`content.js:91` - `iconsAdded` Set)
- Multiple observers (`content.js:45-47`)

---
## DEPENDENCIES
- Chrome 88+ (Manifest V3)
- DAT website structure (one.dat.com)
- Gmail (for email functionality)
- Google Maps (for route mapping)

---
## FILE SIZE REFERENCE
- `content.js`: 489 lines (main logic)
- `popup.js`: 166 lines (settings UI)
- `popup.html`: 432 lines (mostly CSS)
- `background.js`: 21 lines (minimal)
- `manifest.json`: 48 lines (config)

