sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/core/UIComponent',
    'geosort/util/DatabaseHelper',
    'geosort/util/NotificationHelper'
], function(Controller, UIComponent, DatabaseHelper, NotificationHelper) {
	'use strict';

    return Controller.extend('geosort.controller.Login', {
        
        i18n: null,
        router: null,

        onInit: function () {
            this.router = UIComponent.getRouterFor(this)
            this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle()
        },

        onSignIn: async function (evt) {
            const { remote } = nodeRequire('electron')
            const auth = remote.require('../modules/auth.js')

            sap.ui.core.BusyIndicator.show(0)
            try {
                const response = await auth.signInUser()
                let user = await DatabaseHelper.getUser(response.data.user)
                user = user.data()

                const appModel = this.getOwnerComponent().getModel('app')
                appModel.setProperty('/user', user)
                appModel.setProperty('/user/id', response.data.user.permissionId)
                appModel.setProperty('/isLoggedIn', true)

                this.router.navTo('projects')   
            } catch (error) {
                NotificationHelper.error(this.i18n.getText('MSG_LOGIN_ERROR'))
            }
            sap.ui.core.BusyIndicator.hide()
        }

	})
})