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

// Canvas Mouse Hover Tracking
canvas.on('mouse:move', (e) => {
    if (AppState.mode !== 'IDLE') return;
    const pointer = canvas.getPointer(e.e);
    AppState.mousePos = { x: pointer.x, y: pointer.y };
    if (window.drawRulers) window.drawRulers();
});

canvas.on('mouse:out', (e) => {
    AppState.mousePos = null;
    if (window.drawRulers) window.drawRulers();
});

// Centralized Grid Snapping Math with Ruler Origin Adjustment
function applyGridSnap(value, axis) {
    if (!document.getElementById('toggle-grid').checked || !AppState.pixelsPerInch) return value;
    const rawVal = parseFloat(document.getElementById('input-snap-val').value);
    const snapVal = (!isNaN(rawVal) && rawVal > 0) ? rawVal : 1;
    const gridSize = AppState.pixelsPerInch * snapVal;
    
    let offset = 0;
    if (AppState.coreWallBounds) {
        offset = axis === 'x' ? AppState.coreWallBounds.left : AppState.coreWallBounds.top;
    }
    
    return Math.round((value - offset) / gridSize) * gridSize + offset;
}

// Drag and Drop Logic
const canvasContainer = document.getElementById('canvas-container');

function calculateDropPosition(clientX, clientY, pW, pH) {
    const rect = canvasContainer.getBoundingClientRect();
    const zoom = canvas.getZoom();
    
    let pointerX = (clientX - rect.left) / zoom;
    let pointerY = (clientY - rect.top) / zoom;

    pointerX = applyGridSnap(pointerX, 'x');
    pointerY = applyGridSnap(pointerY, 'y');

    const guidesX = [];
    const guidesY = [];
    canvas.getObjects().forEach(obj => {
        if (obj.isGuide) {
            if (obj.lockMovementY) guidesX.push(obj.left);
            if (obj.lockMovementX) guidesY.push(obj.top);
        }
    });

    if (guidesX.length > 0 || guidesY.length > 0) {
        const vL = pointerX - pW / 2;
        const vT = pointerY - pH / 2;
        const vR = pointerX + pW / 2;
        const vB = pointerY + pH / 2;

        const SNAP_THRESHOLD = 15 / zoom;

        let snapX = null;
        let minDiffX = SNAP_THRESHOLD;
        guidesX.forEach(gx => {
            const dL = Math.abs(vL - gx);
            const dC = Math.abs(pointerX - gx);
            const dR = Math.abs(vR - gx);
            if (dL < minDiffX) { minDiffX = dL; snapX = pointerX + (gx - vL); }
            if (dC < minDiffX) { minDiffX = dC; snapX = pointerX + (gx - pointerX); }
            if (dR < minDiffX) { minDiffX = dR; snapX = pointerX + (gx - vR); }
        });

        let snapY = null;
        let minDiffY = SNAP_THRESHOLD;
        guidesY.forEach(gy => {
            const dT = Math.abs(vT - gy);
            const dC = Math.abs(pointerY - gy);
            const dB = Math.abs(vB - gy);
            if (dT < minDiffY) { minDiffY = dT; snapY = pointerY + (gy - vT); }
            if (dC < minDiffY) { minDiffY = dC; snapY = pointerY + (gy - pointerY); }
            if (dB < minDiffY) { minDiffY = dB; snapY = pointerY + (gy - vB); }
        });

        if (snapX !== null) pointerX = snapX;
        if (snapY !== null) pointerY = snapY;
    }

    if (AppState.coreWallBounds) {
        const b = AppState.coreWallBounds;
        const w2 = pW / 2;
        const h2 = pH / 2;
        if (pointerX - w2 < b.left) pointerX = b.left + w2;
        if (pointerX + w2 > b.right) pointerX = b.right - w2;
        if (pointerY - h2 < b.top) pointerY = b.top + h2;
        if (pointerY + h2 > b.bottom) pointerY = b.bottom - h2;
    }

    return { x: pointerX, y: pointerY };
}

