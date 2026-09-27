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

window.resizeCanvas = function() {
    const availableWidth = document.getElementById('canvas-container').clientWidth;
    const availableHeight = document.getElementById('canvas-container').clientHeight;
    
    const scaleX = availableWidth / AppState.logicalWidth;
    const scaleY = availableHeight / AppState.logicalHeight;
    const baseZoom = Math.min(scaleX, scaleY);
    
    const targetZoom = baseZoom * AppState.zoomMultiplier;
    
    canvas.setZoom(targetZoom);
    canvas.setWidth(AppState.logicalWidth * targetZoom);
    canvas.setHeight(AppState.logicalHeight * targetZoom);
    
    document.getElementById('input-zoom-level').value = Math.round(AppState.zoomMultiplier * 100) + '%';
    
    if (window.drawRulers) window.drawRulers();
};

window.addEventListener('resize', window.resizeCanvas);

// Zoom Controls
document.getElementById('btn-zoom-in').addEventListener('click', () => {
    AppState.zoomMultiplier = Math.round(Math.min(10.0, AppState.zoomMultiplier + 0.2) * 10) / 10;
    window.resizeCanvas();
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
    AppState.zoomMultiplier = Math.round(Math.max(0.1, AppState.zoomMultiplier - 0.2) * 10) / 10;
    window.resizeCanvas();
});

document.getElementById('btn-zoom-reset').addEventListener('click', () => {
    AppState.zoomMultiplier = 1.0;
    window.resizeCanvas();
});

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

canvas.on('object:moving', (e) => {
    if (AppState.mode !== 'IDLE') return;
    const target = e.target;

    if (target.isGuide) {
        if (target.lockMovementX) {
            target.set('top', window.applyGridSnap(target.top, 'y'));
        } else {
            target.set('left', window.applyGridSnap(target.left, 'x'));
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
        left: window.applyGridSnap(target.left, 'x'),
        top: window.applyGridSnap(target.top, 'y')
    });

    target.setCoords();
    const zoom = canvas.getZoom();
    const bRect = target.getBoundingRect();
    const vW = bRect.width / zoom;
    const vH = bRect.height / zoom;
    const vL = bRect.left / zoom;
    const vT = bRect.top / zoom;

    const snap = window.calculateGuideSnapping(vL, vT, vW, vH, target.left, target.top, zoom, canvas.getObjects());
    if (snap.x !== null) target.set('left', snap.x);
    if (snap.y !== null) target.set('top', snap.y);

    if (AppState.coreWallBounds) {
        const constrained = window.constrainToBounds(
            target.left, target.top, 
            vL, vT, vW, vH, 
            AppState.coreWallBounds
        );
        target.set({ left: constrained.x, top: constrained.y });
    }
    
    target.setCoords();
    
    const finalRect = target.getBoundingRect();
    AppState.dragBounds = {
        left: finalRect.left / zoom,
        right: (finalRect.left + finalRect.width) / zoom,
        top: finalRect.top / zoom,
        bottom: (finalRect.top + finalRect.height) / zoom
    };

    if (window.drawRulers) window.drawRulers();
});

document.getElementById('canvas-container').addEventListener('scroll', () => {
    canvas.calcOffset();
    if (window.drawRulers) window.drawRulers();
});

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