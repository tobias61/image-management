const fs = require('fs')
const { google } = require('googleapis')
const { BrowserWindow } = require('electron')
const { parse } = require('url')

const config = require('../config')
const drive = require('./drive')

const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE.CLIENT_ID,
    config.GOOGLE.CLIENT_SECRET,
    config.GOOGLE.REDIRECT_URI
)

exports.getAuthClient = () => {
    return oauth2Client
}

exports.loginUser = () => {
    return new Promise(async (resolve, reject) => {
        fs.readFile(config.GOOGLE.TOKEN_PATH, async (error, token) => {
            if (error) return reject(error)
            /* TODO: Implement functionality when refresh token is missing*/

            else {
                oauth2Client.setCredentials(JSON.parse(token));

                const user = await drive.getUserInfo()
                resolve(user)
            }
        })
    })
}

exports.logoutUser = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await oauth2Client.getAccessToken()
            const revoke = await oauth2Client.revokeToken(response.token)

            fs.unlink(config.GOOGLE.TOKEN_PATH, (error) => {
                if (error) reject(error)
                resolve(revoke)
            })
        } catch (error) {
            reject(error)
        }
    })
}

exports.signInUser = () => {
    return new Promise(async (resolve, reject) => {
        let code;
        try {
            code = await signInWithPopup()

            const { tokens } = await oauth2Client.getToken(code)
            /* TODO: Implement functionality when refresh token is missing*/
            oauth2Client.setCredentials(tokens)

            fs.writeFile(config.GOOGLE.TOKEN_PATH, JSON.stringify(tokens), async (error) => {
                if (error) reject(error)
                
                const user = await drive.getUserInfo()
                resolve(user)
            })
        } catch (error) {
            return reject(error)
        }
    })
}

signInWithPopup = () => {
    return new Promise((resolve, reject) => {
        const authWindow = new BrowserWindow({
            width: 500,
            height: 600,
            show: true,
        })

        authWindow.setMenu(null);

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: config.GOOGLE.SCOPE
        })

        function handleNavigation(url) {
            const query = parse(url, true).query
            if (query) {
                if (query.error) {
                    reject(query.error)
                } else if (query.code) {
                    authWindow.removeAllListeners('closed')
                    setImmediate(() => authWindow.close())

                    resolve(query.code)
                }
            }
        }

        authWindow.on('closed', () => {
            throw new Error()
        })

        authWindow.webContents.on('will-navigate', (event, url) => {
            handleNavigation(url)
        })

        authWindow.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => {
            handleNavigation(newUrl)
        })

        authWindow.loadURL(authUrl)
    })
}