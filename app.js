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
    const zoom = Math.min(scaleX, scaleY);
    
    canvas.setZoom(zoom);
    canvas.setWidth(AppState.logicalWidth * zoom);
    canvas.setHeight(AppState.logicalHeight * zoom);
    
    if (window.drawRulers) window.drawRulers();
};
window.addEventListener('resize', window.resizeCanvas);

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
    const guidesX = [];
    const guidesY = [];
    canvas.getObjects().forEach(obj => {
        if (obj.isGuide && obj !== target) {
            if (obj.lockMovementY) guidesX.push(obj.left); 
            if (obj.lockMovementX) guidesY.push(obj.top);  
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
    
    const finalRect = target.getBoundingRect();
    AppState.dragBounds = {
        left: finalRect.left / zoom,
        right: (finalRect.left + finalRect.width) / zoom,
        top: finalRect.top / zoom,
        bottom: (finalRect.top + finalRect.height) / zoom
    };

    if (window.drawRulers) window.drawRulers();
});