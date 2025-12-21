/*
    * Visualization Bindings
*/

let canvasPanActive = false;

function zoomWheel(event) {
    event.preventDefault();
    const zoomFactor = 1.01;
    if (event.deltaY < 0) {
        visualization.currentZoom *= zoomFactor;
    } else {
        visualization.currentZoom /= zoomFactor;
    }

    if (visualization.currentZoom < 1.0/visualization.maxZoom) {
        visualization.currentZoom = 1.0/visualization.maxZoom;
    }
    if (visualization.currentZoom > visualization.maxZoom) {
        visualization.currentZoom = visualization.maxZoom;
    }
   
    visualization.render();
}

function panStart(event) {
    event?.preventDefault();
    canvasPanActive = true;
}
function panEnd(event) {
    event?.preventDefault();
    canvasPanActive = false;
}

function panCanvas(event) {
    event?.preventDefault
    if (event.buttons !== 1) return; // Only pan on left mouse button drag
    visualization.panOffset.x += event.movementX;
    visualization.panOffset.y += event.movementY;

  
   visualization.render();
}


function resetView(event) {
    event?.preventDefault();
    visualization.currentZoom = 1.0;
    visualization.panOffset = { x: 0, y: 0 };
    visualization.render();
}


bluejs.addBinding("canvasZoom", null, zoomWheel);
bluejs.addBinding("canvasPanStart", null, panStart);
bluejs.addBinding("canvasPanEnd", null, panEnd);
bluejs.addBinding("canvasPanMove", null, panCanvas);
bluejs.addBinding("resetViewVisualization", null, resetView);


// Additional event bindings after canvas loads
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('radarCanvas');
    if (!canvas) return;
    
    // Wheel zoom
    canvas.addEventListener('wheel', (e) => {
    bluejs.triggerBinding('canvasZoom', e);
    });
    
    // Pan start
    canvas.addEventListener('mousedown', (e) => {
    bluejs.triggerBinding('canvasPanStart', e);
    });
    
    // Pan move
    canvas.addEventListener('mousemove', (e) => {
    bluejs.triggerBinding('canvasPanMove', e);
    });
    
    // Pan end
    canvas.addEventListener('mouseup', (e) => {
    bluejs.triggerBinding('canvasPanEnd', e);
    });
    
    // Pan cancel
    canvas.addEventListener('mouseleave', (e) => {
    bluejs.triggerBinding('canvasPanCancel', e);
    });
});


