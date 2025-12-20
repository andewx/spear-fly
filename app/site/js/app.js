/**
 * Main application logic for SPEAR
 */

// State management
const appState = {
  platforms: { sams: [], fighters: [] },
  scenarios: [],
  selectedSAM: null,
  selectedFighter: null,
  selectedScenario: null,
  simulationKey: null,
};

// Visualization instance
let visualization;

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('SPEAR Application Starting...');
  
  // Initialize visualization
  visualization = new RadarVisualization('radarCanvas');
  
  // Load initial data
  await loadPlatforms();
  await loadScenarios();
  
  // Setup event listeners
  setupEventListeners();
  
  console.log('Application Ready');
});

// ============================================================================
// Data Loading
// ============================================================================

async function loadPlatforms() {
  try {
    const platforms = await platformAPI.getAll();
    appState.platforms = platforms;
    
    // Update editor panel
    updateEditorPanel();
    
    console.log(`Loaded ${platforms.sams.length} SAMs and ${platforms.fighters.length} fighters`);
  } catch (error) {
    console.error('Failed to load platforms:', error);
  }
}

// Make loadPlatforms globally accessible for forms.js to call after delete/update
window.reloadPlatforms = loadPlatforms;

async function loadScenarios() {
  try {
    const scenarios = await scenarioAPI.getAll();
    appState.scenarios = scenarios;
    
    // Populate scenario dropdown
    const scenarioSelect = document.getElementById('scenarioSelect');
    scenarioSelect.innerHTML = '<option value="">Select Scenario...</option>';
    scenarios.forEach(scenario => {
      const option = document.createElement('option');
      option.value = scenario.id;
      option.textContent = scenario.name;
      scenarioSelect.appendChild(option);
    });
    
    // Update editor panel
    updateEditorPanel();
    
    console.log(`Loaded ${scenarios.length} scenarios`);
  } catch (error) {
    console.error('Failed to load scenarios:', error);
  }
}

// Make loadScenarios globally accessible for forms.js to call after delete/update
window.reloadScenarios = loadScenarios;

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
  // Event listeners are now handled by bluejs bindings
}
// ============================================================================

