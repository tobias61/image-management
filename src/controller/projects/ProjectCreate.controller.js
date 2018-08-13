sap.ui.define([
	'sap/ui/core/mvc/Controller',
	'sap/ui/core/UIComponent',
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/message/Message',
    'sap/ui/core/MessageType',
	'geosort/util/DatabaseHelper',
	'geosort/util/GeocodeHelper',
	'geosort/util/Formatter',
	'geosort/util/NotificationHelper'
], function(Controller, UIComponent, JSONModel, Message, MessageType, DatabaseHelper, GeocodeHelper, Formatter, NotificationHelper) {
	'use strict';

	return Controller.extend('geosort.controller.projects.ProjectCreate', {

		formatter: Formatter,
		i18n: null,
		router: null,

		onInit: function () {
			this.router = UIComponent.getRouterFor(this);
			this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle();

			this.getView().setModel(new JSONModel(), 'viewModel');
			this.getView().setModel(new JSONModel(), 'project');
			this.getView().setModel(new JSONModel(), 'address');
			this.getView().setModel(new JSONModel(), 'gps');

			this.router.getRoute('projectCreate').attachMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function (evt) {
			this.getView().getModel('viewModel').setData({
				isAddrFormVisible: true,
				isGPSFormVisible: false,
				isImageFormVisible: false
			});

			this.getView().getModel('project').setData(DatabaseHelper.getEmptyProject());

			this.getView().getModel('address').setData({
				street: null,
				streetNo: null,
				zipCode: null,
				city: null
			});

			this.getView().getModel('gps').setData({
				lat: null,
				lng: null
			});
		},

		onCancelCreation: function () {
			const projects = DatabaseHelper.getProjects().getProperty('/');

			if (Object.keys(projects).length !== 0) {
				this.router.navTo('projectDetail', {
					id: Object.keys(projects)[0]
				});
			} else {
				this.router.navTo('projects')
			}
		},

		onPickDirectory: async function (evt) {
            const { remote } = nodeRequire('electron')
            const explorer = remote.require('./modules/explorer.js')       
            
            try {
                const response = await explorer.pickDirectory()
                this.getView().getModel('project').setProperty('/directory', response[0])
            } catch (error) {
                // console.log(error)
            }
        },

		onSaveProject: async function (evt) {
			sap.ui.core.BusyIndicator.show(0)
			if (!this.validateSettings()) return

			let project = this.getView().getModel('project').getProperty('/')

			/** TODO: Implement check for existing address */

			try {
				const isProjectValid = await DatabaseHelper.isProjectValid(project)
				if (!isProjectValid) return NotificationHelper.error(this.i18n.getText('MSG_ADD_PROJECT_TITLE_TAKEN'))
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_ADD_PROJECT_ERROR'))
			}

			const { remote } = nodeRequire('electron')
			const maps = remote.require('./modules/maps')
			
			project.user = this.getOwnerComponent().getModel('app').getProperty('/user/id')
			project.created = Date.now()

			if (project.locationMethod === 0) {
				project.address = this.getView().getModel('address').getProperty('/')

				try {
					const geocode = await maps.geocodeAddress(project.address)

					if (geocode.status !== 200) {
						/** TODO: Implement notification if dailed */
					}

					project.gps = {
						lat: geocode.json.results[0].geometry.location.lat,
						lng: geocode.json.results[0].geometry.location.lng
					}
				} catch (error) {
					console.log(error)
					/** TODO: Implement notification if dailed */
				}
			} else if (project.locationMethod === 1) {
				project.gps = this.getView().getModel('gps').getProperty('/');

				try {
					const geocode = await maps.geocodeGPS(project.gps)

					if (geocode.status !== 200) {
						/** TODO: Implement notification if dailed */
					}

					const addressComponents = geocode.json.results[0].address_components.filter(addr_comp => {
						if (addr_comp.types.includes('street_number') || addr_comp.types.includes('route') ||
							addr_comp.types.includes('locality') || addr_comp.types.includes('postal_code')) {
							return true
						}
					})

					/** address components are sorted alphabetically in the following order: locality -> postal_code -> route -> street_number */
					addressComponents.sort((a, b) => {
						if(a.types[0] < b.types[0]) return -1
						if(a.types[0] > b.types[0]) return 1
					})

					project.address = {
						city: addressComponents[0].long_name,
						street: addressComponents[2].long_name,
						streetNo: addressComponents[3].long_name,
						zipCode: addressComponents[1].long_name
					}
				} catch (error) {
					console.log(error)
					/** TODO: Implement notification if dailed */
				}
			}

			try {
				const response = await DatabaseHelper.saveProject(project)
				NotificationHelper.toast(this.i18n.getText('MSG_ADD_PROJECT_SUCCESS'))
				this.router.navTo('projectDetail', {
					id: response.id
				})
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_ADD_PROJECT_ERROR'))
			}
			sap.ui.core.BusyIndicator.hide()
		},

		validateSettings: function () {
			let formControls = this.getView().getControlsByFieldGroupId('fgProject')
			let project = this.getView().getModel('project').getProperty('/')

			if (project.locationMethod === 0) formControls.push(this.getView().getControlsByFieldGroupId('fgAddress'))
			if (project.locationMethod === 1) formControls.push(this.getView().getControlsByFieldGroupId('fgGps'))
			formControls = _.flatten(formControls)

			let validationErrorCounter = 0
			formControls.forEach(control => {
				try {
					const binding = control.getBinding('value')
					const externalValue = control.getProperty('value')
					const internalValue = binding.getType().parseValue(externalValue, binding.sInternalType)
					binding.getType().validateValue(internalValue)
				} catch (error) {
					validationErrorCounter++;
					const binding = control.getBinding('value')
					sap.ui.getCore().getMessageManager().addMessages(
						new Message({
							message: error.message,
							type: MessageType.Error,
							target: (binding.getContext() ? binding.getContext().getPath() + "/" : "") + binding.getPath(),
							processor: control.getBinding('value').getModel() 
						})
					)
				}
			})

			return (validationErrorCounter > 0) ? false : true
		}

	});
});