document.getElementById('btn-wall').addEventListener('click', () => {
    if (AppState.coreWallBounds) {
        document.getElementById('change-wall-modal').style.display = 'flex';
    } else {
        document.getElementById('file-wall').click();
    }
});

document.getElementById('btn-load-new-wall').addEventListener('click', () => {
    document.getElementById('change-wall-modal').style.display = 'none';
    AppState.isRedefiningWall = false;
    AppState.savedWallPolygon = null;
    AppState.savedWallDimensions = null;
    document.getElementById('file-wall').click();
});

document.getElementById('btn-redefine-wall').addEventListener('click', () => {
    document.getElementById('change-wall-modal').style.display = 'none';
    AppState.isRedefiningWall = true;
    openWallModalWithImage(AppState.rawWallImg);
});

document.getElementById('btn-cancel-change-wall').addEventListener('click', () => {
    document.getElementById('change-wall-modal').style.display = 'none';
});

document.getElementById('file-wall').addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
    window.processImageFile(e.target.files[0], (webpUrl) => {
        fabric.Image.fromURL(webpUrl, (img) => {
            if (!img || !img.width) return alert("Failed to load image. Please ensure you are using a standard format.");
            AppState.isRedefiningWall = false;
            AppState.rawWallImg = img;
            openWallModalWithImage(img);
        });
    });
    e.target.value = '';
});

document.getElementById('btn-rotate-wall').addEventListener('click', () => {
    if (!AppState.rawWallImg) return;
    
    window.rotateImageElement(AppState.rawWallImg.getElement(), (webpUrl) => {
        fabric.Image.fromURL(webpUrl, (fImg) => {
            AppState.rawWallImg = fImg;
            
            wallScaleCanvas.clear();
            AppState.wallMaskImage = null;
            AppState.wallPoly = null;
            AppState.wallCorners = [];
            
            AppState.wallMaskImage = window.setupModalCanvasImage(
                wallScaleCanvas, 
                wallScaleCanvasContainer, 
                fImg, 
                document.querySelector('#wall-modal .modal-content'),
                false // Tell utility this is a rotation, preserve modal dimensions
            );
            
            startWallPerspectiveMode(true);
            window.swapDimensions('input-wall-w', 'input-wall-h');
        });
    });
});

window.addEventListener('resize', () => {
    const wallModalContent = document.querySelector('#wall-modal .modal-content');
    if (wallModal.style.display === 'flex' && AppState.wallMaskImage) {
        window.resizeEditorCanvas(
            wallScaleCanvas, 
            wallScaleCanvasContainer, 
            AppState.wallMaskImage, 
            wallModalContent, 
            AppState.wallCorners, 
            renderWallPoly
        );
    }
});

function openWallModalWithImage(img) {
    wallModal.style.display = 'flex';
    
    if (AppState.isRedefiningWall && AppState.savedWallDimensions) {
        document.getElementById('input-wall-w').value = AppState.savedWallDimensions.w;
        document.getElementById('input-wall-h').value = AppState.savedWallDimensions.h;
    } else {
        document.getElementById('input-wall-w').value = '';
        document.getElementById('input-wall-h').value = '';
        document.getElementById('input-wall-w').focus();
    }
    
    fabric.Image.fromURL(img.getElement().src, (modalImg) => {
        AppState.wallMaskImage = window.setupModalCanvasImage(
            wallScaleCanvas, 
            wallScaleCanvasContainer, 
            modalImg, 
            document.querySelector('#wall-modal .modal-content'),
            true
        );
        startWallPerspectiveMode();
    });
}

