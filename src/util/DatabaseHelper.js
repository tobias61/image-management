sap.ui.define([
    'sap/ui/base/Object',
    'sap/ui/model/json/JSONModel'
], function (BaseObject, JSONModel) {
    'use strict';

    const DatabaseHelper = BaseObject.extend('geosort.util.DatabaseHelper', {});

    /**
     * user related database accesses
     */
    DatabaseHelper.getUser = (driveUser) => {
        return new Promise(async (resolve, reject) => {
            try {
                let user = await db.collection('users').doc(driveUser.permissionId).get()
                if (!user.exists) {
                    user = await DatabaseHelper.storeUser(driveUser)
                    resolve(user)
                } else resolve(user)
            } catch (error) {
                reject(error)
            }
        })
    }

    DatabaseHelper.storeUser = async (driveUser) => {
        const userRef = db.collection('users').doc(driveUser.permissionId)

        await userRef.set({
            email: driveUser.emailAddress,
            name: driveUser.displayName,
            role: 'user'
        })

        return userRef.get()
    }

    /**
     * projects related database accesses
     */
    const emptyProjectTemplate = {
        title: null,
        user: null,
        status: 0,
        created: null,
        finished: null,
        directory: null,
        locationMethod: 0,
        address: null,
        gps: null
    }

    const projectsModel = new JSONModel();
    
    DatabaseHelper.attachProjectsListener = (userId, handler) => {
        db.collection('projects').where('user', '==', userId)
            .onSnapshot(handler)
                // handler(snapshot)
                // let projects = {}
                // snapshot.forEach(doc => {
                //     projects[doc.id] = doc.data()
                // })
                // projectsModel.setData(projects)
            
    }

    DatabaseHelper.getEmptyProject = () => {
        return jQuery.extend(true, {}, emptyProjectTemplate);
    };

    DatabaseHelper.getProjects = () => {
        return projectsModel;
    }

    DatabaseHelper.isProjectValid = (project) => {
        return new Promise(async (resolve, reject) => {
            try {
                const query = await db.collection('projects').where('title', '==', project.title).get()
                if (query.docs.length === 0) resolve(true)
                else resolve(false)
            } catch (error) {
                reject(error)
            } 
        })
    }

    DatabaseHelper.removeProject = (projectId) => {
        return db.collection('projects').doc(projectId).delete()
    }

    DatabaseHelper.saveProject = (project) => {
        return db.collection('projects').add(project)
    }

    DatabaseHelper.updateProject = (project, projectId, properties) => {
        let updateObj = {}
        properties.forEach(property => {
            updateObj[property] = project[property];
        })

        return db.collection('projects').doc(projectId).update(updateObj)
    }

    /**
     * sort settings related database accesses
     */
    const emptySettingsTemplate = {
        googlePhotosFlag: false,
        dirNameDrive: null,
        deleteFlag: false
    }
    
    DatabaseHelper.getEmptySettings = () => {
        return jQuery.extend(true, {}, emptySettingsTemplate)
    }

    DatabaseHelper.saveSortSettings = (user) => {
        return db.collection('users').doc(user.id).update({
            sortSettings: user.sortSettings
        })
    }

    return DatabaseHelper;
});