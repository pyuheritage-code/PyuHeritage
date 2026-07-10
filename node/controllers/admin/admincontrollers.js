const artifactsModel = require('../../models/admin/artifactsModel');
const threeDArtifactsModel = require('../../models/admin/threeDArtifactsModel');

const dashboard = (req, res) => {
    artifactsModel.getAllArtifacts((err, artifacts) => {
        if (err) {
            console.error('Error fetching artifacts:', err);
            artifacts = [];
        }
        artifactsModel.countArtifacts((err2, countResult) => {
            if (err2) {
                console.error('Error counting artifacts:', err2);
            }
            const artifactCount = countResult && countResult[0] ? countResult[0].count : 0;

            threeDArtifactsModel.getAll((err3, threeDArtifacts) => {
                if (err3) {
                    console.error('Error fetching 3D artifacts:', err3);
                    threeDArtifacts = [];
                }
                threeDArtifactsModel.count((err4, countResult3d) => {
                    if (err4) {
                        console.error('Error counting 3D artifacts:', err4);
                    }
                    const threeDArtifactCount = countResult3d && countResult3d[0] ? countResult3d[0].count : 0;
                    res.render('admin/dashboard', {
                        artifacts: artifacts || [],
                        artifactCount,
                        threeDArtifacts: threeDArtifacts || [],
                        threeDArtifactCount
                    });
                });
            });
        });
    });
}


module.exports = {
    dashboard,
}
