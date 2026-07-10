const artifactsModel = require('../../models/admin/artifactsModel');

const artifacts = (req, res) => {
    artifactsModel.getAllArtifacts((err, results) => {
        if (err) {
            console.error('Error fetching artifacts:', err);
            results = [];
        }
        res.render('site/artifacts', { artifacts: results || [] });
    });
};

module.exports = {
    artifacts,
};
