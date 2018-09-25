sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/core/UIComponent',
    'sap/ui/model/json/JSONModel',
    'sap/m/GroupHeaderListItem',
    'sap/ui/core/message/Message',
    'sap/ui/core/MessageType',
    'sap/ui/core/format/DateFormat',
    'geosort/util/DatabaseHelper',
    'geosort/util/Formatter',
    'geosort/util/NotificationHelper'
], function (Controller, UIComponent, JSONModel, GroupHeaderListItem, Message, MessageType, DateFormat, DatabaseHelper, Formatter, NotificationHelper) {
    'use strict';

    return Controller.extend('geosort.controller.sort.Sort', {

        formatter: Formatter,
        i18n: null,
        router: null,

        onInit: async function () {
            this.router = UIComponent.getRouterFor(this)
            this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle()

            this.getView().setModel(DatabaseHelper.getProjects(), 'projects')
            this.getView().setModel(new JSONModel(), 'download')

            DatabaseHelper.attachProjectsListener(this.getOwnerComponent().getModel('app').getProperty('/user/id'), function (snapshot) {
                this.getView().byId('projectsList').setBusy(true)
                
                let projects = {}
                snapshot.forEach(doc => {
                    projects[doc.id] = doc.data()
                })
                DatabaseHelper.getProjects().setData(projects)

                if (!this.getOwnerComponent().getModel('app').getProperty('/projects/isListenerAttached')) {
                    this.getOwnerComponent().getModel('app').setProperty('/projects/isListenerAttached', true)
                }

				this.getView().byId('projectsList').setBusy(false)
            }.bind(this))
            
            if (!this.getOwnerComponent().getModel('app').getProperty('/user/sortSettings')) {
                this.getOwnerComponent().getModel('app').setProperty('/user/sortSettings', DatabaseHelper.getEmptySettings())
            }
        },

        onSaveSettings: async function (evt) {
            if (!this.validateSettings()) return
            const user = this.getOwnerComponent().getModel('app').getProperty('/user')

            try {
                await DatabaseHelper.saveSortSettings(user)
                NotificationHelper.toast(this.i18n.getText('MSG_SAVE_SETTINGS_SUCCESS'))
            } catch (error) {
                NotificationHelper.error(this.i18n.getText('MSG_SAVE_SETTINGS_ERROR'))
            }
        },

        onProjectPress: function (evt) {
            const projectId = evt.getSource().getBindingContext('projects').getPath().slice(1)

            this.router.navTo('projectDetail', {
                id: projectId
            })
        },

        onSortProjects: async function (evt) {
            if (!this.validateSettings()) return

            const { remote } = nodeRequire('electron')
            const drive = remote.require('./modules/drive')
            const maps = remote.require('./modules/maps')
            const settings = this.getOwnerComponent().getModel('app').getProperty('/user/sortSettings')

            const download = this.getView().getModel('download')
            download.setData({
                downloadCount: 0,
                failedDownloadCount: 0,
                imagesCount: 0,
                notMatchedCount: 0
            })

            let matchedImages
            
            sap.ui.core.BusyIndicator.show(0)
            if (!settings.googlePhotosFlag) {
                try {
                    const folder = await drive.getFolder(settings.dirNameDrive)

                    if (folder.data.files.length < 1) return NotificationHelper.information(this.i18n.getText('MSG_SORT_IMAGES_DIR_NOT_FOUND'))
                    const images = await drive.getImages(folder.data.files[0].id)

                    if (images.data.files.length < 1) return NotificationHelper.information(this.i18n.getText('MSG_SORT_IMAGES_NO_IMAGES'))
                    const projects = this.getView().getModel('projects').getData()

                    matchedImages = maps.matchImagesToProjects(images.data.files, projects)
                    download.setProperty('/notMatchedCount', (images.data.files.length - matchedImages.length))
                } catch (error) {
                    NotificationHelper.error(this.i18n.getText('MSG_SORT_IMAGES_ERROR'))
                }
            }
            else if (settings.googlePhotosFlag) {
                try {
                    /** TODO: Implement Google Photos usage */
                } catch (error) {
                    NotificationHelper.error(this.i18n.getText('MSG_SORT_IMAGES_ERROR'))
                }
            }
            sap.ui.core.BusyIndicator.hide()

            if (matchedImages.length < 1) return NotificationHelper.information(this.i18n.getText('MSG_MATCH_IMAGES_NO_IMAGES'))

			if (!this.downloadBusyDialog) {
				this.downloadBusyDialog = sap.ui.xmlfragment('geosort.view.sort.DownloadBusyDialog', this);
				this.getView().addDependent(this.downloadBusyDialog);
            }
            this.downloadBusyDialog.open()

            if (!this.downloadInfoDialog) {
                this.downloadInfoDialog = sap.ui.xmlfragment('geosort.view.sort.DownloadInformationDialog', this)
                this.getView().addDependent(this.downloadInfoDialog)
            }

            /** TODO: Implement cancel of sorting */

            download.setProperty('/imagesCount', matchedImages.length)

            const downloadDone = _.after(matchedImages.length, function () {
                this.downloadBusyDialog.close()
                this.downloadInfoDialog.open()
            }.bind(this))
            
            matchedImages.forEach(async (image) => {
                try {
                    await drive.downloadImage(image)
                    download.setProperty('/downloadCount', (download.getProperty('/downloadCount') + 1))
                    if (settings.deleteFlag) drive.deleteImage(image)
                    downloadDone()
                } catch (error) {
                    download.setProperty('/failedDownloadCount', (download.getProperty('/failedDownloadCount') + 1))
                }
            })
        },

        onCloseDialog: function (evt) {
            evt.getSource().getParent().close()
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
        },

        validateSettings: function () {
            let formControls = this.getView().getControlsByFieldGroupId('fgSettings')
            let validationErrorCounter = 0

            formControls.forEach(control => {
                try {
                    if (control.getEnabled()) {
                        const binding = control.getBinding('value')
                        const externalValue = control.getProperty('value')
                        const internalValue = binding.getType().parseValue(externalValue, binding.sInternalType)
                        binding.getType().validateValue(internalValue)
                    }
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