window.getThemeColor = function(type) {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    switch (type) {
        case 'primary': return isLight ? '#48828F' : '#78DCE8';
        case 'primaryFill': return isLight ? 'rgba(72, 130, 143, 0.3)' : 'rgba(120, 220, 232, 0.3)';
        case 'success': return isLight ? '#809664' : '#A9DC76';
        case 'successFill': return isLight ? 'rgba(128, 150, 100, 0.3)' : 'rgba(169, 220, 118, 0.3)';
        default: return '#000';
    }
};

window.updateCanvasColors = function() {
    const primary = window.getThemeColor('primary');
    const primaryFill = window.getThemeColor('primaryFill');
    const success = window.getThemeColor('success');
    const successFill = window.getThemeColor('successFill');

    canvas.getObjects().forEach(obj => {
        if (obj.isGuide) obj.set('stroke', primary);
    });
    canvas.requestRenderAll();
    
    wallScaleCanvas.getObjects().forEach(obj => {
        if (obj.isWallPoly) obj.set({ stroke: primary, fill: primaryFill });
        if (obj.isWallCorner) obj.set({ stroke: primary });
    });
    wallScaleCanvas.requestRenderAll();

    artCanvas.getObjects().forEach(obj => {
        if (obj.isArtPoly) {
            obj.set('stroke', success);
            if (obj.fill !== 'transparent') obj.set('fill', successFill);
        }
        if (obj.isArtOvalBg) {
            obj.set('fill', successFill);
        }
        if (obj.isArtCorner) obj.set('stroke', success);
    });
    artCanvas.requestRenderAll();
    
    if (window.drawRulers) window.drawRulers();
};

window.exportToWebP = function(source, callback) {
    let width = source.naturalWidth || source.width;
    let height = source.naturalHeight || source.height;
    const MAX_SIZE = 4096;

    if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
        } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
        }
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d');
    ctx.drawImage(source, 0, 0, width, height);

    callback(outputCanvas.toDataURL('image/webp', 0.9));
};

