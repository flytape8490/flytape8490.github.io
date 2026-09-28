window.exportToWebP = function(source, callback) {
    let width = source.naturalWidth || source.width;
    let height = source.naturalHeight || source.height;
    const MAX_SIZE = 4096;

    if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
        } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
        }
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d');
    ctx.drawImage(source, 0, 0, width, height);

    callback(outputCanvas.toDataURL('image/webp', 0.9));
};

window.processImageFile = function(file, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => window.exportToWebP(img, callback);
        img.onerror = () => alert("Failed to load image. Please ensure you are using a standard format like JPG or PNG.");
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

window.loadFabricImageFromFile = function(file, callback) {
    window.processImageFile(file, (webpUrl) => {
        fabric.Image.fromURL(webpUrl, (img) => {
            if (!img || !img.width) return alert("Failed to load image. Please ensure you are using a standard format.");
            callback(img, webpUrl);
        });
    });
};

window.rotateImageElement = function(imgSource, callback) {
    const doRotate = (src) => {
        const sourceW = src.naturalWidth || src.width;
        const sourceH = src.naturalHeight || src.height;
        const c = document.createElement('canvas');
        c.width = sourceH;
        c.height = sourceW;
        const ctx = c.getContext('2d');
        ctx.translate(c.width/2, c.height/2);
        ctx.rotate(90 * Math.PI/180);
        ctx.drawImage(src, -sourceW/2, -sourceH/2);
        window.exportToWebP(c, callback);
    };

    if (typeof imgSource === 'string') {
        const img = new Image();
        img.onload = () => doRotate(img);
        img.src = imgSource;
    } else {
        doRotate(imgSource);
    }
};