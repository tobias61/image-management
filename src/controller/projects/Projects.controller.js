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

    return Controller.extend('geosort.controller.projects.Projects', {

        formatter: Formatter,
        i18n: null,
        router: null,

		onInit: async function () {
			this.router = UIComponent.getRouterFor(this)
			this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle()

            this.getView().setModel(DatabaseHelper.getProjects())
            this.getView().setModel(DatabaseHelper.getUsers(), 'users')

			DatabaseHelper.attachProjectsListener(this.getOwnerComponent().getModel('app').getProperty('/user/id'), function (snapshot) {
				this.getView().setBusy(true)

				let projects = {}
				snapshot.forEach(doc => {
					projects[doc.id] = doc.data()
                })

                DatabaseHelper.getProjects().setData(projects)

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

            this.router.getRoute('projects').attachBeforeMatched(this.onBeforeRouteMatched, this)
        },

        onBeforeRouteMatched: function (evt) {
            const query = evt.getParameter('arguments')['?query']

            if (query && query.extend) {
                this.onExpandProject(null, query.extend, true)
            }
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
            DatabaseHelper.getProjects().updateBindings(true)
            this.onExpandProject(null, projectId, true)
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
            DatabaseHelper.getProjects().updateBindings(true)
            this.onExpandProject(null, projectId, true)
			sap.ui.core.BusyIndicator.hide()
        },

        onAddProject: function (evt) {
            this.router.navTo('projectCreate')
        },

        onEditProject: function (evt) {
            const projectId = evt.getSource().getBindingContext().getPath().slice(1)

			this.router.navTo('projectEdit', {
				id: projectId
			})
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

        onExpandProject: function (evt, id, unread) {
            let listItems = this.getView().byId('projectsList').getItems()

            listItems = listItems.filter(listItem => !(listItem instanceof GroupHeaderListItem))

            let listItemsCopy = listItems.filter(listItem => listItem.getContent()[0].getExpanded())
            listItemsCopy.forEach(listItem => {
                const panel = listItem.getContent()[0]

                panel.setExpanded(false)
                if (evt && evt.getSource().getParent().getParent() !== listItem) listItem.setUnread(false)
            })

            if (evt) evt.getSource().getParent().setExpanded(!evt.getSource().getParent().getExpanded())
            else if (id) {
                listItems.forEach(listItem => {
                    if (id === listItem.getBindingContext().getPath().slice(1)) {
                        listItem.getContent()[0].setExpanded(true)

                        if (unread) listItem.setUnread(true)
                    }
                })
            }


        },
        
        onSearchProjects: function (evt) {
            const query = evt.getParameter('query')

            this.getView().byId('projectsList').getBinding('items').filter(new Filter('title', FilterOperator.Contains, query))
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