canvasContainer.addEventListener('dragover', (e) => {
    e.preventDefault(); 
    
    if (AppState.draggingTrayId && AppState.trayItems[AppState.draggingTrayId]) {
        const item = AppState.trayItems[AppState.draggingTrayId];
        const pW = item.physicalW * AppState.pixelsPerInch;
        const pH = item.physicalH * AppState.pixelsPerInch;
        
        const pos = calculateDropPosition(e.clientX, e.clientY, pW, pH);
        
        if (!AppState.dragPreviewObj && !AppState.isLoadingPreview) {
            AppState.isLoadingPreview = true;
            fabric.Image.fromURL(item.finalDataUrl, (img) => {
                img.set({
                    scaleX: pW / img.width,
                    scaleY: pH / img.height,
                    originX: 'center',
                    originY: 'center',
                    opacity: 0.65,
                    hasControls: false, 
                    hasBorders: true,   
                    borderColor: window.getThemeColor('primary'),
                    evented: false,
                    selectable: false
                });
                AppState.dragPreviewObj = img;
                canvas.add(img);
                AppState.isLoadingPreview = false;
                
                if (AppState.mousePos) {
                    img.set({ left: AppState.mousePos.x, top: AppState.mousePos.y });
                    img.setCoords();
                    canvas.requestRenderAll();
                }
            });
        }

        if (AppState.dragPreviewObj) {
            AppState.dragPreviewObj.set({ left: pos.x, top: pos.y });
            AppState.dragPreviewObj.setCoords();
            canvas.requestRenderAll();
        }

        AppState.mousePos = { x: pos.x, y: pos.y };
        AppState.dragBounds = {
            left: pos.x - (pW / 2),
            right: pos.x + (pW / 2),
            top: pos.y - (pH / 2),
            bottom: pos.y + (pH / 2)
        };
    } else {
        const rect = canvasContainer.getBoundingClientRect();
        const zoom = canvas.getZoom();
        AppState.mousePos = {
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom
        };
    }
    
    if (window.drawRulers) window.drawRulers();
});

canvasContainer.addEventListener('dragleave', (e) => {
    const rect = canvasContainer.getBoundingClientRect();
    if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
        AppState.mousePos = null;
        AppState.dragBounds = null;
        if (AppState.dragPreviewObj) {
            canvas.remove(AppState.dragPreviewObj);
            AppState.dragPreviewObj = null;
            AppState.isLoadingPreview = false;
            canvas.requestRenderAll();
        }
        if (window.drawRulers) window.drawRulers();
    }
});

canvasContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    AppState.mousePos = null;
    AppState.dragBounds = null;
    
    if (AppState.dragPreviewObj) {
        canvas.remove(AppState.dragPreviewObj);
        AppState.dragPreviewObj = null;
        AppState.isLoadingPreview = false;
    }
    
    const id = e.dataTransfer.getData('text/plain') || AppState.draggingTrayId;
    if (!id) return;
    const trayItem = AppState.trayItems[id];
    if (!trayItem) return;

    const pW = trayItem.physicalW * AppState.pixelsPerInch;
    const pH = trayItem.physicalH * AppState.pixelsPerInch;

    const pos = calculateDropPosition(e.clientX, e.clientY, pW, pH);

    fabric.Image.fromURL(trayItem.finalDataUrl, (img) => {
        img.set({
            scaleX: pW / img.width,
            scaleY: pH / img.height,
            left: pos.x,
            top: pos.y,
            originX: 'center',
            originY: 'center',
            hasControls: false, 
            hasBorders: true,   
            borderColor: window.getThemeColor('primary'),
            customData: { shape: trayItem.shape, trayId: id } 
        });
        
        canvas.add(img);
        canvas.setActiveObject(img);
        if (window.drawRulers) window.drawRulers();
    });
});

// Dynamic Context Menu Logic
const ctxMenu = document.getElementById('context-menu');

window.hideContextMenu = function() {
    ctxMenu.style.display = 'none';
};

window.addEventListener('click', () => window.hideContextMenu());

