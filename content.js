// Quick-DAT Content Script
const SELECTORS = {
  popup: {
    root: 'dat-load-details',
    actionsArea: [
      '[data-test="details-header-actions"]',
      '.details-header_actions',
      '.details-header',
      '.details-actions'
    ],
    time: {
      originBase: ['[data-test="route-origin"]', '.route-origin'],
      destinationBase: ['[data-test="route-destination"]', '.route-destination'],
      date: ['[data-test="route-date"]', '.date'],
      hours: ['.hours']
    },
    origin: [
      '[data-test="route-origin"] .city',
      '.trip-place div:first-child',
      '.route-origin .city',
      '.city.city-table',
      '.route-flex .route-origin .city'
    ],
    destination: [
      '[data-test="route-destination"] .city',
      '.trip-place div:last-child',
      '.route-destination .city',
      '.city.align.city-table',
      '.route-flex .route-destination .city'
    ],
    date: ['[data-test="route-date"]', '.date', '.route-origin .date', '.route-flex .date'],
    phone: ['a[href^="tel:"]', '.contacts__phone', '.company-data-container a[href^="tel:"]'],
    email: [
      'a[href^="mailto:"]',
      '.contacts__email a[href^="mailto:"]',
      '.contacts__email',
      '.contact-methods a[href^="mailto:"]',
      '.contacts a[href^="mailto:"]',
      '[href^="mailto:"]'
    ],
    rate: [
      '[data-test="load-rate-cell"] .rate-container',
      '.data-item-total',
      '.rate-data',
      '.data-item.data-item-total',
      '.rate-details-container .data-item:first-child',
      '.rate-detail-label:first-child + .rate-data .data-item'
    ],
    commodity: ['.data-item.multiline', '.equipment-data .data-item.multiline', '.equipment-data .data-item'],
    weight: ['.equipment-data .data-item:nth-child(4)', '.data-item:contains("Weight")'],
    reference: ['.equipment-data .data-item:last-child', '.data-item:last-child'],
    equipment: {
      container: '.data-container',
      labels: '.equipment-label .data-label',
      dataItems: '.equipment-data .data-item'
    },
    notes: '.notes-contents, .notes-contents.multiline',
    rateCells: '[data-test="load-rate-cell"]'
  },
  header: {
    originLocation: 'dat-search-location[formcontrolname="origin"]',
    destinationLocation: 'dat-search-location[formcontrolname="destination"]',
    originInput: 'input[data-test="origin-input"][formcontrolname="locationInput"]',
    destinationInput: 'input[data-test="destination-input"][formcontrolname="locationInput"]'
  }
};

