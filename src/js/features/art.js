document.getElementById('btn-art').addEventListener('click', () => document.getElementById('file-art').click());
document.getElementById('file-art').addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
    window.loadFabricImageFromFile(e.target.files[0], (img, webpUrl) => {
        AppState.editingTrayId = null;
        AppState.workingArtSrc = webpUrl;
        artModal.style.display = 'flex';
        AppState.artMaskImage = window.setupModalCanvasImage(
            artCanvas, 
            artCanvasContainer, 
            img, 
            document.querySelector('#art-modal .modal-content'),
            true
        );
        setupArtPerspectiveMode();
        document.getElementById('input-art-w').focus();
    });
    e.target.value = ''; 
});

window.openArtUpdate = function(trayId) {
    const item = AppState.trayItems[trayId];
    AppState.editingTrayId = trayId;
    AppState.workingArtSrc = item.rawImgSrc;
    AppState.currentArtShape = item.shape;
    updateArtShapeUI();

    if (item.shape === 'circle') {
        document.getElementById('input-art-diam').value = item.physicalW;
    } else {
        document.getElementById('input-art-w').value = item.physicalW;
        document.getElementById('input-art-h').value = item.physicalH;
    }

    fabric.Image.fromURL(item.rawImgSrc, (img) => {
        artModal.style.display = 'flex';
        AppState.artMaskImage = window.setupModalCanvasImage(
            artCanvas, 
            artCanvasContainer, 
            img, 
            document.querySelector('#art-modal .modal-content'),
            true
        );
        setupArtPerspectiveMode();
    });
};

document.getElementById('btn-rotate-art').addEventListener('click', () => {
    window.handleEditorRotation({
        rawImg: AppState.workingArtSrc,
        maskImg: AppState.artMaskImage,
        corners: AppState.artCorners,
        canvas: artCanvas,
        canvasContainer: artCanvasContainer,
        modalContent: document.querySelector('#art-modal .modal-content'),
        wInputId: 'input-art-w',
        hInputId: 'input-art-h',
        onComplete: (webpUrl, newRawImg, newMaskImg, forcedPolygon) => {
            AppState.workingArtSrc = webpUrl;
            AppState.artMaskImage = newMaskImg;
            AppState.artPoly = null;
            AppState.artOvalStrokeBg = null;
            AppState.artOvalFill = null;
            AppState.artCorners = [];
            
            const tempId = AppState.editingTrayId;
            AppState.editingTrayId = null; 
            setupArtPerspectiveMode(false, forcedPolygon);
            AppState.editingTrayId = tempId;
        }
    });
});

window.addEventListener('resize', () => {
    const artModalContent = document.querySelector('#art-modal .modal-content');
    if (artModal.style.display === 'flex' && AppState.artMaskImage) {
        window.resizeEditorCanvas(
            artCanvas, 
            artCanvasContainer, 
            AppState.artMaskImage, 
            artModalContent, 
            AppState.artCorners, 
            renderArtPoly
        );
    }
});

function setupArtPerspectiveMode(ignoreSavedPolygon = false, forcedPolygon = null) {
    if (!AppState.editingTrayId && !ignoreSavedPolygon && !forcedPolygon) {
        AppState.currentArtShape = 'rect';
        document.getElementById('input-art-w').value = '';
        document.getElementById('input-art-h').value = '';
        document.getElementById('input-art-diam').value = '';
    }
    updateArtShapeUI();

    const savedP = (AppState.editingTrayId && AppState.trayItems[AppState.editingTrayId]) 
        ? AppState.trayItems[AppState.editingTrayId].polygonP 
        : null;

    AppState.artCorners = window.buildPerspectiveCorners({
        maskImg: AppState.artMaskImage,
        forcedPolygon: forcedPolygon,
        isEditing: !!AppState.editingTrayId,
        savedPolygon: savedP,
        ignoreSavedPolygon: ignoreSavedPolygon,
        color: window.getThemeColor('success'),
        canvas: artCanvas
    });

    if (forcedPolygon && AppState.editingTrayId && AppState.trayItems[AppState.editingTrayId]) {
        AppState.trayItems[AppState.editingTrayId].polygonP = forcedPolygon;
    }

    renderArtPoly(); 
    
    if (window.marchingAntsInterval) clearInterval(window.marchingAntsInterval);
    window.marchingAntsInterval = setInterval(() => {
        if (AppState.currentArtShape !== 'rect' && AppState.artOvalFill) {
            let offset = AppState.artOvalFill.strokeDashOffset || 0;
            AppState.artOvalFill.set('strokeDashOffset', offset - 1);
            artCanvas.requestRenderAll();
        }
    }, 50);
}

