document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        document.getElementById('icon-sun').style.display = 'block';
        document.getElementById('icon-moon').style.display = 'none';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('icon-sun').style.display = 'none';
        document.getElementById('icon-moon').style.display = 'block';
    }
    window.updateCanvasColors();
});

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
    
    const originY = AppState.coreWallBounds ? AppState.coreWallBounds.top * zoom : 0;
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
};

window.resizeCanvas = function() {
    const availableWidth = container.clientWidth;
    const availableHeight = container.clientHeight;
    const scaleX = availableWidth / AppState.logicalWidth;
    const scaleY = availableHeight / AppState.logicalHeight;
    const zoom = Math.min(scaleX, scaleY);
    
    canvas.setZoom(zoom);
    canvas.setWidth(AppState.logicalWidth * zoom);
    canvas.setHeight(AppState.logicalHeight * zoom);
    
    if (window.drawRulers) window.drawRulers();
};
window.addEventListener('resize', window.resizeCanvas);

const ctxMenu = document.getElementById('context-menu');

canvas.on('mouse:down', function(options) {
    if (options.e.button === 2) { 
        if (options.target && !options.target.isGuide && AppState.mode === 'IDLE') {
            const active = canvas.getActiveObject();
            if (!active || (active.type === 'activeSelection' && !active.contains(options.target)) || active !== options.target) {
                canvas.setActiveObject(options.target);
            }
            ctxMenu.style.display = 'block';
            ctxMenu.style.left = options.e.clientX + 'px';
            ctxMenu.style.top = options.e.clientY + 'px';
        } else {
            ctxMenu.style.display = 'none';
        }
    } else {
        ctxMenu.style.display = 'none';
    }
});

document.getElementById('ctx-delete').addEventListener('click', () => {
    const active = canvas.getActiveObjects();
    active.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    ctxMenu.style.display = 'none';
    updateAlignToolbar();
});

