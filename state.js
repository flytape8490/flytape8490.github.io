// Global State Object
export const state = {
    logicalWidth: 1000,
    logicalHeight: 800,
    pixelsPerInch: null,
    mode: 'IDLE'
};

// Global DOM & Canvas Instances
export const canvas = new fabric.Canvas('wall-canvas', { selection: false });
export const tray = document.getElementById('tray');

// Global Resize logic
export function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    const availableWidth = container.clientWidth - 40;
    const availableHeight = container.clientHeight - 40;
    const scaleX = availableWidth / state.logicalWidth;
    const scaleY = availableHeight / state.logicalHeight;
    const zoom = Math.min(scaleX, scaleY);
    
    canvas.setZoom(zoom);
    canvas.setWidth(state.logicalWidth * zoom);
    canvas.setHeight(state.logicalHeight * zoom);
}