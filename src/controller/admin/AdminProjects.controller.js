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

	return Controller.extend('geosort.controller.admin.AdminProjects', {

		formatter: Formatter,
		i18n: null,
		router: null,

		onInit: async function () {
			this.router = UIComponent.getRouterFor(this)
			this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle()

            this.getView().setModel(DatabaseHelper.getAdminProjects())
            this.getView().setModel(DatabaseHelper.getUsers(), 'users')

			DatabaseHelper.attachAdminProjectsListener(function (snapshot) {
				this.getView().setBusy(true)

				let projects = {}
				snapshot.forEach(doc => {
					projects[doc.id] = doc.data()
                })

                DatabaseHelper.getAdminProjects().setData(projects)

				this.getView().setBusy(false)
            }.bind(this))
            
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

		onSearchProjects: function (evt) {
			const query = evt.getParameter('query')

            // this.getView().byId('projectsList').getBinding('items').filter(new Filter('title', FilterOperator.Contains, query))
            this.onUsersSelected(undefined, this.getView().byId('userSelection').getSelectedItems(), query)
        },
        
        onUsersSelected: function (evt, selectedItems, query) {
            if (evt) {
                selectedItems = evt.getParameter('selectedItems')
            }

            let userNames = []
            selectedItems.forEach(item => {
                userNames.push(item.getKey())
            })

            const users = this.getView().getModel('users').getProperty('/')
            let filters = []

            for (let user in users) {
                if (userNames.includes(users[user].name)) {
                    filters.push(new Filter('user', FilterOperator.EQ, user))
                }
            }

            if (!query) {
                query = this.getView().byId('searchfield').getValue()
            }

            filters.push(new Filter('title', FilterOperator.Contains, query))
            this.getView().byId('projectsList').getBinding('items').filter(filters)
        },

        onRemoveProject: async function (evt) {
			sap.ui.core.BusyIndicator.show(0)

			if (!this.projectId) this.projectId = evt.getSource().getBindingContext().getPath().slice(1)
				
			if (!this.deleteDialog) {
				this.deleteDialog = sap.ui.xmlfragment('geosort.view.projects.DeleteDialog', this)
				this.getView().addDependent(this.deleteDialog)
			}

			if (this.deleteDialog.isOpen() === false) {
				this.deleteDialog.open()
				return;
			}

			this.deleteDialog.close()

			if (this.projectId) {
				try {
					await DatabaseHelper.removeProject(this.projectId)
					NotificationHelper.toast(this.i18n.getText('MSG_REMOVE_PROJECT_SUCCESS'))
				} catch (error) {
					NotificationHelper.error(this.i18n.getText('MSG_REMOVE_PROJECT_ERROR'))
				}
				this.projectId = null
			}

			sap.ui.core.BusyIndicator.hide()
		},

		onActivateProject: async function (evt) {
			sap.ui.core.BusyIndicator.show(0)

			const projectId = evt.getSource().getBindingContext().getPath().slice(1)
			let project = evt.getSource().getBindingContext().getObject()

			project.finished = null;
			project.status = 0;

			try {
				await DatabaseHelper.updateProject(project, projectId, ['finished', 'status'])
				NotificationHelper.toast(this.i18n.getText('MSG_ACTIVATE_PROJECT_SUCCESS'))
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_UPDATE_PROJECT_ERROR'))
			}
			DatabaseHelper.getAdminProjects().updateBindings(true)
			sap.ui.core.BusyIndicator.hide()
		},

		onFinishProject: async function (evt) {
			sap.ui.core.BusyIndicator.show(0)

			const projectId = evt.getSource().getBindingContext().getPath().slice(1)
			let project = evt.getSource().getBindingContext().getObject()

			project.finished = Date.now()
			project.status = 1

			try {
				await DatabaseHelper.updateProject(project, projectId, ['finished', 'status'])
				NotificationHelper.toast(this.i18n.getText('MSG_FINISH_PROJECT_SUCCESS'))
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_UPDATE_PROJECT_ERROR'))
			}
			DatabaseHelper.getAdminProjects().updateBindings(true)
			sap.ui.core.BusyIndicator.hide()
		},

		onTransferProject: function (evt) {
			if (!this.userSelectDialog) {
				this.userSelectDialog = sap.ui.xmlfragment('geosort.view.admin.UserSelectDialog', this)
				this.getView().addDependent(this.userSelectDialog)
			}

			this.projectId = evt.getSource().getBindingContext().getPath().slice(1)

			this.userSelectDialog.open()
		},

		onUserSelected: async function (evt) {
			sap.ui.core.BusyIndicator.show(0)

			const userId = evt.getParameter('selectedItem').getBindingContext('users').getPath().slice(1)
			const project = this.getView().getModel().getProperty(`/${this.projectId}`)

			project.user = userId
			try {
				await DatabaseHelper.updateProject(project, this.projectId, ['user'])
				NotificationHelper.toast(this.i18n.getText('MSG_UPDATE_PROJECT_SUCCESS'))
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_UPDATE_PROJECT_ERROR'))
			}
			this.projectId = null
			sap.ui.core.BusyIndicator.hide()
		},

		onUserSearch: function (evt) {
			const query = evt.getParameter('value')

			const filter = new Filter('name', FilterOperator.Contains, query)
			evt.getSource().getBinding('items').filter([filter])
		},

		onCloseDialog: function (evt) {
			this.projectId = null

			if (evt.getSource().getBinding('items')) evt.getSource().getBinding('items').filter([])
		},

		onExpandProject: function (evt) {
			evt.getSource().getParent().setExpanded(!evt.getSource().getParent().getExpanded())
		},

		onPanelExpanding: function (evt) {
			if (evt.getParameter('expand')) {
				let listItems = this.getView().byId('projectsList').getItems()

				listItems = listItems.filter(listItem => !(listItem instanceof GroupHeaderListItem))
				listItems = listItems.filter(listItem => listItem.getContent()[0].getExpanded())
				listItems.forEach(listItem => {
					const panel = listItem.getContent()[0]

					if (evt.getSource() !== panel) panel.setExpanded(!panel.getExpanded())
				})
			}
		},

		getGroupHeader: function (group) {
            let groupTitle = (group.key === 0) ? this.i18n.getText('LIST_TITLE_ACTIVE_PROJECTS') : this.i18n.getText('LIST_TITLE_FINISHED_PROJECTS');

            let groupHeader = new GroupHeaderListItem({
                title: groupTitle,
                upperCase: true
            });
            groupHeader.addStyleClass('groupheaderPanelList');

            return groupHeader;
        }

	});
});