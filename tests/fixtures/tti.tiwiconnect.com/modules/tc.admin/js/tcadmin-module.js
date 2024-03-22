'use strict';

/* TcApp Module */
angular.module('tc.admin', ['tcadmin.controllers', 'tcadmin.services']).run(function(RouteService){
	var _routes = [
	{
		"viewTitle": "Admin",
		"viewRoute": "/admin",
		"menu": true,
		"menuLvl": 1,
		"role": ["site_admin","super_user"],
		"content": null,
		"templateUrl": "modules/tc.admin/partials/tcadmin-home.html",
		"controller": "AdminHomeController",
		"viewId": "admin",
	},
	{
		"viewTitle": "Admin Section",
		"viewRoute": "/admin/:section",
		"menu": false,
		"menuLvl": 0,
		"role": ["site_admin","super_user"],
		"content": null,
		"templateUrl": "modules/tc.admin/partials/tcadmin-section.html",
		"controller": "AdminSectionController as Section",
		"viewId": "adminsection",
	},
	{
		"viewTitle": "Admin Section Edit",
		"viewRoute": "/admin/:section/:modeid",
		"menu": false,
		"menuLvl": 0,
		"role": ["site_admin","super_user"],
		"content": null,
		"templateUrl": "modules/tc.admin/partials/tcadmin-section-edit.html",
		"controller": "AdminSectionController as Section",
		"viewId": "adminsectionedit",
	}];
	_routes.forEach(RouteService.define);
});