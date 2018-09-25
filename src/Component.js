sap.ui.define([
	'sap/ui/core/UIComponent',
	'sap/ui/model/json/JSONModel'
], function (UIComponent, JSONModel) {
	'use strict';

	return UIComponent.extend('geosort.Component', {

		metadata: {
			manifest: 'json'
		},

		init: function () {
			UIComponent.prototype.init.apply(this, arguments)

			sap.ui.getCore().getConfiguration().setLanguage('de')

			let appModel = new JSONModel({
				isLoggedIn: false,
				projects: { isListenerAttached: false },
				users: { isListenerAttached: false }
			})

			// appModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay)
			this.setModel(appModel, 'app')

			this.getRouter().initialize()
		}
	});
});