function startWallPerspectiveMode(ignoreSavedPolygon = false) {
    AppState.mode = 'WALL_SCALE';
    const imgL = AppState.wallMaskImage.left;
    const imgT = AppState.wallMaskImage.top;
    const imgW = AppState.wallMaskImage.getScaledWidth();
    const imgH = AppState.wallMaskImage.getScaledHeight();

    let points;
    if (AppState.isRedefiningWall && AppState.savedWallPolygon && !ignoreSavedPolygon) {
        points = AppState.savedWallPolygon.map(p => ({
            x: imgL + (p.x * AppState.wallMaskImage.scaleX),
            y: imgT + (p.y * AppState.wallMaskImage.scaleY)
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

    AppState.wallCorners = points.map((p, index) => {
        const circle = new fabric.Circle({
            radius: 12, fill: '#ffffff', stroke: window.getThemeColor('primary'), strokeWidth: 4,
            left: p.x, top: p.y, originX: 'center', originY: 'center',
            hasBorders: false, hasControls: false, customIndex: index
        });
        circle.isWallCorner = true;
        circle._lastValidX = p.x;
        circle._lastValidY = p.y;
        wallScaleCanvas.add(circle);
        return circle;
    });
    renderWallPoly(); 
}

function renderWallPoly() {
    if (AppState.wallPoly) wallScaleCanvas.remove(AppState.wallPoly);
    const currentPoints = AppState.wallCorners.map(c => ({ x: c.left, y: c.top }));
    
    AppState.wallPoly = new fabric.Polygon(currentPoints, {
        fill: window.getThemeColor('primaryFill'), 
        stroke: window.getThemeColor('primary'), 
        strokeWidth: 3,
        selectable: false, evented: false, objectCaching: false
    });
    AppState.wallPoly.isWallPoly = true;
    wallScaleCanvas.add(AppState.wallPoly);
    
    if (AppState.wallMaskImage) AppState.wallMaskImage.moveTo(0);
    AppState.wallPoly.moveTo(1);
    AppState.wallCorners.forEach(c => c.bringToFront());
}

wallScaleCanvas.on('object:moving', (e) => {
    if (AppState.mode === 'WALL_SCALE' && e.target.type === 'circle' && e.target.customIndex !== undefined) {
        const minBoundX = AppState.wallMaskImage.left;
        const minBoundY = AppState.wallMaskImage.top;
        const maxBoundX = minBoundX + AppState.wallMaskImage.getScaledWidth();
        const maxBoundY = minBoundY + AppState.wallMaskImage.getScaledHeight();

        window.enforcePolygonBounds(e.target, AppState.wallCorners, minBoundX, minBoundY, maxBoundX, maxBoundY);
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
    
    const scaleX = AppState.wallMaskImage.scaleX;
    const scaleY = AppState.wallMaskImage.scaleY;
    const leftOff = AppState.wallMaskImage.left;
    const topOff = AppState.wallMaskImage.top;

    const absolutePoints = AppState.wallCorners.map(c => ({
        x: (c.left - leftOff) / scaleX,
        y: (c.top - topOff) / scaleY
    }));

    AppState.savedWallPolygon = absolutePoints.map(p => ({ x: p.x, y: p.y }));
    AppState.savedWallDimensions = { w: inchesW, h: inchesH };

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

    const finalCanvas = window.extractPerspective(tempCanvas, expW, expH, absolutePoints, coreW, coreH, offsetX, offsetY, true);

    window.exportToWebP(finalCanvas, (webpUrl) => {
        fabric.Image.fromURL(webpUrl, (img) => {
            AppState.logicalWidth = expW;
            AppState.logicalHeight = expH;
            
            img.set({
                scaleX: expW / img.width,
                scaleY: expH / img.height,
                originX: 'left',
                originY: 'top'
            });
            
            canvas.clear(); 
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            
            document.getElementById('ruler-h').style.display = 'flex';
            document.getElementById('ruler-v').style.display = 'flex';
            document.getElementById('tray').style.display = 'flex';
            document.getElementById('zoom-controls').style.display = 'flex';
            
            window.resizeCanvas();
            
            document.getElementById('btn-art').disabled = false;
            document.getElementById('btn-wall').textContent = "Change Wall";
            
            if (window.drawRulers) window.drawRulers();
            closeWallModal();
        });
    });
});

function closeWallModal() {
    wallModal.style.display = 'none';
    wallScaleCanvas.clear();
    AppState.wallMaskImage = null;
    AppState.wallPoly = null;
    AppState.wallCorners = [];
    AppState.mode = 'IDLE';
}

document.getElementById('btn-cancel-wall').addEventListener('click', closeWallModal);