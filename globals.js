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
    savedWallPolygon: null,
    savedWallDimensions: null,
    isRedefiningWall: false,

    trayItems: {},
    editingTrayId: null,
    workingArtSrc: null,
    draggingTrayId: null,

    artMaskImage: null,
    currentArtShape: 'rect', 
    artPoly: null,
    artOvalStrokeBg: null,
    artOvalFill: null, 
    artCorners: [],
    
    mousePos: null,
    dragBounds: null,
    dragPreviewObj: null,
    isLoadingPreview: false,
    zoomMultiplier: 1.0 // 1.0 means "Fit to screen"
};