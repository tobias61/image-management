jQuery.sap.require("sap.ui.core.format.DateFormat");
sap.ui.define([], function () {
	"use strict";
    return {

        directoryMessageStrip: function (projects) {
            for (let project in projects) {
                if (projects[project].directory === null) return true
            }
            return false
        },
        
        downloadInfoState: function (count, failedCount, matchedCount) {
            if (failedCount > 0) return 'Error'
            else if (matchedCount > 0) return 'Warning'
            else if (count > 0) return 'Success'
            else return 'None'
        },

        projectActivateButton: function (status) {
            return (status === 0) ? false : true;
        },

        projectDates: function (timestamp) {
            if (timestamp) {
                const dateFormat = sap.ui.core.format.DateFormat.getInstance({ style: 'medium' });
                const date = new Date(timestamp);
    
                return dateFormat.format(date);
            }
        },

        projectFinishButton: function (status) {
            return (status === 0) ? true : false;
        },

        projectIcon: function (status) {
            return (status === 0) ? 'sap-icon://open-folder' : 'sap-icon://folder-blank'
        },

        projectStatusText: function (status) {
            const i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle();

            if (status === 0) return i18n.getText('TXT_PROJECT_STATUS_ACTIVE');
            else if (status === 1) return i18n.getText('TXT_PROJECT_STATUS_FINISHED');
        },

        projectStatusColor: function (status) {
            if (status === 0) return 'Success';
            else if (status === 1) return 'Warning';
        },

        projectUser: function (userId, users) {
            const user = this.getView().getModel('users').getProperty(`/${userId}`)

            if (user) return user.name
        },

        saveButton: function (project, address, gps, viewModel) {
            // console.log(project);
            // console.log(address);
            // console.log(gps);
            // console.log(viewModel);

            // if (!project.title && !project.directory) return false;
            return true;
        },

        sortButton: function (projects) {
            for (let project in projects) {
                if (projects[project].status === 0) return true
            }
            return false
        }
	};
});