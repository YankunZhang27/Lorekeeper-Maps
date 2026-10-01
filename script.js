// JavaScript - This file makes everything WORK and be interactive

// Get the canvas element and wrapper
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const canvasWrapper = document.getElementById('canvas-wrapper');

// Get all control elements
const toolSelect = document.getElementById('tool-select');
const colorSelect = document.getElementById('color-select');
const brushSize = document.getElementById('brush-size');
const sizeDisplay = document.getElementById('size-display');
const textInput = document.getElementById('text-input');
const fontSizeInput = document.getElementById('font-size');
const textInputSection = document.getElementById('text-input-section');
const clearBtn = document.getElementById('clear-canvas');
const undoBtn = document.getElementById('undo-btn');
const downloadBtn = document.getElementById('download-btn');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomDisplay = document.getElementById('zoom-display');
const layersContainer = document.getElementById('layers-container');
const addLayerBtn = document.getElementById('add-layer');

// ==================== CANVAS & ZOOM/PAN STATE ====================

// Set canvas to be MUCH bigger (2000x2000 instead of screen size)
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Zoom and pan state
let zoomLevel = 1;
const minZoom = 0.1;
const maxZoom = 5;
let offsetX = 0;  // How far left/right we've panned
let offsetY = 0;  // How far up/down we've panned
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

// Drawing state
let currentTool = 'pen';
let currentColor = '#000000';
let currentSize = 3;
let isDrawing = false;

// ==================== LAYER SYSTEM ====================

// Each layer is like a separate transparent sheet you can draw on
class Layer {
    constructor(name) {
        this.name = name;
        this.canvas = document.createElement('canvas');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.ctx = this.canvas.getContext('2d');
        this.visible = true;
    }
}

// Array to hold all our layers
let layers = [];
let currentLayerIndex = 0;

// Create the first layer when the app starts
function initializeLayers() {
    layers = [];
    addNewLayer('Background');
    updateLayerUI();
}

// Add a new empty layer
function addNewLayer(name = null) {
    if (name === null) {
        name = `Layer ${layers.length + 1}`;
    }
    const layer = new Layer(name);
    layers.push(layer);
    currentLayerIndex = layers.length - 1;
    updateLayerUI();
    return layer;
}

// Get the currently active layer
function getCurrentLayer() {
    return layers[currentLayerIndex];
}

// Update the layer list UI (the sidebar)
function updateLayerUI() {
    layersContainer.innerHTML = '';

    // Add each layer to the UI (in reverse order so newest is on top)
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        if (i === currentLayerIndex) {
            layerItem.classList.add('active');
        }

        const visibility = document.createElement('div');
        visibility.className = 'layer-visibility';
        visibility.textContent = layer.visible ? '👁️' : '🚫';
        visibility.title = 'Toggle visibility';
        visibility.onclick = (e) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            updateLayerUI();
            redrawCanvas();
        };

        const nameSpan = document.createElement('div');
        nameSpan.className = 'layer-name';
        nameSpan.textContent = layer.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn layer-delete';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete layer';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (layers.length > 1) {
                layers.splice(i, 1);
                if (currentLayerIndex >= layers.length) {
                    currentLayerIndex = layers.length - 1;
                }
                updateLayerUI();
                redrawCanvas();
            }
        };

        layerItem.appendChild(visibility);
        layerItem.appendChild(nameSpan);
        layerItem.appendChild(deleteBtn);

        // Click to select layer
        layerItem.onclick = () => {
            currentLayerIndex = i;
            updateLayerUI();
        };

        layersContainer.appendChild(layerItem);
    }
}

// Redraw the final canvas by combining all visible layers
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each visible layer on top of each other
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].visible) {
            ctx.drawImage(layers[i].canvas, 0, 0);
        }
    }
}

// ==================== ZOOM & PAN FUNCTIONS ====================

function updateZoomDisplay() {
    zoomDisplay.textContent = Math.round(zoomLevel * 100) + '%';
}

function zoomTo(newZoom, mouseX, mouseY) {
    // Calculate the point we want to keep centered when zooming
    const oldZoom = zoomLevel;
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoom));

    if (mouseX !== undefined && mouseY !== undefined) {
        // Adjust pan to keep the zoom point centered
        offsetX = mouseX - (mouseX - offsetX) * (zoomLevel / oldZoom);
        offsetY = mouseY - (mouseY - offsetY) * (zoomLevel / oldZoom);
    }

    updateZoomDisplay();
    updateCanvasTransform();
}

