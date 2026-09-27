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

window.rotateImageElement = function(imgSource, callback) {
    const sourceW = imgSource.naturalWidth || imgSource.width;
    const sourceH = imgSource.naturalHeight || imgSource.height;
    
    const c = document.createElement('canvas');
    c.width = sourceH;
    c.height = sourceW;
    const ctx = c.getContext('2d');
    ctx.translate(c.width/2, c.height/2);
    ctx.rotate(90 * Math.PI/180);
    ctx.drawImage(imgSource, -sourceW/2, -sourceH/2);
    
    window.exportToWebP(c, callback);
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