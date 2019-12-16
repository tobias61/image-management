sap.ui.define([
    'sap/ui/core/mvc/Controller',
	'sap/ui/core/UIComponent',
    'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/m/GroupHeaderListItem',
	'geosort/util/DatabaseHelper',
	'geosort/util/Formatter',
	'geosort/util/NotificationHelper'
], function (Controller, UIComponent, Filter, FilterOperator, GroupHeaderListItem, DatabaseHelper, Formatter, NotificationHelper) {
	'use strict';

	return Controller.extend('geosort.controller.admin.AdminUsers', {

		formatter: Formatter,
		i18n: null,
		router: null,

		onInit: async function () {
			this.router = UIComponent.getRouterFor(this)
			this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle()

            this.getView().setModel(DatabaseHelper.getUsers())

            DatabaseHelper.attachUsersListener(function (snapshot) {
				this.getView().setBusy(true)

				let users = {}
				snapshot.forEach(doc => {
					users[doc.id] = doc.data()
				})
				DatabaseHelper.getUsers().setData(users)

                this.getView().setBusy(false)
            }.bind(this))
		},

		onRoleChanged: async function (evt) {
			sap.ui.core.BusyIndicator.show(0)
			const role = evt.getParameter('selectedItem').getKey()
			const userId = evt.getSource().getBindingContext().getPath().slice(1)
			
			try {
				await DatabaseHelper.updateUserRole(userId, role)
				this.getView().getModel().updateBindings(true)
				NotificationHelper.toast(this.i18n.getText('MSG_UPDATE_USER_SUCCESS'))
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_UPDATE_USER_ERROR'))
			}
			sap.ui.core.BusyIndicator.hide()
    },
    
    onRemoveUser: async function (evt) {
			sap.ui.core.BusyIndicator.show(0)

      if (!this.userId) this.userId = this.getOwnerComponent().getModel('app').getProperty('/user/id')
				
			if (!this.deleteDialog) {
				this.deleteDialog = sap.ui.xmlfragment('geosort.view.admin.DeleteUserDialog', this)
				this.getView().addDependent(this.deleteDialog)
			}

			if (this.deleteDialog.isOpen() === false) {
				this.deleteDialog.open()
				return;
			}

			this.deleteDialog.close()

			if (this.userId) {
				try {
					await DatabaseHelper.removeUser(this.userId)
					NotificationHelper.toast(this.i18n.getText('MSG_REMOVE_PROJECT_SUCCESS'))
				} catch (error) {
					NotificationHelper.error(this.i18n.getText('MSG_REMOVE_PROJECT_ERROR'))
				}
				this.userId = null
			}

			sap.ui.core.BusyIndicator.hide()
    },

    onCloseDialog: function (evt) {
      this.userId = null
      evt.getSource().getParent().close()
      sap.ui.core.BusyIndicator.hide()
		},

		onSearchUsers: function (evt) {
			const query = evt.getParameter('query')

            this.getView().byId('usersList').getBinding('items').filter(new Filter('name', FilterOperator.Contains, query))
		},

		getGroupHeader: function (group) {
            let groupTitle = (group.key === 'admin') ? this.i18n.getText('LIST_TITLE_ADMINS') : this.i18n.getText('LIST_TITLE_USERS');

            let groupHeader = new GroupHeaderListItem({
                title: groupTitle,
                upperCase: true
            });
            groupHeader.addStyleClass('groupheaderList');

            return groupHeader;
        }

	});
});