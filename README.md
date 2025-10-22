# Quick-DAT

**Chrome Extension for DAT Load Board Optimization**

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Ready-brightgreen)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0-blue)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green)](https://opensource.org/licenses/MIT)

---

## Overview

Quick-DAT is a Chrome extension built specifically for DAT load board users who want to streamline their workflow. Instead of manually copying load details and composing emails, the extension automatically extracts all relevant information and creates professional email drafts with a single click.

### Key Features

- **One-Click Email** - Generate professional broker emails instantly
- **Route Mapping** - Open Google Maps with pre-filled origin and destination
- **Smart Data Extraction** - Automatically captures load details, rates, and contact information
- **Customizable Templates** - Personalize your email templates to match your communication style
- **Clean Integration** - Minimal interface that doesn't interfere with your existing workflow
- **Privacy Focused** - No data collection, everything runs locally on your device

---

## How It Works

The extension works seamlessly with your existing DAT workflow:

1. Navigate to the DAT load board as usual
2. Click on any load to open the details popup
3. Look for the small map and email icons in the top-right corner of the popup
4. Click the map icon to open Google Maps with the route
5. Click the email icon to compose a professional email to the broker

### Smart Email Generation

When you click the email icon, the extension automatically:
- Extracts all load details (origin, destination, dates, rates)
- Finds broker contact information
- Formats everything into a professional email template
- Opens Gmail with the draft ready to send

---

## Installation

### Chrome Web Store
1. Visit the Chrome Web Store listing
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (for developers)
1. Download the extension files
2. Open Chrome and go to Extensions
3. Enable Developer mode
4. Click "Load unpacked" and select the extension folder

---

## Configuration

### Email Template Customization

Click the Quick-DAT extension icon to access settings:

#### Available Variables:
- `{{ORIGIN}}` - Load origin location
- `{{DESTINATION}}` - Load destination
- `{{DATE}}` - Pickup/delivery dates
- `{{PICKUP_DELIVERY}}` - Pickup and delivery times
- `{{RATE}}` - Load rate information
- `{{COMMODITY}}` - Commodity details
- `{{WEIGHT}}` - Weight specifications
- `{{REFERENCE}}` - Reference ID

#### Default Template:
```
Hello,

I'm interested in the load from {{ORIGIN}} to {{DESTINATION}}{{DATE}}.

Could you please provide the following details:
{{PICKUP_DELIVERY}}
- Weight and commodity details (currently shows: {{COMMODITY}} , {{WEIGHT}})
- Any special requirements
- Your best rate (posted rate: {{RATE}})

Reference ID: {{REFERENCE}}

Thank you,
```

---

## Technical Details

### Requirements
- Chrome 88 or newer
- Access to DAT load board
- Gmail account for email functionality

### Permissions
The extension requires minimal permissions:
- `activeTab` - To access the current DAT page
- `storage` - To save your email template preferences
- `host_permissions` - To integrate with DAT, Gmail, and Google Maps

### How It Works
- Content script injects functionality into DAT pages
- Background script manages the extension lifecycle
- Popup interface handles user settings
- All data stays on your device

---

## Privacy & Security

Your privacy is important to us:
- No data collection or tracking
- Everything runs locally on your device
- Settings are stored only on your computer
- We only request the minimum permissions needed

---

## Support & Contact

### Developer
**Deividas Andrijauskas**  
Website: [www.7solutions.lt](https://www.7solutions.lt)  
Email: [info@7solutions.lt](mailto:info@7solutions.lt)

### Getting Help
- Report bugs via GitHub Issues
- Request new features via GitHub Discussions
- Direct support at info@7solutions.lt

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---