function renderArtPoly() {
    if (AppState.artPoly) artCanvas.remove(AppState.artPoly);
    if (AppState.artOvalFill) artCanvas.remove(AppState.artOvalFill);
    if (AppState.artOvalStrokeBg) artCanvas.remove(AppState.artOvalStrokeBg);
    
    const pts = AppState.artCorners.map(c => ({ x: c.left, y: c.top }));
    const successColor = window.getThemeColor('success');
    const successFill = window.getThemeColor('successFill');
    
    if (AppState.currentArtShape === 'rect') {
        AppState.artPoly = new fabric.Polygon(pts, {
            fill: successFill, stroke: successColor, strokeWidth: 3,
            selectable: false, evented: false
        });
        AppState.artPoly.isArtPoly = true;
        artCanvas.add(AppState.artPoly);
        if (AppState.artMaskImage) AppState.artMaskImage.moveTo(0);
        AppState.artPoly.moveTo(1);
    } else {
        AppState.artPoly = new fabric.Polygon(pts, {
            fill: 'transparent', stroke: successColor, strokeWidth: 3,
            selectable: false, evented: false
        });
        AppState.artPoly.isArtPoly = true;
        
        const pathStr = window.getOvalPathString(pts);

        AppState.artOvalStrokeBg = new fabric.Path(pathStr, {
            fill: successFill, stroke: '#ffffff', strokeWidth: 2,
            selectable: false, evented: false
        });
        AppState.artOvalStrokeBg.isArtOvalBg = true;

        AppState.artOvalFill = new fabric.Path(pathStr, {
            fill: 'transparent', stroke: '#000000', strokeWidth: 2,
            strokeDashArray: [6, 6], strokeDashOffset: 0,
            selectable: false, evented: false
        });
        AppState.artOvalFill.isArtOval = true;

        artCanvas.add(AppState.artOvalStrokeBg);
        artCanvas.add(AppState.artOvalFill);
        artCanvas.add(AppState.artPoly);

        if (AppState.artMaskImage) AppState.artMaskImage.moveTo(0);
        AppState.artOvalStrokeBg.moveTo(1);
        AppState.artOvalFill.moveTo(2);
        AppState.artPoly.moveTo(3);
    }
    AppState.artCorners.forEach(c => c.bringToFront());
}

// Ensure explicit background re-render during drag
artCanvas.on('object:moving', (e) => {
    if (e.target && e.target.isCorner) {
        window.enforcePolygonBoundsWithinMask(e.target, AppState.artCorners, AppState.artMaskImage);
        renderArtPoly();
        artCanvas.requestRenderAll();
    }
});

function updateArtShapeUI() {
    document.getElementById('btn-shape-rect').classList.toggle('selected', AppState.currentArtShape === 'rect');
    document.getElementById('btn-shape-oval').classList.toggle('selected', AppState.currentArtShape === 'oval');
    document.getElementById('btn-shape-circle').classList.toggle('selected', AppState.currentArtShape === 'circle');

    if (AppState.currentArtShape === 'circle') {
        document.getElementById('dim-wh').style.display = 'none';
        document.getElementById('dim-diameter').style.display = 'flex';
    } else {
        document.getElementById('dim-wh').style.display = 'flex';
        document.getElementById('dim-diameter').style.display = 'none';
    }

    if (AppState.artCorners.length > 0) renderArtPoly();
}

document.getElementById('btn-shape-rect').addEventListener('click', () => { AppState.currentArtShape = 'rect'; updateArtShapeUI(); });
document.getElementById('btn-shape-oval').addEventListener('click', () => { AppState.currentArtShape = 'oval'; updateArtShapeUI(); });
document.getElementById('btn-shape-circle').addEventListener('click', () => { AppState.currentArtShape = 'circle'; updateArtShapeUI(); });

