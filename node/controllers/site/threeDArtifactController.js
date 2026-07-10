const threeDArtifactsModel = require('../../models/admin/threeDArtifactsModel');

const threeDArtifacts = (req, res) => {
    threeDArtifactsModel.getAll((err, results) => {
        if (err) {
            console.error('Error fetching 3D artifacts:', err);
            results = [];
        }
        res.render('site/threeDArtifacts', { artifacts: results || [] });
    });
};

module.exports = {
    threeDArtifacts,
};
