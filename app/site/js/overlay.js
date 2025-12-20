/**
 * Overlay/Modal Management
 * Handles dynamic form overlays for the application
 */

let currentOverlay = null;

/**
 * Open overlay with dynamic content
 * @param {string} contentUrl - URL to fetch form content
 * @param {string} title - Overlay title
 */
async function openOverlay(contentUrl, title) {
  const overlay = document.getElementById('overlayContainer');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayBody = document.getElementById('overlayBody');

  if (!overlay || !overlayTitle || !overlayBody) {
    console.error('Overlay elements not found');
    return;
  }

  // Set title
  overlayTitle.textContent = title;

  // Show loading state
  overlayBody.innerHTML = `
    <div class="text-center p-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;

  // Show overlay
  overlay.classList.remove('d-none');
  document.body.style.overflow = 'hidden';

  try {
    // Fetch form content
    const response = await fetch(contentUrl);
    if (!response.ok) {
      throw new Error(`Failed to load form: ${response.statusText}`);
    }

    const html = await response.text();
    overlayBody.innerHTML = html;

    // Setup form submission handlers
    setupFormHandlers(overlayBody);

    currentOverlay = contentUrl;
  } catch (error) {
    console.error('Error loading overlay content:', error);
    overlayBody.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> Failed to load form content. ${error.message}
      </div>
    `;
  }
}

/**
 * Close the overlay
 */
function closeOverlay() {
  const overlay = document.getElementById('overlayContainer');
  if (overlay) {
    overlay.classList.add('d-none');
    document.body.style.overflow = '';
    
    // Clear content after animation
    setTimeout(() => {
      const overlayBody = document.getElementById('overlayBody');
      if (overlayBody) {
        overlayBody.innerHTML = '';
      }
    }, 300);
  }
  currentOverlay = null;
}

/**
 * Setup form submission handlers within overlay
 * @param {HTMLElement} container - Form container element
 */
function setupFormHandlers(container) {
  const forms = container.querySelectorAll('form[data-overlay-form]');
  
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn?.textContent;
      
      try {
        // Disable submit button
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            Submitting...
          `;
        }

        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Handle checkboxes explicitly (unchecked checkboxes don't submit)
        form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
          const name = checkbox.name;
          if (name) {
            data[name] = checkbox.checked;
          }
        });

        //Output data for debugging
        console.log('Form data to submit:', data);
        
        // Handle nested JSON fields (for data structures like radar[frequency] or environment[precipitation][enabled])
        Object.keys(data).forEach(key => {
          if (key.includes('[') && key.includes(']')) {
            // Parse nested field names with multiple levels
            const parts = key.split(/[\[\]]+/).filter(p => p.length > 0);
            
            if (parts.length > 1) {
              // Build nested object structure
              let current = data;
              for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) current[part] = {};
                current = current[part];
              }
              // Set the value at the deepest level
              current[parts[parts.length - 1]] = data[key];
              delete data[key];
            }
          }
        });

        // Transform platform data to match backend expectations
        if (data.type === 'sam' || data.type === 'fighter') {
          const platformData = {};
          const type = data.type;
          
          // Extract all non-type fields into platformData
          Object.keys(data).forEach(key => {
            if (key !== 'type') {
              platformData[key] = data[key];
              delete data[key];
            }
          });
          
          // Restructure to match controller expectations
          data.type = type;
          data.data = platformData;
        }

        // Submit form
        // HTML forms only support GET/POST, so check for data-method attribute for PUT/DELETE
        const method = form.getAttribute('data-method') || form.method || 'POST';
        const action = form.action;
        
        const response = await fetch(action, {
          method: method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Submission failed');
        }

        const result = await response.json();
        
        // Show success message
        showNotification('Success', 'Form submitted successfully', 'success');
        
        // Close overlay
        closeOverlay();
        
        // Reload page or update content based on form type
        const reloadPage = form.dataset.reloadOnSuccess !== 'false';
        if (reloadPage) {
          setTimeout(() => window.location.reload(), 500);
        }
        
      } catch (error) {
        console.error('Form submission error:', error);
        showNotification('Error', error.message, 'danger');
        
        // Re-enable submit button
        if (submitBtn && originalText) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  });
}

/**
 * Show notification toast
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Bootstrap alert type (success, danger, warning, info)
 */
function showNotification(title, message, type = 'info') {
  const container = document.getElementById('overlayBody');
  if (!container) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show position-absolute top-0 start-50 translate-middle-x mt-3`;
  alert.style.zIndex = '9999';
  alert.innerHTML = `
    <strong>${title} OKAY:</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Close button
  const closeBtn = document.getElementById('overlayClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeOverlay);
  }

  // Backdrop click
  const backdrop = document.getElementById('overlayBackdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeOverlay);
  }

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentOverlay) {
      closeOverlay();
    }
  });
});


function togglePrecipitation() {
  const enabled = document.getElementById('precipitationEnabled').checked;
  const fields = document.getElementById('precipitationFields');
  
  if (enabled) {
    fields.classList.remove('d-none');
  } else {
    fields.classList.add('d-none');
  }
}

/** Toggle platform-specific fields in creation form
 * @param {string} type - Platform type ('sam' or 'fighter')
 */
function togglePlatformFields(type) {
  const samFields = document.getElementById('samFields');
  const fighterFields = document.getElementById('fighterFields');
  
  if (type === 'sam') {
    samFields.classList.remove('d-none');
    fighterFields.classList.add('d-none');
  } else if (type === 'fighter') {
    samFields.classList.add('d-none');
    fighterFields.classList.remove('d-none');
  } else {
    samFields.classList.add('d-none');
    fighterFields.classList.add('d-none');
  }
}
