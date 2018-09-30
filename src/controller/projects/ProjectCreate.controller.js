sap.ui.define([
	'sap/ui/core/mvc/Controller',
	'sap/ui/core/UIComponent',
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/message/Message',
	'sap/ui/core/MessageType',
	'sap/m/MessageStrip',
	'geosort/util/DatabaseHelper',
	'geosort/util/Formatter',
	'geosort/util/NotificationHelper'
], function(Controller, UIComponent, JSONModel, Message, MessageType, MessageStrip, DatabaseHelper, Formatter, NotificationHelper) {
	'use strict';

	return Controller.extend('geosort.controller.projects.ProjectCreate', {

		formatter: Formatter,
		i18n: null,
		router: null,

		onInit: function () {
			this.router = UIComponent.getRouterFor(this)
			this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle()

			this.getView().setModel(new JSONModel(), 'project')
			this.getView().setModel(new JSONModel(), 'address')
			this.getView().setModel(new JSONModel(), 'gps')
			this.getView().setModel(new JSONModel(), 'image')
			this.getView().setModel(new JSONModel(), 'view')

			this.router.getRoute('projectCreate').attachBeforeMatched(this.onBeforeRouteMatched, this)
			this.router.getRoute('projectCreate').attachMatched(this.onRouteMatched, this)
		},

		onBeforeRouteMatched: function (evt) {
			let formControls = []
			formControls.push(this.getView().getControlsByFieldGroupId('fgProject'))
			formControls.push(this.getView().getControlsByFieldGroupId('fgAddress'))
			formControls.push(this.getView().getControlsByFieldGroupId('fgGps'))
			formControls.push(this.getView().getControlsByFieldGroupId('fgImage'))
			formControls = _.flatten(formControls)

			formControls.forEach(control => {
				control.setValueState('None')
			})
			
			if (this.getView().byId('formContainer').getItems()[0] instanceof MessageStrip) {
				this.getView().byId('formContainer').removeItem(this.getView().byId('formContainer').getItems()[0])
			}
		},

		onRouteMatched: function (evt) {
			this.getView().getModel('project').setData(DatabaseHelper.getEmptyProject())

			this.getView().getModel('address').setData({
				street: null,
				streetNo: null,
				zipCode: null,
				city: null
			})

			this.getView().getModel('gps').setData({
				lat: null,
				lng: null
			})

			this.getView().getModel('image').setData({
				imagePath: null
			})

			this.getView().getModel('view').setData({
                validationError: false
            })
		},

		onCancelCreation: function () {
            this.router.navTo('projects')
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
		
		onPickImage: async function (evt) {
			const { remote } = nodeRequire('electron')
			const explorer = remote.require('./modules/explorer')

			try {
				const response = await explorer.pickFile()
				this.getView().getModel('image').setProperty('/imagePath', response[0])
			} catch (error) {
				console.log(error)
			}
		},

		onSaveProject: async function (evt) {
			if (!this.validateSettings()) {
				return this.getView().getModel('view').setProperty('/validationError', true)
			}
			sap.ui.core.BusyIndicator.show(0)

			let project = this.getView().getModel('project').getProperty('/')

			/** TODO: Implement check for existing address */

			const { remote } = nodeRequire('electron')
			const explorer = remote.require('./modules/explorer')

			project.user = this.getOwnerComponent().getModel('app').getProperty('/user/id')
			project.created = Date.now()

			try {
				const isProjectValid = await DatabaseHelper.isProjectValid(project)
				if (!isProjectValid) {
					NotificationHelper.error(this.i18n.getText('MSG_ADD_PROJECT_TITLE_TAKEN'))
					return sap.ui.core.BusyIndicator.hide()
				}
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_ADD_PROJECT_ERROR'))
				return sap.ui.core.BusyIndicator.hide()
			}

			if (project.locationMethod === 0) {
				project.address = this.getView().getModel('address').getProperty('/')

				try {
					project.gps = await this.getGPS(project.address)
				} catch (error) {
					/** TODO: Implement notification when failed */
				}
			} else if (project.locationMethod === 1) {
				project.gps = this.getView().getModel('gps').getProperty('/');

				try {
					project.address = await this.getAddress(project.gps)
				} catch (error) {
					/** TODO: Implement notification if dailed */
				}
			} else if (project.locationMethod === 2) {
				const path = this.getView().getModel('image').getProperty('/imagePath')

				project.imagePath = path

				try {
					const metadata = await explorer.getFileMetadata(path)
					
					project.gps = {
						lat: metadata.tags.GPSLatitude,
						lng: metadata.tags.GPSLongitude
					}

					project.address = await this.getAddress(project.gps)
				} catch (error) {
					/** TODO: Implement notification if dailed */
				}
			}

			try {
                const response = await DatabaseHelper.saveProject(project)
				NotificationHelper.toast(this.i18n.getText('MSG_ADD_PROJECT_SUCCESS'))
                this.router.navTo('projects', {
                    query: {
                        extend: response.id
                    }
                })
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_ADD_PROJECT_ERROR'))
			}
			sap.ui.core.BusyIndicator.hide()
		},

		getAddress: function (gps) {
			const { remote } = nodeRequire('electron')
			const maps = remote.require('./modules/maps')
			
			return new Promise(async (resolve, reject) => {
				try {
					const geocode = await maps.geocodeGPS(gps)

					if (geocode.status !== 200) reject(error)
					
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

					resolve({
						city: addressComponents[0].long_name,
						street: addressComponents[2].long_name,
						streetNo: addressComponents[3].long_name,
						zipCode: addressComponents[1].long_name
					})
				} catch (error) {
					reject(error)
				}
			})
		},

		getGPS: function (address) {
			const { remote } = nodeRequire('electron')
			const maps = remote.require('./modules/maps')

			return new Promise(async (resolve, reject) => {
				try {
					const geocode = await maps.geocodeAddress(address)

					if (geocode.status !== 200) reject(error)

					resolve({
						lat: geocode.json.results[0].geometry.location.lat,
						lng: geocode.json.results[0].geometry.location.lng						
					})
				} catch (error) {
					reject(error)
				}
			})
		},

		validateSettings: function () {
			let formControls = this.getView().getControlsByFieldGroupId('fgProject')
			let project = this.getView().getModel('project').getProperty('/')

			if (project.locationMethod === 0) formControls.push(this.getView().getControlsByFieldGroupId('fgAddress'))
			if (project.locationMethod === 1) formControls.push(this.getView().getControlsByFieldGroupId('fgGps'))
			if (project.locationMethod === 2) formControls.push(this.getView().getControlsByFieldGroupId('fgImage'))
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