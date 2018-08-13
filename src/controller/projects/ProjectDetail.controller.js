sap.ui.define([
	'sap/ui/core/mvc/Controller',
	'sap/ui/core/UIComponent',
	'sap/ui/model/json/JSONModel',
	'geosort/util/DatabaseHelper',
	'geosort/util/Formatter',
	'geosort/util/NotificationHelper'
], function(Controller, UIComponent, JSONModel, DatabaseHelper, Formatter, NotificationHelper) {
	'use strict';

	return Controller.extend('geosort.controller.projects.ProjectDetail', {

		formatter: Formatter,
		i18n: null,
		router: null,

		onInit: function () {
			this.router = UIComponent.getRouterFor(this)
			this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle()

			this.router.getRoute('projectDetail').attachMatched(this.onRouteMatched, this)

			this.getView().setModel(DatabaseHelper.getProjects())
		},

		onRouteMatched: function (evt) {
			const args = evt.getParameter('arguments');

			this.getView().bindElement('/' + args.id);

			if (!this.getView().getModel('viewModel')) {
				this.getView().setModel(new JSONModel(), 'viewModel');
			}

			this.getView().getModel('viewModel').setData({
				displayMode: true
			});
		},

		onActivateProject: async function (evt) {
			sap.ui.core.BusyIndicator.show(0)

			const projectId = this.getView().getBindingContext().getPath().slice(1);
			let project = this.getView().getBindingContext().getObject();

			project.finished = null;
			project.status = 0;

			try {
				await DatabaseHelper.updateProject(project, projectId, ['finished', 'status'])
				NotificationHelper.toast(this.i18n.getText('MSG_ACTIVATE_PROJECT_SUCCESS'))
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_UPDATE_PROJECT_ERROR'))
			}
			sap.ui.core.BusyIndicator.hide()
		},

		onFinishProject: async function (evt) {
			sap.ui.core.BusyIndicator.show(0)

			const projectId = this.getView().getBindingContext().getPath().slice(1)
			let project = this.getView().getBindingContext().getObject()

			project.finished = Date.now()
			project.status = 1

			try {
				await DatabaseHelper.updateProject(project, projectId, ['finished', 'status'])
				NotificationHelper.toast(this.i18n.getText('MSG_FINISH_PROJECT_SUCCESS'))
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_UPDATE_PROJECT_ERROR'))
			}
			sap.ui.core.BusyIndicator.hide()
		},

		onRemoveProject: async function (evt) {
			sap.ui.core.BusyIndicator.show(0)
			
			if (!this.deleteDialog) {
				this.deleteDialog = sap.ui.xmlfragment('geosort.view.projects.DeleteDialog', this)
				this.getView().addDependent(this.deleteDialog)
			}

			if (this.deleteDialog.isOpen() === false) {
				this.deleteDialog.open()
				return;
			}

			this.deleteDialog.close()

			const projectId = this.getView().getBindingContext().getPath().slice(1)

			try {
				await DatabaseHelper.removeProject(projectId)
				NotificationHelper.toast(this.i18n.getText('MSG_REMOVE_PROJECT_SUCCESS'))
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_REMOVE_PROJECT_ERROR'))
			}

			const projects = this.getView().getModel().getProperty('/')

			if (!projects) {
				this.router.navTo('projects')
			} else {
				this.router.navTo('projectDetail', {
					id: Object.keys(projects)[0]
				})
			}
			sap.ui.core.BusyIndicator.hide()
		},

		onCloseDialog: function (evt) {
			evt.getSource().getParent().close()
		}

	});
});