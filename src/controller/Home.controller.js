sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/core/UIComponent'
], function (Controller, UIComponent) {
    'use strict';

    return Controller.extend('geosort.controller.Home', {

        router: null,

        onInit: function () {
            this.router = UIComponent.getRouterFor(this)
        }

    })
})