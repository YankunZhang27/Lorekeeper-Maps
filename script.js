// Lorekeeper Maps - Interactive Fantasy Map Maker

const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const canvasWrapper = document.getElementById('canvas-wrapper');

// UI Elements
const toolSelect = document.getElementById('tool-select');
const colorSelect = document.getElementById('color-select');
const brushSize = document.getElementById('brush-size');
const sizeDisplay = document.getElementById('size-display');
const textInput = document.getElementById('text-input');
const fontSizeInput = document.getElementById('font-size');
const textInputSection = document.getElementById('text-input-section');
const clearBtn = document.getElementById('clear-canvas');
const clearLayerBtn = document.getElementById('clear-layer');
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

// ========== CONSTANTS & STATE ==========
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let zoomLevel = 1;
let offsetX = 0;
let offsetY = 0;
let currentTool = 'pen';
let currentColor = '#000000';
let currentSize = 3;
let isDrawing = false;
let isPanning = false;

// ========== LAYER SYSTEM ==========
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
let editingLayerIndex = null;

function initializeLayers() {
    layers = [];
    addNewLayer('Background');
}

function addNewLayer(name = null) {
    name = name || `Layer ${layers.length + 1}`;
    const layer = new Layer(name);
    layers.push(layer);
    currentLayerIndex = layers.length - 1;
    updateLayerUI();
    return layer;
}

function getCurrentLayer() {
    return layers[currentLayerIndex];
}

function finishLayerNameEdit() {
    editingLayerIndex = null;
    updateLayerUI();
}

function updateLayerUI() {
    layersContainer.innerHTML = '';

    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const isActive = i === currentLayerIndex;
        const isEditing = i === editingLayerIndex;

        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item' + (isActive ? ' active' : '');

        // Visibility toggle
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

        // Name (editable)
        const nameContainer = document.createElement('div');
        nameContainer.style.flex = '1';
        nameContainer.style.minWidth = '0';

        if (isEditing) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = layer.name;
            input.className = 'text-field';
            input.style.padding = '4px';
            input.style.margin = '0';
            input.style.width = '100%';
            input.style.fontSize = '0.95em';

            nameContainer.appendChild(input);
            nameContainer.onclick = (e) => e.stopPropagation();

            setTimeout(() => input.focus(), 0);
            input.select();

            const saveEdit = () => {
                layer.name = input.value.trim() || 'Unnamed Layer';
                editingLayerIndex = null;
                updateLayerUI();
            };

            input.addEventListener('blur', saveEdit);
            input.addEventListener('keydown', (e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                    saveEdit();
                } else if (e.key === 'Escape') {
                    editingLayerIndex = null;
                    updateLayerUI();
                }
            });
        } else {
            const nameSpan = document.createElement('div');
            nameSpan.className = 'layer-name';
            nameSpan.textContent = layer.name;
            nameSpan.title = 'Double-click to rename';
            nameSpan.style.cursor = 'text';
            nameSpan.ondblclick = (e) => {
                e.stopPropagation();
                editingLayerIndex = i;
                updateLayerUI();
            };
            nameContainer.appendChild(nameSpan);
        }

        // Delete button
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
        layerItem.appendChild(nameContainer);
        layerItem.appendChild(deleteBtn);

        layerItem.onclick = () => {
            if (editingLayerIndex === null) {
                currentLayerIndex = i;
                updateLayerUI();
            }
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

// ========== PIN SYSTEM ==========
class Pin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.name = 'New Location';
        this.note = '';
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
            const preview = pin.note ? pin.note.substring(0, 50) + '...' : 'No notes';
            pinItem.innerHTML = `<strong>${pin.name}</strong><small>${preview}</small>`;
            pinItem.onclick = () => openPinModal(pin);
            pinsList.appendChild(pinItem);
        });
    }
}

function findPinAtPosition(x, y) {
    for (let pin of pins) {
        const dist = Math.sqrt((pin.x - x) ** 2 + (pin.y - y) ** 2);
        if (dist <= 20) return pin;
    }
    return null;
}

