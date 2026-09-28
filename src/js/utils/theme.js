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
        if (obj.isCorner) obj.set({ stroke: primary }); // Updated to catch shared 'isCorner' prop
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
        if (obj.isCorner) obj.set('stroke', success); // Updated to catch shared 'isCorner' prop
    });
    artCanvas.requestRenderAll();
    
    if (window.drawRulers) window.drawRulers();
};