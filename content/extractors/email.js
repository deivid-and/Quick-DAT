// Quick-DAT email extraction
// Dependencies: window.QD.selectors
window.QD = window.QD || {};
window.QD.extractors = window.QD.extractors || {};
window.QD.extractors.extractEmailFromElement = function extractEmailFromElement(element, selectors, context) {
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
    const notesSection = element.querySelector(window.QD.selectors.popup.notes);
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
        const popup = element.closest(window.QD.selectors.popup.root);
        if (popup) {
          const existingIcons = popup.querySelector('.quick-dat-icons');
          if (existingIcons && !existingIcons.querySelector('[title="Email Broker"]')) {
            const emailIcon = window.QD.ui.icons.createIcon('mail', 'Email Broker', () => {
              window.QD.integrations.gmail.openEmailDraft(
                { ...window.QD.extractors.extractLoadData(popup, context), email: delayedEmail },
                popup,
                context
              );
            });
            existingIcons.appendChild(emailIcon);
          }
        }
      }
    }, delay);
  });

  return '';
};
