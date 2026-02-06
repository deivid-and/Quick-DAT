// Quick-DAT popup icons
// Dependencies: window.QD.selectors, window.QD.extractors, window.QD.ui.rpm
window.QD = window.QD || {};
window.QD.ui = window.QD.ui || {};
window.QD.ui.icons = window.QD.ui.icons || {};

window.QD.ui.icons.addIconsToPopup = function addIconsToPopup(popup, context) {
  if (context.iconsAdded.has(popup)) return;

  const loadData = window.QD.extractors.extractLoadData(popup, context);
  if (!loadData.origin || !loadData.destination) return;

  // Find the header actions area
  const actionsArea = popup.querySelector(window.QD.selectors.popup.actionsArea.join(', '));
  if (!actionsArea) return;

  // Create icons container
  const iconsContainer = document.createElement('div');
  iconsContainer.className = 'quick-dat-icons';
  iconsContainer.style.cssText =
    'display: flex;' +
    'gap: 8px;' +
    'margin-left: 8px;';

  // Add Maps icon (always show)
  const mapsIcon = window.QD.ui.icons.createIcon('map', 'View Route on Maps', () => {
    window.QD.integrations.maps.openGoogleMaps(loadData, context);
  });
  iconsContainer.appendChild(mapsIcon);

  // Add Email icon only if email exists
  if (loadData.email) {
    const emailIcon = window.QD.ui.icons.createIcon('mail', 'Email Broker', () => {
      window.QD.integrations.gmail.openEmailDraft(loadData, popup, context);
    });
    iconsContainer.appendChild(emailIcon);
  }

  // Insert icons into actions area
  actionsArea.appendChild(iconsContainer);
  context.iconsAdded.add(popup);

  // Add RPM badge in popup if applicable
  window.QD.ui.rpm.addPopupRpmBadge(popup, context);
};

window.QD.ui.icons.createIcon = function createIcon(iconType, title, onClick) {
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
};
