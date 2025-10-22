// Content script for DAT load board interaction
class DATLoadExtractor {
  constructor() {
    this.setupMessageListener();
    this.addVisualIcons();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "emailBroker") {
        this.handleEmailBroker();
      } else if (request.action === "viewRoute") {
        this.handleViewRoute();
      }
    });
  }

  addVisualIcons() {
    // Add visual icons to each load popup for better UX
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const loadDetails = node.querySelector ? node.querySelector('dat-load-details') : null;
            if (loadDetails || node.tagName === 'DAT-LOAD-DETAILS') {
              this.addIconsToPopup(loadDetails || node);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also check for existing popups
    document.querySelectorAll('dat-load-details').forEach(popup => {
      this.addIconsToPopup(popup);
    });
  }

  addIconsToPopup(popup) {
    if (popup.dataset.iconsAdded) return; // Already added icons
    
    // Find the header actions area
    const actionsArea = popup.querySelector('.details-header_actions') || 
                       popup.querySelector('.details-header') ||
                       popup.querySelector('.details-block');
    
    if (!actionsArea) return;

    // Create icons container
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'dat-extension-icons';
    iconsContainer.style.cssText = `
      display: flex;
      gap: 8px;
      margin-left: 10px;
      align-items: center;
    `;

    // Email icon
    const emailIcon = document.createElement('button');
    emailIcon.innerHTML = '📧';
    emailIcon.title = 'Email Broker';
    emailIcon.style.cssText = `
      background: #0046E0;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 8px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 4px;
    `;
    emailIcon.onclick = (e) => {
      e.stopPropagation();
      this.handleEmailBrokerForPopup(popup);
    };

    // Maps icon
    const mapsIcon = document.createElement('button');
    mapsIcon.innerHTML = '🗺️';
    mapsIcon.title = 'View Route';
    mapsIcon.style.cssText = `
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 8px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 4px;
    `;
    mapsIcon.onclick = (e) => {
      e.stopPropagation();
      this.handleViewRouteForPopup(popup);
    };

    iconsContainer.appendChild(emailIcon);
    iconsContainer.appendChild(mapsIcon);
    actionsArea.appendChild(iconsContainer);
    
    popup.dataset.iconsAdded = 'true';
  }

  extractLoadData() {
    // Extract origin and destination from multiple possible selectors
    // Based on actual DAT UI structure from inspect data
    const originSelectors = [
      '.trip-place div:first-child',
      '.route-origin .city',
      '.city.city-table',
      '.route-flex .route-origin .city'
    ];
    
    const destinationSelectors = [
      '.trip-place div:last-child',
      '.route-destination .city',
      '.city.align.city-table',
      '.route-flex .route-destination .city'
    ];

    const dateSelectors = [
      '.date',
      '.route-origin .date',
      '.route-flex .date'
    ];

    const phoneSelectors = [
      'a[href^="tel:"]',
      '.contacts__phone',
      '.company-data-container a[href^="tel:"]'
    ];

    const emailSelectors = [
      'a[href^="mailto:"]',
      '.contacts__email'
    ];

    const rateSelectors = [
      '.data-item-total',
      '.rate-data',
      '.data-item.data-item-total'
    ];

    const commoditySelectors = [
      '.data-item.multiline',
      '.equipment-data .data-item.multiline',
      '.equipment-data .data-item'
    ];

    // Fixed reference selectors - removed invalid :contains() selector
    const referenceSelectors = [
      '.equipment-data .data-item:last-child',
      '.data-item:last-child',
      '.equipment-data .data-item:nth-last-child(2)'
    ];

    return {
      origin: this.extractText(originSelectors),
      destination: this.extractText(destinationSelectors),
      date: this.extractText(dateSelectors),
      phone: this.extractText(phoneSelectors),
      email: this.extractText(emailSelectors),
      rate: this.extractText(rateSelectors),
      commodity: this.extractText(commoditySelectors),
      reference: this.extractText(referenceSelectors)
    };
  }

  extractText(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    return '';
  }

  extractLoadDataFromPopup(popup) {
    // Extract data from a specific popup element
    const originSelectors = [
      '.trip-place div:first-child',
      '.route-origin .city',
      '.city.city-table',
      '.route-flex .route-origin .city'
    ];
    
    const destinationSelectors = [
      '.trip-place div:last-child',
      '.route-destination .city',
      '.city.align.city-table',
      '.route-flex .route-destination .city'
    ];

    const dateSelectors = [
      '.date',
      '.route-origin .date',
      '.route-flex .date'
    ];

    const phoneSelectors = [
      'a[href^="tel:"]',
      '.contacts__phone',
      '.company-data-container a[href^="tel:"]'
    ];

    const emailSelectors = [
      'a[href^="mailto:"]',
      '.contacts__email'
    ];

    const rateSelectors = [
      '.data-item-total',
      '.rate-data',
      '.data-item.data-item-total'
    ];

    const commoditySelectors = [
      '.data-item.multiline',
      '.equipment-data .data-item.multiline',
      '.equipment-data .data-item'
    ];

    const referenceSelectors = [
      '.equipment-data .data-item:last-child',
      '.data-item:last-child',
      '.equipment-data .data-item:nth-last-child(2)'
    ];

    return {
      origin: this.extractTextFromElement(popup, originSelectors),
      destination: this.extractTextFromElement(popup, destinationSelectors),
      date: this.extractTextFromElement(popup, dateSelectors),
      phone: this.extractTextFromElement(popup, phoneSelectors),
      email: this.extractTextFromElement(popup, emailSelectors),
      rate: this.extractTextFromElement(popup, rateSelectors),
      commodity: this.extractTextFromElement(popup, commoditySelectors),
      reference: this.extractTextFromElement(popup, referenceSelectors)
    };
  }

  extractTextFromElement(element, selectors) {
    for (const selector of selectors) {
      const foundElement = element.querySelector(selector);
      if (foundElement && foundElement.textContent.trim()) {
        return foundElement.textContent.trim();
      }
    }
    return '';
  }

  handleEmailBroker() {
    // Find the closest dat-load-details element to the clicked element
    const targetPopup = this.findTargetPopup();
    if (targetPopup) {
      this.handleEmailBrokerForPopup(targetPopup);
    } else {
      const loadData = this.extractLoadData();
      this.openEmailDraft(loadData);
    }
  }

  handleViewRoute() {
    // Find the closest dat-load-details element to the clicked element
    const targetPopup = this.findTargetPopup();
    if (targetPopup) {
      this.handleViewRouteForPopup(targetPopup);
    } else {
      const loadData = this.extractLoadData();
      this.openGoogleMaps(loadData);
    }
  }

  findTargetPopup() {
    // Try to find the most recently opened or focused popup
    const popups = document.querySelectorAll('dat-load-details');
    if (popups.length === 0) return null;
    
    // Return the last one (most recently opened)
    return popups[popups.length - 1];
  }

  handleEmailBrokerForPopup(popup) {
    const loadData = this.extractLoadDataFromPopup(popup);
    this.openEmailDraft(loadData);
  }

  handleViewRouteForPopup(popup) {
    const loadData = this.extractLoadDataFromPopup(popup);
    this.openGoogleMaps(loadData);
  }

  openEmailDraft(loadData) {
    // Create email subject
    const subject = `Load Inquiry: ${loadData.origin} to ${loadData.destination}${loadData.date ? ` (${loadData.date})` : ''}`;
    
    // Create email body
    const body = this.createEmailBody(loadData);
    
    // Create Gmail URL
    const emailParams = new URLSearchParams({
      to: loadData.email || '',
      subject: subject,
      body: body
    });
    
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&${emailParams.toString()}`;
    
    // Open Gmail in new tab
    window.open(gmailUrl, '_blank');
  }

  createEmailBody(loadData) {
    return `Hello,

I'm interested in the load from ${loadData.origin} to ${loadData.destination}${loadData.date ? ` (${loadData.date})` : ''}.

Could you please provide the following details:
- Pickup and delivery times
- Weight and commodity details${loadData.commodity ? ` (I see: ${loadData.commodity})` : ''}
- Any special requirements
- Rate confirmation${loadData.rate ? ` (Current rate: ${loadData.rate})` : ''}

${loadData.reference ? `Reference ID: ${loadData.reference}` : ''}

Please let me know if this load is still available and if you need any additional information from me.

Thank you,
[Your Name]
[Your Company]
[Your Phone]`;
  }

  openGoogleMaps(loadData) {
    if (!loadData.origin || !loadData.destination) {
      alert('Could not extract origin and destination from the load details.');
      return;
    }

    // Create Google Maps URL with directions
    const origin = encodeURIComponent(loadData.origin);
    const destination = encodeURIComponent(loadData.destination);
    const mapsUrl = `https://www.google.com/maps/dir/${origin}/${destination}`;
    
    // Open Google Maps in new tab
    window.open(mapsUrl, '_blank');
  }
}

// Initialize the extension when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DATLoadExtractor();
  });
} else {
  new DATLoadExtractor();
}
