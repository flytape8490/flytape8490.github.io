window.swapDimensions = function(wId, hId) {
    const wInput = document.getElementById(wId);
    const hInput = document.getElementById(hId);
    if (wInput && hInput) {
        const temp = wInput.value;
        wInput.value = hInput.value;
        hInput.value = temp;
    }
};

window.setupEditorZoomAndPan = function(canvas, controlsConfig, containerId) {
    const containerEl = document.getElementById(containerId);

    if (controlsConfig) {
        const btnIn = document.getElementById(controlsConfig.zoomIn);
        const btnOut = document.getElementById(controlsConfig.zoomOut);
        const btnReset = document.getElementById(controlsConfig.zoomReset);

        const applyButtonZoom = (factor) => {
            let oldZoom = canvas.getZoom();
            let zoom = oldZoom * factor;
            if (zoom > 20) zoom = 20;
            if (zoom < 1) zoom = 1;
            
            canvas.setZoom(zoom);
            if (canvas.baseWidth && canvas.baseHeight) {
                canvas.setWidth(canvas.baseWidth * zoom);
                canvas.setHeight(canvas.baseHeight * zoom);
            }
            
            if (containerEl) {
                const zoomRatio = zoom / oldZoom;
                const centerX = containerEl.clientWidth / 2;
                const centerY = containerEl.clientHeight / 2;
                
                containerEl.scrollLeft = (containerEl.scrollLeft + centerX) * zoomRatio - centerX;
                containerEl.scrollTop = (containerEl.scrollTop + centerY) * zoomRatio - centerY;
            }
        };

        if (btnIn) btnIn.addEventListener('click', () => applyButtonZoom(1.2));
        if (btnOut) btnOut.addEventListener('click', () => applyButtonZoom(1 / 1.2));
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                canvas.setZoom(1);
                if (canvas.baseWidth && canvas.baseHeight) {
                    canvas.setWidth(canvas.baseWidth);
                    canvas.setHeight(canvas.baseHeight);
                }
                if (containerEl) {
                    containerEl.scrollLeft = 0;
                    containerEl.scrollTop = 0;
                }
            });
        }
    }
};

window.resizeEditorCanvas = function(fabricCanvas, containerEl, fabricImg, modalContentEl, corners, renderPolyCallback) {
    if (!fabricImg) return;

    const oldScale = fabricImg.scaleX || 1;
    const oldLeft = fabricImg.left || 0;
    const oldTop = fabricImg.top || 0;

    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    
    // Temporarily suppress overflow to calculate visible client area unencumbered by canvas/scrollbars
    containerEl.style.overflow = 'hidden';
    fabricCanvas.setWidth(0);
    fabricCanvas.setHeight(0);
    
    void modalContentEl.offsetHeight;
    void containerEl.offsetHeight;
    
    const targetW = containerEl.clientWidth;
    const targetH = containerEl.clientHeight;
    
    containerEl.style.overflow = 'auto';
    
    fabricCanvas.baseWidth = targetW;
    fabricCanvas.baseHeight = targetH;
    
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

        // Apply ratio to the scroller wrapper if one exists, decoupling it from the inner canvas
        if (containerEl.parentElement.classList.contains('canvas-scroller-wrapper')) {
            containerEl.parentElement.style.aspectRatio = imgRatio;
        } else {
            containerEl.style.aspectRatio = imgRatio;
        }
    }

    fabricImg.set({ selectable: false });
    fabricCanvas.add(fabricImg);

    window.resizeEditorCanvas(fabricCanvas, containerEl, fabricImg, modalContentEl, [], null);
    return fabricImg;
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

window.closeEditorModal = function(modalId, fabricCanvas) {
    document.getElementById(modalId).style.display = 'none';
    fabricCanvas.clear();
};