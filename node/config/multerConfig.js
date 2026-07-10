const path = require('path');
const multer = require('multer');

// Image upload config (for regular artifacts)
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const basename = 'artifact-' + Date.now();
        cb(null, basename + ext);
    }
});

const imageFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    const extOk = allowed.test(ext);

    if (mimeOk && extOk) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpeg, jpg, png, webp, gif) are allowed'));
    }
};

const upload = multer({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// 3D model upload config (for 3D artifacts - .glb files)
const modelStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const basename = '3d-' + Date.now();
        if (file.fieldname === 'image') {
            const ext = path.extname(file.originalname);
            cb(null, basename + ext);
        } else {
            cb(null, basename + '.glb');
        }
    }
});

const modelFilter = (req, file, cb) => {
    if (file.fieldname === 'image') {
        const allowed = /jpeg|jpg|png|webp|gif/;
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        const mimeOk = allowed.test(file.mimetype.split('/')[1]);
        const extOk = allowed.test(ext);
        if (mimeOk && extOk) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (jpeg, jpg, png, webp, gif) are allowed for the image field'));
        }
    } else {
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        const mimeOk = file.mimetype === 'model/gltf-binary' || file.mimetype === 'application/octet-stream';
        const extOk = /glb/.test(ext);
        if (extOk || mimeOk) {
            cb(null, true);
        } else {
            cb(new Error('Only .glb files are allowed for the model field'));
        }
    }
};

const modelUpload = multer({
    storage: modelStorage,
    fileFilter: modelFilter,
    limits: { fileSize: 100 * 1024 * 1024 }
});

module.exports = { upload, modelUpload };
