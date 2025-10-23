// Quick-DAT Popup Script
class QuickDATPopup {
  constructor() {
    this.loadSettings();
    this.setupEventListeners();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['emailTemplate', 'emptyBodyOption']);
      document.getElementById('emailTemplate').value = result.emailTemplate || this.getDefaultTemplate();
      document.getElementById('emptyBodyOption').checked = result.emptyBodyOption || false;
    } catch (error) {
      console.error('Error loading settings:', error);
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

  setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    // Variable tag clicks
    document.querySelectorAll('.variable-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const variable = tag.getAttribute('data-var');
        this.insertVariable(variable);
      });
    });
  }

  insertVariable(variable) {
    const textarea = document.getElementById('emailTemplate');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    textarea.value = before + variable + after;
    textarea.focus();
    textarea.setSelectionRange(start + variable.length, start + variable.length);
  }

  async saveSettings() {
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
      const settings = {
        emailTemplate: document.getElementById('emailTemplate').value,
        emptyBodyOption: document.getElementById('emptyBodyOption').checked
      };
      
      await chrome.storage.sync.set(settings);
      
      status.textContent = 'Settings saved successfully!';
      status.className = 'status success';
      status.style.display = 'block';
      
      setTimeout(() => {
        status.style.display = 'none';
      }, 3000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      status.textContent = 'Error saving settings. Please try again.';
      status.className = 'status error';
      status.style.display = 'block';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new QuickDATPopup();
});
