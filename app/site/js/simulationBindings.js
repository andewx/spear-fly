/**
 * BlueJS bindings for simulation controls
 */

/**
 * Initialize simulation from scenario selector
 */
bluejs.addBinding('initSimulation', null, async function(e) {
  e?.preventDefault();
  
  const scenarioSelect = document.querySelector('[bluejs="scenario-selector"]');
  if (!scenarioSelect || !scenarioSelect.value) {
    alert('Please select a scenario first');
    return;
  }

  const scenarioId = scenarioSelect.value;
  const visualization = window.visualizationInstance;

  try {
    // Show loading indicator
    const statusEl = document.getElementById('sim-status');
    if (statusEl) statusEl.textContent = 'Initializing...';

    await window.simulationManager.initialize(scenarioId, visualization);

    if (statusEl) statusEl.textContent = 'Ready';
    console.log('[UI] Simulation initialized');
  } catch (error) {
    console.error('[UI] Failed to initialize simulation:', error);
    alert('Failed to initialize simulation: ' + error.message);
  }
});

/**
 * Step simulation forward by one time step
 */
bluejs.addBinding('stepSimulation', null, async function(e) {
  e?.preventDefault();

  try {
    const response = await window.simulationManager.step();
    if (response) {
      updateSimulationUI(response);
    }
  } catch (error) {
    console.error('[UI] Step failed:', error);
  }
});

/**
 * Start auto-stepping simulation
 */
bluejs.addBinding('startSimulation', null, function(e) {
  e?.preventDefault();
  
  window.simulationManager.start();
  updateControlButtons(true);
});

/**
 * Pause simulation
 */
bluejs.addBinding('pauseSimulation', null, function(e) {
  e?.preventDefault();
  
  window.simulationManager.pause();
  updateControlButtons(false);
});

/**
 * Resume simulation
 */
bluejs.addBinding('resumeSimulation', null, function(e) {
  e?.preventDefault();
  
  window.simulationManager.resume();
  updateControlButtons(true);
});

/**
 * Stop simulation
 */
bluejs.addBinding('stopSimulation', null, function(e) {
  e?.preventDefault();
  
  window.simulationManager.stop();
  updateControlButtons(false);
});

/**
 * Reset simulation to initial state
 */
bluejs.addBinding('resetSimulation', null, async function(e) {
  e?.preventDefault();

  try {
    await window.simulationManager.reset();
    
    const statusEl = document.getElementById('sim-status');
    if (statusEl) statusEl.textContent = 'Reset';
    
    updateControlButtons(false);
  } catch (error) {
    console.error('[UI] Reset failed:', error);
  }
});

/**
 * Run simulation to completion
 */
bluejs.addBinding('runToCompletion', null, async function(e) {
  e?.preventDefault();

  try {
    const statusEl = document.getElementById('sim-status');
    if (statusEl) statusEl.textContent = 'Running...';

    const result = await window.simulationManager.runToCompletion();

    if (statusEl) statusEl.textContent = 'Complete';
    console.log('[UI] Simulation completed:', result);
  } catch (error) {
    console.error('[UI] Run to completion failed:', error);
  }
});

/**
 * Update simulation UI elements
 */
function updateSimulationUI(response) {
  const { timeElapsed, simulationComplete, state } = response;

  // Update time display
  const timeEl = document.getElementById('sim-time');
  if (timeEl) {
    timeEl.textContent = `${timeElapsed.toFixed(1)} s`;
  }

  // Update status
  const statusEl = document.getElementById('sim-status');
  if (statusEl) {
    statusEl.textContent = simulationComplete ? 'Complete' : 'Running';
  }

  // Update fighter/SAM status if available
  if (state) {
    const fighterStatusEl = document.getElementById('fighter-status');
    if (fighterStatusEl && state.fighter) {
      fighterStatusEl.textContent = state.fighter.state;
    }

    const samStatusEl = document.getElementById('sam-status');
    if (samStatusEl && state.sam) {
      samStatusEl.textContent = state.sam.state;
    }

    const distanceEl = document.getElementById('distance');
    if (distanceEl && state.distance !== undefined) {
      distanceEl.textContent = `${state.distance.toFixed(1)} km`;
    }
  }
}

/**
 * Update control button states
 */
function updateControlButtons(isRunning) {
  const startBtn = document.querySelector('[bluejs-binding="startSimulation"]');
  const pauseBtn = document.querySelector('[bluejs-binding="pauseSimulation"]');
  const stopBtn = document.querySelector('[bluejs-binding="stopSimulation"]');

  if (startBtn) startBtn.disabled = isRunning;
  if (pauseBtn) pauseBtn.disabled = !isRunning;
  if (stopBtn) stopBtn.disabled = !isRunning;
}
