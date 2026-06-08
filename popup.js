// Quick-DAT Popup Script
class QuickDATPopup {
  constructor() {
    this.saving = false; // Track saving state to prevent double clicks
    this.templateCollapsed = true;
    this.loadSettings();
    this.setupEventListeners();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['emailTemplate', 'emptyBodyOption', 'rpmHighlightEnabled', 'targetRpm']);
      document.getElementById('emailTemplate').value = result.emailTemplate || this.getDefaultTemplate();
      document.getElementById('emptyBodyOption').checked = true;
      document.getElementById('emptyBodyOption').disabled = true;
      document.getElementById('rpmHighlightEnabled').checked = result.rpmHighlightEnabled ?? false;
      document.getElementById('targetRpm').value = typeof result.targetRpm === 'number' ? result.targetRpm.toFixed(2) : '2.00';
      
      // Email templates are temporarily disabled, so keep the editor hidden.
      this.toggleEmailTemplateSection(true);
      this.updateTemplateCollapse(this.templateCollapsed);
      
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
    
    // Template controls remain in code for future re-enable, but are inactive for now.
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
    const toggleBtn = document.getElementById('toggleTemplateBtn');
    if (isHidden) {
      section.classList.add('hidden');
      toggleBtn.disabled = true;
      toggleBtn.textContent = 'Hidden';
    } else {
      section.classList.remove('hidden');
      toggleBtn.disabled = false;
      // When user wants the template, auto-expand it
      this.templateCollapsed = false;
      this.updateTemplateCollapse(this.templateCollapsed);
    }
  }

  updateTemplateCollapse(collapsed) {
    const section = document.getElementById('emailTemplateSection');
    const toggleBtn = document.getElementById('toggleTemplateBtn');
    if (!section || !toggleBtn) return;

    if (section.classList.contains('hidden')) {
      toggleBtn.textContent = 'Hidden';
      return;
    }

    if (collapsed) {
      section.classList.add('collapsed');
      toggleBtn.textContent = 'Expand';
      toggleBtn.setAttribute('aria-expanded', 'false');
    } else {
      section.classList.remove('collapsed');
      toggleBtn.textContent = 'Collapse';
      toggleBtn.setAttribute('aria-expanded', 'true');
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
    status.className = `status ${type}`;
    status.style.display = 'block'; // Ensure it's visible before showing
    status.classList.add('show');
    
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
    // Prevent double clicks with debounce
    if (this.saving) return;
    this.saving = true;
    
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
      const settings = {
        emailTemplate: document.getElementById('emailTemplate').value,
        emptyBodyOption: true,
        rpmHighlightEnabled: document.getElementById('rpmHighlightEnabled').checked,
        targetRpm: parseFloat(document.getElementById('targetRpm').value) || 0
      };
      
      await chrome.storage.sync.set(settings);
      
      this.showStatus('Settings saved successfully!', 'success');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('Error saving settings. Please try again.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
      
      // Reset saving state after delay
      setTimeout(() => {
        this.saving = false;
      }, 1500);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new QuickDATPopup();
});
