sap.ui.define([
    'sap/ui/core/mvc/Controller',
	'sap/ui/core/UIComponent',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/m/GroupHeaderListItem',
	'geosort/util/DatabaseHelper',
	'geosort/util/Formatter'
], function (Controller, UIComponent, Filter, FilterOperator, GroupHeaderListItem, DatabaseHelper, Formatter) {
	'use strict';

	return Controller.extend('geosort.controller.projects.ProjectsList', {

		formatter: Formatter,
		i18n: null,
		router: null,

		onInit: async function () {
			this.router = UIComponent.getRouterFor(this)
			this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle()

			if (!this.getOwnerComponent().getModel('app').getProperty('/projects/isListenerAttached')) {
				DatabaseHelper.attachProjectsListener(this.getOwnerComponent().getModel('app').getProperty('/user/id'))
				this.getOwnerComponent().getModel('app').setProperty('/projects/isListenerAttached', true)
			}
			this.getView().setModel(DatabaseHelper.getProjects())

			// this.router.getRoute('projects').attachPatternMatched(this.onRoutePatternMatched, this)
		},

		onRoutePatternMatched: function (evt) {
			const projects = this.getView().getModel().getProperty('/')

			if (Object.keys(projects).length !== 0) {
				this.getView().byId('projectsList').setSelectedItem(this.getView().byId('projectsList').getItems()[0])
				this.router.navTo('projectDetail', {
					id: Object.keys(projects)[0]
				})
			}
			// if (projects && Object.keys(projects).length === 0) {
			// 	this.getView().byId('projectsList').getBinding('items').attachChange(function (evt) {
			// 		let projects = this.getView().getModel().getProperty('/')

			// 		if (projects) {
			// 			this.getView().byId('projectsList').setSelectedItem(this.getView().byId('projectsList').getItems()[0])

			// 			this.router.navTo('projectDetail', {
			// 				id: Object.keys(projects)[0]
			// 			});
			// 		}
			// 	}.bind(this));
			// } else if (projects) {
			// 	this.router.navTo('projectDetail', {
			// 		id: Object.keys(projects)[0]
			// 	});
			// }
		},

		onSearchProjects: function (evt) {
			const query = evt.getParameter('query');

			this.getView().byId('projectsList').getBinding('items').filter(new Filter('title', FilterOperator.Contains, query));
		},

		onAddProject: function (evt) {
			this.router.navTo('projectCreate')
		},

		onProjectSelected: function (evt) {
			const path = evt.getParameter('listItem').getBindingContext().getPath()

			this.router.navTo('projectDetail', {
				id: path.slice(1)
			})
		},

		getGroupHeader: function (group) {
            let groupTitle = (group.key === 0) ? this.i18n.getText('LIST_TITLE_ACTIVE_PROJECTS') : this.i18n.getText('LIST_TITLE_FINISHED_PROJECTS')

            let groupHeader = new GroupHeaderListItem({
                title: groupTitle,
                upperCase: true
            })

            return groupHeader
        },

	});
});