window.processImageFile = function(file, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => window.exportToWebP(img, callback);
        img.onerror = () => alert("Failed to load image. Please ensure you are using a standard format like JPG or PNG.");
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

// ==========================================
// DRY PERSPECTIVE EDITOR UTILITIES
// ==========================================

window.rotateImageElement = function(imgSource, callback) {
    const doRotate = (src) => {
        const sourceW = src.naturalWidth || src.width;
        const sourceH = src.naturalHeight || src.height;
        const c = document.createElement('canvas');
        c.width = sourceH;
        c.height = sourceW;
        const ctx = c.getContext('2d');
        ctx.translate(c.width/2, c.height/2);
        ctx.rotate(90 * Math.PI/180);
        ctx.drawImage(src, -sourceW/2, -sourceH/2);
        window.exportToWebP(c, callback);
    };

    if (typeof imgSource === 'string') {
        const img = new Image();
        img.onload = () => doRotate(img);
        img.src = imgSource;
    } else {
        doRotate(imgSource);
    }
};

window.calculateRotatedPolygon = function(corners, fabricImg) {
    if (!corners || corners.length === 0) return null;
    const scaleX = fabricImg.scaleX || 1;
    const scaleY = fabricImg.scaleY || 1;
    const leftOff = fabricImg.left || 0;
    const topOff = fabricImg.top || 0;
    const imgW = fabricImg.width;
    const imgH = fabricImg.height;
    
    // Extract absolute relative points
    const P = corners.map(c => ({
        x: (c.left - leftOff) / scaleX,
        y: (c.top - topOff) / scaleY
    }));
    
    // Rotate coordinates 90 deg CW
    const P_rot = P.map(p => ({
        x: imgH - p.y,
        y: p.x
    }));
    
    // Shift indices to maintain [TL, TR, BR, BL] bounding integrity
    return [ P_rot[3], P_rot[0], P_rot[1], P_rot[2] ];
};

window.handleEditorRotation = function(options) {
    if (!options.rawImg || !options.maskImg) return;
    
    const forcedPolygon = window.calculateRotatedPolygon(options.corners, options.maskImg);
    const rawElement = (options.rawImg instanceof fabric.Image) ? options.rawImg.getElement() : options.rawImg;

    window.rotateImageElement(rawElement, (webpUrl) => {
        options.canvas.clear();
        
        fabric.Image.fromURL(webpUrl, (fImg) => {
            const newMaskImage = window.setupModalCanvasImage(
                options.canvas, 
                options.canvasContainer, 
                fImg, 
                options.modalContent,
                false 
            );
            
            window.swapDimensions(options.wInputId, options.hInputId);
            if (options.onComplete) options.onComplete(webpUrl, fImg, newMaskImage, forcedPolygon);
        });
    });
};

window.swapDimensions = function(wId, hId) {
    const wInput = document.getElementById(wId);
    const hInput = document.getElementById(hId);
    if (wInput && hInput) {
        const temp = wInput.value;
        wInput.value = hInput.value;
        hInput.value = temp;
    }
};

window.buildPerspectiveCorners = function(options) {
    const imgL = options.maskImg.left;
    const imgT = options.maskImg.top;
    const imgW = options.maskImg.getScaledWidth();
    const imgH = options.maskImg.getScaledHeight();

    let points;
    if (options.forcedPolygon) {
        points = options.forcedPolygon.map(p => ({
            x: imgL + (p.x * options.maskImg.scaleX),
            y: imgT + (p.y * options.maskImg.scaleY)
        }));
    } else if (options.isEditing && options.savedPolygon && !options.ignoreSavedPolygon) {
        points = options.savedPolygon.map(p => ({
            x: imgL + (p.x * options.maskImg.scaleX),
            y: imgT + (p.y * options.maskImg.scaleY)
        }));
    } else {
        const padX = imgW * 0.1;
        const padY = imgH * 0.1;
        points = [
            { x: imgL + padX, y: imgT + padY }, 
            { x: imgL + imgW - padX, y: imgT + padY }, 
            { x: imgL + imgW - padX, y: imgT + imgH - padY }, 
            { x: imgL + padX, y: imgT + imgH - padY } 
        ];
    }

    return points.map((p, index) => {
        const circle = new fabric.Circle({
            radius: 12, fill: '#ffffff', stroke: options.color, strokeWidth: 4,
            left: p.x, top: p.y, originX: 'center', originY: 'center',
            hasBorders: false, hasControls: false, customIndex: index
        });
        circle.isCorner = true;
        circle._lastValidX = p.x;
        circle._lastValidY = p.y;
        options.canvas.add(circle);
        return circle;
    });
};

window.getRelativePolygon = function(corners, maskImg) {
    const scaleX = maskImg.scaleX;
    const scaleY = maskImg.scaleY;
    const leftOff = maskImg.left;
    const topOff = maskImg.top;

    return corners.map(c => ({
        x: (c.left - leftOff) / scaleX,
        y: (c.top - topOff) / scaleY
    }));
};

// ==========================================
// RESIZING & BOUNDARY MATH
// ==========================================

window.resizeEditorCanvas = function(fabricCanvas, containerEl, fabricImg, modalContentEl, corners, renderPolyCallback) {
    if (!fabricImg) return;

    const oldScale = fabricImg.scaleX || 1;
    const oldLeft = fabricImg.left || 0;
    const oldTop = fabricImg.top || 0;

    void modalContentEl.offsetHeight;
    void containerEl.offsetHeight;

    const targetW = containerEl.clientWidth;
    const targetH = containerEl.clientHeight;

    fabricCanvas.setWidth(targetW);
    fabricCanvas.setHeight(targetH);
    
    const newScale = Math.min(
        (targetW * 0.95) / (fabricImg.width), 
        (targetH * 0.95) / (fabricImg.height)
    );
    
    const newLeft = (targetW - (fabricImg.width * newScale)) / 2;
    const newTop = (targetH - (fabricImg.height * newScale)) / 2;
    
    fabricImg.set({ 
        scaleX: newScale, scaleY: newScale, 
        left: newLeft, top: newTop 
    });
    fabricImg.setCoords();

    if (corners && corners.length > 0) {
        corners.forEach(c => {
            const relX = (c.left - oldLeft) / oldScale;
            const relY = (c.top - oldTop) / oldScale;
            c.set({
                left: (relX * newScale) + newLeft,
                top: (relY * newScale) + newTop
            });
            c.setCoords();
            c._lastValidX = c.left;
            c._lastValidY = c.top;
        });
        if (renderPolyCallback) renderPolyCallback();
    }
    
    fabricCanvas.requestRenderAll();
};

window.setupModalCanvasImage = function(fabricCanvas, containerEl, fabricImg, modalContentEl, isInitialLoad = true) {
    if (isInitialLoad) {
        const imgRatio = fabricImg.width / fabricImg.height;
        
        if (fabricImg.width > fabricImg.height) {
            modalContentEl.classList.add('landscape');
            modalContentEl.classList.remove('portrait');
        } else {
            modalContentEl.classList.add('portrait');
            modalContentEl.classList.remove('landscape');
        }

        containerEl.style.aspectRatio = imgRatio;
    }

    fabricImg.set({ selectable: false });
    fabricCanvas.add(fabricImg);

    window.resizeEditorCanvas(fabricCanvas, containerEl, fabricImg, modalContentEl, [], null);
    return fabricImg;
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

function isConvex(pts) {
    function crossProduct(a, b, c) {
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    }
    let pos = 0, neg = 0;
    for (let i = 0; i < 4; i++) {
        const cp = crossProduct(pts[i], pts[(i + 1) % 4], pts[(i + 2) % 4]);
        if (cp > 0) pos++;
        if (cp < 0) neg++;
    }
    return pos === 4 || neg === 4; 
}

window.enforcePolygonBoundsWithinMask = function(target, corners, maskImage) {
    const minBoundX = maskImage.left;
    const minBoundY = maskImage.top;
    const maxBoundX = minBoundX + maskImage.getScaledWidth();
    const maxBoundY = minBoundY + maskImage.getScaledHeight();
    window.enforcePolygonBounds(target, corners, minBoundX, minBoundY, maxBoundX, maxBoundY);
};

window.enforcePolygonBounds = function(target, corners, minBoundX, minBoundY, maxBoundX, maxBoundY) {
    if (target._lastValidX === undefined) {
        target._lastValidX = target.left;
        target._lastValidY = target.top;
    }

    const idx = target.customIndex;
    let minX = minBoundX;
    let maxX = maxBoundX;
    let minY = minBoundY;
    let maxY = maxBoundY;

    if (idx === 0 || idx === 3) {
        maxX = Math.min(corners[1].left, corners[2].left) - 1;
    } else {
        minX = Math.max(corners[0].left, corners[3].left) + 1;
    }

    if (idx === 0 || idx === 1) {
        maxY = Math.min(corners[2].top, corners[3].top) - 1;
    } else {
        minY = Math.max(corners[0].top, corners[1].top) + 1;
    }

    minX = Math.max(minX, minBoundX);
    maxX = Math.min(maxX, maxBoundX);
    minY = Math.max(minY, minBoundY);
    maxY = Math.min(maxY, maxBoundY);

    let newX = target.left;
    let newY = target.top;

    if (newX < minX) newX = minX;
    if (newX > maxX) newX = maxX;
    if (newY < minY) newY = minY;
    if (newY > maxY) newY = maxY;
    
    const testPts = corners.map(c => {
        if (c === target) return { x: newX, y: newY };
        return { x: c.left, y: c.top };
    });

    if (isConvex(testPts)) {
        target.left = newX;
        target.top = newY;
        target._lastValidX = newX;
        target._lastValidY = newY;
    } else {
        target.left = target._lastValidX;
        target.top = target._lastValidY;
    }
    
    target.setCoords();
};