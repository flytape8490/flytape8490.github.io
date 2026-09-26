window.drawRulers = function() {
    const hRuler = document.getElementById('ruler-h');
    const vRuler = document.getElementById('ruler-v');
    if (hRuler.style.display === 'none') return;
    
    const hCanvas = document.getElementById('ruler-h-canvas');
    const vCanvas = document.getElementById('ruler-v-canvas');
    
    const zoom = canvas.getZoom();
    const ppi = AppState.pixelsPerInch * zoom; 
    if (!ppi) return;
    
    const dpr = window.devicePixelRatio || 1;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const color = isLight ? '#8F8E8C' : '#939293';
    
    // Horizontal Ruler
    hCanvas.width = hCanvas.clientWidth * dpr;
    hCanvas.height = hCanvas.clientHeight * dpr;
    const hCtx = hCanvas.getContext('2d');
    hCtx.scale(dpr, dpr);
    hCtx.fillStyle = color;
    hCtx.strokeStyle = color;
    hCtx.font = "10px sans-serif";
    hCtx.textBaseline = "top";
    hCtx.lineWidth = 1;
    
    const originX = AppState.coreWallBounds ? AppState.coreWallBounds.left * zoom : 0;
    const startInchX = Math.floor(-originX / ppi);
    const endInchX = Math.ceil((hCanvas.clientWidth - originX) / ppi);
    
    for (let i = startInchX; i <= endInchX; i++) {
        const x = Math.round(originX + (i * ppi)) + 0.5;
        if (x < 0 || x > hCanvas.clientWidth) continue;
        
        hCtx.beginPath();
        hCtx.moveTo(x, hCanvas.clientHeight);
        if (i % 12 === 0) {
            hCtx.lineTo(x, 0);
            hCtx.fillText(Math.abs(i), x + 3, 2);
        } else if (i % 6 === 0) {
            hCtx.lineTo(x, hCanvas.clientHeight * 0.4);
        } else {
            hCtx.lineTo(x, hCanvas.clientHeight * 0.7);
        }
        hCtx.stroke();
    }
    
    // Draw Horizontal Indicators
    if (AppState.dragBounds) {
        hCtx.fillStyle = window.getThemeColor('primaryFill');
        const x1 = AppState.dragBounds.left * zoom;
        const x2 = AppState.dragBounds.right * zoom;
        hCtx.fillRect(x1, 0, x2 - x1, hCanvas.clientHeight);
        
        hCtx.fillStyle = window.getThemeColor('primary');
        hCtx.fillRect(x1, 0, 1, hCanvas.clientHeight);
        hCtx.fillRect(x2 - 1, 0, 1, hCanvas.clientHeight);
    } else if (AppState.mousePos) {
        hCtx.fillStyle = window.getThemeColor('primary');
        hCtx.globalAlpha = 0.5;
        hCtx.fillRect(AppState.mousePos.x * zoom, 0, 1, hCanvas.clientHeight);
        hCtx.globalAlpha = 1.0;
    }
    
    // Vertical Ruler
    vCanvas.width = vCanvas.clientWidth * dpr;
    vCanvas.height = vCanvas.clientHeight * dpr;
    const vCtx = vCanvas.getContext('2d');
    vCtx.scale(dpr, dpr);
    vCtx.fillStyle = color;
    vCtx.strokeStyle = color;
    vCtx.font = "10px sans-serif";
    vCtx.textBaseline = "middle";
    vCtx.textAlign = "center";
    vCtx.lineWidth = 1;
    
    const vOffset = hRuler.offsetHeight || 24; 
    const originY = (AppState.coreWallBounds ? AppState.coreWallBounds.top * zoom : 0) + vOffset;
    
    const startInchY = Math.floor(-originY / ppi);
    const endInchY = Math.ceil((vCanvas.clientHeight - originY) / ppi);
    
    for (let i = startInchY; i <= endInchY; i++) {
        const y = Math.round(originY + (i * ppi)) + 0.5;
        if (y < 0 || y > vCanvas.clientHeight) continue;
        
        vCtx.beginPath();
        vCtx.moveTo(vCanvas.clientWidth, y);
        if (i % 12 === 0) {
            vCtx.lineTo(0, y);
            vCtx.save();
            vCtx.translate(vCanvas.clientWidth * 0.4, y + 5);
            vCtx.rotate(-Math.PI / 2);
            vCtx.fillText(Math.abs(i), 0, 0);
            vCtx.restore();
        } else if (i % 6 === 0) {
            vCtx.lineTo(vCanvas.clientWidth * 0.4, y);
        } else {
            vCtx.lineTo(vCanvas.clientWidth * 0.7, y);
        }
        vCtx.stroke();
    }

    // Draw Vertical Indicators
    if (AppState.dragBounds) {
        vCtx.fillStyle = window.getThemeColor('primaryFill');
        const y1 = (AppState.dragBounds.top * zoom) + vOffset;
        const y2 = (AppState.dragBounds.bottom * zoom) + vOffset;
        vCtx.fillRect(0, y1, vCanvas.clientWidth, y2 - y1);
        
        vCtx.fillStyle = window.getThemeColor('primary');
        vCtx.fillRect(0, y1, vCanvas.clientWidth, 1);
        vCtx.fillRect(0, y2 - 1, vCanvas.clientWidth, 1);
    } else if (AppState.mousePos) {
        vCtx.fillStyle = window.getThemeColor('primary');
        vCtx.globalAlpha = 0.5;
        vCtx.fillRect(0, (AppState.mousePos.y * zoom) + vOffset, vCanvas.clientWidth, 1);
        vCtx.globalAlpha = 1.0;
    }
};

