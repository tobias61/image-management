const { app, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')

require('dotenv').config()

let win

function createWindow() {
    win = new BrowserWindow({
        width: 1500,
        height: 1000,
        frame: true
    })

    win.setMenu(null);

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'src/index.html'),
        protocol: 'file:',
        slashes: true
    }))

    win.webContents.openDevTools()

    win.on('closed', () => {
        win = null
    })
}

app.on('ready', createWindow)


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
})

exports.quitApp = () => {
    app.quit()
}