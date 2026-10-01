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
const pinModal = document.getElementById('pin-modal');
const modalClose = document.getElementById('modal-close');
const pinNameInput = document.getElementById('pin-name');
const pinNoteInput = document.getElementById('pin-note');
const savePinBtn = document.getElementById('save-pin');
const deletePinBtn = document.getElementById('delete-pin');
const pinsSidebar = document.getElementById('pins-sidebar');
const pinsList = document.getElementById('pins-list');

// ==================== CANVAS & ZOOM/PAN STATE ====================

// Set canvas to be MUCH bigger (2000x2000 instead of screen size)
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Set the display size of the canvas (this is separate from the drawing surface)
canvas.style.width = CANVAS_WIDTH + 'px';
canvas.style.height = CANVAS_HEIGHT + 'px';

// Zoom and pan state
let zoomLevel = 1;
const minZoom = 0.1;
const maxZoom = 5;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

// Drawing state
let currentTool = 'pen';
let currentColor = '#000000';
let currentSize = 3;
let isDrawing = false;

// ==================== PIN SYSTEM ====================

class Pin {
    constructor(x, y, name = 'New Location', note = '') {
        this.x = x;
        this.y = y;
        this.name = name;
        this.note = note;
        this.id = Date.now();
    }
}

let pins = [];
let currentPin = null;

function addPin(x, y) {
    const pin = new Pin(x, y);
    pins.push(pin);
    updatePinsList();
    openPinModal(pin);
    redrawCanvas();
}

function deletePin(pinId) {
    pins = pins.filter(p => p.id !== pinId);
    currentPin = null;
    pinModal.style.display = 'none';
    updatePinsList();
    redrawCanvas();
}

function openPinModal(pin) {
    currentPin = pin;
    pinNameInput.value = pin.name;
    pinNoteInput.value = pin.note;
    pinModal.style.display = 'flex';
}

function closePinModal() {
    pinModal.style.display = 'none';
    currentPin = null;
}

function savePinData() {
    if (currentPin) {
        currentPin.name = pinNameInput.value.trim() || 'Unnamed Location';
        currentPin.note = pinNoteInput.value;
        updatePinsList();
        redrawCanvas();
    }
    closePinModal();
}

function updatePinsList() {
    pinsList.innerHTML = '';

    if (pins.length === 0) {
        pinsList.innerHTML = '<small style="color: #999;">No locations yet. Add one with the Pin tool!</small>';
        pinsSidebar.style.display = 'none';
    } else {
        pinsSidebar.style.display = 'flex';
        pins.forEach(pin => {
            const pinItem = document.createElement('div');
            pinItem.className = 'pin-item';
            pinItem.innerHTML = `<strong>${pin.name}</strong><small>${pin.note ? pin.note.substring(0, 50) + '...' : 'No notes'}</small>`;
            pinItem.onclick = () => openPinModal(pin);
            pinsList.appendChild(pinItem);
        });
    }
}

function findPinAtPosition(x, y, clickRadius = 15) {
    for (let pin of pins) {
        const distance = Math.sqrt((pin.x - x) ** 2 + (pin.y - y) ** 2);
        if (distance <= clickRadius) {
            return pin;
        }
    }
    return null;
}

function drawPins() {
    pins.forEach(pin => {
        if (pin) {
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
}

// ==================== LAYER SYSTEM ====================

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

let layers = [];
let currentLayerIndex = 0;

function initializeLayers() {
    layers = [];
    addNewLayer('Background');
    updateLayerUI();
}

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

function getCurrentLayer() {
    return layers[currentLayerIndex];
}

function updateLayerUI() {
    layersContainer.innerHTML = '';

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
        nameSpan.title = 'Double-click to rename';

        // Double-click to edit layer name
        nameSpan.ondblclick = (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = layer.name;
            input.className = 'text-field';
            input.style.margin = '0';

            nameSpan.replaceWith(input);
            input.focus();
            input.select();

            function saveName() {
                layer.name = input.value.trim() || 'Unnamed Layer';
                updateLayerUI();
            }

            input.onblur = saveName;
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    saveName();
                }
            };
        };

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

        layerItem.onclick = () => {
            currentLayerIndex = i;
            updateLayerUI();
        };

        layersContainer.appendChild(layerItem);
    }
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < layers.length; i++) {
        if (layers[i].visible) {
            ctx.drawImage(layers[i].canvas, 0, 0);
        }
    }

    drawPins();
}

// ==================== ZOOM & PAN FUNCTIONS ====================

function updateZoomDisplay() {
    zoomDisplay.textContent = Math.round(zoomLevel * 100) + '%';
}

function zoomTo(newZoom, mouseX, mouseY) {
    const oldZoom = zoomLevel;
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoom));

    if (mouseX !== undefined && mouseY !== undefined) {
        offsetX = mouseX - (mouseX - offsetX) * (zoomLevel / oldZoom);
        offsetY = mouseY - (mouseY - offsetY) * (zoomLevel / oldZoom);
    }

    updateZoomDisplay();
    updateCanvasTransform();
}

function updateCanvasTransform() {
    // Position and scale the canvas for zoom/pan
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomLevel})`;
    canvas.style.transformOrigin = '0 0';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
}

// ==================== EVENT LISTENERS ====================

// Zoom with mouse wheel
canvasWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
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

// Undo button
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

// Pin modal controls
modalClose.addEventListener('click', closePinModal);
savePinBtn.addEventListener('click', savePinData);
deletePinBtn.addEventListener('click', () => {
    if (currentPin && confirm('Delete this location?')) {
        deletePin(currentPin.id);
    }
});

pinModal.addEventListener('click', (e) => {
    if (e.target === pinModal) {
        closePinModal();
    }
});

// ==================== DRAWING FUNCTIONALITY ====================

function getMousePosOnCanvas(e) {
    const rect = canvasWrapper.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    x = (x - offsetX) / zoomLevel;
    y = (y - offsetY) / zoomLevel;

    return { x, y };
}

canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePosOnCanvas(e);

    if (currentTool === 'pan') {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvas.classList.add('panning');
    } else if (currentTool === 'pin') {
        // Check if clicking on existing pin
        const clickedPin = findPinAtPosition(pos.x, pos.y, 20);
        if (clickedPin) {
            openPinModal(clickedPin);
        } else {
            addPin(pos.x, pos.y);
        }
    } else {
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
updatePinsList();

console.log('✨ Lorekeeper Maps initialized!');
console.log('🗺️ Canvas size: 2000x2000 pixels');
console.log('📍 Use the Pin tool to add location markers');
console.log('📚 Double-click layer names to rename them');
console.log('🔍 Use scroll wheel to zoom, Pan tool to navigate');