document.getElementById('btn-save-art').addEventListener('click', () => {
    const shapeToApply = AppState.currentArtShape;
    let physicalW, physicalH;

    if (shapeToApply === 'circle') {
        const diam = parseFloat(document.getElementById('input-art-diam').value);
        if (!diam || diam < 1) return alert("Please enter a physical diameter of 1 or greater.");
        physicalW = diam;
        physicalH = diam;
    } else {
        physicalW = parseFloat(document.getElementById('input-art-w').value);
        physicalH = parseFloat(document.getElementById('input-art-h').value);
        if (!physicalW || !physicalH || physicalW < 1 || physicalH < 1) {
            return alert("Please enter valid physical dimensions (1 inch or greater).");
        }
    }

    const P = window.getRelativePolygon(AppState.artCorners, AppState.artMaskImage);
    const extractPPI = 30;
    const dstW = Math.round(physicalW * extractPPI);
    const dstH = Math.round(physicalH * extractPPI);

    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = AppState.artMaskImage.width;
    rawCanvas.height = AppState.artMaskImage.height;
    rawCanvas.getContext('2d').drawImage(AppState.artMaskImage.getElement(), 0, 0);

    const flatCanvas = window.extractPerspective(rawCanvas, dstW, dstH, P, dstW, dstH, 0, 0, false);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = dstW;
    finalCanvas.height = dstH;
    const finalCtx = finalCanvas.getContext('2d');

    finalCtx.beginPath();
    if (shapeToApply === 'rect') {
        finalCtx.rect(0, 0, dstW, dstH);
    } else { 
        finalCtx.ellipse(dstW/2, dstH/2, dstW/2, dstH/2, 0, 0, 2*Math.PI);
    }
    finalCtx.closePath();
    finalCtx.clip();
    finalCtx.drawImage(flatCanvas, 0, 0);
    
    window.exportToWebP(finalCanvas, (finalDataUrl) => {
        const trayId = AppState.editingTrayId || 'tray_' + Date.now();
        const rawSrc = AppState.workingArtSrc;

        AppState.trayItems[trayId] = {
            id: trayId,
            rawImgSrc: rawSrc,
            shape: shapeToApply,
            physicalW: physicalW,
            physicalH: physicalH,
            polygonP: P,
            finalDataUrl: finalDataUrl
        };

        if (AppState.editingTrayId) {
            const imgEl = document.getElementById('tray').querySelector(`img[data-id="${trayId}"]`);
            if (imgEl) imgEl.src = finalDataUrl;
            
            canvas.getObjects().forEach(obj => {
                if (obj.customData && obj.customData.trayId === trayId) {
                    obj.setSrc(finalDataUrl, () => {
                        const targetPixelWidth = physicalW * AppState.pixelsPerInch;
                        const targetPixelHeight = physicalH * AppState.pixelsPerInch;
                        obj.set({
                            scaleX: targetPixelWidth / obj.width,
                            scaleY: targetPixelHeight / obj.height,
                            customData: { shape: shapeToApply, trayId: trayId }
                        });
                        obj.setCoords();
                        canvas.requestRenderAll();
                    });
                }
            });
        } else {
            window.addToTray(trayId);
        }
        closeArtModal();
    });
});

document.getElementById('btn-cancel-art').addEventListener('click', closeArtModal);

function closeArtModal() {
    window.closeEditorModal('art-modal', artCanvas);
    AppState.artMaskImage = null; 
    AppState.artPoly = null;
    AppState.artOvalStrokeBg = null;
    AppState.artOvalFill = null;
    AppState.artCorners = [];
    AppState.editingTrayId = null;
    AppState.workingArtSrc = null;
    
    document.getElementById('input-art-w').value = '';
    document.getElementById('input-art-h').value = '';
    document.getElementById('input-art-diam').value = '';

    if (window.marchingAntsInterval) {
        clearInterval(window.marchingAntsInterval);
        window.marchingAntsInterval = null;
    }
}