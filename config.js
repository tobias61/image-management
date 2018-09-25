const os = require('os')

const config = {
    GOOGLE: {
        API_KEY: 'AIzaSyCqS9zoZyse0ecZFFevOH9ZtOSkr1lWijw',
        CLIENT_ID: '45739233279-ddlcosq6rj598ctn87dq20kno3a5q73l.apps.googleusercontent.com',
        CLIENT_SECRET: 'SZpYqVlyaQ76F3gEKYSS30HV',
        REDIRECT_URI: 'https://baudirekt-image-management.firebaseapp.com/__/auth/handler',
        SCOPE: 'https://www.googleapis.com/auth/drive',
        TOKEN_PATH: os.homedir() + '/.bd_img_mng_credentials.json'
    }
}

module.exports = config