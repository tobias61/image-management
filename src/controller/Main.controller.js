sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/core/UIComponent',
    'geosort/util/DatabaseHelper'
], function(Controller, UIComponent, DatabaseHelper) {
	'use strict';

	return Controller.extend('geosort.controller.Main', {

        errorCodes: null,
        i18n: null,
        router: null,
        toolPage: null,

        onInit: function () {
            this.router = UIComponent.getRouterFor(this)
            this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle()
            this.toolPage = this.getView().byId('toolPage')

            this.onLoginUser()
        },

        onLoginUser: async function () {
            const { remote } = nodeRequire('electron')
            const auth = remote.require('./modules/auth.js')

            sap.ui.core.BusyIndicator.show(0)
            try {
                const response = await auth.loginUser()
                let user = await DatabaseHelper.getUser(response.data.user)
                user = user.data()

                const appModel = this.getOwnerComponent().getModel('app')
                appModel.setProperty('/user', user)
                appModel.setProperty('/user/id', response.data.user.permissionId)
                appModel.setProperty('/isLoggedIn', true)

                this.router.navTo('home')
            } catch (error) {
                this.router.navTo('login')
            }
            sap.ui.core.BusyIndicator.hide()
        },

        onNavigationItemPressed: function (evt) {
            const item = evt.getParameter('item')
            const routeName = item.getKey()
            this.router.navTo(routeName)
        },
        
        onToggleSideContent: function () {
            this.toolPage.setSideExpanded(!this.toolPage.getSideExpanded())
        },

        onUserPress: function (evt) {
            if (this.userPopover && this.userPopover.isOpen() === true) return this.userPopover.close()
            if (!this.userPopover) {
                this.userPopover = sap.ui.xmlfragment('geosort.view.UserPopover', this)
                this.getView().addDependent(this.userPopover)
            }

            this.userPopover.openBy(evt.getSource())
        },

        onLogout: async function (evt) {
            const { remote } = nodeRequire('electron')
            const auth = remote.require('./modules/auth.js')

            try {
                await auth.logoutUser()

                const appModel = this.getOwnerComponent().getModel('app')
                appModel.setProperty('/user', null)
                appModel.setProperty('/isLoggedIn', false)

                this.router.navTo('login')
            } catch (error) {
                // NotificationHelper.toast(this.i18n.getText())
            }
        },

        onQuitApp: function (evt) {
            const { remote } = nodeRequire('electron')
            const main = remote.require('./main.js')

            main.quitApp()
        } 

	});
});