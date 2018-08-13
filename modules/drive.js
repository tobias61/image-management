const fs = require('fs')
const { google } = require('googleapis')

const auth = require('./auth')

const drive = google.drive({
    version: 'v3'
})

exports.deleteImage = (image) => {
    const oauth2Client = auth.getAuthClient()

    return drive.files.delete({
        auth: oauth2Client,
        fileId: image.id
    })
}

exports.downloadImage = (image) => {
    return new Promise(async (resolve, reject) => {
        const oauth2Client = auth.getAuthClient()

        try {
            if (!fs.existsSync(image.directory)){
                fs.mkdirSync(image.directory);
            }

            const response = await drive.files.get({
                fileId: image.id,
                alt: 'media',
                auth: oauth2Client
            }, {
                responseType: 'stream'
            })
            /** TODO: Implement write stream into date folder */
            const writeStream = response.data.pipe(fs.createWriteStream(`${image.directory}/${image.name}`))

            writeStream.on('finish', () => {
                resolve(image)
            })
        } catch (error) {
            reject(error)
        }
    })
}

exports.getFolder = (folderName) => {
    const oauth2Client = auth.getAuthClient()

    return drive.files.list({
        auth: oauth2Client,
        q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder'`
    })
}

exports.getImages = (folderId) => {
    const oauth2Client = auth.getAuthClient()

    return drive.files.list({
        auth: oauth2Client,
        q: `'${folderId}' in parents and mimeType contains 'image'`,
        fields: 'files/id,files/name,files/imageMediaMetadata'
    })
}

exports.getUserInfo = () => {
    const oauth2Client = auth.getAuthClient()
    
    return drive.about.get({
        auth: oauth2Client,
        fields: 'user'
    })
}