// Content script for DAT load board interaction
class DATLoadExtractor {
  constructor() {
    this.setupMessageListener();
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

  handleEmailBroker() {
    const loadData = this.extractLoadData();
    this.openEmailDraft(loadData);
  }

  handleViewRoute() {
    const loadData = this.extractLoadData();
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
