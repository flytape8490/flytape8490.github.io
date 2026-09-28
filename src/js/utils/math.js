window.calculateHomography = function(P) {
    const dx1 = P[1].x - P[2].x;
    const dx2 = P[3].x - P[2].x;
    const sx = P[0].x - P[1].x + P[2].x - P[3].x;
    const dy1 = P[1].y - P[2].y;
    const dy2 = P[3].y - P[2].y;
    const sy = P[0].y - P[1].y + P[2].y - P[3].y;

    const D = dx1 * dy2 - dy1 * dx2;
    const g = D !== 0 ? (sx * dy2 - sy * dx2) / D : 0;
    const h = D !== 0 ? (dx1 * sy - dy1 * sx) / D : 0;

    const a = P[1].x - P[0].x + g * P[1].x;
    const b = P[3].x - P[0].x + h * P[3].x;
    const c = P[0].x;
    const d = P[1].y - P[0].y + g * P[1].y;
    const e = P[3].y - P[0].y + h * P[3].y;
    const f = P[0].y;

    return { a, b, c, d, e, f, g, h };
};

window.extractPerspective = function(srcCanvas, dstW, dstH, P, coreW, coreH, offsetX, offsetY, maintainContext) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = dstW;
    outCanvas.height = dstH;
    const outCtx = outCanvas.getContext('2d');
    const dstData = outCtx.createImageData(dstW, dstH);
    const dst8 = dstData.data;

    const srcCtx = srcCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const src8 = srcData.data;
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;

    const H = window.calculateHomography(P);

    let dstIdx = 0;
    for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
            const u = (x - offsetX) / coreW;
            const v = (y - offsetY) / coreH;

            const denom = H.g * u + H.h * v + 1;
            const srcX = (H.a * u + H.b * v + H.c) / denom;
            const srcY = (H.d * u + H.e * v + H.f) / denom;

            const ix = Math.round(srcX);
            const iy = Math.round(srcY);

            if (ix >= 0 && ix < srcW && iy >= 0 && iy < srcH) {
                const srcIdx = (iy * srcW + ix) * 4;
                const isOutside = (u < 0 || u > 1 || v < 0 || v > 1);
                
                if (maintainContext) {
                    const multiplier = isOutside ? 0.35 : 1.0;
                    dst8[dstIdx] = src8[srcIdx] * multiplier;
                    dst8[dstIdx+1] = src8[srcIdx+1] * multiplier;
                    dst8[dstIdx+2] = src8[srcIdx+2] * multiplier;
                    dst8[dstIdx+3] = src8[srcIdx+3]; 
                } else {
                    if (!isOutside) {
                        dst8[dstIdx] = src8[srcIdx];
                        dst8[dstIdx+1] = src8[srcIdx+1];
                        dst8[dstIdx+2] = src8[srcIdx+2];
                        dst8[dstIdx+3] = src8[srcIdx+3];
                    } else {
                        dst8[dstIdx+3] = 0; 
                    }
                }
            } else {
                if (maintainContext) {
                    dst8[dstIdx] = 17; dst8[dstIdx+1] = 17; dst8[dstIdx+2] = 17; dst8[dstIdx+3] = 255;
                } else {
                    dst8[dstIdx+3] = 0;
                }
            }
            dstIdx += 4;
        }
    }
    
    outCtx.putImageData(dstData, 0, 0);
    return outCanvas;
};

window.applyGridSnap = function(value, axis) {
    if (!document.getElementById('toggle-grid').checked || !AppState.pixelsPerInch) return value;
    const rawVal = parseFloat(document.getElementById('input-snap-val').value);
    const snapVal = (!isNaN(rawVal) && rawVal > 0) ? rawVal : 1;
    const gridSize = AppState.pixelsPerInch * snapVal;
    
    let offset = 0;
    if (AppState.coreWallBounds) {
        offset = axis === 'x' ? AppState.coreWallBounds.left : AppState.coreWallBounds.top;
    }
    
    return Math.round((value - offset) / gridSize) * gridSize + offset;
};

window.calculateGuideSnapping = function(vL, vT, vW, vH, targetX, targetY, zoom, objects) {
    const guidesX = [];
    const guidesY = [];
    objects.forEach(obj => {
        if (obj.isGuide) {
            if (obj.lockMovementY) guidesX.push(obj.left);
            if (obj.lockMovementX) guidesY.push(obj.top);
        }
    });

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
        if (dL < minDiffX) { minDiffX = dL; snapX = targetX + (gx - vL); }
        if (dC < minDiffX) { minDiffX = dC; snapX = targetX + (gx - vCenterX); }
        if (dR < minDiffX) { minDiffX = dR; snapX = targetX + (gx - vR); }
    });

    let snapY = null;
    let minDiffY = SNAP_THRESHOLD;
    guidesY.forEach(gy => {
        const dT = Math.abs(vT - gy);
        const dC = Math.abs(vCenterY - gy);
        const dB = Math.abs(vB - gy);
        if (dT < minDiffY) { minDiffY = dT; snapY = targetY + (gy - vT); }
        if (dC < minDiffY) { minDiffY = dC; snapY = targetY + (gy - vCenterY); }
        if (dB < minDiffY) { minDiffY = dB; snapY = targetY + (gy - vB); }
    });

    return { x: snapX, y: snapY };
};

window.constrainToBounds = function(targetX, targetY, vL, vT, vW, vH, bounds) {
    const offsetLeft = targetX - vL;
    const offsetRight = (vL + vW) - targetX;
    const offsetTop = targetY - vT;
    const offsetBottom = (vT + vH) - targetY;

    let newLeft = targetX;
    let newTop = targetY;

    if (newLeft - offsetLeft < bounds.left) newLeft = bounds.left + offsetLeft;
    if (newLeft + offsetRight > bounds.right) newLeft = bounds.right - offsetRight;
    if (newTop - offsetTop < bounds.top) newTop = bounds.top + offsetTop;
    if (newTop + offsetBottom > bounds.bottom) newTop = bounds.bottom - offsetBottom;

    return { x: newLeft, y: newTop };
};