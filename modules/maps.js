const config = require('../config')
const axios = require('axios')
const moment = require('moment')

const googleMapsClient = require('@google/maps').createClient({
    key: config.GOOGLE.API_KEY,
    Promise: Promise
})

calculateDistance = (lat1, lat2, lng1, lng2) => {
    let radlat1 = Math.PI * lat1 / 180,
        radlat2 = Math.PI * lat2 / 180,
        theta = lng1 - lng2,
        radtheta = Math.PI * theta / 180,
        dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta)

    if (dist > 1) {
        dist = 1
    }

    dist = Math.acos(dist)
    dist = dist * 180 / Math.PI
    dist = dist * 60 * 1.1515
    dist = dist * 1.609344

    return dist
}

exports.geocodeAddress = (addressObj) => {
    const address = `${addressObj.street} ${addressObj.streetNo} ${addressObj.city}`;

    return googleMapsClient.geocode({ address }).asPromise()
}

exports.geocodeGPS = (gpsObj) => {
    return googleMapsClient.reverseGeocode({ latlng: gpsObj }).asPromise()
}

exports.matchImagesToProjects = (images, projects) => {
    let matchedImages = []  

    for (let projectId in projects) {
        images.forEach(image => {
            let project = projects[projectId]
            /** TODO: Check if date format is conistent for all devices (currently works for Apple) */
            
            let date
            if (!moment(image.imageMediaMetadata.time).isValid()) {
                date = moment(image.imageMediaMetadata.time, 'YYYY-MM-DD') /** NOTE: For Apple devices */
            } else {
                date = moment(image.imageMediaMetadata.time)
            }

            if (project.gps && image.imageMediaMetadata.location && calculateDistance(project.gps.lat, image.imageMediaMetadata.location.latitude, project.gps.lng, image.imageMediaMetadata.location.longitude) <= 0.5) {
                if (date.isValid()) matchedImages.push({ id: image.id, name: image.name, directory: (project.directory + '\\' + date.format('DD-MM-YYYY')) })
                else matchedImages.push({ id: image.id, name: image.name, directory: project.directory })
            }
        })
    }

    return matchedImages
}