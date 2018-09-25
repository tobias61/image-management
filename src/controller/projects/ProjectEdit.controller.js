sap.ui.define([
	'sap/ui/core/mvc/Controller',
    'sap/ui/core/UIComponent',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageStrip',
    'sap/ui/core/message/Message',
	'sap/ui/core/MessageType',
	'geosort/util/DatabaseHelper',
	'geosort/util/NotificationHelper',
	'geosort/util/Formatter'
], function(Controller, UIComponent, JSONModel, MessageStrip, Message, MessageType, DatabaseHelper, NotificationHelper, Formatter) {
	'use strict';

	return Controller.extend('geosort.controller.projects.ProjectEdit', {

		formatter: Formatter,
		i18n: null,
		router: null,

		onInit: function () {
			this.router = UIComponent.getRouterFor(this)
            this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle()

            this.getView().setModel(new JSONModel(), 'view')

            this.getView().setModel(DatabaseHelper.getProjects())
            
            this.router.getRoute('projectEdit').attachMatched(this.onRouteMatched, this)
        }, 
        
        onRouteMatched: function (evt) {
            this.getView().getModel('view').setData({
                dataChanged: false,
                validationError: false
            })

            const args = evt.getParameter('arguments')

            this.getView().bindElement('/' + args.id)
            this.getView().getModel().attachPropertyChange(function (evt) {
                const property = evt.getParameter('path')

				if (property !== 'title' && property !== 'directory' && property !== 'locationMethod') {
					this.getView().getModel('view').setProperty('/dataChanged', true)
                }
            }.bind(this))
        },

        onSaveProject: async function (evt) {
			if (!this.validateSettings()) {
				return this.getView().getModel('view').setProperty('/validationError', true)
			}

			sap.ui.core.BusyIndicator.show(0)

			const projectId = this.getView().getBindingContext().getPath().slice(1);
			let project = this.getView().getBindingContext().getObject()

			/** TODO: Implement check for existing address */

			const { remote } = nodeRequire('electron')
			const explorer = remote.require('./modules/explorer')

			try {
				const isProjectValid = await DatabaseHelper.isProjectValid(project)
				if (!isProjectValid) {
					NotificationHelper.error(this.i18n.getText('MSG_ADD_PROJECT_TITLE_TAKEN'))
					return sap.ui.core.BusyIndicator.hide()
				}
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_UPDATE_PROJECT_ERROR'))
				return sap.ui.core.BusyIndicator.hide()
			}

			if (project.locationMethod === 0) {
				try {
					project.gps = await this.getGPS(project.address)
				} catch (error) {
					/** TODO: Implement notification when failed */
				}
			} else if (project.locationMethod === 1) {
				try {
					project.address = await this.getAddress(project.gps)
				} catch (error) {
					/** TODO: Implement notification if dailed */
				}
			} else if (project.locationMethod === 2) {
				try {
					const metadata = await explorer.getFileMetadata(project.imagePath)
					
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
				await DatabaseHelper.updateProject(project, projectId)
				NotificationHelper.toast(this.i18n.getText('MSG_UPDATE_PROJECT_SUCCESS'))
				this.router.navTo('projectDetail', {
					id: projectId
				})
			} catch (error) {
				NotificationHelper.error(this.i18n.getText('MSG_UPDATE_PROJECT_ERROR'))
			}
			sap.ui.core.BusyIndicator.hide()
        },

        onCancelEdit: function (evt) {
            this.router.navTo('projectDetail', {
                id: this.getView().getElementBinding().getPath().slice(1)
            })
		},

		onPickImage: async function (evt) {
			const { remote } = nodeRequire('electron')
			const explorer = remote.require('./modules/explorer')

			try {
				const response = await explorer.pickFile()
				this.getView().getModel().setProperty(`/${this.getView().getBindingContext().getPath().slice(1)}/imagePath`, response[0])
			} catch (error) {
				console.log(error)
			}
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
			let project = this.getView().getBindingContext().getObject()

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