window.showContextMenu = function(e, type, target) {
    e.preventDefault();
    ctxMenu.innerHTML = '';
    
    if (type === 'wall-art') {
        const trayId = target.customData.trayId;
        ctxMenu.innerHTML = `
            <div class="ctx-item" id="ctx-rotate-cw">Rotate 90&deg; CW</div>
            <div class="ctx-item" id="ctx-rotate-ccw">Rotate 90&deg; CCW</div>
            <div class="ctx-item" id="ctx-update">Update Art</div>
            <div class="ctx-item" id="ctx-delete-selected">Delete Selected</div>
            <div class="ctx-item" id="ctx-delete-all">Delete All Instances</div>
        `;
        document.getElementById('ctx-rotate-cw').onclick = () => {
            const active = canvas.getActiveObjects();
            active.forEach(obj => {
                obj.rotate((obj.angle || 0) + 90);
                obj.setCoords();
            });
            canvas.requestRenderAll();
            window.updateAlignToolbar();
            window.hideContextMenu();
        };
        document.getElementById('ctx-rotate-ccw').onclick = () => {
            const active = canvas.getActiveObjects();
            active.forEach(obj => {
                obj.rotate((obj.angle || 0) - 90);
                obj.setCoords();
            });
            canvas.requestRenderAll();
            window.updateAlignToolbar();
            window.hideContextMenu();
        };
        document.getElementById('ctx-update').onclick = () => window.openArtUpdate(trayId);
        document.getElementById('ctx-delete-selected').onclick = () => {
            const active = canvas.getActiveObjects();
            active.forEach(obj => canvas.remove(obj));
            canvas.discardActiveObject();
            window.updateAlignToolbar();
        };
        document.getElementById('ctx-delete-all').onclick = () => window.deleteAllInstances(trayId);
    } else if (type === 'tray-art') {
        const trayId = target.dataset.id;
        ctxMenu.innerHTML = `
            <div class="ctx-item" id="ctx-update">Update Art</div>
            <div class="ctx-item" id="ctx-delete-tray">Delete Art</div>
        `;
        document.getElementById('ctx-update').onclick = () => window.openArtUpdate(trayId);
        document.getElementById('ctx-delete-tray').onclick = () => {
            window.deleteAllInstances(trayId);
            target.remove();
            delete AppState.trayItems[trayId];
            if (Object.keys(AppState.trayItems).length === 0) {
                document.getElementById('tray-empty-text').style.display = 'block';
            }
        };
    }
    
    // Display block first to calculate dimensions safely
    ctxMenu.style.display = 'block';
    
    const menuWidth = ctxMenu.offsetWidth;
    const menuHeight = ctxMenu.offsetHeight;
    
    let left = e.clientX;
    let top = e.clientY;
    
    if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth;
    }
    if (top + menuHeight > window.innerHeight) {
        top = window.innerHeight - menuHeight;
    }
    
    ctxMenu.style.left = left + 'px';
    ctxMenu.style.top = top + 'px';
};

canvas.on('mouse:down', function(options) {
    if (options.e.button === 2 || options.e.button === 3) { 
        if (options.target && !options.target.isGuide && AppState.mode === 'IDLE' && options.target.customData?.trayId) {
            const active = canvas.getActiveObject();
            if (!active || (active.type === 'activeSelection' && !active.contains(options.target)) || active !== options.target) {
                canvas.setActiveObject(options.target);
            }
            window.showContextMenu(options.e, 'wall-art', options.target);
        } else {
            window.hideContextMenu();
        }
    } else {
        window.hideContextMenu();
    }
});

tray.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('tray-item')) {
        window.showContextMenu(e, 'tray-art', e.target);
    }
});

window.deleteAllInstances = function(trayId) {
    const objects = canvas.getObjects();
    objects.forEach(obj => {
        if (obj.customData && obj.customData.trayId === trayId) {
            canvas.remove(obj);
        }
    });
    canvas.discardActiveObject();
    window.updateAlignToolbar();
};

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

window.updateAlignToolbar = function() {
    const active = canvas.getActiveObjects();
    document.getElementById('align-toolbar').style.display = active.length > 1 ? 'flex' : 'none';
}

canvas.on('selection:created', window.updateAlignToolbar);
canvas.on('selection:updated', window.updateAlignToolbar);
canvas.on('selection:cleared', window.updateAlignToolbar);

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
        AppState.mousePos = { x: pt.x, y: pt.y };
        
        if (isHorizontal) {
            pt.y = applyGridSnap(pt.y, 'y');
            guide.set({ y1: pt.y, y2: pt.y, top: pt.y });
        } else {
            pt.x = applyGridSnap(pt.x, 'x');
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
}

document.getElementById('ruler-h').addEventListener('mousedown', (e) => startDragGuide(e, 'h'));
document.getElementById('ruler-v').addEventListener('mousedown', (e) => startDragGuide(e, 'v'));

