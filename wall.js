document.getElementById('btn-wall').addEventListener('click', () => {
    if (AppState.coreWallBounds) {
        document.getElementById('change-wall-modal').style.display = 'flex';
    } else {
        document.getElementById('file-wall').click();
    }
});

document.getElementById('btn-load-new-wall').addEventListener('click', () => {
    document.getElementById('change-wall-modal').style.display = 'none';
    document.getElementById('file-wall').click();
});

document.getElementById('btn-redefine-wall').addEventListener('click', () => {
    document.getElementById('change-wall-modal').style.display = 'none';
    
    canvas.clear();
    AppState.coreWallBounds = null;
    document.getElementById('ruler-h').style.display = 'none';
    document.getElementById('ruler-v').style.display = 'none';
    document.getElementById('btn-art').disabled = true;
    document.getElementById('btn-wall').textContent = "1. Load Wall";
    
    AppState.logicalWidth = AppState.rawWallImg.width;
    AppState.logicalHeight = AppState.rawWallImg.height;
    
    canvas.setBackgroundImage(AppState.rawWallImg, canvas.renderAll.bind(canvas));
    window.resizeCanvas(); 
    startWallPerspectiveMode();
});

document.getElementById('btn-cancel-change-wall').addEventListener('click', () => {
    document.getElementById('change-wall-modal').style.display = 'none';
});

document.getElementById('file-wall').addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
    
    if (AppState.coreWallBounds) {
        canvas.clear();
        AppState.coreWallBounds = null;
        document.getElementById('ruler-h').style.display = 'none';
        document.getElementById('ruler-v').style.display = 'none';
        document.getElementById('btn-art').disabled = true;
        document.getElementById('btn-wall').textContent = "1. Load Wall";
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        fabric.Image.fromURL(event.target.result, (img) => {
            if (!img || !img.width) {
                alert("Failed to load image. Please ensure you are using a standard format like JPG or PNG.");
                return;
            }
            
            AppState.logicalWidth = img.width;
            AppState.logicalHeight = img.height;
            AppState.rawWallImg = img;
            
            canvas.clear();
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            window.resizeCanvas(); 
            startWallPerspectiveMode();
        });
    };
    reader.readAsDataURL(e.target.files[0]);
    e.target.value = '';
});

function startWallPerspectiveMode() {
    AppState.mode = 'WALL_SCALE';
    uiDefault.style.display = 'none';
    uiWallScale.style.display = 'flex';
    
    const padX = AppState.logicalWidth * 0.1;
    const padY = AppState.logicalHeight * 0.1;
    const points = [
        { x: padX, y: padY }, 
        { x: AppState.logicalWidth - padX, y: padY }, 
        { x: AppState.logicalWidth - padX, y: AppState.logicalHeight - padY }, 
        { x: padX, y: AppState.logicalHeight - padY } 
    ];

    AppState.wallCorners = points.map((p, index) => {
        const circle = new fabric.Circle({
            radius: 15, fill: '#ffffff', stroke: window.getThemeColor('primary'), strokeWidth: 4,
            left: p.x, top: p.y, originX: 'center', originY: 'center',
            hasBorders: false, hasControls: false, customIndex: index
        });
        circle.isWallCorner = true;
        circle._lastValidX = p.x;
        circle._lastValidY = p.y;
        canvas.add(circle);
        return circle;
    });

    renderWallPoly(); 
}

function renderWallPoly() {
    if (AppState.wallPoly) canvas.remove(AppState.wallPoly);
    const currentPoints = AppState.wallCorners.map(c => ({ x: c.left, y: c.top }));
    
    AppState.wallPoly = new fabric.Polygon(currentPoints, {
        fill: window.getThemeColor('primaryFill'), 
        stroke: window.getThemeColor('primary'), 
        strokeWidth: 3,
        selectable: false, evented: false, objectCaching: false
    });
    AppState.wallPoly.isWallPoly = true;
    canvas.add(AppState.wallPoly);
    AppState.wallPoly.sendToBack();
}

