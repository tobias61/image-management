const os = require('os')

const config = {
    GOOGLE: {
        SCOPE: 'https://www.googleapis.com/auth/drive',
        TOKEN_PATH: os.homedir() + '/.bd_img_mng_credentials.json'
    }
}

module.exports = config