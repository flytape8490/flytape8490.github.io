document.getElementById('btn-art').addEventListener('click', () => document.getElementById('file-art').click());
document.getElementById('file-art').addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
    window.processImageFile(e.target.files[0], (webpUrl) => {
        AppState.editingTrayId = null;
        AppState.workingArtSrc = webpUrl;
        fabric.Image.fromURL(webpUrl, (img) => {
            if (!img || !img.width) return alert("Failed to load image. Please ensure you are using a standard format.");
            artModal.style.display = 'flex';
            AppState.artMaskImage = window.setupModalCanvasImage(
                artCanvas, 
                artCanvasContainer, 
                img, 
                document.querySelector('#art-modal .modal-content')
            );
            setupArtPerspectiveMode();
        });
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
            document.querySelector('#art-modal .modal-content')
        );
        setupArtPerspectiveMode();
    });
};

document.getElementById('btn-rotate-art').addEventListener('click', () => {
    if (!AppState.workingArtSrc) return;
    const img = new Image();
    img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.height;
        c.height = img.width;
        const ctx = c.getContext('2d');
        ctx.translate(c.width/2, c.height/2);
        ctx.rotate(90 * Math.PI/180);
        ctx.drawImage(img, -img.width/2, -img.height/2);
        
        window.exportToWebP(c, (webpUrl) => {
            AppState.workingArtSrc = webpUrl;
            AppState.artCorners.forEach(corner => artCanvas.remove(corner));
            AppState.artCorners = [];
            if (AppState.artPoly) artCanvas.remove(AppState.artPoly);
            if (AppState.artOvalStrokeBg) artCanvas.remove(AppState.artOvalStrokeBg);
            if (AppState.artOvalFill) artCanvas.remove(AppState.artOvalFill);
            if (AppState.artMaskImage) artCanvas.remove(AppState.artMaskImage);

            const tempId = AppState.editingTrayId;
            AppState.editingTrayId = null;

            fabric.Image.fromURL(AppState.workingArtSrc, (fImg) => {
                AppState.artMaskImage = window.setupModalCanvasImage(
                    artCanvas, 
                    artCanvasContainer, 
                    fImg, 
                    document.querySelector('#art-modal .modal-content')
                );
                setupArtPerspectiveMode(true);
                AppState.editingTrayId = tempId;
            });
        });
    };
    img.src = AppState.workingArtSrc;
});

function setupArtPerspectiveMode(ignoreSavedPolygon = false) {
    if (!AppState.editingTrayId && !ignoreSavedPolygon) {
        AppState.currentArtShape = 'rect';
        document.getElementById('input-art-w').value = '';
        document.getElementById('input-art-h').value = '';
        document.getElementById('input-art-diam').value = '';
    }
    updateArtShapeUI();

    const imgL = AppState.artMaskImage.left;
    const imgT = AppState.artMaskImage.top;
    const imgW = AppState.artMaskImage.getScaledWidth();
    const imgH = AppState.artMaskImage.getScaledHeight();

    let points;
    if (AppState.editingTrayId && AppState.trayItems[AppState.editingTrayId] && !ignoreSavedPolygon) {
        points = AppState.trayItems[AppState.editingTrayId].polygonP.map(p => ({
            x: imgL + (p.x * AppState.artMaskImage.scaleX),
            y: imgT + (p.y * AppState.artMaskImage.scaleY)
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

    AppState.artCorners = points.map((p, index) => {
        const circle = new fabric.Circle({
            radius: 12, fill: '#ffffff', stroke: window.getThemeColor('success'), strokeWidth: 4,
            left: p.x, top: p.y, originX: 'center', originY: 'center',
            hasBorders: false, hasControls: false, customIndex: index
        });
        circle.isArtCorner = true;
        circle._lastValidX = p.x;
        circle._lastValidY = p.y;
        artCanvas.add(circle);
        return circle;
    });

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
        
        const p0 = pts[0], p1 = pts[1], p2 = pts[2], p3 = pts[3];
        const m0 = { x: (p0.x+p1.x)/2, y: (p0.y+p1.y)/2 };
        const m1 = { x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2 };
        const m2 = { x: (p2.x+p3.x)/2, y: (p2.y+p3.y)/2 };
        const m3 = { x: (p3.x+p0.x)/2, y: (p3.y+p0.y)/2 };
        const k = 0.27614237491; 

        const cp1 = { x: m0.x + (p1.x-p0.x)*k, y: m0.y + (p1.y-p0.y)*k };
        const cp2 = { x: m1.x + (p1.x-p2.x)*k, y: m1.y + (p1.y-p2.y)*k };
        const cp3 = { x: m1.x + (p2.x-p1.x)*k, y: m1.y + (p2.y-p1.y)*k };
        const cp4 = { x: m2.x + (p2.x-p3.x)*k, y: m2.y + (p2.y-p3.y)*k };
        const cp5 = { x: m2.x + (p3.x-p2.x)*k, y: m2.y + (p3.y-p2.y)*k };
        const cp6 = { x: m3.x + (p3.x-p0.x)*k, y: m3.y + (p3.y-p0.y)*k };
        const cp7 = { x: m3.x + (p0.x-p3.x)*k, y: m3.y + (p0.y-p3.y)*k };
        const cp8 = { x: m0.x + (p0.x-p1.x)*k, y: m0.y + (p0.y-p1.y)*k };

        const pathStr = `M ${m0.x} ${m0.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${m1.x} ${m1.y} C ${cp3.x} ${cp3.y} ${cp4.x} ${cp4.y} ${m2.x} ${m2.y} C ${cp5.x} ${cp5.y} ${cp6.x} ${cp6.y} ${m3.x} ${m3.y} C ${cp7.x} ${cp7.y} ${cp8.x} ${cp8.y} ${m0.x} ${m0.y} Z`;

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

artCanvas.on('object:moving', (e) => {
    if (e.target.type === 'circle' && e.target.customIndex !== undefined) {
        const minBoundX = AppState.artMaskImage.left;
        const minBoundY = AppState.artMaskImage.top;
        const maxBoundX = minBoundX + AppState.artMaskImage.getScaledWidth();
        const maxBoundY = minBoundY + AppState.artMaskImage.getScaledHeight();
        window.enforcePolygonBounds(e.target, AppState.artCorners, minBoundX, minBoundY, maxBoundX, maxBoundY);
        renderArtPoly();
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
    
    const scaleX = AppState.artMaskImage.scaleX;
    const scaleY = AppState.artMaskImage.scaleY;
    const leftOff = AppState.artMaskImage.left;
    const topOff = AppState.artMaskImage.top;

    const P = AppState.artCorners.map(c => ({
        x: (c.left - leftOff) / scaleX,
        y: (c.top - topOff) / scaleY
    }));

    const extractPPI = 30;
    const dstW = Math.round(physicalW * extractPPI);
    const dstH = Math.round(physicalH * extractPPI);

    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = AppState.artMaskImage.width;
    rawCanvas.height = AppState.artMaskImage.height;
    const rawCtx = rawCanvas.getContext('2d');
    rawCtx.drawImage(AppState.artMaskImage.getElement(), 0, 0);

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
    artModal.style.display = 'none';
    artCanvas.clear();
    
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