canvas.on('object:moving', (e) => {
    if (AppState.mode === 'WALL_SCALE' && e.target.type === 'circle' && e.target.customIndex !== undefined) {
        window.enforcePolygonBounds(
            e.target, 
            AppState.wallCorners, 
            0, 
            0, 
            AppState.logicalWidth, 
            AppState.logicalHeight
        );
        renderWallPoly();
    }
});

document.getElementById('btn-set-scale').addEventListener('click', () => {
    const inchesW = parseFloat(document.getElementById('input-wall-w').value);
    const inchesH = parseFloat(document.getElementById('input-wall-h').value);
    
    if (!inchesW || !inchesH || inchesW < 1 || inchesH < 1) {
        return alert("Please enter valid positive dimensions (1 inch or greater).");
    }
    
    AppState.pixelsPerInch = 15; 
    const absolutePoints = AppState.wallCorners.map(c => ({ x: c.left, y: c.top }));

    const xs = absolutePoints.map(p => p.x);
    const ys = absolutePoints.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    
    const cropW = maxX - minX;
    const cropH = maxY - minY;
    const centerX = minX + (cropW / 2);
    const centerY = minY + (cropH / 2);

    const maxAllowedW = Math.min(centerX, AppState.rawWallImg.width - centerX) * 2;
    const maxAllowedH = Math.min(centerY, AppState.rawWallImg.height - centerY) * 2;
    const maxScaleX = maxAllowedW / cropW;
    const maxScaleY = maxAllowedH / cropH;

    const virtualWallPolygonScale = 2;
    const appliedScale = Math.min(virtualWallPolygonScale, maxScaleX, maxScaleY);

    const coreW = Math.round(inchesW * AppState.pixelsPerInch);
    const coreH = Math.round(inchesH * AppState.pixelsPerInch);
    
    const expW = Math.round(coreW * appliedScale);
    const expH = Math.round(coreH * appliedScale);
    const offsetX = (expW - coreW) / 2;
    const offsetY = (expH - coreH) / 2;

    AppState.coreWallBounds = {
        left: offsetX,
        top: offsetY,
        right: offsetX + coreW,
        bottom: offsetY + coreH
    };

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = AppState.rawWallImg.width;
    tempCanvas.height = AppState.rawWallImg.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(AppState.rawWallImg.getElement(), 0, 0);
    const srcData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const src8 = srcData.data;
    const srcW = tempCanvas.width;
    const srcH = tempCanvas.height;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = expW;
    finalCanvas.height = expH;
    const finalCtx = finalCanvas.getContext('2d');
    const dstData = finalCtx.createImageData(expW, expH);
    const dst8 = dstData.data;

    const H = calculateHomography(absolutePoints);

    let dstIdx = 0;
    for (let y = 0; y < expH; y++) {
        for (let x = 0; x < expW; x++) {
            
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
                const multiplier = isOutside ? 0.35 : 1.0;

                dst8[dstIdx] = src8[srcIdx] * multiplier;
                dst8[dstIdx+1] = src8[srcIdx+1] * multiplier;
                dst8[dstIdx+2] = src8[srcIdx+2] * multiplier;
                dst8[dstIdx+3] = src8[srcIdx+3]; 
            } else {
                dst8[dstIdx] = 17; dst8[dstIdx+1] = 17; dst8[dstIdx+2] = 17; dst8[dstIdx+3] = 255;
            }
            dstIdx += 4;
        }
    }
    finalCtx.putImageData(dstData, 0, 0);

    fabric.Image.fromURL(finalCanvas.toDataURL('image/png'), (img) => {
        AppState.logicalWidth = expW;
        AppState.logicalHeight = expH;
        
        canvas.clear(); 
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        window.resizeCanvas();
        
        document.getElementById('btn-art').disabled = false;
        document.getElementById('btn-wall').textContent = "Change Wall";
        
        document.getElementById('ruler-h').style.display = 'flex';
        document.getElementById('ruler-v').style.display = 'flex';
        
        if (window.drawRulers) window.drawRulers();
        
        AppState.mode = 'IDLE';
        uiWallScale.style.display = 'none';
        uiDefault.style.display = 'flex';
    });
});

document.getElementById('btn-cancel-wall').addEventListener('click', () => {
    canvas.clear();
    AppState.mode = 'IDLE';
    uiWallScale.style.display = 'none';
    uiDefault.style.display = 'flex';
});