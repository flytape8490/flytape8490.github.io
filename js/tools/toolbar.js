const ctxMenu = document.getElementById('context-menu');

window.hideContextMenu = function() {
    ctxMenu.style.display = 'none';
};

window.addEventListener('click', () => window.hideContextMenu());

window.showContextMenu = function(e, type, target) {
    e.preventDefault();
    ctxMenu.innerHTML = '';
    
    if (type === 'wall-art') {
        const trayId = target.customData.trayId;
        ctxMenu.innerHTML = `
            <div class="ctx-item" id="ctx-rotate-cw">Rotate 90&deg; CW</div>
            <div class="ctx-item" id="ctx-rotate-ccw">Rotate 90&deg; CCW</div>
            <div class="ctx-item" id="ctx-update">Update Art</div>
            <div class="ctx-item" id="ctx-delete-selected">Delete Selected</div>
            <div class="ctx-item" id="ctx-delete-all">Delete All Instances</div>
        `;
        document.getElementById('ctx-rotate-cw').onclick = () => {
            const active = canvas.getActiveObjects();
            active.forEach(obj => {
                obj.rotate((obj.angle || 0) + 90);
                obj.setCoords();
            });
            canvas.requestRenderAll();
            window.updateAlignToolbar();
            window.hideContextMenu();
        };
        document.getElementById('ctx-rotate-ccw').onclick = () => {
            const active = canvas.getActiveObjects();
            active.forEach(obj => {
                obj.rotate((obj.angle || 0) - 90);
                obj.setCoords();
            });
            canvas.requestRenderAll();
            window.updateAlignToolbar();
            window.hideContextMenu();
        };
        document.getElementById('ctx-update').onclick = () => window.openArtUpdate(trayId);
        document.getElementById('ctx-delete-selected').onclick = () => {
            const active = canvas.getActiveObjects();
            active.forEach(obj => canvas.remove(obj));
            canvas.discardActiveObject();
            window.updateAlignToolbar();
        };
        document.getElementById('ctx-delete-all').onclick = () => window.deleteAllInstances(trayId);
    } else if (type === 'tray-art') {
        const trayId = target.dataset.id;
        ctxMenu.innerHTML = `
            <div class="ctx-item" id="ctx-update">Update Art</div>
            <div class="ctx-item" id="ctx-delete-tray">Delete Art</div>
        `;
        document.getElementById('ctx-update').onclick = () => window.openArtUpdate(trayId);
        document.getElementById('ctx-delete-tray').onclick = () => {
            window.deleteAllInstances(trayId);
            target.remove();
            delete AppState.trayItems[trayId];
            if (Object.keys(AppState.trayItems).length === 0) {
                document.getElementById('tray-empty-text').style.display = 'block';
            }
        };
    }
    
    ctxMenu.style.display = 'block';
    
    const menuWidth = ctxMenu.offsetWidth;
    const menuHeight = ctxMenu.offsetHeight;
    
    let left = e.clientX;
    let top = e.clientY;
    
    if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth;
    }
    if (top + menuHeight > window.innerHeight) {
        top = window.innerHeight - menuHeight;
    }
    
    ctxMenu.style.left = left + 'px';
    ctxMenu.style.top = top + 'px';
};

document.getElementById('tray').addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('tray-item')) {
        window.showContextMenu(e, 'tray-art', e.target);
    }
});

window.deleteAllInstances = function(trayId) {
    const objects = canvas.getObjects();
    objects.forEach(obj => {
        if (obj.customData && obj.customData.trayId === trayId) {
            canvas.remove(obj);
        }
    });
    canvas.discardActiveObject();
    window.updateAlignToolbar();
};

window.updateAlignToolbar = function() {
    const active = canvas.getActiveObjects();
    document.getElementById('align-toolbar').style.display = active.length > 1 ? 'flex' : 'none';
}

canvas.on('selection:created', window.updateAlignToolbar);
canvas.on('selection:updated', window.updateAlignToolbar);
canvas.on('selection:cleared', window.updateAlignToolbar);

function alignObjects(type) {
    const activeSelection = canvas.getActiveObject();
    if (!activeSelection || activeSelection.type !== 'activeSelection') return;
    
    const objects = activeSelection.getObjects();
    const bounds = activeSelection.getBoundingRect();
    
    canvas.discardActiveObject();
    
    objects.forEach(obj => {
        const objBounds = obj.getBoundingRect();
        switch(type) {
            case 'left': obj.set('left', obj.left - (objBounds.left - bounds.left)); break;
            case 'center': obj.set('left', obj.left - (objBounds.left + objBounds.width/2 - (bounds.left + bounds.width/2))); break;
            case 'right': obj.set('left', obj.left - (objBounds.left + objBounds.width - (bounds.left + bounds.width))); break;
            case 'top': obj.set('top', obj.top - (objBounds.top - bounds.top)); break;
            case 'middle': obj.set('top', obj.top - (objBounds.top + objBounds.height/2 - (bounds.top + bounds.height/2))); break;
            case 'bottom': obj.set('top', obj.top - (objBounds.top + objBounds.height - (bounds.top + bounds.height))); break;
        }
        obj.setCoords();
    });
    
    const newSel = new fabric.ActiveSelection(objects, { canvas: canvas });
    canvas.setActiveObject(newSel);
    canvas.requestRenderAll();
}

function distributeObjects(type) {
    const activeSelection = canvas.getActiveObject();
    if (!activeSelection || activeSelection.type !== 'activeSelection') return;
    
    let objects = activeSelection.getObjects();
    const bounds = activeSelection.getBoundingRect();
    
    canvas.discardActiveObject();
    
    if (type === 'h') {
        objects.sort((a, b) => a.getBoundingRect().left - b.getBoundingRect().left);
        const totalWidth = objects.reduce((sum, obj) => sum + obj.getBoundingRect().width, 0);
        const gap = (bounds.width - totalWidth) / (objects.length - 1);
        let currentX = bounds.left;
        objects.forEach(obj => {
            const objBounds = obj.getBoundingRect();
            obj.set('left', obj.left - (objBounds.left - currentX));
            obj.setCoords();
            currentX += objBounds.width + gap;
        });
    } else if (type === 'v') {
        objects.sort((a, b) => a.getBoundingRect().top - b.getBoundingRect().top);
        const totalHeight = objects.reduce((sum, obj) => sum + obj.getBoundingRect().height, 0);
        const gap = (bounds.height - totalHeight) / (objects.length - 1);
        let currentY = bounds.top;
        objects.forEach(obj => {
            const objBounds = obj.getBoundingRect();
            obj.set('top', obj.top - (objBounds.top - currentY));
            obj.setCoords();
            currentY += objBounds.height + gap;
        });
    }
    
    const newSel = new fabric.ActiveSelection(objects, { canvas: canvas });
    canvas.setActiveObject(newSel);
    canvas.requestRenderAll();
}

document.getElementById('btn-align-left').addEventListener('click', () => alignObjects('left'));
document.getElementById('btn-align-center').addEventListener('click', () => alignObjects('center'));
document.getElementById('btn-align-right').addEventListener('click', () => alignObjects('right'));
document.getElementById('btn-align-top').addEventListener('click', () => alignObjects('top'));
document.getElementById('btn-align-middle').addEventListener('click', () => alignObjects('middle'));
document.getElementById('btn-align-bottom').addEventListener('click', () => alignObjects('bottom'));
document.getElementById('btn-distribute-h').addEventListener('click', () => distributeObjects('h'));
document.getElementById('btn-distribute-v').addEventListener('click', () => distributeObjects('v'));