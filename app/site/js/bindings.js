// ============================================================================
// BlueJS Bindings Registration
// ============================================================================

// ============================================================================
// Platform Form Handlers
// ============================================================================

/**
 * Open create SAM system form
 */
function createSAMSystem(e) {
  e?.preventDefault();
  openOverlay('/forms/platform/create?type=sam', 'Create SAM System');
}

/**
 * Open create fighter aircraft form
 */
function createFighter(e) {
  e?.preventDefault();
  openOverlay('/forms/platform/create?type=fighter', 'Create Fighter');
}



/**
 * Open edit platform form
 */
function editPlatform(e) {
  e?.preventDefault();
  const element = e.currentTarget;
  const type = element.getAttribute('data-type');
  const id = element.getAttribute('data-id');
  
  if (!type || !id) {
    console.error('Platform type and ID required');
    return;
  }
  
  const title = type === 'sam' ? 'Edit SAM System' : 'Edit Fighter Aircraft';
  openOverlay(`/forms/platform/edit/${type}/${id}`, title);
}

/**
 * Delete platform with confirmation
 */
async function deletePlatform(e) {
  e?.preventDefault();
  const element = e.currentTarget;
  const type = element.getAttribute('data-type');
  const id = element.getAttribute('data-id');
  
  if (!type || !id) {
    console.error('Platform type and ID required');
    return;
  }
  
  const confirmMsg = `Are you sure you want to delete this ${type === 'sam' ? 'SAM system' : 'fighter aircraft'}?`;
  if (!confirm(confirmMsg)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/platforms/${type}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete platform');
    }
    
    // Reload page to show updated list
    window.location.reload();
  } catch (error) {
    console.error('Error deleting platform:', error);
    alert(`Error: ${error.message}`);
  }
}

// ============================================================================
// Scenario Form Handlers
// ============================================================================

/**
 * Open create scenario form
 */
function createScenario(e) {
  e?.preventDefault();
  openOverlay('/forms/scenario/create', 'Create Scenario');
}

/**
 * Open edit scenario form
 */
function editScenario(e) {
  e?.preventDefault();
  const element = e.currentTarget;
  const id = element.getAttribute('data-id');
  
  if (!id) {
    console.error('Scenario ID required');
    return;
  }
  
  openOverlay(`/forms/scenario/edit/${id}`, 'Edit Scenario');
}

/**
 * Delete scenario with confirmation
 */
async function deleteScenario(e) {
  e?.preventDefault();
  const element = e.currentTarget;
  const id = element.getAttribute('data-id');
  
  if (!id) {
    console.error('Scenario ID required');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this scenario?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/scenarios/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete scenario');
    }
    
    // Reload page to show updated list
    window.location.reload();
  } catch (error) {
    console.error('Error deleting scenario:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * View scenario details
 */
function viewScenario(e) {
  e?.preventDefault();
  const element = e.currentTarget;
  const id = element.getAttribute('data-id');
  
  if (!id) {
    console.error('Scenario ID required');
    return;
  }
  
  // Navigate to scenario detail page
  window.location.href = `/scenarios/${id}`;
}

// ============================================================================
// Scenario Selection Handlers
// ============================================================================

/**
 * Handle scenario selection from dropdown
 */
function selectScenario(e) {
  const scenarioId = e?.currentTarget?.value;
  
  if (!scenarioId) {
    console.log('No scenario selected');
    return;
  }
  
  // Get scenario from appState
  if (typeof appState !== 'undefined' && appState.scenarios) {
    const selectedScenario = appState.scenarios.find(s => s.id === scenarioId);

    if (selectedScenario === undefined) {
      console.error('Scenario not found:', scenarioId);
      return;
    }
    
    if (selectedScenario) {
      appState.selectedScenario = selectedScenario;
      
      // Update visualization if available
      if (typeof visualization !== 'undefined' && visualization.setScenario) {
        visualization.setScenario(selectedScenario);
      }
      
      console.log('Selected Scenario:', selectedScenario.name);
    } else {
      console.error('Scenario not found:', scenarioId);
    }
  } else {
    console.error('appState or scenarios not available');
  }
}

// ============================================================================
// Precipitation Field Handlers
// ============================================================================

/**
 * Generate precipitation field for selected scenario
 */
async function generatePrecipitation(e) {
  console.log('generatePrecipitation called', e);
  e?.preventDefault();
  
  // Get selected scenario from dropdown
  const scenarioSelect = document.getElementById('scenarioSelect');
  console.log('scenarioSelect:', scenarioSelect, 'value:', scenarioSelect?.value);
  
  if (!scenarioSelect || !scenarioSelect.value) {
    alert('Please select a scenario first');
    return;
  }
  
  const scenarioId = scenarioSelect.value;
  const btn = e?.currentTarget;
  const originalText = btn?.innerHTML;
  
  console.log('Generating precipitation for scenario:', scenarioId);
  
  try {
    // Disable button and show loading state
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';
    }
    
    // Call API to generate precipitation field
    console.log('Calling /api/synthetic/precipitation with scenarioId:', scenarioId);
    const response = await fetch('/api/synthetic/precipitation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scenarioId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate precipitation field');
    }
    
    const result = await response.json();
    
    // Show success message
    alert(`Precipitation field generated successfully!\nImage: ${result.data.imageFilename}`);
    
    // Reload page to update visualization
    window.location.reload();
    
  } catch (error) {
    console.error('Error generating precipitation field:', error);
    alert(`Error: ${error.message}`);
  } finally {
    // Re-enable button
    if (btn && originalText) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}


async function initSimulation(scenarioId){
 
    try {
    const response = await fetch('/api/simulation/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
         scenarioId,
         timeStep: 0.5, // default time step
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Simulation failed');
    }
    
    const resultInit = await response.json();
    appState.simulationKey = resultInit.data.simulationKey;
    console.log('Simulation initialized with key:', appState.simulationKey);
    } catch (error) {
        console.error('Error initializing simulation:', error);
    }
}

// ============================================================================
// Simulation Handlers
// ============================================================================
async function getRangeProfile(scenarioId){
    let result = null;
    
    try {
     const response = await fetch('/api/simulation/getRanges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenarioId,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Simulation failed');
    }
    
    result = await response.json();
    } catch (error) {
        console.error('Error fetching range profile:', error);
        return; // Exit early if error occurs
    }

    //Pass Range Data to Visualization Module
    if (result && typeof visualization !== 'undefined' && visualization.updateRangeProfile) {
        visualization.updateRangeProfile(result.data);
    }
}

