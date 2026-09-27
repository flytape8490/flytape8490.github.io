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