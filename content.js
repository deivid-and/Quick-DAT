// Quick-DAT Content Script
class QuickDAT {
  constructor() {
    this.iconsAdded = new Set();
    this.setupObserver();
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['emailTemplate', 'emptyBodyOption']);
      this.settings = {
        emailTemplate: result.emailTemplate || this.getDefaultTemplate(),
        emptyBodyOption: result.emptyBodyOption || false
      };
    } catch (error) {
      this.settings = {
        emailTemplate: this.getDefaultTemplate(),
        emptyBodyOption: false
      };
    }
  }

  getDefaultTemplate() {
    return `Hello,

I'm interested in the load from {{ORIGIN}} to {{DESTINATION}}{{DATE}}.

Could you please provide the following details:
{{PICKUP_DELIVERY}}
- Weight and commodity details (currently shows: {{COMMODITY}} , {{WEIGHT}})
- Any special requirements
- Your best rate (posted rate: {{RATE}})

Reference ID: {{REFERENCE}}

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
    const mapsIcon = this.createIcon('map', 'View Route on Maps', () => {
      this.openGoogleMaps(loadData);
    });
    iconsContainer.appendChild(mapsIcon);

    // Add Email icon only if email exists
    if (loadData.email) {
      const emailIcon = this.createIcon('mail', 'Email Broker', () => {
        this.openEmailDraft(loadData);
      });
      iconsContainer.appendChild(emailIcon);
    }

    // Insert icons into actions area
    actionsArea.appendChild(iconsContainer);
    this.iconsAdded.add(popup);
  }

  createIcon(iconType, title, onClick) {
    const icon = document.createElement('button');
    icon.title = title;
    
    // Create icon image
    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL(`icons/${iconType}-icon.png`);
    iconImg.style.cssText = 
      'width: 20px;' +
      'height: 20px;' +
      'filter: brightness(0);' +
      'transition: all 0.2s ease;';
    
    icon.appendChild(iconImg);
    icon.style.cssText = 
      'background: transparent;' +
      'border: none;' +
      'border-radius: 50%;' +
      'width: 32px;' +
      'height: 32px;' +
      'display: flex;' +
      'align-items: center;' +
      'justify-content: center;' +
      'cursor: pointer;' +
      'transition: all 0.2s ease;' +
      'padding: 6px;';
    
    icon.addEventListener('mouseenter', () => {
      icon.style.background = '#0046e0';
      icon.style.transform = 'scale(1.1)';
      icon.style.boxShadow = '0 4px 8px rgba(0, 70, 224, 0.4)';
      iconImg.style.filter = 'brightness(0) invert(1)';
    });
    
    icon.addEventListener('mouseleave', () => {
      icon.style.background = 'transparent';
      icon.style.transform = 'scale(1)';
      icon.style.boxShadow = 'none';
      iconImg.style.filter = 'brightness(0)';
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
    const emailSelectors = [
      'a[href^="mailto:"]', 
      '.contacts__email a[href^="mailto:"]',
      '.contacts__email',
      '.contact-methods a[href^="mailto:"]',
      '.contacts a[href^="mailto:"]',
      '[href^="mailto:"]'
    ];
    const rateSelectors = [
      '.data-item-total', 
      '.rate-data', 
      '.data-item.data-item-total',
      '.rate-details-container .data-item:first-child',
      '.rate-detail-label:first-child + .rate-data .data-item'
    ];
    const commoditySelectors = ['.data-item.multiline', '.equipment-data .data-item.multiline', '.equipment-data .data-item'];
    const weightSelectors = ['.equipment-data .data-item:nth-child(4)', '.data-item:contains("Weight")'];
    const referenceSelectors = ['.equipment-data .data-item:last-child', '.data-item:last-child'];

    return {
      origin: this.extractTextFromElement(popup, originSelectors),
      destination: this.extractTextFromElement(popup, destinationSelectors),
      date: this.extractTextFromElement(popup, dateSelectors),
      phone: this.extractTextFromElement(popup, phoneSelectors),
      email: this.extractEmailFromElement(popup, emailSelectors),
      rate: this.extractTextFromElement(popup, rateSelectors),
      commodity: this.extractTextFromElement(popup, commoditySelectors),
      weight: this.extractTextFromElement(popup, weightSelectors),
      reference: this.extractTextFromElement(popup, referenceSelectors),
      pickupTime: this.extractTextFromElement(popup, [
        '.route-origin .hours',
        '.route-origin .date + .hours'
      ]),
      deliveryTime: this.extractTextFromElement(popup, [
        '.route-destination .hours',
        '.route-destination .date + .hours'
      ])
    };
  }

  extractTextFromElement(element, selectors) {
    for (const selector of selectors) {
      const found = element.querySelector(selector);
      if (found && found.textContent.trim()) {
        const text = found.textContent.trim();
        // Filter out trip miles from rate extraction
        if (selector.includes('rate') && text.includes('mi')) {
          continue;
        }
        return text;
      }
    }
    return '';
  }

  extractEmailFromElement(element, selectors) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

    const findEmail = () => {
      // 1️⃣ Check all mailto links
      const mailto = element.querySelector('a[href^="mailto:"]');
      if (mailto) return mailto.href.replace('mailto:', '').trim();

      // 2️⃣ Check .contacts__email container text
      const emailDiv = element.querySelector('.contacts__email');
      if (emailDiv && emailDiv.textContent.match(emailRegex)) {
        return emailDiv.textContent.match(emailRegex)[0].trim();
      }

      // 3️⃣ Fallback: search entire popup text
      const match = element.textContent.match(emailRegex);
      if (match) return match[0].trim();

      return '';
    };

    // Try immediately
    let email = findEmail();
    if (email) return email;

    // If not found — retry after small delay (Angular async)
    [500, 1000, 1500].forEach((delay) => {
      setTimeout(() => {
        const delayedEmail = findEmail();
        if (delayedEmail) {
          const popup = element.closest('dat-load-details');
          if (popup) {
            const existingIcons = popup.querySelector('.quick-dat-icons');
            if (existingIcons && !existingIcons.querySelector('[title="Email Broker"]')) {
              const emailIcon = this.createIcon('mail', 'Email Broker', () => {
                this.openEmailDraft({
                  ...this.extractLoadData(popup),
                  email: delayedEmail
                });
              });
              existingIcons.appendChild(emailIcon);
            }
          }
        }
      }, delay);
    });

    return '';
  }

  openEmailDraft(loadData) {
    const subject = `Load Inquiry: ${loadData.origin.trim()} → ${loadData.destination.trim()}${loadData.date ? ` (${loadData.date.trim()})` : ''}`;
    
    // Check if empty body option is enabled
    if (this.settings.emptyBodyOption) {
      // Send email with empty body (subject only)
      const gmailUrl = `https://mail.google.com/mail/u/0/?fs=1&tf=cm&to=${encodeURIComponent(loadData.email)}&su=${encodeURIComponent(subject)}`;
      window.open(gmailUrl, '_blank');
    } else {
      // Send email with full body
      const body = this.createEmailBody(loadData);
      const gmailUrl = `https://mail.google.com/mail/u/0/?fs=1&tf=cm&to=${encodeURIComponent(loadData.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, '_blank');
    }
  }

  createEmailBody(loadData) {
    let body = this.settings.emailTemplate;
    
    body = body.replace(/\{\{ORIGIN\}\}/g, loadData.origin);
    body = body.replace(/\{\{DESTINATION\}\}/g, loadData.destination);
    body = body.replace(/\{\{DATE\}\}/g, loadData.date ? ` (${loadData.date})` : '');
    body = body.replace(/\{\{COMMODITY\}\}/g, loadData.commodity ? ` ${loadData.commodity}` : '');
    body = body.replace(/\{\{RATE\}\}/g, loadData.rate && loadData.rate !== '–' && !loadData.rate.includes('mi') ? `${loadData.rate}` : '');
    body = body.replace(/\{\{WEIGHT\}\}/g, loadData.weight ? `${loadData.weight}` : '');
    body = body.replace(/\{\{REFERENCE\}\}/g, loadData.reference ? `${loadData.reference}` : '');
    
    // Handle pickup and delivery times
    const pickupDeliveryInfo = this.formatPickupDeliveryTimes(loadData);
    body = body.replace(/\{\{PICKUP_DELIVERY\}\}/g, pickupDeliveryInfo);
    
    return body;
  }

  formatPickupDeliveryTimes(loadData) {
    const pickupTime = loadData.pickupTime?.trim();
    const deliveryTime = loadData.deliveryTime?.trim();
    
    if (pickupTime && deliveryTime) {
      return `- Pickup and delivery times (posted: ${pickupTime} - ${deliveryTime})`;
    } else if (pickupTime) {
      return `- Pickup and delivery times (posted: ${pickupTime})`;
    } else if (deliveryTime) {
      return `- Pickup and delivery times (posted: ${deliveryTime})`;
    }
    
    return '- Pickup and delivery times';
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