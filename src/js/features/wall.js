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
    window.loadFabricImageFromFile(e.target.files[0], (img) => {
        AppState.isRedefiningWall = false;
        AppState.rawWallImg = img;
        openWallModalWithImage(img);
    });
    e.target.value = '';
});

document.getElementById('btn-rotate-wall').addEventListener('click', () => {
    window.handleEditorRotation({
        rawImg: AppState.rawWallImg,
        maskImg: AppState.wallMaskImage,
        corners: AppState.wallCorners,
        canvas: wallScaleCanvas,
        canvasContainer: wallScaleCanvasContainer,
        modalContent: document.querySelector('#wall-modal .modal-content'),
        wInputId: 'input-wall-w',
        hInputId: 'input-wall-h',
        onComplete: (webpUrl, newRawImg, newMaskImg, forcedPolygon) => {
            AppState.rawWallImg = newRawImg;
            AppState.wallMaskImage = newMaskImg;
            AppState.wallPoly = null;
            AppState.wallCorners = [];
            startWallPerspectiveMode(false, forcedPolygon);
        }
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

function startWallPerspectiveMode(ignoreSavedPolygon = false, forcedPolygon = null) {
    AppState.mode = 'WALL_SCALE';

    AppState.wallCorners = window.buildPerspectiveCorners({
        maskImg: AppState.wallMaskImage,
        forcedPolygon: forcedPolygon,
        isEditing: AppState.isRedefiningWall,
        savedPolygon: AppState.savedWallPolygon,
        ignoreSavedPolygon: ignoreSavedPolygon,
        color: window.getThemeColor('primary'),
        canvas: wallScaleCanvas
    });

    if (forcedPolygon && AppState.isRedefiningWall) {
        AppState.savedWallPolygon = forcedPolygon; 
    }

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

// Ensure explicit background re-render during drag
wallScaleCanvas.on('object:moving', (e) => {
    if (AppState.mode === 'WALL_SCALE' && e.target && e.target.isCorner) {
        window.enforcePolygonBoundsWithinMask(e.target, AppState.wallCorners, AppState.wallMaskImage);
        renderWallPoly();
        wallScaleCanvas.requestRenderAll();
    }
});

document.getElementById('btn-set-scale').addEventListener('click', () => {
    const inchesW = parseFloat(document.getElementById('input-wall-w').value);
    const inchesH = parseFloat(document.getElementById('input-wall-h').value);
    
    if (!inchesW || !inchesH || inchesW < 1 || inchesH < 1) {
        return alert("Please enter valid positive dimensions (1 inch or greater).");
    }
    
    AppState.pixelsPerInch = 15; 
    
    const absolutePoints = window.getRelativePolygon(AppState.wallCorners, AppState.wallMaskImage);
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

    const appliedScale = Math.min(2, maxScaleX, maxScaleY);
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
    tempCanvas.getContext('2d').drawImage(AppState.rawWallImg.getElement(), 0, 0);

    const finalCanvas = window.extractPerspective(tempCanvas, expW, expH, absolutePoints, coreW, coreH, offsetX, offsetY, true);

    window.exportToWebP(finalCanvas, (webpUrl) => {
        fabric.Image.fromURL(webpUrl, (img) => {
            AppState.logicalWidth = expW;
            AppState.logicalHeight = expH;
            
            img.set({ scaleX: expW / img.width, scaleY: expH / img.height, originX: 'left', originY: 'top' });
            
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
    window.closeEditorModal('wall-modal', wallScaleCanvas);
    AppState.wallMaskImage = null;
    AppState.wallPoly = null;
    AppState.wallCorners = [];
    AppState.mode = 'IDLE';
}

document.getElementById('btn-cancel-wall').addEventListener('click', closeWallModal);