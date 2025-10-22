// Quick-DAT Content Script - Icon-based interface
class QuickDAT {
  constructor() {
    this.iconsAdded = new Set();
    this.setupObserver();
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['emailTemplate']);
      this.settings = {
        emailTemplate: result.emailTemplate || this.getDefaultTemplate()
      };
    } catch (error) {
      this.settings = {
        emailTemplate: this.getDefaultTemplate()
      };
    }
  }

  getDefaultTemplate() {
    return `Hello,

I'm interested in the load from {{ORIGIN}} to {{DESTINATION}}{{DATE}}.

Could you please provide the following details:
- Pickup and delivery times
- Weight and commodity details (Currently shows: {{COMMODITY}} , {{WEIGHT}})
- Any special requirements
- Your best rate (posted rate: {{RATE}})

Reference ID: {{REFERENCE}}

Is this load still available?

Thank you,`;
  }

  setupObserver() {
    // Watch for new load popups
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this is a dat-load-details element
            if (node.matches && node.matches('dat-load-details')) {
              this.addIconsToPopup(node);
            }
            // Check for nested dat-load-details
            const loadDetails = node.querySelectorAll && node.querySelectorAll('dat-load-details');
            if (loadDetails) {
              loadDetails.forEach(popup => this.addIconsToPopup(popup));
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also check existing popups
    document.querySelectorAll('dat-load-details').forEach(popup => {
      this.addIconsToPopup(popup);
    });
  }

  addIconsToPopup(popup) {
    if (this.iconsAdded.has(popup)) return;
    
    const loadData = this.extractLoadData(popup);
    if (!loadData.origin || !loadData.destination) return;

    // Find the header actions area
    const actionsArea = popup.querySelector('.details-header_actions');
    if (!actionsArea) return;

    // Create icons container
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'quick-dat-icons';
    iconsContainer.style.cssText = 
      'display: flex;' +
      'gap: 8px;' +
      'margin-left: 8px;';

    // Add Maps icon (always show)
    const mapsIcon = this.createIcon('🗺️', 'View Route on Maps', () => {
      this.openGoogleMaps(loadData);
    });
    iconsContainer.appendChild(mapsIcon);

    // Add Email icon only if email exists
    if (loadData.email) {
      const emailIcon = this.createIcon('📧', 'Email Broker', () => {
        this.openEmailDraft(loadData);
      });
      iconsContainer.appendChild(emailIcon);
    }

    // Insert icons into actions area
    actionsArea.appendChild(iconsContainer);
    this.iconsAdded.add(popup);
  }

  createIcon(emoji, title, onClick) {
    const icon = document.createElement('button');
    icon.innerHTML = emoji;
    icon.title = title;
    icon.style.cssText = 
      'background: #0046e0;' +
      'color: white;' +
      'border: none;' +
      'border-radius: 50%;' +
      'width: 32px;' +
      'height: 32px;' +
      'display: flex;' +
      'align-items: center;' +
      'justify-content: center;' +
      'cursor: pointer;' +
      'font-size: 14px;' +
      'transition: all 0.2s ease;' +
      'box-shadow: 0 2px 4px rgba(0, 70, 224, 0.3);';
    
    icon.addEventListener('mouseenter', () => {
      icon.style.transform = 'scale(1.1)';
      icon.style.boxShadow = '0 4px 8px rgba(0, 70, 224, 0.4)';
    });
    
    icon.addEventListener('mouseleave', () => {
      icon.style.transform = 'scale(1)';
      icon.style.boxShadow = '0 2px 4px rgba(0, 70, 224, 0.3)';
    });
    
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });

    return icon;
  }

  extractLoadData(popup) {
    // Extract data from specific popup element
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

    const dateSelectors = ['.date', '.route-origin .date', '.route-flex .date'];
    const phoneSelectors = ['a[href^="tel:"]', '.contacts__phone', '.company-data-container a[href^="tel:"]'];
    const emailSelectors = ['a[href^="mailto:"]', '.contacts__email'];
    const rateSelectors = ['.data-item-total', '.rate-data', '.data-item.data-item-total'];
    const commoditySelectors = ['.data-item.multiline', '.equipment-data .data-item.multiline', '.equipment-data .data-item'];
    const weightSelectors = ['.equipment-data .data-item:nth-child(4)', '.data-item:contains("Weight")'];
    const referenceSelectors = ['.equipment-data .data-item:last-child', '.data-item:last-child'];

    return {
      origin: this.extractTextFromElement(popup, originSelectors),
      destination: this.extractTextFromElement(popup, destinationSelectors),
      date: this.extractTextFromElement(popup, dateSelectors),
      phone: this.extractTextFromElement(popup, phoneSelectors),
      email: this.extractTextFromElement(popup, emailSelectors),
      rate: this.extractTextFromElement(popup, rateSelectors),
      commodity: this.extractTextFromElement(popup, commoditySelectors),
      weight: this.extractTextFromElement(popup, weightSelectors),
      reference: this.extractTextFromElement(popup, referenceSelectors)
    };
  }

  extractTextFromElement(element, selectors) {
    for (const selector of selectors) {
      const found = element.querySelector(selector);
      if (found && found.textContent.trim()) {
        return found.textContent.trim();
      }
    }
    return '';
  }

  openEmailDraft(loadData) {
    const subject = `Load Inquiry: ${loadData.origin} to ${loadData.destination}${loadData.date ? ` (${loadData.date})` : ''}`;
    const body = this.createEmailBody(loadData);
    
    const emailParams = new URLSearchParams({
      to: loadData.email,
      subject: subject,
      body: body
    });
    
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&${emailParams.toString()}`;
    window.open(gmailUrl, '_blank');
  }

  createEmailBody(loadData) {
    let body = this.settings.emailTemplate;
    
    // Replace template variables
    body = body.replace(/\{\{ORIGIN\}\}/g, loadData.origin);
    body = body.replace(/\{\{DESTINATION\}\}/g, loadData.destination);
    body = body.replace(/\{\{DATE\}\}/g, loadData.date ? ` (${loadData.date})` : '');
    body = body.replace(/\{\{COMMODITY\}\}/g, loadData.commodity ? ` (I see: ${loadData.commodity})` : '');
    body = body.replace(/\{\{RATE\}\}/g, loadData.rate ? ` (Current rate: ${loadData.rate})` : '');
    body = body.replace(/\{\{WEIGHT\}\}/g, loadData.weight ? ` (Weight: ${loadData.weight})` : '');
    body = body.replace(/\{\{REFERENCE\}\}/g, loadData.reference ? `Reference ID: ${loadData.reference}` : '');
    
    return body;
  }

  openGoogleMaps(loadData) {
    if (!loadData.origin || !loadData.destination) {
      alert('Could not extract origin and destination from the load details.');
      return;
    }

    const origin = encodeURIComponent(loadData.origin);
    const destination = encodeURIComponent(loadData.destination);
    const mapsUrl = `https://www.google.com/maps/dir/${origin}/${destination}`;
    window.open(mapsUrl, '_blank');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new QuickDAT());
} else {
  new QuickDAT();
}