canvas.on('mouse:up', (e) => {
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

function updateAlignToolbar() {
    const active = canvas.getActiveObjects();
    document.getElementById('align-toolbar').style.display = active.length > 1 ? 'flex' : 'none';
}

canvas.on('selection:created', updateAlignToolbar);
canvas.on('selection:updated', updateAlignToolbar);
canvas.on('selection:cleared', updateAlignToolbar);

function alignObjects(type) {
    const activeSelection = canvas.getActiveObject();
    if (!activeSelection || activeSelection.type !== 'activeSelection') return;
    
    const objects = activeSelection.getObjects();
    const bounds = activeSelection.getBoundingRect();
    
    canvas.discardActiveObject();
    
    objects.forEach(obj => {
        const objBounds = obj.getBoundingRect();
        switch(type) {
            case 'left': obj.set('left', obj.left - (objBounds.left - bounds.left)); break;
            case 'center': obj.set('left', obj.left - (objBounds.left + objBounds.width/2 - (bounds.left + bounds.width/2))); break;
            case 'right': obj.set('left', obj.left - (objBounds.left + objBounds.width - (bounds.left + bounds.width))); break;
            case 'top': obj.set('top', obj.top - (objBounds.top - bounds.top)); break;
            case 'middle': obj.set('top', obj.top - (objBounds.top + objBounds.height/2 - (bounds.top + bounds.height/2))); break;
            case 'bottom': obj.set('top', obj.top - (objBounds.top + objBounds.height - (bounds.top + bounds.height))); break;
        }
        obj.setCoords();
    });
    
    const newSel = new fabric.ActiveSelection(objects, { canvas: canvas });
    canvas.setActiveObject(newSel);
    canvas.requestRenderAll();
}

function distributeObjects(type) {
    const activeSelection = canvas.getActiveObject();
    if (!activeSelection || activeSelection.type !== 'activeSelection') return;
    
    let objects = activeSelection.getObjects();
    const bounds = activeSelection.getBoundingRect();
    
    canvas.discardActiveObject();
    
    if (type === 'h') {
        objects.sort((a, b) => a.getBoundingRect().left - b.getBoundingRect().left);
        const totalWidth = objects.reduce((sum, obj) => sum + obj.getBoundingRect().width, 0);
        const gap = (bounds.width - totalWidth) / (objects.length - 1);
        let currentX = bounds.left;
        objects.forEach(obj => {
            const objBounds = obj.getBoundingRect();
            obj.set('left', obj.left - (objBounds.left - currentX));
            obj.setCoords();
            currentX += objBounds.width + gap;
        });
    } else if (type === 'v') {
        objects.sort((a, b) => a.getBoundingRect().top - b.getBoundingRect().top);
        const totalHeight = objects.reduce((sum, obj) => sum + obj.getBoundingRect().height, 0);
        const gap = (bounds.height - totalHeight) / (objects.length - 1);
        let currentY = bounds.top;
        objects.forEach(obj => {
            const objBounds = obj.getBoundingRect();
            obj.set('top', obj.top - (objBounds.top - currentY));
            obj.setCoords();
            currentY += objBounds.height + gap;
        });
    }
    
    const newSel = new fabric.ActiveSelection(objects, { canvas: canvas });
    canvas.setActiveObject(newSel);
    canvas.requestRenderAll();
}

document.getElementById('btn-align-left').addEventListener('click', () => alignObjects('left'));
document.getElementById('btn-align-center').addEventListener('click', () => alignObjects('center'));
document.getElementById('btn-align-right').addEventListener('click', () => alignObjects('right'));
document.getElementById('btn-align-top').addEventListener('click', () => alignObjects('top'));
document.getElementById('btn-align-middle').addEventListener('click', () => alignObjects('middle'));
document.getElementById('btn-align-bottom').addEventListener('click', () => alignObjects('bottom'));
document.getElementById('btn-distribute-h').addEventListener('click', () => distributeObjects('h'));
document.getElementById('btn-distribute-v').addEventListener('click', () => distributeObjects('v'));

function startDragGuide(e, type) {
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
        
        if (document.getElementById('toggle-grid').checked) {
            const gridSize = AppState.pixelsPerInch;
            if (isHorizontal) pt.y = Math.round(pt.y / gridSize) * gridSize;
            else pt.x = Math.round(pt.x / gridSize) * gridSize;
        }

        if (isHorizontal) {
            guide.set({ y1: pt.y, y2: pt.y, top: pt.y });
        } else {
            guide.set({ x1: pt.x, x2: pt.x, left: pt.x });
        }
        
        const bounds = AppState.coreWallBounds || {left:0, top:0};
        if ((isHorizontal && pt.y < bounds.top) || (!isHorizontal && pt.x < bounds.left)) {
            guide.set('opacity', 0.3);
        } else {
            guide.set('opacity', 1);
        }

        guide.setCoords();
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
        canvas.renderAll();
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

document.getElementById('ruler-h').addEventListener('mousedown', (e) => startDragGuide(e, 'h'));
document.getElementById('ruler-v').addEventListener('mousedown', (e) => startDragGuide(e, 'v'));

window.addToTray = function(imgDataUrl, physicalW, physicalH, shapeType) {
    document.getElementById('tray-empty-text').style.display = 'none';
    
    const imgEl = document.createElement('img');
    imgEl.src = imgDataUrl;
    imgEl.className = 'tray-item';
    
    imgEl.addEventListener('click', () => {
        fabric.Image.fromURL(imgDataUrl, (img) => {
            const targetPixelWidth = physicalW * AppState.pixelsPerInch;
            const targetPixelHeight = physicalH * AppState.pixelsPerInch;
            
            img.set({
                scaleX: targetPixelWidth / img.width,
                scaleY: targetPixelHeight / img.height,
                left: AppState.logicalWidth / 2 - (targetPixelWidth / 2),
                top: AppState.logicalHeight / 2 - (targetPixelHeight / 2),
                hasControls: false, 
                hasBorders: true,   
                borderColor: window.getThemeColor('primary'),
                customData: { shape: shapeType } 
            });
            
            canvas.add(img);
            canvas.setActiveObject(img);
        });
    });

    tray.appendChild(imgEl);
};

canvas.on('object:moving', (e) => {
    if (AppState.mode !== 'IDLE') return;
    
    const target = e.target;

    if (target.isGuide) {
        const bounds = AppState.coreWallBounds || {left:0, top:0};
        if ((target.lockMovementX && target.top < bounds.top) || 
            (target.lockMovementY && target.left < bounds.left)) {
            target.set('opacity', 0.3);
        } else {
            target.set('opacity', 1);
        }
        return; 
    }
    
    if (document.getElementById('toggle-grid').checked && AppState.pixelsPerInch) {
        const gridSize = AppState.pixelsPerInch; 
        target.set({
            left: Math.round(target.left / gridSize) * gridSize,
            top: Math.round(target.top / gridSize) * gridSize
        });
        target.setCoords();
    }

    if (AppState.coreWallBounds) {
        const b = AppState.coreWallBounds;
        
        let clampedLeft = target.left;
        let clampedTop = target.top;
        const logicalWidth = target.getScaledWidth();
        const logicalHeight = target.getScaledHeight();

        if (clampedLeft < b.left) clampedLeft = b.left;
        if (clampedTop < b.top) clampedTop = b.top;
        if (clampedLeft + logicalWidth > b.right) clampedLeft = b.right - logicalWidth;
        if (clampedTop + logicalHeight > b.bottom) clampedTop = b.bottom - logicalHeight;
        
        target.set({ left: clampedLeft, top: clampedTop });
        target.setCoords();
    }
});