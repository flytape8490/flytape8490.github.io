function calculateDropPosition(clientX, clientY, pW, pH) {
    const canvasContainer = document.getElementById('canvas-container');
    const rect = canvasContainer.getBoundingClientRect();
    const zoom = canvas.getZoom();
    
    let pointerX = (clientX - rect.left + canvasContainer.scrollLeft) / zoom;
    let pointerY = (clientY - rect.top + canvasContainer.scrollTop) / zoom;

    pointerX = window.applyGridSnap(pointerX, 'x');
    pointerY = window.applyGridSnap(pointerY, 'y');

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

document.getElementById('canvas-container').addEventListener('dragover', (e) => {
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
        const canvasContainer = document.getElementById('canvas-container');
        const rect = canvasContainer.getBoundingClientRect();
        const zoom = canvas.getZoom();
        AppState.mousePos = {
            x: (e.clientX - rect.left + canvasContainer.scrollLeft) / zoom,
            y: (e.clientY - rect.top + canvasContainer.scrollTop) / zoom
        };
    }
    
    if (window.drawRulers) window.drawRulers();
});

document.getElementById('canvas-container').addEventListener('dragleave', (e) => {
    const canvasContainer = document.getElementById('canvas-container');
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

document.getElementById('canvas-container').addEventListener('drop', (e) => {
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

window.addToTray = function(trayId) {
    document.getElementById('tray-empty-text').style.display = 'none';
    
    const imgEl = document.createElement('img');
    imgEl.src = AppState.trayItems[trayId].finalDataUrl;
    imgEl.className = 'tray-item';
    imgEl.draggable = true;
    imgEl.dataset.id = trayId;
    
    imgEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', trayId);
        AppState.draggingTrayId = trayId;

        const ghost = document.getElementById('drag-ghost');
        if (ghost) {
            e.dataTransfer.setDragImage(ghost, 0, 0);
        }
    });

    imgEl.addEventListener('dragend', (e) => {
        AppState.draggingTrayId = null;
        AppState.dragBounds = null;
        AppState.mousePos = null;
        if (AppState.dragPreviewObj) {
            canvas.remove(AppState.dragPreviewObj);
            AppState.dragPreviewObj = null;
            canvas.requestRenderAll();
        }
        AppState.isLoadingPreview = false;
        if (window.drawRulers) window.drawRulers();
    });

    document.getElementById('tray').appendChild(imgEl);
};