function updateCanvasTransform() {
    // Apply CSS transform to scale and position the canvas
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomLevel})`;
    canvas.style.transformOrigin = '0 0';
}

// ==================== EVENT LISTENERS ====================

// Zoom with mouse wheel
canvasWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;  // Zoom out or in
    const rect = canvasWrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    zoomTo(zoomLevel * delta, mouseX, mouseY);
});

// Zoom buttons
zoomInBtn.addEventListener('click', () => zoomTo(zoomLevel * 1.2));
zoomOutBtn.addEventListener('click', () => zoomTo(zoomLevel * 0.8));

// Layer management
addLayerBtn.addEventListener('click', addNewLayer);

// Tool selector
toolSelect.addEventListener('change', (e) => {
    currentTool = e.target.value;

    if (currentTool === 'text') {
        textInputSection.style.display = 'block';
    } else {
        textInputSection.style.display = 'none';
    }

    // Update cursor
    if (currentTool === 'pan') {
        canvas.classList.add('pan-cursor');
    } else {
        canvas.classList.remove('pan-cursor');
    }
});

// Color selector
colorSelect.addEventListener('change', (e) => {
    currentColor = e.target.value;
});

// Brush size slider
brushSize.addEventListener('input', (e) => {
    currentSize = e.target.value;
    sizeDisplay.textContent = currentSize + 'px';
});

// Clear canvas
clearBtn.addEventListener('click', () => {
    if (confirm('Clear the current layer?')) {
        const layer = getCurrentLayer();
        layer.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        redrawCanvas();
    }
});

// Undo button (simple - clears the current layer)
undoBtn.addEventListener('click', () => {
    const layer = getCurrentLayer();
    layer.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    redrawCanvas();
});

// Download as image
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'my-lorekeeper-map.png';
    link.click();
});

// ==================== DRAWING FUNCTIONALITY ====================

function getMousePosOnCanvas(e) {
    const rect = canvasWrapper.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Reverse the zoom/pan transformation to get actual canvas coordinates
    x = (x - offsetX) / zoomLevel;
    y = (y - offsetY) / zoomLevel;

    return { x, y };
}

canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePosOnCanvas(e);

    if (currentTool === 'pan') {
        // Pan mode - click and drag to move around
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvas.classList.add('panning');
    } else {
        // Drawing modes
        isDrawing = true;
        const layer = getCurrentLayer();
        const layerCtx = layer.ctx;

        if (currentTool === 'pen') {
            layerCtx.beginPath();
            layerCtx.moveTo(pos.x, pos.y);
        } else if (currentTool === 'text') {
            if (textInput.value.trim() !== '') {
                const fontSize = fontSizeInput.value;
                layerCtx.font = `${fontSize}px Arial`;
                layerCtx.fillStyle = currentColor;
                layerCtx.fillText(textInput.value, pos.x, pos.y);
                textInput.value = '';
                isDrawing = false;
            }
        }

        redrawCanvas();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (currentTool === 'pan' && isPanning) {
        // Move the canvas around when panning
        const deltaX = e.clientX - panStartX;
        const deltaY = e.clientY - panStartY;
        offsetX += deltaX;
        offsetY += deltaY;
        panStartX = e.clientX;
        panStartY = e.clientY;
        updateCanvasTransform();
    } else if (isDrawing) {
        const pos = getMousePosOnCanvas(e);
        const layer = getCurrentLayer();
        const layerCtx = layer.ctx;

        if (currentTool === 'pen') {
            layerCtx.lineWidth = currentSize;
            layerCtx.lineCap = 'round';
            layerCtx.lineJoin = 'round';
            layerCtx.strokeStyle = currentColor;
            layerCtx.lineTo(pos.x, pos.y);
            layerCtx.stroke();
        } else if (currentTool === 'eraser') {
            layerCtx.clearRect(pos.x - currentSize / 2, pos.y - currentSize / 2, currentSize, currentSize);
        } else if (currentTool === 'shape') {
            layerCtx.strokeStyle = currentColor;
            layerCtx.lineWidth = currentSize;
            layerCtx.strokeRect(pos.x - 20, pos.y - 20, 40, 40);
        }

        redrawCanvas();
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    isPanning = false;
    canvas.classList.remove('panning');
    ctx.closePath();
});

canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
    isPanning = false;
    canvas.classList.remove('panning');
    ctx.closePath();
});

// Touch support for mobile
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
});

// ==================== INITIALIZATION ====================

initializeLayers();
updateZoomDisplay();
updateCanvasTransform();

console.log('✨ Lorekeeper Maps initialized!');
console.log('🎨 Canvas size: 2000x2000 pixels');
console.log('🔍 Use scroll wheel to zoom, select Pan tool to move around');
console.log('📚 Use the Layers panel to manage your layers');