canvas.on('object:moving', (e) => {
    if (AppState.mode !== 'IDLE') return;
    
    const target = e.target;

    if (target.isGuide) {
        if (target.lockMovementX) {
            target.set('top', applyGridSnap(target.top, 'y'));
        } else {
            target.set('left', applyGridSnap(target.left, 'x'));
        }

        const bounds = AppState.coreWallBounds || {left:0, top:0};
        if ((target.lockMovementX && target.top < bounds.top) || 
            (target.lockMovementY && target.left < bounds.left)) {
            target.set('opacity', 0.3);
        } else {
            target.set('opacity', 1);
        }
        return; 
    }
    
    target.set({
        left: applyGridSnap(target.left, 'x'),
        top: applyGridSnap(target.top, 'y')
    });

    // Always update coordinates before reading the bounding rect
    target.setCoords();

    const zoom = canvas.getZoom();

    // Guide Snapping
    const guidesX = [];
    const guidesY = [];
    canvas.getObjects().forEach(obj => {
        if (obj.isGuide && obj !== target) {
            if (obj.lockMovementY) guidesX.push(obj.left); // Vertical guide
            if (obj.lockMovementX) guidesY.push(obj.top);  // Horizontal guide
        }
    });

    if (guidesX.length > 0 || guidesY.length > 0) {
        const bRect = target.getBoundingRect();
        const vW = bRect.width / zoom;
        const vH = bRect.height / zoom;
        const vL = bRect.left / zoom;
        const vT = bRect.top / zoom;
        const vCenterX = vL + vW / 2;
        const vCenterY = vT + vH / 2;
        const vR = vL + vW;
        const vB = vT + vH;

        const SNAP_THRESHOLD = 15 / zoom;

        let snapX = null;
        let minDiffX = SNAP_THRESHOLD;
        
        guidesX.forEach(gx => {
            const dL = Math.abs(vL - gx);
            const dC = Math.abs(vCenterX - gx);
            const dR = Math.abs(vR - gx);

            if (dL < minDiffX) { minDiffX = dL; snapX = target.left + (gx - vL); }
            if (dC < minDiffX) { minDiffX = dC; snapX = target.left + (gx - vCenterX); }
            if (dR < minDiffX) { minDiffX = dR; snapX = target.left + (gx - vR); }
        });

        let snapY = null;
        let minDiffY = SNAP_THRESHOLD;
        
        guidesY.forEach(gy => {
            const dT = Math.abs(vT - gy);
            const dC = Math.abs(vCenterY - gy);
            const dB = Math.abs(vB - gy);

            if (dT < minDiffY) { minDiffY = dT; snapY = target.top + (gy - vT); }
            if (dC < minDiffY) { minDiffY = dC; snapY = target.top + (gy - vCenterY); }
            if (dB < minDiffY) { minDiffY = dB; snapY = target.top + (gy - vB); }
        });

        if (snapX !== null) target.set('left', snapX);
        if (snapY !== null) target.set('top', snapY);
        
        target.setCoords();
    }

    if (AppState.coreWallBounds) {
        const b = AppState.coreWallBounds;
        const bRect = target.getBoundingRect();
        const vW = bRect.width / zoom;
        const vH = bRect.height / zoom;
        const vL = bRect.left / zoom;
        const vT = bRect.top / zoom;

        const offsetLeft = target.left - vL;
        const offsetRight = (vL + vW) - target.left;
        const offsetTop = target.top - vT;
        const offsetBottom = (vT + vH) - target.top;

        let newLeft = target.left;
        let newTop = target.top;

        if (newLeft - offsetLeft < b.left) newLeft = b.left + offsetLeft;
        if (newLeft + offsetRight > b.right) newLeft = b.right - offsetRight;
        if (newTop - offsetTop < b.top) newTop = b.top + offsetTop;
        if (newTop + offsetBottom > b.bottom) newTop = b.bottom - offsetBottom;

        target.set({ left: newLeft, top: newTop });
        target.setCoords();
    }
    
    // Update Drag Bounds
    const finalRect = target.getBoundingRect();
    AppState.dragBounds = {
        left: finalRect.left / zoom,
        right: (finalRect.left + finalRect.width) / zoom,
        top: finalRect.top / zoom,
        bottom: (finalRect.top + finalRect.height) / zoom
    };

    if (window.drawRulers) window.drawRulers();
});