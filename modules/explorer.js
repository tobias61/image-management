const { dialog } = require('electron');

exports.pickDirectory = () => {
    return new Promise((resolve, reject) => {
        dialog.showOpenDialog({
            properties: ["openDirectory"]
        }, (fileNames) => {
            if (fileNames === undefined) return reject(fileNames)
            return resolve(fileNames)
        });
    })
}