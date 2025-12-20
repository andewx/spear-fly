/**
 * Form Handlers
 * Client-side handlers for platform and scenario form operations using bluejs framework
 */


// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Distribution Toggle Binding
 */

function distributionToggle(event) {
  event?.preventDefault();
  const select = document.getElementById('distributionPresetSelect');
  const customFields = document.getElementById('customDistributionFields');
  if (select && customFields) {
    if (select.value === 'custom') {
      customFields.classList.remove('d-none');
    } else {
      customFields.classList.add('d-none');
    }
  }
}


/**
 * Get selected platform from dropdown
 * @param {string} selectId - ID of select element
 * @returns {string|null} Selected platform ID
 */
function getSelectedPlatform(selectId) {
  const select = document.getElementById(selectId);
  return select ? select.value : null;
}

/**
 * Get selected scenario from dropdown
 * @returns {string|null} Selected scenario ID
 */
function getSelectedScenario() {
  const select = document.getElementById('scenarioSelect');
  return select ? select.value : null;
}




