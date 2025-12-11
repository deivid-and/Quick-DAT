// Quick-DAT Content Script
class QuickDAT {
  constructor() {
    this.debug = false; // Set to true for development debugging
    this.iconsAdded = new Set();
    this.observer = null; // Track observer to prevent multiple instances
    this.setupObserver();
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['emailTemplate', 'emptyBodyOption']);
      this.settings = {
        emailTemplate: result.emailTemplate ?? this.getDefaultTemplate(),
        emptyBodyOption: result.emptyBodyOption ?? false
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

Could you please confirm the following:
- Pickup time ({{PICKUP_TIME}})
- Delivery time ({{DELIVERY_TIME}})
- Weight and commodity ({{COMMODITY}}, {{WEIGHT}})
- Any special requirements
- Your best rate (posted: {{RATE}})

Reference ID: {{REFERENCE}}

Thank you,`;
  }

  setupObserver() {
    // Prevent multiple observers
    if (this.observer) {
      this.observer.disconnect();
    }

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

    this.observer = observer;

    // Also check existing popups
    document.querySelectorAll('dat-load-details').forEach(popup => {
      this.addIconsToPopup(popup);
    });

    // Final safety re-check for Angular re-renders
    setTimeout(() => {
      document.querySelectorAll('dat-load-details').forEach(popup => {
        if (!popup.querySelector('.quick-dat-icons')) {
          this.addIconsToPopup(popup);
        }
      });
    }, 5000);
  }

  addIconsToPopup(popup) {
    if (this.iconsAdded.has(popup)) return;
    
    const loadData = this.extractLoadData(popup);
    if (!loadData.origin || !loadData.destination) return;

    // Find the header actions area
    const actionsArea = popup.querySelector('.details-header_actions, .details-header, .details-actions');
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
        this.openEmailDraft(loadData, popup);
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

    const pickupTime = this.extractTimeWithRetry(popup, 'pickup');
    const deliveryTime = this.extractTimeWithRetry(popup, 'delivery');

    const loadData = {
      origin: this.extractTextFromElement(popup, originSelectors),
      destination: this.extractTextFromElement(popup, destinationSelectors),
      date: this.extractTextFromElement(popup, dateSelectors),
      phone: this.extractTextFromElement(popup, phoneSelectors),
      email: this.extractEmailFromElement(popup, emailSelectors),
      rate: this.extractTextFromElement(popup, rateSelectors),
      commodity: this.extractTextFromElement(popup, commoditySelectors),
      weight: this.extractTextFromElement(popup, weightSelectors),
      reference: this.extractTextFromElement(popup, referenceSelectors),
      pickupTime,
      deliveryTime
    };

    // Debug log for pickup/delivery times
    if (this.debug) {
      console.log('Quick-DAT: Debug - Looking for times in popup:', popup);
      console.log('Quick-DAT: Debug - Found pickup elements:', popup.querySelectorAll('.route-origin .hours'));
      console.log('Quick-DAT: Debug - Found delivery elements:', popup.querySelectorAll('.route-destination .hours'));
      console.log('Quick-DAT: Debug - All hours elements:', popup.querySelectorAll('.hours'));
      
      if (pickupTime || deliveryTime) {
        console.log('Quick-DAT: Extracted times:', { pickupTime, deliveryTime });
      } else {
        console.log('Quick-DAT: No times extracted - checking all hours elements');
        popup.querySelectorAll('.hours').forEach((el, index) => {
          console.log(`Quick-DAT: Hours element ${index}:`, {
            textContent: el.textContent.trim(),
            innerHTML: el.innerHTML.trim(),
            classes: el.className
          });
        });
      }
    }

    return loadData;
  }

  extractTextFromElement(element, selectors) {
    for (const selector of selectors) {
      const found = element.querySelector(selector);
      if (found) {
        // Try textContent first, then innerHTML as fallback
        let text = found.textContent.trim();
        if (!text) {
          text = found.innerHTML.trim();
        }
        
        if (text) {
          // Filter out trip miles from rate extraction
          if (selector.includes('rate') && text.includes('mi')) {
            continue;
          }
          // Debug for time-related selectors
          if (selector.includes('hours') && this.debug) {
            console.log(`Quick-DAT: Found time with selector "${selector}":`, text);
          }
          return text;
        }
      }
    }
    return '';
  }

  extractTimeWithRetry(popup, type) {
    const base = type === 'pickup' ? '.route-origin' : '.route-destination';

    const extract = () => {
      const dateEl = popup.querySelector(`${base} .date`);
      const hoursEls = Array.from(popup.querySelectorAll(`${base} .hours`))
        .map(el => el.textContent.replace(/^@/, '').replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim())
        .filter(t => t && !/^$/.test(t)); // remove empty entries

      let parts = [];
      if (dateEl && dateEl.textContent.trim()) {
        const date = dateEl.textContent.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
        parts.push(date);
      }

      // Choose the best time candidate
      if (hoursEls.length > 0) {
        // For pickup: take first non-empty
        // For delivery: take last non-empty
        const chosen = type === 'pickup' ? hoursEls[0] : hoursEls[hoursEls.length - 1];
        parts.push(chosen);
      }

      const combined = parts.join('\n').trim();
      return combined;
    };

    let time = extract();
    if (time) return time;

    const delays = [300, 800, 1500, 2500, 4000];
    for (const delay of delays) {
      setTimeout(() => {
        requestAnimationFrame(() => {
          const delayedTime = extract();
          if (delayedTime) {
            const popupRef = popup.closest('dat-load-details');
            if (!popupRef) return;
            const key = `${type}Time`;
            if (popupRef.dataset[key] !== delayedTime) {
              popupRef.dataset[key] = delayedTime;
              if (this.debug)
                console.log(`Quick-DAT: Late-found ${type} time after ${delay}ms:`, delayedTime);
            }
          }
        });
      }, delay);
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

  openEmailDraft(loadData, popup = null) {
    // Re-extract reference from popup if available (Angular async loading)
    // The reference may not be populated when icons are first added
    if (popup) {
      const equipmentContainer = popup.querySelector('.data-container');
      if (equipmentContainer) {
        const labels = Array.from(equipmentContainer.querySelectorAll('.equipment-label .data-label'));
        const dataItems = Array.from(equipmentContainer.querySelectorAll('.equipment-data .data-item'));
        
        const refLabelIndex = labels.findIndex(label => {
          const text = label.textContent.trim().toLowerCase();
          return text.includes('reference');
        });
        
        if (refLabelIndex !== -1 && dataItems[refLabelIndex]) {
          const freshReference = dataItems[refLabelIndex].textContent.trim();
          // Only use if it's a valid reference (not dash)
          if (freshReference && freshReference !== '–' && freshReference !== '-' && freshReference !== '—') {
            loadData.reference = freshReference;
          }
        }
      }
    }
    
    // Build subject with reference ID if present
    let subject = `Load Inquiry: ${loadData.origin.trim()} → ${loadData.destination.trim()}${loadData.date ? ` (${loadData.date.trim()})` : ''}`;
    
    // Add reference ID if present and valid (not empty, not "-", not "–", not "—")
    const reference = loadData.reference ? loadData.reference.trim() : '';
    const isValidReference = reference && 
                             reference !== '-' && 
                             reference !== '–' && 
                             reference !== '—' &&
                             reference.length > 0;
    
    if (isValidReference) {
      subject += ` [Ref: ${reference}]`;
    }
    
    // Add subtle delay to prevent Chrome blocking Gmail links
    setTimeout(() => {
      // Check if empty body option is enabled
      if (this.settings.emptyBodyOption) {
        // Send email with empty body (subject only)
        const gmailUrl = `https://mail.google.com/mail/u/0/?fs=1&tf=cm&to=${encodeURIComponent(loadData.email)}&su=${encodeURIComponent(subject)}`;
        window.open(gmailUrl, '_blank');
      } else {
        // Send email with full body
        const body = this.createEmailBody(loadData, popup);
        const gmailUrl = `https://mail.google.com/mail/u/0/?fs=1&tf=cm&to=${encodeURIComponent(loadData.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank');
      }
    }, 50);
  }

  createEmailBody(loadData, popup = null) {
    let body = this.settings.emailTemplate;
    
    // Safe value helper to prevent undefined/null issues
    const safe = v => v || '';
    
    body = body.replace(/\{\{ORIGIN\}\}/g, safe(loadData.origin));
    body = body.replace(/\{\{DESTINATION\}\}/g, safe(loadData.destination));
    body = body.replace(/\{\{DATE\}\}/g, loadData.date ? ` (${loadData.date})` : '');
    body = body.replace(/\{\{COMMODITY\}\}/g, loadData.commodity ? ` ${loadData.commodity}` : '');
    body = body.replace(/\{\{RATE\}\}/g, loadData.rate && loadData.rate !== '–' && !loadData.rate.includes('mi') ? `${loadData.rate}` : '');
    body = body.replace(/\{\{WEIGHT\}\}/g, loadData.weight ? `${loadData.weight}` : '');
    body = body.replace(/\{\{REFERENCE\}\}/g, loadData.reference ? `${loadData.reference}` : '');
    
    // Handle pickup and delivery times separately - check for late-loaded times
    const pickupTime = loadData.pickupTime || (popup ? popup.dataset.pickupTime : '') || '';
    const deliveryTime = loadData.deliveryTime || (popup ? popup.dataset.deliveryTime : '') || '';
    
    body = body.replace(/\{\{PICKUP_TIME\}\}/g, pickupTime);
    body = body.replace(/\{\{DELIVERY_TIME\}\}/g, deliveryTime);
    
    return body;
  }


  extractUserSearchOrigin() {
    // Extract user's search origin from DAT header
    // Find the first dat-search-location with formcontrolname="origin"
    const originLocation = document.querySelector('dat-search-location[formcontrolname="origin"]');
    if (!originLocation) return '';

    // Find the input with data-test="origin-input" and formcontrolname="locationInput"
    const originInput = originLocation.querySelector('input[data-test="origin-input"][formcontrolname="locationInput"]');
    if (!originInput) return '';

    const userOrigin = originInput.value ? originInput.value.trim() : '';
    return userOrigin;
  }

  openGoogleMaps(loadData) {
    if (!loadData.origin || !loadData.destination) {
      alert('Could not extract origin and destination from the load details.');
      return;
    }

    // Try to get user's search origin from header
    const userOrigin = this.extractUserSearchOrigin();
    
    let mapsUrl;
    if (userOrigin) {
      // Route: User Origin → Load Origin → Load Destination
      const start = encodeURIComponent(userOrigin);
      const waypoint = encodeURIComponent(loadData.origin);
      const destination = encodeURIComponent(loadData.destination);
      mapsUrl = `https://www.google.com/maps/dir/${start}/${waypoint}/${destination}`;
    } else {
      // Fallback: Load Origin → Load Destination (original behavior)
      const origin = encodeURIComponent(loadData.origin);
      const destination = encodeURIComponent(loadData.destination);
      mapsUrl = `https://www.google.com/maps/dir/${origin}/${destination}`;
    }
    
    // Add subtle delay to prevent Chrome blocking
    setTimeout(() => {
      window.open(mapsUrl, '_blank');
    }, 50);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new QuickDAT());
} else {
  new QuickDAT();
}