async function stepSimulation(e) {
  e?.preventDefault();
  const element = e.currentTarget;
  const scenarioId = element.getAttribute('data-id') || getSelectedScenario();
  
  if (!scenarioId) {
    alert('Please select a scenario first');
    console.error('Scenario ID required');
    return;
  }
  
  const resultsPanel = document.getElementById('resultsPanel');
  const stepBtn = document.getElementById('stepSimBtn');
  const btnText = document.getElementById('stepSimBtnText');
  const btnSpinner = document.getElementById('stepSimBtnSpinner');

  await initSimulation(scenarioId);
  await getRangeProfile(scenarioId);

  // Visualization Render with updated range profile
  if (typeof visualization !== 'undefined' && visualization.render) {
      visualization.render();
  }
  
  try {
    // Show loading state
    if (stepBtn) stepBtn.disabled = true;
    if (btnText) btnText.classList.add('d-none');
    if (btnSpinner) btnSpinner.classList.remove('d-none');
    
    if (resultsPanel) {
      resultsPanel.innerHTML = '<div class="spinner-border spinner-border-sm text-primary"></div> Stepping simulation...';
    }
    
    const response = await fetch('/api/simulation/step', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({simulationKey: appState.simulationKey}),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Simulation step failed');
    }
    
    const result = await response.json();
    
    console.log(`Simulation step result:`, result.data.result);
    // Display results
    if (resultsPanel && result.data) {
      displaySimulationResults(result.data.result);
    }
    
  } catch (error) {
    console.error('Simulation step error:', error);
    if (resultsPanel) {
      resultsPanel.innerHTML = `
        <div class="alert alert-danger mb-0">
          <strong>Error:</strong> ${error.message}
        </div>
      `;
    }
  } finally {
    // Reset button state
    if (stepBtn) stepBtn.disabled = false;
    if (btnText) btnText.classList.remove('d-none');
    if (btnSpinner) btnSpinner.classList.add('d-none');
  }
}

/**
 * Run simulation
 */
async function runSimulation(e) {
  e?.preventDefault();
  const element = e.currentTarget;
  const scenarioId = element.getAttribute('data-id') || getSelectedScenario();
  
  if (!scenarioId) {
    alert('Please select a scenario first');
    console.error('Scenario ID required');
    return;
  }
  
  const resultsPanel = document.getElementById('resultsPanel');
  const runBtn = document.getElementById('runSimBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  await initSimulation(scenarioId);
  await getRangeProfile(scenarioId);

  // Visualization Render with updated range profile
  if (typeof visualization !== 'undefined' && visualization.render) {
      visualization.render();
  }
  
  try {
    // Show loading state
    if (runBtn) runBtn.disabled = true;
    if (btnText) btnText.classList.add('d-none');
    if (btnSpinner) btnSpinner.classList.remove('d-none');
    
    if (resultsPanel) {
      resultsPanel.innerHTML = '<div class="spinner-border spinner-border-sm text-primary"></div> Running simulation...';
    }
    
    const response = await fetch('/api/simulation/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({simulationKey: appState.simulationKey}),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Simulation failed');
    }
    
    const result = await response.json();
    
    console.log(`Simulation result:`, result.data.result);
    // Display results
    if (resultsPanel && result.data) {
      displaySimulationResults(result.data.result);
    }
    
  } catch (error) {
    console.error('Simulation error:', error);
    if (resultsPanel) {
      resultsPanel.innerHTML = `
        <div class="alert alert-danger mb-0">
          <strong>Error:</strong> ${error.message}
        </div>
      `;
    }
  } finally {
    // Reset button state
    if (runBtn) runBtn.disabled = false;
    if (btnText) btnText.classList.remove('d-none');
    if (btnSpinner) btnSpinner.classList.add('d-none');
  }
}

