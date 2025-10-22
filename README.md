# DAT Load Board Optimizer

A Chrome extension that optimizes workflow on DAT load board by providing quick email and maps integration.

## Features

- **Quick Email to Broker**: Right-click on any load popup to generate a Gmail draft with load details
- **Google Maps Integration**: Instantly view route from origin to destination
- **Smart Data Extraction**: Automatically extracts origin, destination, dates, rates, and contact info

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will be active on DAT load board

## Usage

1. Navigate to `https://one.dat.com/search-loads`
2. Click on any load to open the details popup
3. Right-click anywhere on the popup
4. Select either:
   - **📧 Email Broker** - Opens Gmail with pre-filled load details
   - **🗺️ View Route** - Opens Google Maps with route directions

## How it Works

The extension:
- Detects DAT load popup elements using multiple CSS selectors
- Extracts key information (origin, destination, dates, rates, contact info)
- Generates professional email templates
- Creates Google Maps URLs with directions

## File Structure

```
├── manifest.json      # Extension configuration
├── background.js      # Context menu setup
├── content.js         # DAT page interaction
├── popup.html         # Extension popup UI
└── README.md          # This file
```

## Technical Details

- **Manifest V3** compatible
- **Minimal permissions** (contextMenus, activeTab)
- **Optimized selectors** for reliable data extraction
- **No over-engineering** - simple, focused functionality

## Browser Support

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium browsers
