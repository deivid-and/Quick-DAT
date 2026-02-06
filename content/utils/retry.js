// Quick-DAT retry helper
// Defines: window.QD.utils.retryWithDelays
// Expects: window.QD
window.QD = window.QD || {};
window.QD.utils = window.QD.utils || {};
window.QD.utils.retryWithDelays = function retryWithDelays(delays, fn) {
  delays.forEach((delay) => {
    setTimeout(() => fn(delay), delay);
  });
};
