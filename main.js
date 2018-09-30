const { app, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')

// require('dotenv').config()

const electron = require('electron')

require('electron-reload')(__dirname, {
    // Note that the path to electron may vary according to the main file
    electron: require(`${__dirname}/node_modules/electron`)
});

let win

function createWindow() {
    win = new BrowserWindow({
        width: 1600,
        height: 1000,
        frame: false,
        show: true,
        center: true,
        darkTheme: true,
        backgroundColor: '#2f3c48'
    })

    win.setMenu(null);

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'src/index.html'),
        protocol: 'file:',
        slashes: true
    }))

    win.once('ready-to-show', () => {
        win.show()
    })

    win.webContents.openDevTools()

    // win.on('closed', () => {
    //     win = null
    // })
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