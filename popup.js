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
      const emptyBodyChecked = result.emptyBodyOption || false;
      document.getElementById('emptyBodyOption').checked = emptyBodyChecked;
      
      // Initialize the email template section visibility
      this.toggleEmailTemplateSection(emptyBodyChecked);
      
      // Auto-resize textarea on load
      const textarea = document.getElementById('emailTemplate');
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight) + 'px';
    } catch (error) {
      console.error('Error loading settings:', error);
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

  setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    // Restore default button
    document.getElementById('restoreBtn').addEventListener('click', () => {
      this.restoreDefaultTemplate();
    });

    // Empty body option checkbox
    document.getElementById('emptyBodyOption').addEventListener('change', (e) => {
      this.toggleEmailTemplateSection(e.target.checked);
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
    
    // Auto-resize after insertion
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
  }

  toggleEmailTemplateSection(isHidden) {
    const section = document.getElementById('emailTemplateSection');
    if (isHidden) {
      section.classList.add('hidden');
    } else {
      section.classList.remove('hidden');
    }
  }

  restoreDefaultTemplate() {
    const textarea = document.getElementById('emailTemplate');
    textarea.value = this.getDefaultTemplate();
    
    // Auto-resize after restoration
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
    
    // Show success message
    this.showStatus('Template restored to default!', 'success');
  }

  showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type} show`;
    
    setTimeout(() => {
      status.classList.remove('show');
      status.classList.add('hide');
      setTimeout(() => {
        status.style.display = 'none';
        status.classList.remove('hide');
      }, 300);
    }, 2000);
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
      
      this.showStatus('Settings saved successfully! Please refresh the page to apply the changes.', 'success');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('Error saving settings. Please try again.', 'error');
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
