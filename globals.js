const container = document.getElementById('canvas-container');
const canvas = new fabric.Canvas('wall-canvas', { 
    selection: true, 
    fireRightClick: true, 
    stopContextMenu: true 
});
const tray = document.getElementById('tray');

const artCanvasContainer = document.getElementById('art-canvas-container');
const artCanvas = new fabric.Canvas('art-canvas', { selection: false });

const wallScaleCanvasContainer = document.getElementById('wall-scale-canvas-container');
const wallScaleCanvas = new fabric.Canvas('wall-scale-canvas', { selection: false });

const uiDefault = document.getElementById('default-controls');
const artModal = document.getElementById('art-modal');
const wallModal = document.getElementById('wall-modal');

const AppState = {
    logicalWidth: 1000, 
    logicalHeight: 800,
    pixelsPerInch: null,
    mode: 'IDLE', 

    rawWallImg: null,
    wallMaskImage: null,
    wallPoly: null,
    wallCorners: [],
    coreWallBounds: null, 

    artMaskImage: null,
    currentArtShape: 'rect', 
    artPoly: null,
    artOvalStrokeBg: null,
    artOvalFill: null, 
    artCorners: []
};

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

// Math helper to determine if a set of points forms a strictly convex polygon
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
    // If all cross products have the same sign (and non-zero), the polygon is strictly convex
    return pos === 4 || neg === 4; 
}

window.enforcePolygonBounds = function(target, corners, minBoundX, minBoundY, maxBoundX, maxBoundY) {
    // Initialize last known good state
    if (target._lastValidX === undefined) {
        target._lastValidX = target.left;
        target._lastValidY = target.top;
    }

    const idx = target.customIndex;
    let minX = minBoundX;
    let maxX = maxBoundX;
    let minY = minBoundY;
    let maxY = maxBoundY;

    // Fast boundary clamping (Prevent edge crossovers)
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
    
    // Strict Concavity Check: Form test polygon with the proposed move
    const testPts = corners.map(c => {
        if (c === target) return { x: newX, y: newY };
        return { x: c.left, y: c.top };
    });

    if (isConvex(testPts)) {
        // Valid move
        target.left = newX;
        target.top = newY;
        target._lastValidX = newX;
        target._lastValidY = newY;
    } else {
        // Block the move: revert to the last safely established convex coordinate
        target.left = target._lastValidX;
        target.top = target._lastValidY;
    }
    
    target.setCoords();
};