class QuickDAT {
  constructor() {
    this.debug = false; // Set to true for development debugging
    this.settings = {
      emailTemplate: this.getDefaultTemplate(),
      emptyBodyOption: true,
      rpmHighlightEnabled: false,
      targetRpm: 2.0
    };
    this.iconsAdded = new Set();
    this.observer = null; // Track observer to prevent multiple instances
    this.rpmStylesInjected = false;
    this.setupObserver();
    this.loadSettings();
    this.setupSettingsListener();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['emailTemplate', 'emptyBodyOption', 'rpmHighlightEnabled', 'targetRpm']);
      this.settings = {
        emailTemplate: result.emailTemplate ?? this.getDefaultTemplate(),
        emptyBodyOption: result.emptyBodyOption ?? true,
        rpmHighlightEnabled: result.rpmHighlightEnabled ?? false,
        targetRpm: typeof result.targetRpm === 'number' ? result.targetRpm : 2.0
      };
    } catch (error) {
      this.settings = {
        emailTemplate: this.getDefaultTemplate(),
        emptyBodyOption: true,
        rpmHighlightEnabled: false,
        targetRpm: 2.0
      };
    }

    // Apply RPM highlighting if enabled after settings load
    if (this.settings.rpmHighlightEnabled) {
      this.highlightLoadRows();
      document.querySelectorAll(SELECTORS.popup.root).forEach(popup => this.addPopupRpmBadge(popup));
    }
  }

  setupSettingsListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;

      const relevantKeys = new Set(['emailTemplate', 'emptyBodyOption', 'rpmHighlightEnabled', 'targetRpm']);
      const hasRelevantChanges = Object.keys(changes).some(key => relevantKeys.has(key));
      if (!hasRelevantChanges) return;

      const nextSettings = { ...this.settings };
      for (const [key, change] of Object.entries(changes)) {
        nextSettings[key] = change.newValue;
      }
      this.settings = {
        emailTemplate: nextSettings.emailTemplate ?? this.getDefaultTemplate(),
        emptyBodyOption: nextSettings.emptyBodyOption ?? true,
        rpmHighlightEnabled: nextSettings.rpmHighlightEnabled ?? false,
        targetRpm: typeof nextSettings.targetRpm === 'number' ? nextSettings.targetRpm : 2.0
      };

      this.showToast('Quick-DAT settings updated');

      if (!this.settings.rpmHighlightEnabled) {
        this.clearRpmHighlights();
        return;
      }

      this.highlightLoadRows();
      document.querySelectorAll(SELECTORS.popup.root).forEach(popup => this.addPopupRpmBadge(popup));
    });
  }

  showToast(message) {
    const existing = document.getElementById('quick-dat-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'quick-dat-toast';
    toast.textContent = message;
    toast.style.cssText =
      'position: fixed;' +
      'right: 16px;' +
      'bottom: 16px;' +
      'z-index: 999999;' +
      'background: #0f172a;' +
      'color: #ffffff;' +
      'padding: 10px 12px;' +
      'border-radius: 8px;' +
      'font-size: 12px;' +
      'box-shadow: 0 6px 16px rgba(15, 23, 42, 0.3);' +
      'opacity: 0;' +
      'transform: translateY(6px);' +
      'transition: opacity 0.2s ease, transform 0.2s ease;';

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      setTimeout(() => toast.remove(), 250);
    }, 1500);
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
            if (node.matches && node.matches(SELECTORS.popup.root)) {
              this.addIconsToPopup(node);
            }
            // Check for nested dat-load-details
            const loadDetails = node.querySelectorAll && node.querySelectorAll(SELECTORS.popup.root);
            if (loadDetails) {
              loadDetails.forEach(popup => this.addIconsToPopup(popup));
            }
            // Scan for rate cells to apply RPM highlighting
            if (node.querySelectorAll) {
              const rateCells = node.querySelectorAll(SELECTORS.popup.rateCells);
              if (rateCells.length > 0) {
                this.highlightLoadRows(rateCells);
              }
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
    document.querySelectorAll(SELECTORS.popup.root).forEach(popup => {
      this.addIconsToPopup(popup);
    });

    // Initial pass for RPM highlighting on existing rows
    const initialRateCells = document.querySelectorAll(SELECTORS.popup.rateCells);
    if (initialRateCells.length > 0) {
      this.highlightLoadRows(initialRateCells);
    }

    // Final safety re-check for Angular re-renders
    setTimeout(() => {
      document.querySelectorAll(SELECTORS.popup.root).forEach(popup => {
        if (!popup.querySelector('.quick-dat-icons')) {
          this.addIconsToPopup(popup);
        }
      });
      const delayedRateCells = document.querySelectorAll(SELECTORS.popup.rateCells);
      if (delayedRateCells.length > 0) {
        this.highlightLoadRows(delayedRateCells);
      }
    }, 5000);
  }

  addIconsToPopup(popup) {
    if (this.iconsAdded.has(popup)) return;
    
    const loadData = this.extractLoadData(popup);
    if (!loadData.origin || !loadData.destination) return;

    // Find the header actions area
    const actionsArea = popup.querySelector(SELECTORS.popup.actionsArea.join(', '));
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

    // Add RPM badge in popup if applicable
    this.addPopupRpmBadge(popup);
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
    const pickupTime = this.extractTimeWithRetry(popup, 'pickup');
    const deliveryTime = this.extractTimeWithRetry(popup, 'delivery');

    const loadData = {
      origin: this.extractTextFromElement(popup, SELECTORS.popup.origin),
      destination: this.extractTextFromElement(popup, SELECTORS.popup.destination),
      date: this.extractTextFromElement(popup, SELECTORS.popup.date),
      phone: this.extractTextFromElement(popup, SELECTORS.popup.phone),
      email: this.extractEmailFromElement(popup, SELECTORS.popup.email),
      rate: this.extractTextFromElement(popup, SELECTORS.popup.rate, { skipMiles: true }),
      commodity: this.extractTextFromElement(popup, SELECTORS.popup.commodity),
      weight: this.extractTextFromElement(popup, SELECTORS.popup.weight),
      reference: this.extractTextFromElement(popup, SELECTORS.popup.reference),
      pickupTime,
      deliveryTime
    };

    // Debug log for pickup/delivery times
    if (this.debug) {
      console.log('Quick-DAT: Debug - Looking for times in popup:', popup);
      const pickupHours = SELECTORS.popup.time.originBase
        .flatMap(base => SELECTORS.popup.time.hours.map(hours => `${base} ${hours}`));
      const deliveryHours = SELECTORS.popup.time.destinationBase
        .flatMap(base => SELECTORS.popup.time.hours.map(hours => `${base} ${hours}`));

      console.log('Quick-DAT: Debug - Found pickup elements:', popup.querySelectorAll(pickupHours.join(', ')));
      console.log('Quick-DAT: Debug - Found delivery elements:', popup.querySelectorAll(deliveryHours.join(', ')));
      console.log('Quick-DAT: Debug - All hours elements:', popup.querySelectorAll(SELECTORS.popup.time.hours.join(', ')));
      
      if (pickupTime || deliveryTime) {
        console.log('Quick-DAT: Extracted times:', { pickupTime, deliveryTime });
      } else {
        console.log('Quick-DAT: No times extracted - checking all hours elements');
        popup.querySelectorAll(SELECTORS.popup.time.hours.join(', ')).forEach((el, index) => {
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

  extractTextFromElement(element, selectors, options = {}) {
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
          if (options.skipMiles && text.includes('mi')) {
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
    const baseSelectors = type === 'pickup'
      ? SELECTORS.popup.time.originBase
      : SELECTORS.popup.time.destinationBase;
    const dateSelectors = SELECTORS.popup.time.date;
    const hoursSelectors = SELECTORS.popup.time.hours;

    const extract = () => {
      let dateEl = null;
      for (const base of baseSelectors) {
        for (const dateSel of dateSelectors) {
          const found = popup.querySelector(`${base} ${dateSel}`);
          if (found) {
            dateEl = found;
            break;
          }
        }
        if (dateEl) break;
      }

      const hoursSet = new Set();
      for (const base of baseSelectors) {
        for (const hoursSel of hoursSelectors) {
          popup.querySelectorAll(`${base} ${hoursSel}`).forEach(el => hoursSet.add(el));
        }
      }

      const hoursEls = Array.from(hoursSet)
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
            const popupRef = popup.closest(SELECTORS.popup.root);
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
      // 1️⃣ Check configured selectors first (prefer stable selectors)
      for (const selector of selectors) {
        const el = element.querySelector(selector);
        if (!el) continue;

        if (el.href && el.href.startsWith('mailto:')) {
          return el.href.replace('mailto:', '').trim();
        }

        const match = el.textContent.match(emailRegex);
        if (match) return match[0].trim();
      }

      // 2️⃣ Check comments/notes section specifically
      const notesSection = element.querySelector(SELECTORS.popup.notes);
      if (notesSection && notesSection.textContent.match(emailRegex)) {
        return notesSection.textContent.match(emailRegex)[0].trim();
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
          const popup = element.closest(SELECTORS.popup.root);
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

  ensureRpmStyles() {
    if (this.rpmStylesInjected) return;
    const style = document.createElement('style');
    style.textContent = `
      .quick-dat-rpm-hit {
        background: #e7f5ec !important;
        border: 1px solid #c6e7d3 !important;
        border-radius: 6px;
        padding: 2px 6px;
      }
    `;
    document.head.appendChild(style);
    this.rpmStylesInjected = true;
  }

  parseRpmFromCell(cell) {
    if (!cell) return null;
    const text = cell.querySelector('.calculated-rate span')?.textContent?.trim() || '';
    const match = text.match(/\$?\s*([\d.,]+)\s*\*?\/\s*mi/i);
    if (!match) return null;
    const value = parseFloat(match[1].replace(/,/g, ''));
    return Number.isFinite(value) ? value : null;
  }

  applyRpmHighlightToCell(cell) {
    const rateContainer = cell.querySelector('.rate-container') || cell;
    if (!this.settings.rpmHighlightEnabled) {
      rateContainer.classList.remove('quick-dat-rpm-hit');
      return;
    }
    const rpm = this.parseRpmFromCell(cell);
    const target = this.settings.targetRpm ?? 2.0;

    if (!rpm || rpm < target) {
      rateContainer.classList.remove('quick-dat-rpm-hit');
      return;
    }

    this.ensureRpmStyles();
    rateContainer.classList.add('quick-dat-rpm-hit');
  }

  highlightLoadRows(rateCells = null) {
    if (!this.settings.rpmHighlightEnabled) return;
    const cells = rateCells ? Array.from(rateCells) : Array.from(document.querySelectorAll(SELECTORS.popup.rateCells));
    cells.forEach(cell => this.applyRpmHighlightToCell(cell));
  }

  clearRpmHighlights() {
    const cells = Array.from(document.querySelectorAll(SELECTORS.popup.rateCells));
    cells.forEach(cell => {
      const rateContainer = cell.querySelector('.rate-container') || cell;
      rateContainer.classList.remove('quick-dat-rpm-hit');
    });
  }

  addPopupRpmBadge(popup) {
    if (!this.settings.rpmHighlightEnabled) return;
    const rateCell = popup.querySelector(SELECTORS.popup.rateCells);
    const rpm = this.parseRpmFromCell(rateCell);
    const target = this.settings.targetRpm ?? 2.0;

    const rateContainer = rateCell ? (rateCell.querySelector('.rate-container') || rateCell) : null;
    if (!rateContainer) return;
    
    rateContainer.classList.remove('quick-dat-rpm-hit');
    if (!rpm || rpm < target) {
      return;
    }

    this.ensureRpmStyles();
    rateContainer.classList.add('quick-dat-rpm-hit');
  }

  openEmailDraft(loadData, popup = null) {
    // Re-extract reference from popup if available (Angular async loading)
    // The reference may not be populated when icons are first added
    if (popup) {
      const equipmentContainer = popup.querySelector(SELECTORS.popup.equipment.container);
      if (equipmentContainer) {
        const labels = Array.from(equipmentContainer.querySelectorAll(SELECTORS.popup.equipment.labels));
        const dataItems = Array.from(equipmentContainer.querySelectorAll(SELECTORS.popup.equipment.dataItems));
        
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
    const originLocation = document.querySelector(SELECTORS.header.originLocation);
    if (!originLocation) return '';

    // Find the input with data-test="origin-input" and formcontrolname="locationInput"
    const originInput = originLocation.querySelector('input[data-test="origin-input"][formcontrolname="locationInput"]');
    if (!originInput) return '';

    const userOrigin = originInput.value ? originInput.value.trim() : '';
    return userOrigin;
  }

  extractUserSearchDestination() {
    // Extract user's search destination from DAT header
    // Find the first dat-search-location with formcontrolname="destination"
    const destinationLocation = document.querySelector(SELECTORS.header.destinationLocation);
    if (!destinationLocation) return '';

    // Find the input with data-test="destination-input" and formcontrolname="locationInput"
    const destinationInput = destinationLocation.querySelector('input[data-test="destination-input"][formcontrolname="locationInput"]');
    if (!destinationInput) return '';

    const userDestination = destinationInput.value ? destinationInput.value.trim() : '';
    return userDestination;
  }

  openGoogleMaps(loadData) {
    if (!loadData.origin || !loadData.destination) {
      alert('Could not extract origin and destination from the load details.');
      return;
    }

    // Try to get user's search origin from header
    const userOrigin = this.extractUserSearchOrigin();
    const userDestination = this.extractUserSearchDestination();
    
    let mapsUrl;
    if (userOrigin && userDestination) {
      // Route: User Origin → Load Origin → Load Destination → User Destination
      const start = encodeURIComponent(userOrigin);
      const waypoint = encodeURIComponent(loadData.origin);
      const destination = encodeURIComponent(loadData.destination);
      const end = encodeURIComponent(userDestination);
      mapsUrl = `https://www.google.com/maps/dir/${start}/${waypoint}/${destination}/${end}`;
    } else if (userOrigin) {
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
