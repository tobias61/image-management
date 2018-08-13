sap.ui.define([
    'sap/ui/base/Object',
    'sap/m/MessageToast',
    'sap/m/MessageBox'
], function (BaseObject, MessageToast, MessageBox) {
    'use strict';

    const NotificationManager = BaseObject.extend('geosort.util.NotificationHelper', {});


    NotificationManager.error = message => {
        MessageBox.error(message)
    }

    NotificationManager.information = message => {
        MessageBox.information(message)
    }

    NotificationManager.toast = message => {
        MessageToast.show(message, {
            width: '25em',
            closeOnBrowserNavigation: false
        })
    }

    return NotificationManager;
});