window.startDragGuide = function(e, type) {
    if (AppState.mode !== 'IDLE' || !AppState.pixelsPerInch) return;
    const isHorizontal = type === 'h';
    const pointer = canvas.getPointer(e);
    
    const guide = new fabric.Line(
        isHorizontal ? [0, pointer.y, AppState.logicalWidth, pointer.y] 
                     : [pointer.x, 0, pointer.x, AppState.logicalHeight], 
        {
            stroke: window.getThemeColor('primary'), strokeWidth: 3 / canvas.getZoom(), 
            selectable: true, hasControls: false, hasBorders: false, 
            isGuide: true, lockMovementX: isHorizontal, lockMovementY: !isHorizontal,
            hoverCursor: isHorizontal ? 'ns-resize' : 'ew-resize'
        }
    );
    canvas.add(guide);
    canvas.setActiveObject(guide);
    
    const onMouseMove = (moveEvent) => {
        const pt = canvas.getPointer(moveEvent);
        AppState.mousePos = { x: pt.x, y: pt.y };
        
        if (isHorizontal) {
            pt.y = window.applyGridSnap(pt.y, 'y');
            guide.set({ y1: pt.y, y2: pt.y, top: pt.y });
        } else {
            pt.x = window.applyGridSnap(pt.x, 'x');
            guide.set({ x1: pt.x, x2: pt.x, left: pt.x });
        }
        
        const bounds = AppState.coreWallBounds || {left:0, top:0};
        if ((isHorizontal && pt.y < bounds.top) || (!isHorizontal && pt.x < bounds.left)) {
            guide.set('opacity', 0.3);
        } else {
            guide.set('opacity', 1);
        }

        guide.setCoords();
        if (window.drawRulers) window.drawRulers();
        canvas.renderAll();
    };
    
    const onMouseUp = (upEvent) => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        
        const pt = canvas.getPointer(upEvent);
        const bounds = AppState.coreWallBounds || {left:0, top:0};
        
        if ((isHorizontal && pt.y < bounds.top) || (!isHorizontal && pt.x < bounds.left)) {
            canvas.remove(guide);
            canvas.discardActiveObject();
        }
        
        AppState.mousePos = null;
        if (window.drawRulers) window.drawRulers();
        canvas.renderAll();
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};

document.getElementById('ruler-h').addEventListener('mousedown', (e) => window.startDragGuide(e, 'h'));
document.getElementById('ruler-v').addEventListener('mousedown', (e) => window.startDragGuide(e, 'v'));

canvas.on('mouse:up', (e) => {
    AppState.dragBounds = null;
    if (window.drawRulers) window.drawRulers();
    
    if (e.target && e.target.isGuide) {
        const bounds = AppState.coreWallBounds || {left:0, top:0};
        if ((e.target.lockMovementX && e.target.top < bounds.top) || 
            (e.target.lockMovementY && e.target.left < bounds.left)) {
            canvas.remove(e.target);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        }
    }
});