/**
 * Reset simulation UI
 */
function resetSimulation(e) {
  e?.preventDefault();
  
  // Clear selections
  const platformSelect = document.getElementById('platformSelect');
  const scenarioSelect = document.getElementById('scenarioSelect');
  const resultsPanel = document.getElementById('resultsPanel');
  
  if (platformSelect) platformSelect.value = '';
  if (scenarioSelect) scenarioSelect.value = '';
  if (resultsPanel) {
    resultsPanel.innerHTML = '<p>No simulation run yet</p>';
  }
  
  // Clear visualization if present
  if (typeof clearVisualization === 'function') {
    clearVisualization();
  }
}

/**
 * Display simulation results
 * @param {Object} results - Simulation results data
 */
function displaySimulationResults(results) {
  const resultsPanel = document.getElementById('resultsPanel');
  if (!resultsPanel) return;
  
  let html = '<div class="simulation-results">';
  
  // Add results display based on data structure
  if (results.success) {

    html += `<div class="alert alert-success">`;
    html += `<strong>Outcome:</strong> Success! The HARM successfully neutralized the SAM system before being intercepted.`;
    html += '</div>';
  }else{
    html += `<div class="alert alert-danger">`;
    html += `<strong>Outcome:</strong> Failure. The SAM system intercepted the HARM before it could neutralize the threat.`;
    html += '</div>';
  }
  
  //Display Missile Information - Ensure Null Checks on all fields
    let missiles = results.missileResults.missiles || [];


    html += '<h6 class="text-primary mt-3">Results</h6>';
    html += '<dl class="row small mb-0">';

    try{
    
      for (const missile of missiles) {
        let key = missile.launchedBy === 'sam' ? 'SAM Missile' : 'HARM Missile';
        let value = `Launched at ${missile.launchTime.toFixed(2)}`;


        html += `<dt class="col-sm-6">${key}:</dt>`;
        

        if (missile.timeOfImpact !== null) {
            value += `, Impact at ${missile.timeOfImpact.toFixed(2)}`;
   
        } else {
            value += `, No Impact`;
        }

        
        if (missile.impactPosition !== null) {
            value += `, Position: (${missile.impactPosition.x.toFixed(2)} km, ${missile.impactPosition.y.toFixed(2)} km)`;
        } else {
            value += `, Position: N/A`;
        }
        value += `, Status: ${missile.status.charAt(0).toUpperCase() + missile.status.slice(1)}`;
        html += `<dd class="col-sm-6">${value}</dd>`;
        html += `<dd class="col-sm-6">${value}</dd>`;
      }

  
      html += '</dl>';

      html += '</div>';
    } catch (error) {
      console.error('Error displaying missile results:', error);
      html += `<div class="alert alert-danger">Error displaying missile results.</div>`;
    }
  resultsPanel.innerHTML = html;

}


function scenarioGridValueInputWidth(e) {
  e?.preventDefault();
    const input = e?.currentTarget;

    
    //enforce 16:9 aspect ratio constraint on the input height
    if (input) {
        const width = input.value;
        const height = Math.round((width * 9) / 16);
        const heightInput = document.getElementById('gridHeightInput');
        if (heightInput) {
            heightInput.value = height;
        }
    }
}


function scenarioGridValueInputHeight(e) {
  e?.preventDefault();
    const input = e?.currentTarget;
    
    //enforce 16:9 aspect ratio constraint on the input width
    if (input) {
        const height = input.value;
        const width = Math.round((height * 16) / 9);
        const widthInput = document.getElementById('gridWidthInput');
        if (widthInput) {
            widthInput.value = width;
        }
    }
}

/**
 * Open create platform form (general)
 */
function createPlatform(e) {
  e?.preventDefault();
  openOverlay('/forms/platform/create', 'Create Platform');
}


// Register all form handler bindings with bluejs
bluejs.addBinding('createPlatform', null, createPlatform);
bluejs.addBinding('createSAMSystem', null, createSAMSystem);
bluejs.addBinding('createFighter', null, createFighter);
bluejs.addBinding('editPlatform', null, editPlatform);
bluejs.addBinding('deletePlatform', null, deletePlatform);
bluejs.addBinding('createScenario', null, createScenario);
bluejs.addBinding('editScenario', null, editScenario);
bluejs.addBinding('deleteScenario', null, deleteScenario);
bluejs.addBinding('viewScenario', null, viewScenario);
bluejs.addBinding('selectScenario', null, selectScenario);
bluejs.addBinding('generatePrecipitation', null, generatePrecipitation);
bluejs.addBinding('runSimulation', null, runSimulation);
bluejs.addBinding('resetSimulation', null, resetSimulation);
bluejs.addBinding('distributionToggle', null, distributionToggle);
bluejs.addBinding('gridWidth',null , scenarioGridValueInputWidth);
bluejs.addBinding('gridHeight',null , scenarioGridValueInputHeight);