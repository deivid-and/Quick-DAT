# Quick-DAT

Chrome Extension for DAT Load Board Optimization

---

## Overview

Quick-DAT is a Chrome extension built for DAT load board users who want to streamline their workflow.  
Instead of manually copying load details and composing emails, the extension automatically extracts relevant information and creates professional email drafts with a single click.

### Key Features

- **One-Click Email** – Generate professional broker emails instantly  
- **Route Mapping** – Open Google Maps with pre-filled origin and destination  
- **Smart Data Extraction** – Automatically captures load details, rates, and contact information  
- **Customizable Templates** – Personalize your email templates to match your communication style  
- **Clean Integration** – Minimal interface that doesn't interfere with your workflow  
- **Privacy Focused** – No data collection, everything runs locally on your device  

---

## How It Works

The extension integrates seamlessly with your existing DAT workflow:

1. Navigate to the DAT load board.  
2. Click on any load to open the details popup.  
3. Look for the small map and email icons in the top-right corner.  
4. Click the map icon to open Google Maps with the route.  
5. Click the email icon to compose a professional email to the broker.

### Smart Email Generation

When you click the email icon, Quick-DAT automatically:
- Extracts all load details (origin, destination, dates, rates)
- Finds broker contact information
- Formats everything into a professional email template
- Opens Gmail with the draft ready to send

---

## Installation

### Chrome Web Store
1. Visit the Chrome Web Store listing.  
2. Click **Add to Chrome**.  
3. Confirm the installation.

### Manual Installation (for developers)
1. Download the extension files.  
2. Open Chrome and go to `chrome://extensions/`.  
3. Enable **Developer mode** (top-right).  
4. Click **Load unpacked** and select the extension folder.

---

## Configuration

### Email Template Customization

Click the Quick-DAT icon in Chrome to access settings.

#### Available Variables
- `{{ORIGIN}}` – Load origin location  
- `{{DESTINATION}}` – Load destination  
- `{{DATE}}` – Pickup or delivery date  
- `{{PICKUP_TIME}}` – Pickup time details  
- `{{DELIVERY_TIME}}` – Delivery time details  
- `{{RATE}}` – Load rate information  
- `{{COMMODITY}}` – Commodity details  
- `{{WEIGHT}}` – Weight specifications  
- `{{REFERENCE}}` – Reference ID  

#### Default Template

Hello,

I'm interested in the load from {{ORIGIN}} to {{DESTINATION}}{{DATE}}.

Could you please confirm the following:

Pickup time ({{PICKUP_TIME}})

Delivery time ({{DELIVERY_TIME}})

Weight and commodity ({{COMMODITY}}, {{WEIGHT}})

Any special requirements

Your best rate (posted: {{RATE}})

Reference ID: {{REFERENCE}}

Thank you,


---

## Technical Details

### Requirements
- Chrome 88 or newer  
- Access to the DAT load board  
- Gmail account for email functionality  

### Permissions
The extension requires minimal permissions:
- `storage` – To save your email template preferences locally  
- `host_permissions` – To inject content script into DAT load board pages (one.dat.com only)  

### How It Works
- Content script injects functionality into DAT pages  
- Background script manages lifecycle events  
- Popup interface handles user settings  
- All data remains on your local device  

---

## Privacy & Security

Your privacy is important:
- No tracking or analytics  
- No external data collection  
- All logic runs locally in your browser  
- Settings are stored only on your computer  

---

## Support & Contact

### Developer
**Deividas Andrijauskas**  
Website: [https://www.7solutions.lt](https://www.7solutions.lt)  
Email: [info@7solutions.lt](mailto:info@7solutions.lt)

### Getting Help
- Report issues via GitHub Issues  
- Request new features via GitHub Discussions  
- Contact directly at info@7solutions.lt  

---

## License

This project is licensed under the MIT License.  
See the [LICENSE](LICENSE) file for details.