function updateEditorPanel() {
  const editorPanel = document.getElementById('editorPanel');
  if (!editorPanel) return;
  
  const { sams, fighters } = appState.platforms;
  const scenarios = appState.scenarios;
  
  if (sams.length === 0 && fighters.length === 0 && scenarios.length === 0) {
    editorPanel.innerHTML = '<p class="text-muted small">No platforms or scenarios available. Create new items to get started.</p>';
    return;
  }
  
  let html = '<div class="platform-hierarchy">';
  
  // SAM Systems Section
  if (sams.length > 0) {
    html += '<div class="mb-3">';
    html += '<h6 class="text-primary mb-2"><i class="bi bi-diagram-3"></i> SAM Systems</h6>';
    html += '<div class="list-group list-group-flush">';
    
    sams.forEach(sam => {
      html += `
        <div class="list-group-item bg-dark border-secondary p-2 d-flex justify-content-between align-items-center">
          <div class="flex-grow-1">
            <small class="fw-bold text-light">${sam.name}</small>
            <br>
            <small class="text-muted">${sam.nominalRange} km | ${sam.systemFrequency} GHz</small>
          </div>
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-primary py-0 px-2" 
                    bluejs="btn-edit-sam-editor-${sam.id}" 
                    bluejs-trigger="click" 
                    bluejs-binding="editPlatform"
                    data-type="sam"
                    data-id="${sam.id}"
                    title="Edit SAM System">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger py-0 px-2" 
                    bluejs="btn-delete-sam-editor-${sam.id}" 
                    bluejs-trigger="click" 
                    bluejs-binding="deletePlatform"
                    data-type="sam"
                    data-id="${sam.id}"
                    title="Delete SAM System">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    });
    
    html += '</div></div>';
  }
  
  // Fighter Aircraft Section
  if (fighters.length > 0) {
    html += '<div class="mb-3">';
    html += '<h6 class="text-primary mb-2"><i class="bi bi-airplane"></i> Fighter Aircraft</h6>';
    html += '<div class="list-group list-group-flush">';
    
    fighters.forEach(fighter => {
      html += `
        <div class="list-group-item bg-dark border-secondary p-2 d-flex justify-content-between align-items-center">
          <div class="flex-grow-1">
            <small class="fw-bold text-light">${fighter.type}</small>
            <br>
            <small class="text-muted">RCS: ${fighter.rcs.nose} m² | Mach ${fighter.velocity}</small>
          </div>
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-primary py-0 px-2" 
                    bluejs="btn-edit-fighter-editor-${fighter.id}" 
                    bluejs-trigger="click" 
                    bluejs-binding="editPlatform"
                    data-type="fighter"
                    data-id="${fighter.id}"
                    title="Edit Fighter">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger py-0 px-2" 
                    bluejs="btn-delete-fighter-editor-${fighter.id}" 
                    bluejs-trigger="click" 
                    bluejs-binding="deletePlatform"
                    data-type="fighter"
                    data-id="${fighter.id}"
                    title="Delete Fighter">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    });
    
    html += '</div></div>';
  }
  
  // Scenarios Section
  if (scenarios.length > 0) {
    html += '<div class="mb-3">';
    html += '<h6 class="text-success mb-2"><i class="bi bi-folder"></i> Scenarios</h6>';
    html += '<div class="list-group list-group-flush">';
    
    scenarios.forEach(scenario => {
      const samName = scenario.platforms?.sam?.configId || 'N/A';
      const fighterName = scenario.platforms?.fighter?.configId || 'N/A';
      const hasRain = scenario.environment?.precipitation?.enabled ? '🌧️' : '☀️';
      
      html += `
        <div class="list-group-item bg-dark border-secondary p-2 d-flex justify-content-between align-items-center">
          <div class="flex-grow-1">
            <small class="fw-bold text-light">${scenario.name} ${hasRain}</small>
            <br>
            <small class="text-muted">${scenario.grid?.width || 0}×${scenario.grid?.height || 0} km</small>
          </div>
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-success py-0 px-2" 
                    bluejs="btn-edit-scenario-editor-${scenario.id}" 
                    bluejs-trigger="click" 
                    bluejs-binding="editScenario"
                    data-id="${scenario.id}"
                    title="Edit Scenario">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger py-0 px-2" 
                    bluejs="btn-delete-scenario-editor-${scenario.id}" 
                    bluejs-trigger="click" 
                    bluejs-binding="deleteScenario"
                    data-id="${scenario.id}"
                    title="Delete Scenario">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    });
    
    html += '</div></div>';
  }
  
  html += '</div>';
  
  editorPanel.innerHTML = html;
  
  // Re-initialize bluejs bindings for dynamically added elements
  if (typeof bluejs !== 'undefined') {
    bluejs.register();
  }
}

// ============================================================================
// 

// ============================================================================
// Simulation
// ============================================================================

async function runSimulation() {
  const resultsPanel = document.getElementById('resultsPanel');
  
  // Validate selections
  if (!appState.selectedScenario) {
    alert('Please select a scenario');
    return;
  }
  
  if (!appState.selectedSAM) {
    alert('Please select a SAM system');
    return;
  }
  
  if (!appState.selectedFighter) {
    alert('Please select a fighter platform');
    return;
  }
  
  try {
    console.log('Running simulation...');
    
    const results = await simulationAPI.run(
      appState.selectedScenario.id,
      appState.selectedSAM.id,
      appState.selectedFighter.id
    );
    
    console.log('Simulation results:', results);
    
    // Update results display
    document.getElementById('detectionRange').textContent = `${results.detectionRange.toFixed(2)} km`;
    document.getElementById('pathAttenuation').textContent = `${results.pathAttenuation.toFixed(2)} dB`;
    document.getElementById('samKillTime').textContent = `${results.samKillTime.toFixed(2)} s`;
    document.getElementById('harmKillTime').textContent = `${results.harmKillTime.toFixed(2)} s`;
    
    const outcomeEl = document.getElementById('outcome');
    if (results.success) {
      outcomeEl.textContent = 'HARM SUCCESS';
      outcomeEl.className = 'value success';
    } else {
      outcomeEl.textContent = 'SAM SUCCESS';
      outcomeEl.className = 'value failure';
    }
    
    // Show results panel
    resultsPanel.style.display = 'block';
    
    // Update visualization
    visualization.setResults(results);
    
  } catch (error) {
    console.error('Simulation failed:', error);
    alert(`Simulation failed: ${error.message}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatNumber(value, decimals = 2) {
  return typeof value === 'number' ? value.toFixed(decimals) : '-';
}
