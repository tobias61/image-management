const { dialog } = require('electron');
const fs = require('fs')
const exif = require('exif-parser')

exports.getFileMetadata = (path) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (error, data) => {
            if (error) reject(error)

            try {
                const parser = exif.create(data)
                const metadata = parser.parse()
                resolve(metadata)
            } catch (error) {
                reject(error)
            }
        })
    })
}

exports.pickDirectory = () => {
    return new Promise((resolve, reject) => {
        dialog.showOpenDialog({
            properties: ['openDirectory']
        }, (fileNames) => {
            if (fileNames === undefined) return reject(fileNames)
            return resolve(fileNames)
        });
    })
}

exports.pickFile = () => {
    return new Promise((resolve, reject) => {
        dialog.showOpenDialog({
            filters: [{ name: 'Images', extensions: ['jpg', 'png'] }],
            properties: ['openFile']
        }, (fileNames) => {
            if (fileNames === undefined) return reject(fileNames)
            resolve(fileNames)
        })
    })
}