function drawPins() {
    pins.forEach(pin => {
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// ========== ZOOM & PAN ==========
function updateZoomDisplay() {
    zoomDisplay.textContent = Math.round(zoomLevel * 100) + '%';
}

function zoomTo(newZoom) {
    zoomLevel = Math.max(0.1, Math.min(5, newZoom));
    updateZoomDisplay();
    updateCanvasTransform();
}

function updateCanvasTransform() {
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomLevel})`;
    canvas.style.transformOrigin = '0 0';
}

function fitCanvasToViewport() {
    // Calculate zoom level to fit canvas in viewport
    const wrapperWidth = canvasWrapper.clientWidth;
    const wrapperHeight = canvasWrapper.clientHeight;

    const zoomX = wrapperWidth / CANVAS_WIDTH;
    const zoomY = wrapperHeight / CANVAS_HEIGHT;

    zoomLevel = Math.min(zoomX, zoomY) * 0.9; // 0.9 for some padding
    zoomLevel = Math.max(0.1, Math.min(5, zoomLevel));

    offsetX = 0;
    offsetY = 0;

    updateZoomDisplay();
    updateCanvasTransform();
}

// ========== EVENT LISTENERS ==========
toolSelect.addEventListener('change', (e) => {
    currentTool = e.target.value;
    textInputSection.style.display = currentTool === 'text' ? 'block' : 'none';
    canvas.classList.toggle('pan-cursor', currentTool === 'pan');
});

colorSelect.addEventListener('change', (e) => {
    currentColor = e.target.value;
});

brushSize.addEventListener('input', (e) => {
    currentSize = e.target.value;
    sizeDisplay.textContent = currentSize + 'px';
});

zoomInBtn.addEventListener('click', () => zoomTo(zoomLevel * 1.2));
zoomOutBtn.addEventListener('click', () => zoomTo(zoomLevel * 0.8));

canvasWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomTo(zoomLevel * delta);
});

addLayerBtn.addEventListener('click', addNewLayer);

clearLayerBtn.addEventListener('click', () => {
    if (confirm('Clear only the current layer?')) {
        const layer = getCurrentLayer();
        layer.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        redrawCanvas();
    }
});

clearBtn.addEventListener('click', () => {
    if (confirm('Clear ALL layers? This cannot be undone.')) {
        for (let layer of layers) {
            layer.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        pins = [];
        updatePinsList();
        redrawCanvas();
    }
});

undoBtn.addEventListener('click', () => {
    const layer = getCurrentLayer();
    layer.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    redrawCanvas();
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'my-lorekeeper-map.png';
    link.click();
});

modalClose.addEventListener('click', closePinModal);
savePinBtn.addEventListener('click', savePinData);
deletePinBtn.addEventListener('click', () => {
    if (currentPin && confirm('Delete this location?')) {
        deletePin(currentPin.id);
    }
});

pinModal.addEventListener('click', (e) => {
    if (e.target === pinModal) closePinModal();
});

// ========== DRAWING ==========
function getMousePosOnCanvas(e) {
    const rect = canvasWrapper.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    x = (x - offsetX) / zoomLevel;
    y = (y - offsetY) / zoomLevel;
    return { x, y };
}

let panStartX, panStartY;

canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePosOnCanvas(e);

    if (currentTool === 'pan') {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        canvas.classList.add('panning');
    } else if (currentTool === 'pin') {
        const clickedPin = findPinAtPosition(pos.x, pos.y);
        if (clickedPin) {
            openPinModal(clickedPin);
        } else {
            addPin(pos.x, pos.y);
        }
    } else {
        isDrawing = true;
        const layer = getCurrentLayer();
        const lctx = layer.ctx;

        if (currentTool === 'pen') {
            lctx.beginPath();
            lctx.moveTo(pos.x, pos.y);
        } else if (currentTool === 'text' && textInput.value.trim()) {
            lctx.font = `${fontSizeInput.value}px Arial`;
            lctx.fillStyle = currentColor;
            lctx.fillText(textInput.value, pos.x, pos.y);
            textInput.value = '';
            isDrawing = false;
        }
        redrawCanvas();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
        offsetX += e.clientX - panStartX;
        offsetY += e.clientY - panStartY;
        panStartX = e.clientX;
        panStartY = e.clientY;
        updateCanvasTransform();
    } else if (isDrawing) {
        const pos = getMousePosOnCanvas(e);
        const layer = getCurrentLayer();
        const lctx = layer.ctx;

        if (currentTool === 'pen') {
            lctx.lineWidth = currentSize;
            lctx.lineCap = 'round';
            lctx.lineJoin = 'round';
            lctx.strokeStyle = currentColor;
            lctx.lineTo(pos.x, pos.y);
            lctx.stroke();
        } else if (currentTool === 'eraser') {
            lctx.clearRect(pos.x - currentSize / 2, pos.y - currentSize / 2, currentSize, currentSize);
        } else if (currentTool === 'shape') {
            lctx.strokeStyle = currentColor;
            lctx.lineWidth = currentSize;
            lctx.strokeRect(pos.x - 20, pos.y - 20, 40, 40);
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

// Touch support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY }));
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY }));
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    canvas.dispatchEvent(new MouseEvent('mouseup', {}));
});

// ========== INIT ==========
initializeLayers();
updatePinsList();

// Auto-fit canvas to viewport on load
window.addEventListener('load', () => {
    setTimeout(fitCanvasToViewport, 100);
});

// Also fit when window resizes
window.addEventListener('resize', () => {
    setTimeout(fitCanvasToViewport, 100);
});

console.log('🗺️ Lorekeeper Maps ready!');
