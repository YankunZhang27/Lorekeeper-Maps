// JavaScript - This file makes everything WORK and be interactive

// Get the canvas element (the drawing area)
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');

// Get all the control elements from the HTML
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

// Set up canvas size to fill the screen
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

// Initial setup
let currentTool = 'pen';
let currentColor = '#000000';
let currentSize = 3;
let isDrawing = false;

// History for undo functionality
let drawingHistory = [];

// Set initial canvas size
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Save the current canvas state (for undo)
function saveState() {
    drawingHistory.push(canvas.toDataURL());
    // Keep only the last 20 states to save memory
    if (drawingHistory.length > 20) {
        drawingHistory.shift();
    }
}

// Restore a previous canvas state
function restoreState() {
    if (drawingHistory.length > 0) {
        const lastState = drawingHistory.pop();
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = lastState;
    }
}

// Update the tool when dropdown changes
toolSelect.addEventListener('change', (e) => {
    currentTool = e.target.value;

    // Show text input only if Text tool is selected
    if (currentTool === 'text') {
        textInputSection.style.display = 'block';
    } else {
        textInputSection.style.display = 'none';
    }

    console.log('Tool changed to:', currentTool);
});

// Update the color when dropdown changes
colorSelect.addEventListener('change', (e) => {
    currentColor = e.target.value;
    console.log('Color changed to:', currentColor);
});

// Update brush size when slider changes
brushSize.addEventListener('input', (e) => {
    currentSize = e.target.value;
    sizeDisplay.textContent = currentSize + 'px';
});

// Clear the entire canvas
clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the entire canvas?')) {
        saveState();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
});

// Undo the last action
undoBtn.addEventListener('click', () => {
    restoreState();
});

// Download the map as an image
downloadBtn.addEventListener('click', () => {
    // Create a link element
    const link = document.createElement('a');
    // Convert canvas to image data
    link.href = canvas.toDataURL('image/png');
    // Set the filename
    link.download = 'my-lorekeeper-map.png';
    // Trigger the download
    link.click();
});

// DRAWING FUNCTIONALITY

// When mouse button is pressed down
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    saveState(); // Save state before drawing

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle different tools
    if (currentTool === 'pen') {
        ctx.beginPath();
        ctx.moveTo(x, y);
    } else if (currentTool === 'text') {
        // Add text at click position
        if (textInput.value.trim() !== '') {
            const fontSize = fontSizeInput.value;
            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = currentColor;
            ctx.fillText(textInput.value, x, y);
            textInput.value = ''; // Clear the input after adding text
            isDrawing = false;
        }
    }
});

// When mouse is moving
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'pen') {
        // Draw a line
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = currentColor;
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (currentTool === 'eraser') {
        // Erase by drawing with white/transparent
        ctx.clearRect(x - currentSize / 2, y - currentSize / 2, currentSize, currentSize);
    } else if (currentTool === 'shape') {
        // Draw a rectangle (for shapes)
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentSize;
        ctx.strokeRect(x - 20, y - 20, 40, 40);
    }
});

// When mouse button is released
canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    ctx.closePath();
});

// When mouse leaves the canvas
canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
    ctx.closePath();
});

// Touch support for mobile/tablets
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

console.log('Lorekeeper Maps initialized! Start drawing on the canvas.');
