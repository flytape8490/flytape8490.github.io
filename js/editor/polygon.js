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

window.calculateRotatedPolygon = function(corners, fabricImg) {
    if (!corners || corners.length === 0) return null;
    const scaleX = fabricImg.scaleX || 1;
    const scaleY = fabricImg.scaleY || 1;
    const leftOff = fabricImg.left || 0;
    const topOff = fabricImg.top || 0;
    const imgW = fabricImg.width;
    const imgH = fabricImg.height;
    
    const P = corners.map(c => ({
        x: (c.left - leftOff) / scaleX,
        y: (c.top - topOff) / scaleY
    }));
    
    const P_rot = P.map(p => ({
        x: imgH - p.y,
        y: p.x
    }));
    
    return [ P_rot[3], P_rot[0], P_rot[1], P_rot[2] ];
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
            hasBorders: false, hasControls: false
        });
        
        // Explicitly assign non-standard properties so Fabric doesn't strip them
        circle.customIndex = index;
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

window.getOvalPathString = function(pts) {
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

    return `M ${m0.x} ${m0.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${m1.x} ${m1.y} C ${cp3.x} ${cp3.y} ${cp4.x} ${cp4.y} ${m2.x} ${m2.y} C ${cp5.x} ${cp5.y} ${cp6.x} ${cp6.y} ${m3.x} ${m3.y} C ${cp7.x} ${cp7.y} ${cp8.x} ${cp8.y} ${m0.x} ${m0.y} Z`;
};