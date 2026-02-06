// Quick-DAT toast UI
// Defines: window.QD.ui.showToast
// Expects: window.QD
window.QD = window.QD || {};
window.QD.ui = window.QD.ui || {};
window.QD.ui.showToast = function showToast(message) {
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
};
