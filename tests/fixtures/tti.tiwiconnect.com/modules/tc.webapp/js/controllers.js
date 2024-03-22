/* global $ */
'use strict';

/* Controllers */

angular.module('tcapp.controllers', ['tcapp.controllers.core', 'tcapp.controllers.endnodes']);


/* Core Controllers */
var tcappcontrollers = angular.module('tcapp.controllers.core', [])
	.controller('mainController', ['$rootScope', '$scope', '$http', '$log', '$interval', '$timeout','$route', '$routeParams', '$location', 'BroadCastService', 'SocketService', 'RouteService', 'AjaxService',
	function ($rootScope, $scope, $http, $log, $interval, $timeout, $route, $routeParams, $location, BroadCastService, SocketService, RouteService, AjaxService) {


		// global helper function(s)
		$rootScope.isString = function(v)
		{
			return typeof v == 'string';
		};

		$rootScope.objectLength = function(o)
		{
			if (typeof o !== "object")
			{
				return false;
			}
			return Object.keys(o).length;
		};

		$rootScope.hasKeys = function(o)
		{
			if (typeof o !== "object")
			{
				return false;
			}
			return Object.keys(o).length > 0 ? true : false;
		};

		$scope.baseFolder = $rootScope.baseFolder;
		$scope.templates = {
			"header": {
				"templateUrl": $scope.baseFolder + "partials/c-header.html"
			},
			"footer": {
				"templateUrl": $scope.baseFolder + "partials/c-footer.html"
			}
		};

		// if the user is logged in, ping the server in 1 minute intervals, ping faster when the server is down, until it comes back up
		var Pong;
		function createPinger(interval)
		{
			if (!interval || interval < 5)
			{
				interval = 60;
			}
			$interval.cancel(Pong);

			Pong = $interval(function(){
				AjaxService.get('/ping').then(function(response){
					$rootScope.serverDown = false;
					createPinger(60);
				},function(response){
					createPinger(5);
				});
			}, interval*1000);
		}
		createPinger(5);

		var bad_gateway_tolerance = 0;
		$scope.$on('bcm.http.502', function(){

			bad_gateway_tolerance++;
			if (bad_gateway_tolerance >= 5)
			{
				$rootScope.serverDown = true;
				var serverUpWatcher = $scope.$on('bcm.httpconnection', function (event,pkg)
				{
					bad_gateway_tolerance = 0;
					$rootScope.serverDown = false;
					serverUpWatcher();
				});
			}
		});

		var date = new Date();
		$scope.config = { "appName": "TiWiConnect", "appVersion": "0.8.3", "year": date.getFullYear() };

		$scope.view = false;
		var _load_tc_view = function () {
			if ($route.current && $route.current.$$route)
			{
				BroadCastService.broadcast("cmonloaded");

				var viewid = RouteService.getViewId($route.current.$$route.originalPath);

				RouteService.get(viewid).then(function(view)
				{
					$scope.view = view;
				},
				function(error){
					console.log("error");
				});
			}
		};

		// we do this because $route does not get populated right away, issue with Angular still as of 1.3
		var _cmon_load_it = $interval(function(){
			if (!$scope.view)
			{
				$route.reload();
				_load_tc_view();
			}
			else
			{
				$interval.cancel(_cmon_load_it);
			}
		}, 1000);

		$scope.$on('$routeChangeSuccess', _load_tc_view);
	}]);

tcappcontrollers.controller('viewController',function (){});

tcappcontrollers.controller('DebugController', ['$scope', 'BroadCastService', 'SocketService', function($scope, BroadCastService, SocketService)
{
	var _line = 0;
	$scope.pause = false;
	$scope.filter = "";
	$scope.show = false;

	var _print_debug_message = function(event, pkg, col)
	{
		if (!$scope.pause && $scope.filter === "" || typeof pkg.msg === 'string' && pkg.msg.indexOf($scope.filter) == -1)
		{
			if (!col) { col = "black"; }
			var _message = pkg.msg.data || pkg.msg;
			_line++;
			if (_line > 9999){ _line = 0;}

			var _line_str = "0000"+_line;
			_line_str = _line_str.substr(-4, 4);

			var _time = new Date().toString();
			var _debugText = $('#debugWindow').html();
			_debugText = '<span style="color:grey;">' + _line_str + '</span>:<span style="color: blue">' + _time.substr(0, _time.length - 15) + '</span>:<span style="color: '+col+';">' + JSON.stringify(_message) + '</span></br>' + _debugText;
			$('#debugWindow').html( _debugText.substr(0, 5000));
		}
	};

	var _print_debug_message_ss = function(event, pkg)
	{
		_print_debug_message(event, pkg, "red");
	};

	$scope.$on('bcm.ss.ClientDebugNotification', _print_debug_message_ss);
	$scope.$on('bcm.ss.ClientDebugSystem', function(event, pkg)
	{
		console.log("ClientDebugSystem", pkg.msg.id, pkg.msg)
	});

	$scope.$on('bcm.debug', _print_debug_message);
}]);

tcappcontrollers.controller('imageUploadController', ['$scope', '$upload', function($scope, $upload)
{
    $scope.uploadFiles = [];
	$scope.fileName = "file";

    var sendFile = function(file,cb)
    {
        $upload.upload({
            url: '/api/upload/image',
            file: file
        }).progress(function (evt) {
           file.uploadProgress = parseInt(100.0 * evt.loaded / evt.total);
        }).then(function (data, status, headers, config) {
            file.done = true;
            file.barType = 'success';
            cb(false, file, data);
        },function(error){
            file.error = error;
            file.barType = 'danger';
            cb(error, file);
        });
    };

    $scope.upload = function (files) {
        if (files && files.length) {
            for (var i = 0; i < files.length; i++) {
                sendFile(files[i], function(err, file, data){
                    console.log(err, file, data);
					$scope.uploadedImage = data;
                });
            }
        }
    };

}]);

tcappcontrollers.controller('headerController', ['$scope', '$route', '$log', '$http', '$location', '$animate', '$timeout', '$interval', '$uibModal', 'RouteService', 'SocketService', 'UserService', 'NotificationsSrv', 'BroadCastService', 'DeviceService', 'TriggerService', 'LoraService',
	function ($scope, $route, $log, $http, $location, $animate, $timeout, $interval, $modal, RouteService, SocketService, UserService, NotificationsSrv, BroadCastService, DeviceService, TriggerService, LoraService)
	{
		var headerController = this;
		//provides data object to the nav bar.
		$scope.client = {
			"socketed": false,
			"httpConnected": true
		};

		$scope.model = {
			logAction: "Log in",
			warningMessage: "",
			alerts: { },
		};

		headerController.loggedIn = false;

		//allows route change from template (called by a button)
		$scope.changeRouteById = RouteService.change;
		$scope.buttons = {
			logIn: function ()
			{
				RouteService.change('login');
			},
			logOut: function ()
			{
				//clear the loaded models
				DeviceService.clear();
				LoraService.clear();
				NotificationsSrv.clear();
				TriggerService.clear();
				SocketService.unsubscribeAll();
				UserService.logout().then(function(user)
				{
					$scope.model.user = user;
					RouteService.change('login');
				});
			}
		};

		$scope.views = {"one":[],"two":[],"three":[]};
		var _assign_views = function(views)
		{
			$scope.views.one.length = 0;
			$scope.views.two.length = 0;
			$scope.views.three.length = 0;

			//assign views to the menu positions
			for (var k in views)
			{
				if (views[k].menu)
				{
					if($scope.model.user == undefined) {
						// Not logged in
					} else {
						//check that my roles intersect with the menuItem roles
						for (var ii = 0; ii < $scope.model.user.auth.roleMap.roleNames.length; ii++)
						{
							if (views[k].role.indexOf($scope.model.user.auth.roleMap.roleNames[ii]) != -1)
							{
								if (views[k].menuLvl == 1)
								{
									$scope.views.one.push(views[k]);
									break;
								}
								else if (views[k].menuLvl == 2)
								{
									$scope.views.two.push(views[k]);
									break;
								}
								else if (views[k].menuLvl == 3)
								{
									$scope.views.three.push(views[k]);
									break;
								}
							}
						}
					}
				}
			}
		};

		var update_header = function()
		{
			UserService.session().then(function(user)
			{
				$scope.model.user = user;
				headerController.loggedIn = true;

				NotificationsSrv.get().then(function(response)
				{
					$scope.model.alerts = response;
				});

				//if navigating to the root, redirect to endnodes
				if ($location.$$path === "")
				{
					RouteService.change('endnodes');
				}
				RouteService.get().then(function(views)
				{
					_assign_views(views);
					$route.reload();
				});

			},
			function(user)
			{
				$scope.model.user = user;

				headerController.loggedIn = false;

				RouteService.get().then(function(views)
				{
					_assign_views(views);
				});
				$route.reload();
			});
		};
		$scope.$on('bcm.usersessionchange', update_header);

		//flash the menu when a new notification arrives
		$scope.$on('bcm.ss.wskNewClientNotification', function()
		{
			var element = $('#alerts');
			$animate.addClass(element, 'alert-animate');
			setTimeout(function() {
				element.removeClass('alert-animate');
			}, 2000);
		});

		$scope.$on('bcm.httpconnection', function (event,pkg)
		{
			$scope.client.httpConnected = pkg.msg;
		});

		// prevent users from visiting routes that they don't have access to (based on roles of currently logged in user)
		$scope.$on('$routeChangeStart', function(event, next, current)
		{
			var _user = UserService.get();
			if (!next)
			{
				return;
			}

			var _route = RouteService.getByUrl(next.$$route.originalPath);

			for (var i = 0; i < _route.role.length; i++)
			{
				if (_user.auth.roleMap.roleNames.indexOf(_route.role[i]) != -1)
				{
					return;
				}
			}
			event.preventDefault();
			$location.url('/login').replace();
		});


		// socket connection status, waits for connection to be stable for 5 second, and then sets the stable connection flag. The user is
		// warned if this is unset.
		var stablize = false;
		$scope.$on('bcm.socket.socketId', function (event,pkg)
		{
			$scope.socketId = pkg.msg;
		});

		$scope.$on('bcm.socket.connected', function (event,pkg)
		{
			$scope.client.socketed = pkg.msg;
			if ($scope.client.stableConnection && !$scope.client.socketed)
			{
				$scope.model.warningMessage = "Internet connection interrupted.";
				$scope.client.stableConnection = false;
			}
			$timeout.cancel(stablize);
			stablize = $timeout(function(){
				$scope.client.stableConnection = $scope.client.socketed;
				if ($scope.client.stableConnection)
				{
					$scope.model.warningMessage = "";
				}
			}, 5000);

		});
	}
]);

/*
 *
 *	Users & Accounts
 *
 */
tcappcontrollers.controller('passwordResetModalController', ['$scope', '$uibModalInstance', 'AjaxService', function($scope, $uibModalInstance, AjaxService){

	$scope.info = {
		'email': '',
		'success': false,
		'failure': false,
		'buttonEnabled': true
	};

	$scope.close = function(){$uibModalInstance.close();};

	$scope.submit = function()
	{
		$scope.info.success = false;
		$scope.info.failure = false;
		$scope.info.buttonEnabled = false;

		AjaxService.post('/user-password-reset', {
			email: $scope.info.email
		}).then(function(data, status, headers, config){

			$scope.info.buttonEnabled = true;
			$scope.info.email = "";
			$scope.info.success = true;
		},function(error, status)
		{
			$scope.info.failure = error;
		});
	};
}]).controller('PasswordResetController', ['$scope', '$routeParams', '$location', '$interval', 'AjaxService', function($scope, $routeParams, $location, $interval, AjaxService)
{
	$scope.model = { "newPassword": "", "buttonEnabled": true };
	$scope.model.redirect = !$routeParams.redirect;

	$scope.buttons = {
		resetConfirm: function()
		{
			$scope.model.buttonEnabled = false;
			AjaxService.post('/password-reset/' + $routeParams.hash, $scope.model).then(function(response){

				//reset success
				// $scope.model.countDown = 3;
				$scope.model.success = true;
				// var redirect = $interval(function(){
				// 	$scope.model.countDown--;
				// 	if ($scope.model.countDown <= 0 && $scope.model.redirect)
				// 	{
				// 		$interval.cancel(redirect);
				// 		$location.url('/login?prefill='+$scope.model.varName);
				// 	}
				// }, 1000);
			},function(error){
				console.error(error);
				$scope.model.fail = error.result;
				$scope.model.buttonEnabled = true;
			});
		}
	};
}]);

tcappcontrollers.controller('LoginSignupController', ['$scope','$uibModal','$log','UserService',
	function ($scope, $modal, $log, UserService)
	{
		$scope.signupview = false;
		$scope.toggleView = function()
		{
			$scope.signupview = !$scope.signupview;
		};

		$scope.passwordReset = function(){

			$modal.open(
			{
				templateUrl: $scope.baseFolder + 'partials/m-passwordreset.html',
				controller: 'passwordResetModalController'
			});
		};
	}
]);

tcappcontrollers.controller('LoginController', ['$scope', '$log', '$timeout', '$routeParams', 'UserService', 'BroadCastService', 'RouteService',
	function ($scope, $log, $timeout, $routeParams, UserService, BroadCastService, RouteService)
	{
		$scope.model = {
			"user": {
				"username": $routeParams.prefill || "",
				"password": ""
			}
		};

		if ($("#Username").length)
		{
			$("#Username").focus();
		}

		$scope.$watch("ajaxButton1.status", function(newVal, oldVal)
		{
			if ($scope.ajaxButton1.status)
			{
				$timeout(function(){
					$scope.ajaxButton1.status = 0;
					$scope.alertClass = false;
					$scope.alertMessage = "";

				}, 5000);
			}
		});

		$scope.ajaxButton1 = {
			"config": [
				{ "class": "btn-primary", "icon": "", "message": "Log In" },
				{ "class": "btn-primary", "icon": "", "message": "Logging In..." },
				{ "class": "btn-success", "icon": "fa-thumbs-up", "message": "OK!" },
				{ "class": "btn-danger", "icon": "fa-warning", "message": "Invalid Username or Password" }
			],
			"status": 0,
			"button": function()
			{
				if (!$scope.ajaxButton1.status)
				{
					$scope.ajaxButton1.status = 1;

					UserService.login({ "username": $scope.model.user.username, "password": $scope.model.user.password }).then(function(response)
					{
						$scope.ajaxButton1.status = 2;
						RouteService.change('endnodes');
					},
					function(error)
					{
						$scope.ajaxButton1.status = 3;
						$log.info(error);
					});
				}
			}
		};

	}
]);
tcappcontrollers.controller('SignupController', ['$scope', 'LogService', '$timeout', 'AjaxService', 'UserService', 'RouteService',
	function ($scope, $log, $timeout, AjaxService, UserService, RouteService)
	{
	    $scope.model = { 'user': {}};
		$scope.alerts = [];

	    $scope.$watch('user.newPassword', function () {
	      checkPasswordMatch();
	    });

	    $scope.$watch('user.newPasswordConfirm', function () {
	      checkPasswordMatch();
	    });

	    function checkPasswordMatch() {
	      if ($scope.model.user.newPassword && $scope.model.user.newPassword.length > 0) {
	        if ($scope.model.user.newPassword != $scope.model.user.newPasswordConfirm)
	        {
	          return false;
	        }
	        else
	        {
	          return true;
	        }
	      }
	    }

		$scope.$watch("ajaxButton1.status", function()
		{
			if ($scope.ajaxButton1.status)
			{
				$timeout(function(){ $scope.ajaxButton1.status = 0; }, 2000);
			}
		});

		$scope.ajaxButton1 = {
			"config": [
				{ "class": "btn-primary", "icon": "", "message": "Sign Up" },
				{ "class": "btn-primary", "icon": "", "message": "Signing Up..." },
				{ "class": "btn-success", "icon": "fa-thumbs-up", "message": "OK! Logging In..." },
				{ "class": "btn-error", "icon": "fa-warning", "message": "Error" }
			],
			"status": 0,
			"button": function()
			{
				if (!$scope.ajaxButton1.status)
				{
					if (checkPasswordMatch())
					{
						$scope.ajaxButton1.status = 1;
						AjaxService.post('/signup', {
							email: $scope.model.user.newEmail,
							password: $scope.model.user.newPassword//,
						}).then(function (response) {

							UserService.login({ "username": $scope.model.user.newEmail, "password": $scope.model.user.newPassword }).then(function(response)
							{
								RouteService.change('endnodes');
								$scope.ajaxButton1.status = 2;
							});

						},function (error) {
							$scope.ajaxButton1.status = 3;
							$scope.ajaxButton1.config[3].message = "Error " + error.message;
							$log.info(error);
						});
					}
				}
			}
		};
}]);

tcappcontrollers.controller('UserNotificationsController', ['$scope', '$uibModal', '$timeout', 'LogService', 'AjaxService', 'UserService',
	function($scope, $uibModal, $timeout, $log, AjaxService, UserService)
	{
		var Controller = this;
		Controller.model = {};

		Controller.model.resetConfirm = false;
		Controller.resetNotifDeliveryMethods = function()
		{
			if (!Controller.model.resetConfirm)
			{
				Controller.model.resetConfirm = true;
				return;
			}
			Controller.model.resetConfirm = false;
			AjaxService.get("/notif-delivery-reset").then(function(result)
			{
				_get_notif_delivery();
			});
		};

		Controller.editNotifDeliveryMethod = function(method)
		{
			var modalInstance = $uibModal.open(
			{
				templateUrl: $scope.baseFolder + 'partials/m-notification-delivery-edit.html',
				controller: 'EditNotificationDeliveryModalController',
				resolve: {
					model: function()
					{
						return method;
					}
				}
			});

			modalInstance.result.then(_get_notif_delivery);
		};

		var _get_notif_delivery = function()
		{
			AjaxService.get("/notif-delivery").then(function(result)
			{
				Controller.model.notifDeliveryMethods = result;
			},function(error)
			{
				console.error(error);
			});
		};
		_get_notif_delivery();

	}
])
.controller('UserRolesController', ['$scope', '$uibModal', '$timeout', 'LogService', 'AjaxService', 'UserService',
	function($scope, $uibModal, $timeout, $log, AjaxService, UserService)
	{
		var Controller = this;
		Controller.model = {};

		UserService.session().then(function(response)
		{
			Controller.model.user = response;
		});
	}
])
.controller('UserDetailsController', ['$scope', '$uibModal', '$timeout', 'LogService', 'AjaxService', 'UserService',
	function($scope, $uibModal, $timeout, $log, AjaxService, UserService)
	{
		var Controller = this;
		Controller.model = {};

		UserService.session().then(function(response)
		{
			Controller.model.user = response;

			UserService.config().then(function(response)
			{
				Controller.model.config = response;
			});
		});

		Controller.saveUserName = function()
		{
			//
		};

		Controller.changePassword = function()
		{
			// open model window
			var modalInstance = $uibModal.open(
			{
				templateUrl: $scope.baseFolder + 'partials/m-password-edit.html',
				controller: 'ChangePasswordModalController',
				resolve: {
					model: function()
					{
						return Controller.model;
					}
				}
			});

			modalInstance.result.then(function(){

			});
		};
	}]
).controller('EditNotificationDeliveryModalController', function($scope, $uibModalInstance, UserService, AjaxService, model)
{
	UserService.session().then(function(response)
	{
		$scope.user = response;
	});

	AjaxService.get("/notif-services").then(function(result)
	{
		$scope.services = result;

		$scope.model = {
			"token": "",
			"service": null
		};

		if (model)
		{
			$scope.currentToken = model.token;
			$scope.model.token = model.token;
			$scope.model.service = model.service;
		}
		else
		{
			$scope.newMethod = true;
		}

		$scope.$watch('model.service', function(newVal, oldVal)
		{
			for (var i = 0; i < $scope.services.length; i++)
			{
				if ($scope.model.service == $scope.services[i].serviceType)
				{
					$scope.serviceObj = $scope.services[i];

					if (newVal != oldVal)
					{
						$scope.model.token = "";
						if ($scope.model.service == 'tiwiconnect-notif')
						{
							$scope.model.token = $scope.user.varName;
						}
					}
					break;
				}
			}

		});

	},function(error)
	{

	});

	$scope.cancel = function()
	{
		$uibModalInstance.close();
	};

	$scope.save = function()
	{
		if ($scope.newMethod)
		{
			AjaxService.post("/notif-delivery", $scope.model).then($uibModalInstance.close,function(error)
			{
				console.log(error);
			});
		}
		else
		{
			if ($scope.currentToken != $scope.model.newToken){
				$scope.model.newToken = $scope.model.token;
			}
			AjaxService.put("/notif-delivery/" + $scope.model.service + "/" + $scope.currentToken, $scope.model).then($uibModalInstance.close,function(error)
			{
				console.log(error);
			});
		}
	};

	$scope.delete = function()
	{
		if (!$scope.confirmDelete)
		{
			$scope.confirmDelete = true;
			return;
		}
		AjaxService.delete("/notif-delivery/" + $scope.model.service + "/" + $scope.currentToken).then(function(result)
		{
			$scope.confirmDelete = false;
			$uibModalInstance.close();
		},function(error)
		{
			console.log(error);
		});
	};

}).controller('ChangePasswordModalController', function($scope, $uibModalInstance, AjaxService, model)
{
	$scope.editThis = JSON.parse(JSON.stringify(model.user));
	$scope.changePasswordSubmit = function()
	{
		AjaxService.put('/user/password',
			{
				userPkg: $scope.editThis
			}
		).then(function(returned)
		{
			$('#ChangePasswordModal').modal('hide');
			$scope.saveUserDetails.status = 2;
			$scope.editThis = {};
		},function(error)
		{
			$scope.saveUserDetails.status = 3;
		});
	};

});


/*
 *
 *  Alerts
 *
 */

tcappcontrollers.controller('AlertsController', ['$scope', 'NotificationsSrv', 'UserService',
	function ($scope, NotificationsSrv, UserService)
	{
		$scope.model = { "alerts": [], "sort": [], "page": 1, "pages": 1 };

		NotificationsSrv.get().then(function(response)
		{
			$scope.model.alerts = response;
		});

		$scope.buttons = {
			queue: function(alert)
			{
				NotificationsSrv.queue(alert).then(function(){
					alert.queued = true;
				});
			},
			unqueue: function(alert)
			{
				NotificationsSrv.unqueue(alert).then(function(){
					alert.queued = false;
				});
			},
			trash: function(id)
			{
				NotificationsSrv.trash(id).then(function(resp){});
			}
//			more: NotificationsSrv.getMore
		};
	}
])
.controller('TriggersController', ['$scope', '$uibModal', '$log', '$routeParams', 'TriggerService', 'DeviceService', 'UserService',
	function ($scope, $modal, $log, $routeParams, TriggerService, DeviceService, UserService)
	{
		$scope.model = {};

		$scope.TriggerList = {
			'sort': 'metaData.name',
			'reverse': false
		};

		if ($routeParams.clientid)
		{
			DeviceService.get($routeParams.clientid).then(function(client)
			{
				$scope.model.client = client;
				_get_triggers();
			});
		}
		else
		{
			_get_triggers();
		}

		function _get_triggers()
		{
			TriggerService.get(true).then(function(response)
			{
				$scope.model.triggers = response;

				TriggerService.getSort().then(function(response)
				{
					$scope.model.triggersSort = response;
					_group_triggers();
				});
			});
		}

		function _group_triggers()
		{
			var _map = {};
			var _n = 0;
			var _c = '';
			$scope.model.groupedTriggers = [];

			for (var i = 0; i < $scope.model.triggersSort.length; i++)
			{
				if (_c != $scope.model.triggersSort[i].targetVarName)
				{
					_c = $scope.model.triggersSort[i].targetVarName;
				}

				// if we are on a page that's targeting a specific device, only show triggers for that device
				if (($scope.model.client && $scope.model.client.varName == _c) || !$scope.model.client)
				{
					if (_map[_c] === undefined)
					{
						_map[_c] = _n;
						$scope.model.groupedTriggers[_map[_c]] = [];
						_n++;
					}

					$scope.model.groupedTriggers[_map[_c]].push( $scope.model.triggersSort[i]);
				}
			}
		}

		$scope.buttons = {
			subscribe: function(trigger, subType)
			{
				TriggerService.subscribe(trigger.varName, subType).then(function(response){
					if (!trigger.subs){
						trigger.subs = {};
					}
					trigger.subs[subType] = true;
				},
				function(error){
					console.log(error);
				});
			},
			unsubscribe:  function(trigger, subType)
			{
				TriggerService.unsubscribe(trigger.varName, subType).then(function(response){
					if (!trigger.subs){
						trigger.subs = {};
					}
					trigger.subs[subType] = false;
				},
				function(error){
					console.log(error);
				});
			},
			edit: function(triggerVarName)
			{
				var modalInstance = $modal.open(
				{
					templateUrl: $scope.baseFolder + 'partials/m-trigger-edit.html',
					controller: 'triggerEditModalController',
					resolve: {
						triggerVarName: function()
						{
							return triggerVarName;
						},
						targetVarName: function()
						{
							if ($scope.model.client)
							{
								return $scope.model.client.varName;
							}
							return false;
						}
					}
				});

				modalInstance.result.then(function(){
					_get_triggers(true);
				});
			}
		};

	}
])
.controller("triggerEditModalController", function($scope, $log, $uibModalInstance, triggerVarName, targetVarName, DeviceService, TriggerService, UserService)
{
	$scope.model = {
		"conditionalsNumber": [
			{ "name": "equal to",		"value": "&&equals" },
			{ "name": "greater than",	"value": "&&greater" },
			{ "name": "less than",		"value": "&&less" }
		],
		"expiresKeys": [
			'minute',
			'hour',
			'day',
			'week',
			'month'
		],
		"targets": {},
		"options": [],
		"deleteEnabled": true
	};

	var retried = false;

	DeviceService.devices().then(function(response){
		if (response)
		{
			return response;
		}
		else
		{
			$log.debug($scope.model.viewDeviceId, " couldn't be loaded");
		}
	}).then(function(targets)
	{
		$scope.model.targets = targets;
		$scope.$watch('trigger.targetVarName', function(deviceid)
			{
				var _name = '';
				var _target = false;
				if (deviceid)
				{
					DeviceService.get(deviceid, {"force":true}).then(function(_target){
						if (_target)
						{
							$scope.model.paths = [];
							for (var p in _target.deviceTypeMap)
							{
								var _profile = _target.deviceTypeMap[p].at;
								for (var a in _profile)
								{
									if (_profile[a].dataType == 'number' || _profile[a].dataType == 'boolean')
									{
										_name = _profile[a].metaData.name ? _profile[a].metaData.name : a;

										//is not system
										if (!_profile[a].flags.SYS)
										{
											$scope.model.paths.unshift({
												"name": _name,
												"path": 'deviceTypeMap.' + p + '.at.' + a + '.value',
												"profile": p
											});
										}
									}
								}
							}

							//fill in the existing conditions
							for (var i = 0; i < $scope.trigger.conditionalMap.length; i++)
							{
								_trigger_options(i);
							}
						}
						else if (!retried)
						{
							retried = true;
							$scope.trigger.targetVarName = false;
							DeviceService.get(deviceid).then(function(response)
							{
								if (response)
								{
									$scope.trigger.targetVarName = response.varName;
								}
							});
						}
						else
						{
							console.error("boo");
						}
					});
				}
			}
		);

		if (targetVarName && !triggerVarName)
		{
			// new trigger
			$scope.trigger = {
				targetVarName: targetVarName,
				conditionalMap: [],
				metaData: {
					name: "",
					description: ""
				}
			};
			$scope.buttons.addCondition();
			$scope.loaded = true;
		}
		else if (!triggerVarName)
		{
			// new trigger
			$scope.trigger = {
				targetVarName: false,
				conditionalMap: [],
				metaData: {
					name: "",
					description: ""
				}
			};
			$scope.buttons.addCondition();
			$scope.loaded = true;
		}
		else
		{
			// edit existing trigger, make a copy
			TriggerService.get(triggerVarName).then(function(trigger)
			{
				$scope.loaded = true;
				$scope.trigger = JSON.parse( JSON.stringify(trigger));
				$scope.model.deleteEnabled = $scope.trigger.owner == UserService.get('varName');

			});
		}
	});

	function _trigger_options(condidx)
	{
		if (!$scope.trigger.conditionalMap[condidx])
		{
			return;
		}
		var _target = false;
		//find the target with the device id
		for (var k in $scope.model.targets)
		{
			if ($scope.model.targets[k].varName == $scope.trigger.targetVarName)
			{
				_target = $scope.model.targets[k];
				break;
			}
		}

		if ($scope.trigger.conditionalMap[condidx].cond_1_type == "path")
		{
			var _split = $scope.trigger.conditionalMap[condidx].cond_1.split(".");
			if (_split.length > 1)
			{

				if (!_target.deviceTypeMap[_split[1]].at[_split[3]].units)
				{
					_target.deviceTypeMap[_split[1]].at[_split[3]].units = "";
				}
				$scope.model.options[condidx] = {};
				$scope.model.options[condidx].units = _target.deviceTypeMap[_split[1]].at[_split[3]].units.split(',');
				$scope.model.options[condidx].min = _target.deviceTypeMap[_split[1]].at[_split[3]].min;
				$scope.model.options[condidx].max = _target.deviceTypeMap[_split[1]].at[_split[3]].max;
				$scope.model.options[condidx].dataType = _target.deviceTypeMap[_split[1]].at[_split[3]].dataType.toUpperCase();

				if (_split[4] == 'lastValue')
				{
					$scope.model.options[condidx].lastValue = true;
					$scope.trigger.conditionalMap[condidx].cond_1 =  $scope.trigger.conditionalMap[condidx].cond_1.replace(/\.lastValue$/,'.value');
				}

				if ($scope.model.options[condidx].dataType == 'BOOLEAN' && $scope.model.options[condidx].units.length < 2)
				{
					$scope.model.options[condidx].units = ["False", "True"];
				}
			}
		}
	}

	//selecting an attribute, finds the attribute's type and updates the conditional
	$scope.selectPath = _trigger_options;

	$scope.buttons = {
		ok: function()
		{
			$scope.trigger.conditionalMap.forEach(function(c,i)
			{
				if ($scope.model.options[i].lastValue)
				{
					$scope.trigger.conditionalMap[i].cond_1 =  $scope.trigger.conditionalMap[i].cond_1.replace(/\.value$/,'.lastValue');
				}
			});

			// save the trigger
			TriggerService.save($scope.trigger).then(function(saved){
				$uibModalInstance.close();
			},function(err)
			{
				alert(err);
			});
		},
		cancel: $uibModalInstance.close,
		trash: function()
		{
			TriggerService.trash(triggerVarName).then($uibModalInstance.close);

		},
		addCondition: function()
		{
			$scope.trigger.conditionalMap.push({
				"operand":"&&equals",
				"cond_1":"",
				"cond_1_type":"path",
				"cond_2": "",
				"cond_2_type": "const"
			});
		},
		removeCondition: function(idx)
		{
			$scope.trigger.conditionalMap.splice(idx, 1);
		}
	};
});

/*
 *
 *	EndNode Controllers
 *
 */



angular.module('tcapp.controllers.endnodes', [])
.controller('GroupListController', ['$scope', '$log', '$routeParams', 'DeviceService', 'UserService','AjaxService',
	function ($scope, $log, $routeParams, DeviceService, UserService, AjaxService)
	{
		var GroupController = this;

		//get the group
		AjaxService.get('/groups/'+$routeParams.clientid+'/members').then(function(response)
		{
			GroupController.group = response.group;
			GroupController.members = response.members;
		},function(error)
		{
			console.error(error);
		});

		GroupController.refreshWifiStatus = function(device)
		{
			//send action to device
			var actionPackage = {
				'cmd': 'EndNodeAction',
				'sys': false,
				'cuspar': false,
				'path': device._id+'.wifiStatus.GetAtts',
				'params': {}
			};

			AjaxService.post('/action', { "data": actionPackage })
			.then(function(returned)
			{
				//simulate the socket ack
			},function(error)
			{
				$log.log("There was an error sending the action.");
			});

		};
/*
		//get the devices
		DeviceService.devices(options).then(function(response){
			$scope.loaded = true;
			GroupController.devices = response;
		});
*/
		//filter by the group member

	}
])
.controller('DeviceListController', ['$scope', '$log', 'DeviceService', 'UserService', 'AjaxService',
	function ($scope, $log, DeviceService, UserService, AjaxService)
	{
		$scope.model = {
			"devices": {},
			"sort": []
		};
		$scope.DeviceList = {};
		$scope.GroupList = {};
		$scope.loadedDelta = 10;

		UserService.session().then(function(response)
		{
			$scope.model.user = response;
			UserService.config().then(function(config)
			{
				$scope.model.config = config;
				_get_devices({"force":true});
			});
		});

		var _userHasDevice = function(device)
		{
			return true;
//			return $scope.model.user.auth.roleMap.endNodes.indexOf(device._id) != -1;
		};

		this.clientSort = 'metaData.name';
		this.reverse = false;

		function _get_devices(options)
		{
			$scope.model.sort.length = 0;
			DeviceService.devices(options).then(function(response){
				$scope.devicesLoaded = true;
				$scope.model.devices = response;
				$scope.loadedDelta = DeviceService.loadedDelta();
				_sort();
			});
		}

		function _sort()
		{
			for (var k in $scope.model.devices)
			{
				$scope.model.devices[k].tcUserHasDevice = _userHasDevice($scope.model.devices[k]);
				$scope.model.sort.push($scope.model.devices[k]);
			}

			AjaxService.get('/groups').then(function(response)
				{
					//list the groups
					$scope.model.groups = response;
					$scope.groupsLoaded = true;
				});
		}

		$scope.$on('bcm.endnodesrefresh', function(){
			_get_devices({'force': true});
		});

		$scope.buttons = {
			getMore: function()
			{
				DeviceService.moreDevices().then(function(response)
				{
					$log.debug("more devices loaded");
					_sort();
				});
			},
			refreshDevices: function()
			{
				$scope.loaded = false;
				_get_devices({"force":true});
			},
			saveConfig: function()
			{
				UserService.config({"allDevices": $scope.model.config.allDevices }).then(function(){
					$scope.buttons.refreshDevices();
				});
			}
		};
	}
])
.controller('HomeController', ['$scope', 'LogService', '$timeout', 'DeviceService',
	function($scope, $log, $timeout, DeviceService)
	{
		$scope.model = {
			"viewDeviceId": "",
			"sysProfiles": {}
		};

		$scope.getDataType = DeviceService.getDataType;
	}
])
.controller('DeviceDetailController', ['$scope', '$route', 'LogService', '$timeout', 'DeviceService', 'AjaxService',
	function($scope, $route, $log, $timeout, DeviceService, AjaxService)
	{
		// setup model and identity
		$scope.model = {
			"viewDeviceId": $route.current.params.endnodeid,
			"showList": 1,
			"hasActions": {},
			"hasAttributes": {},
			"sysProfiles": {}
		};

		DeviceService.get($scope.model.viewDeviceId, {"force": true}).then(function(device)
		{
			device.deviceTypeMapSort = [];
			$scope.model.device = device;

			// AjaxService.get("/log-counts/"+device.varName).then(function(resp){
			// 	var log_counts = {};
			// 	for (var i = 0; i < resp.length; i++){
			// 		log_counts[resp[i]._id] = resp[i].count;
			// 	}
				for (var _p in device.deviceTypeMap){
					if (!('metaData' in device.deviceTypeMap[_p])){
						device.deviceTypeMap[_p].metaData = {"name": _p};
					}
					device.deviceTypeMap[_p].varName = _p;
					device.deviceTypeMapSort.push(device.deviceTypeMap[_p]);

					$scope.model.sysProfiles[_p] = true;
					for (var _at in device.deviceTypeMap[_p].at){
						if (!('metaData' in device.deviceTypeMap[_p].at[_at])){
							device.deviceTypeMap[_p].at[_at].metaData = {"name": _p+"."+_at};
						}

						try {
							$scope.model.sysProfiles[_p] = !device.deviceTypeMap[_p].at[_at].flags && !device.deviceTypeMap[_p].at[_at].flags.SYS;
							// device.deviceTypeMap[_p].at[_at].logs = log_counts[device.varName+"."+_p+"."+_at] || 0;
						} catch (error){}
					}
					for (var _ac in device.deviceTypeMap[_p].ac){
						if (!('metaData' in device.deviceTypeMap[_p].ac[_ac])){
							device.deviceTypeMap[_p].ac[_ac].metaData = {"name": _p+"."+_ac};
						}
						try {
							$scope.model.sysProfiles[_p] = !device.deviceTypeMap[_p].ac[_ac].flags && !device.deviceTypeMap[_p].ac[_ac].flags.SYS;
						} catch (error) {}
					}
				}
			// }, function(err){
			// 	console.error(err);
			// });
		});

		$scope.getDataType = DeviceService.getDataType;

		function jq( myid ) {
		    return myid.replace( /(:|\.|\[|\])/g, "\\$1" );
		}

		$scope.buttons = {
			toggleFlag: function(varP, varA, flag)
			{
				$scope.model.device.deviceTypeMap[varP].at[varA].flags[flag] = !$scope.model.device.deviceTypeMap[varP].at[varA].flags[flag];
				DeviceService.save($scope.model.device._id).then(function(result) {

				}, function(error){
					$log.error(error);
				});
			}
		};
	}]
)
.controller('DeviceAddController', ['$scope', 'LogService', '$uibModal', 'DeviceService', 'AjaxService', 'UserService', 'BroadCastService',
	function ($scope, $log, $modal, DeviceService, AjaxService, UserService, BroadCastService)
	{
		$scope.addDevice = function()
		{
			var modalInstance = $modal.open(
			{
				templateUrl: $scope.baseFolder + 'partials/m-device-add.html',
				controller: addDeviceModalController,
				resolve: {
					view: function()
					{
						return $scope.view;
					}
				}
			});
		};

		$scope.quickAddDevice = function(device)
		{
			AjaxService.post('/endnodes',
				{
					deviceId: device.auth.deviceId,
					regPin: device.auth.regPin
				}
			)
			.then(function(returned)
			{
					DeviceService.devices({"force": true}).then(function()
					{
						BroadCastService.broadcast('endnodesrefresh');
					});
			},function(status, returned)
			{
				$log.error(status);
			});
		};

		var addDeviceModalController = function($scope, $uibModalInstance, view)
		{
			$scope.view = view;
			$scope.modalModel = {
				"deviceId": '',
				"regPin": ''
			};

			$scope.ok = function()
			{
				AjaxService.post('/endnodes',
					{
						deviceId: $scope.modalModel.deviceId,
						regPin: $scope.modalModel.regPin
					}
				)
				.then(function(returned)
				{
					//add the device to the user's roleMap
					DeviceService.devices({"force": true}).then(function(response)
					{
						$scope.modalModel = {
							"deviceId": '',
							"regPin": ''
						};

						BroadCastService.broadcast('endnodesrefresh');
						$uibModalInstance.close();
					});
				},function(status, returned)
				{
					$scope.modalModel.message = status;

					$log.error(status);
				});
			};

			$scope.cancel = function()
			{
				$uibModalInstance.dismiss('cancel');
			};
		};
	}]
)

.controller('DeviceEditController', ['$scope', 'LogService', '$route', '$uibModal', 'DeviceService', 'BroadCastService', 'UserService', 'AjaxService',
 	function ($scope, $log, $route, $modal, DeviceService, BroadCastService, UserService, AjaxService)
	{
		//edit device
		$scope.buttons = {
			editDevice: function(deviceid)
			{
				var modalInstance = $modal.open(
				{
					templateUrl: $scope.baseFolder + 'partials/m-device-edit.html',
					controller: editDeviceModalController,
					resolve: {
						deviceid: function()
						{
							return deviceid;
						}
					}
				});

				// force refresh of the device model
				modalInstance.result.then(function(){
					DeviceService.get(deviceid, {"force": true});
				});
			}
		};

		var editDeviceModalController = function($scope, $uibModalInstance, deviceid)
		{
			$scope.model = {
				"device": {}
			};

			DeviceService.get(deviceid, {"force": true}).then(function(response)
				{
					$scope.model.device = response;
					$scope.editing = JSON.parse(JSON.stringify($scope.model.device));

/*
					$scope.model.rebuild = $scope.model.device.customTypeId != "";
					$scope.$watch('editing.customTypeId', function()
					{
						$scope.model.rebuild = $scope.editing.customTypeId == $scope.model.device.customTypeId;
					});
*/

//					$scope.customTypeAccess = !$scope.model.device.customTypeId;

					DeviceService.getTypes().then(function(response)
						{

							$scope.all_deviceTypes = response;
							$scope.selected_deviceTypes = {};

							$scope.$watch("selected_deviceTypes", function(newVal,oldVal)
							{
								$scope.editing.deviceTypeIds.length = 0;
								for (var k in newVal)
								{
									if (newVal[k].selected)
									{
										$scope.editing.deviceTypeIds.push(k);
									}
								}

								$scope.rebuild = 1;
								for (var i = 0; i < $scope.model.device.deviceTypeIds.length; i++)
								{
									if ($scope.editing.deviceTypeIds.indexOf($scope.model.device.deviceTypeIds[i]) == -1)
									{
										$scope.rebuild = 2;
										break;
									}
								}

								for (var i = 0; i < $scope.editing.deviceTypeIds.length; i++)
								{
									if ($scope.model.device.deviceTypeIds.indexOf($scope.editing.deviceTypeIds[i]) == -1)
									{
										$scope.rebuild = 2;
										break;
									}
								}

							},true);

							var my_deviceTypeIds = response.map(function(dt)
							{
								return dt.varName;
							});

							response.forEach(function(dt)
							{
								$scope.selected_deviceTypes[dt.varName] = {"selected": false, "SYS": dt.owner == "SYS", "access": true};
							});

							for (var i = 0; i < $scope.model.device.deviceTypeIds.length; i++)
							{
								if (my_deviceTypeIds.indexOf($scope.model.device.deviceTypeIds[i]) != -1)
								{
									for (var ii = 0; ii < response.length; ii++)
									{
										if (response[ii]._id == $scope.model.device.deviceTypeIds[i])
										{
											$scope.selected_deviceTypes[response[ii].varName].selected = true;
											break;
										}
										else if (response[ii].varName == $scope.model.device.deviceTypeIds[i])
										{
											$scope.selected_deviceTypes[response[ii].varName].selected = true;
											break;
										}
									}
								}
								else
								{
									$scope.hasOtherDeviceTypes = true;
									$scope.selected_deviceTypes[$scope.model.device.deviceTypeIds[i]] = {"access": false, "SYS": false, "selected": true};
								}
							}
						}
					);
				}
			);

			$scope.modal = $uibModalInstance;


			$scope.buttons = {
				devicePurgeMessages: function()
				{
					AjaxService.get('/admin-endnodes/purgemessages/'+$scope.model.device._id)
					.then(function(returned,status)
					{
						alert(returned.message);
					});
				},
				devicePurgeLogs: function()
				{
					AjaxService.get('/admin-endnodes/purgelogs/'+$scope.model.device._id)
					.then(function(returned,status)
					{
						alert(returned.message);
					});
				},
				rebuildTypes: function()
				{
					DeviceService.rebuild($scope.model.device._id).then(function(resp){
						$route.reload();
						$scope.modal.close();
					}, function(err)
					{
						alert("Device could not be rebuilt, check console.");
						console.error(err);
					});
				},
				addMeta: function()
				{
					if (!$scope.model.newKey)
					{
						$scope.model.newKey = 'new key';
						$scope.model.newValue = 'new val';
					}
					else if (!$scope.editing.metaData.hasOwnProperty($scope.model.newKey))
					{
						$scope.editing.metaData[$scope.model.newKey] = $scope.model.newValue;
						$scope.model.newKey = '';
						$scope.model.newValue = '';
					}
					else
					{
						$log.error("Duplicate Meta Key");
					}
				},
				trashMeta: function(key)
				{
					delete $scope.editing.metaData[key];
				},
				ok: function()
				{
					if (typeof $scope.model.newKey === 'string' && $scope.model.newKey.length > 0 )
					{
						$scope.buttons.addMeta();
					}

					DeviceService.save($scope.model.device._id, $scope.editing, {"push":true,"rebuild":$scope.rebuild == 2}).then(function(resp){
						$route.reload();
						$scope.modal.close();
					}, function(err){
						alert("Device could not be saved, check console.");
						console.error(err);
					});
				},
				cancel: function()
				{
					$uibModalInstance.dismiss('cancel');
				},
				removeDevice: function()
				{
					//open confirmation modal
					var modalInstance = $modal.open(
					{
						templateUrl: $scope.baseFolder + 'partials/m-confirm.html',
						controller: confirmClientRemoveModalController,
						resolve: {
							parentScope: function()
							{
								return {
									"message": "Are you sure you want to remove this device?",
									"modal":	$uibModalInstance,
								 	"authid": deviceid,
								 	"DeviceService": DeviceService
								};
							}
						}
					});

					function confirmClientRemoveModalController($scope, $uibModalInstance, parentScope)
					{

						$scope.modal = $uibModalInstance;
						$scope.message = parentScope.message;
						$scope.buttons = {
							ok: function()
							{
								parentScope.DeviceService.trash(parentScope.authid).then(function(returned)
								{
									DeviceService.devices({"force": true}).then(function(response)
									{
										BroadCastService.broadcast('endnodesrefresh');
										$scope.modal.close();
										parentScope.modal.close();
									});
								},
								function(error)
								{
									console.error(error);
								});
							},
							cancel: function()
							{
								$scope.modal.close();
							}
						};
					}
				}
			};
		};
	}
])
.controller('AttributeEditController', ['$scope', 'LogService', '$uibModal', 'DeviceService',
 	function ($scope, $log, $modal, DeviceService)
	{
		//edit device
		$scope.buttons = {
		    editAttribute: function(varD, varP, varA) {
		        $modal.open({
		            templateUrl: $scope.baseFolder + 'partials/m-attribute-edit.html',
		            controller: 'editAttributeModalController',
		            resolve: {
		                parentScope: function() {
		                    return {
		                        "deviceVarName": varD,
		                        "profileVarName": varP,
		                        "attributeVarName": varA
		                    };
		                }
		            }
		        });
		    }
		};
}])
.controller("editAttributeModalController", function($scope, $log, AjaxService, DeviceService, $uibModalInstance, parentScope){
	$scope.model = {
		"device": {}
	};

	DeviceService.get(parentScope.deviceVarName).then(function(response){
		$scope.model.device = response;
		$scope.model.attribute = $scope.model.device.deviceTypeMap[parentScope.profileVarName].at[parentScope.attributeVarName];

		//convert array to dictionary if needed
		if (Object.prototype.toString.call( $scope.model.attribute.flags ) === '[object Array]'){
			var _flags = {};
			for (var i = 0; i < $scope.model.attribute.flags.length; i++){
				_flags[$scope.model.attribute.flags[i]] = true;
			}
			$scope.model.attribute.flags = _flags;
		}
	});

	$scope.buttons = {
		removeAttributeLogs: function(){
			DeviceService.removeAttributeLogs($scope.model.device._id+'.'+parentScope.profileVarName+'.'+parentScope.attributeVarName).then(function(response){
				// alert("Logs Removed");
				$uibModalInstance.close();
			});
		},
		save: function() {
			DeviceService.save($scope.model.device._id).then(function(result) {
				$uibModalInstance.close();
			}, function(error){
				$log.error(error);
			});
		},
		cancel: function(){
			$uibModalInstance.close();
		}
	};
})
.controller('LoraApplicationListController', ['$scope', '$log', 'LoraService', 'UserService', 'AjaxService',
	function ($scope, $log, LoraService, UserService, AjaxService)
	{
		$scope.model = {
			"loraApplications": {},
			"sort": []
		};
		$scope.LoraApplicationList = {};
		$scope.loadedDelta = 10;

		UserService.session().then(function(response)
		{
			$scope.model.user = response;
			UserService.config().then(function(config)
			{
				$scope.model.config = config;
				_get_loraApplications({"force":true});
			});
		});

		var _userHasApplication = function(application)
		{
			return true;
		};

		this.clientSort = 'name';
		this.reverse = false;

		function _get_loraApplications(options)
		{
			$scope.model.sort.length = 0;
			LoraService.loraApplications(options).then(function(response){
				$scope.loraApplicationsLoaded = true;
				$scope.model.loraApplications = response;
				$scope.loadedDelta = LoraService.loadedDelta();
				_sort();
			});
		}

		function _sort()
		{
			for (var k in $scope.model.loraApplications)
			{
				$scope.model.loraApplications[k].tcUserHasApplication = _userHasApplication($scope.model.loraApplications[k]);
				$scope.model.sort.push($scope.model.loraApplications[k]);
			}
		}

		$scope.$on('bcm.loraapplicationsrefresh', function(){
			_get_loraApplications({'force': true});
		});

		$scope.buttons = {
			getMore: function()
			{
				LoraService.moreApplications().then(function(response)
				{
					$log.debug("more applications loaded");
					_sort();
				});
			},
			refreshLoraApplications: function()
			{
				$scope.loaded = false;
				_get_loraApplications({"force":true});
			},
			saveConfig: function()
			{
				UserService.config({"allLoraApplications": $scope.model.config.allLoraApplications }).then(function(){
					$scope.buttons.refreshLoraApplications();
				});
			}
		};
	}
])
.controller('LoraApplicationAddController', ['$scope', 'LogService', '$uibModal', 'LoraService', 'AjaxService', 'UserService', 'BroadCastService',
	function ($scope, $log, $modal, LoraService, AjaxService, UserService, BroadCastService)
	{
		$scope.addLoraApplication = function()
		{
			var modalInstance = $modal.open(
			{
				templateUrl: $scope.baseFolder + 'partials/m-loraapp-add.html',
				controller: addLoraApplicationModalController,
				resolve: {
					view: function()
					{
						return $scope.view;
					}
				}
			});

		};

		$scope.quickAddLoraApplication = function(device)
		{
			AjaxService.post('/loraApplications',
				{
					name: loraApplication.name,
					appEui: loraApplication.appEui
				}
			)
			.then(function(returned)
			{
					LoraService.loraApplications({"force": true}).then(function()
					{
						BroadCastService.broadcast('loraapplicationsrefresh');
					});
			},function(status, returned)
			{
				$log.error(status);
			});
		};

		var addLoraApplicationModalController = function($scope, $uibModalInstance, view)
		{
			$scope.view = view;
			$scope.modalModel = {
				"name": '',
				"appEui": ''
			};

			$scope.ok = function()
			{
				AjaxService.post('/loraapplications',
					{
						name: $scope.modalModel.name,
						appEui: $scope.modalModel.appEui
					}
				)
				.then(function(returned)
				{
					//Refresh the list
					LoraService.loraApplications({"force": true}).then(function(response)
					{
						$scope.modalModel = {
							"name": '',
							"appEui": ''
						};

						BroadCastService.broadcast('loraapplicationsrefresh');
						$uibModalInstance.close();
					});
				},function(status, returned)
				{
					$scope.modalModel.message = status;

					$log.error(status);
				});
			};

			$scope.cancel = function()
			{
				$uibModalInstance.dismiss('cancel');
			};
		};
  }
])
.controller('LoraApplicationEditController', ['$scope', 'LogService', '$route', '$uibModal', 'LoraService', 'BroadCastService', 'UserService', 'AjaxService',
 	function ($scope, $log, $route, $modal, LoraService, BroadCastService, UserService, AjaxService)
	{
		//edit application
		$scope.buttons = {
			editLoraApplication: function(appEui)
			{
				var modalInstance = $modal.open(
				{
					templateUrl: $scope.baseFolder + 'partials/m-loraapp-edit.html',
					controller: editLoraApplicationModalController,
					resolve: {
						appEui: function()
						{
							return appEui;
						}
					}
				});
				// force refresh of the application model
				modalInstance.result.then(function(){
					LoraService.get(appEui, {"force": true});
				});
			}
		};

		var editLoraApplicationModalController = function($scope, $uibModalInstance, appEui)
		{

			$scope.modalModel = {
				"name": '',
				"appEui": ''
			};

			LoraService.get(appEui, {"force": true}).then(function(response)
				{
					$scope.modalModel = response;
					//$scope.editing = JSON.parse(JSON.stringify($scope.modalModel));
				}
			);

			$scope.modal = $uibModalInstance;

			$scope.buttons = {
				ok: function()
				{
					LoraService.set($scope.modalModel.appEui, $scope.modalModel, {"push":true}, function(err)
					{
						if (!err)
						{
							$route.reload();
							$scope.modal.close();
						}
					});
				},
				cancel: function()
				{
					$uibModalInstance.dismiss('cancel');
				},
				removeLoraApplication: function()
				{
					//open confirmation modal
					var modalInstance = $modal.open(
					{
						templateUrl: $scope.baseFolder + 'partials/m-confirm.html',
						controller: confirmLoraApplicationRemoveModalController,
						resolve: {
							parentScope: function()
							{
								return {
									"message": "Are you sure you want to remove this application?",
									"modal":	$uibModalInstance,
								 	"appEui": appEui,
								 	"LoraService": LoraService
								};
							}
						}
					});

					function confirmLoraApplicationRemoveModalController($scope, $uibModalInstance, parentScope)
					{

						$scope.modal = $uibModalInstance;
						$scope.message = parentScope.message;
						$scope.buttons = {
							ok: function()
							{
								parentScope.LoraService.trashApplication(parentScope.appEui).then(function(returned)
								{
									LoraService.loraApplications({"force": true}).then(function(response)
									{
										BroadCastService.broadcast('loraapplicationsrefresh');
										$scope.modal.close();
										parentScope.modal.close();
									});
								},
								function(error)
								{
									console.error(error);
								});
							},
							cancel: function()
							{
								$scope.modal.close();
							}
						};
					}
				}
			};
		};
	}
])
.controller('LoraMoteListController', ['$scope', '$log', 'LoraService', 'UserService', 'AjaxService',
	function ($scope, $log, LoraService, UserService, AjaxService)
	{
		$scope.model = {
			"loraMotes": {},
			"sort": []
		};
		$scope.LoraMoteList = {};
		$scope.loadedDelta = 10;

		UserService.session().then(function(response)
		{
			$scope.model.user = response;
			UserService.config().then(function(config)
			{
				$scope.model.config = config;
				_get_loraMotes({"force":true});
			});
		});

		var _userHasMote = function(mote)
		{
			return true;
		};

		this.clientSort = 'name';
		this.reverse = false;

		function _get_loraMotes(options)
		{
			$scope.model.sort.length = 0;
			LoraService.loraMotes(options).then(function(response){
				$scope.loraMotesLoaded = true;
				$scope.model.loraMotes = response;
				$scope.loadedDelta = LoraService.loadedDelta();
				_sort();
			});
		}

		function _sort()
		{
			for (var k in $scope.model.loraMotes)
			{
				$scope.model.loraMotes[k].tcUserHasMote = _userHasMote($scope.model.loraMotes[k]);
				$scope.model.sort.push($scope.model.loraMotes[k]);
			}
		}

		$scope.$on('bcm.loramotesrefresh', function(){
			_get_loraMotes({'force': true});
		});

		$scope.buttons = {
			getMore: function()
			{
				LoraService.moreMotes().then(function(response)
				{
					$log.debug("more motes loaded");
					_sort();
				});
			},
			refreshLoraMotes: function()
			{
				$scope.loaded = false;
				_get_loraMotes({"force":true});
			},
			saveConfig: function()
			{
				UserService.config({"allLoraMotes": $scope.model.config.allLoraMotes }).then(function(){
					$scope.buttons.refreshLoraMotes();
				});
			}
		};
	}
])
.controller('LoraMoteAddController', ['$scope', 'LogService', '$uibModal', 'LoraService', 'AjaxService', 'UserService', 'BroadCastService',
	function ($scope, $log, $modal, LoraService, AjaxService, UserService, BroadCastService)
	{
		$scope.addLoraMote = function()
		{
			var modalInstance = $modal.open(
			{
				templateUrl: $scope.baseFolder + 'partials/m-loramote-add.html',
				controller: addLoraMoteModalController,
				resolve: {
					view: function()
					{
						return $scope.view;
					}
				}
			});

		};

		$scope.quickAddLoraMote = function(loraMote)
		{
			AjaxService.post('/loramotes',
				{
					devEui: loraMote.devEui,
					appEui: loraMote.appEui
				}
			)
			.then(function(returned)
			{
					LoraService.loraMotes({"force": true}).then(function()
					{
						BroadCastService.broadcast('loramotesrefresh');
					});
			},function(status, returned)
			{
				$log.error(status);
			});
		};

		var addLoraMoteModalController = function($scope, $uibModalInstance, view)
		{
			$scope.view = view;
			$scope.modalModel = {
				"devEui": '',
				"appEui": ''
			};

			$scope.ok = function()
			{
				AjaxService.post('/loramotes',
					{
						devEui: $scope.modalModel.devEui,
						appEui: $scope.modalModel.appEui
					}
				)
				.then(function(returned)
				{
					//Refresh the list
					LoraService.loraMotes({"force": true}).then(function(response)
					{
						$scope.modalModel = {
							"devEui": '',
							"appEui": ''
						};

						BroadCastService.broadcast('loramotesrefresh');
						$uibModalInstance.close();
					});
				},function(status, returned)
				{
					$scope.modalModel.message = status;

					$log.error(status);
				});
			};

			$scope.cancel = function()
			{
				$uibModalInstance.dismiss('cancel');
			};
		};

  }
])
.controller('LoraMoteEditController', ['$scope', 'LogService', '$route', '$uibModal', 'LoraService', 'BroadCastService', 'UserService', 'AjaxService',
 	function ($scope, $log, $route, $modal, LoraService, BroadCastService, UserService, AjaxService)
	{
		//edit mote
		$scope.buttons = {
			editLoraMote: function(devEui)
			{
				var modalInstance = $modal.open(
				{
					templateUrl: $scope.baseFolder + 'partials/m-loramote-edit.html',
					controller: editLoraMoteModalController,
					resolve: {
						devEui: function()
						{
							return devEui;
						}
					}
				});
				// force refresh of the mote model
				modalInstance.result.then(function(){
					LoraService.getMote(devEui, {"force": true});
				});
			}
		};

		var editLoraMoteModalController = function($scope, $uibModalInstance, devEui)
		{

			$scope.modalModel = {
				"devEui": '',
				"appEui": ''
			};

			LoraService.getMote(devEui, {"force": true}).then(function(response)
				{
					$scope.modalModel = response;
					//$scope.editing = JSON.parse(JSON.stringify($scope.modalModel));
				}
			);

			$scope.modal = $uibModalInstance;

			$scope.buttons = {
				ok: function()
				{
					LoraService.setMote($scope.modalModel.devEui, $scope.modalModel, {"push":true}, function(err)
					{
						if (!err)
						{
							$route.reload();
							$scope.modal.close();
						}
					});
				},
				cancel: function()
				{
					$uibModalInstance.dismiss('cancel');
				},
				removeLoraMote: function()
				{
					//open confirmation modal
					var modalInstance = $modal.open(
					{
						templateUrl: $scope.baseFolder + 'partials/m-confirm.html',
						controller: confirmLoraMoteRemoveModalController,
						resolve: {
							parentScope: function()
							{
								return {
									"message": "Are you sure you want to remove this mote?",
									"modal":	$uibModalInstance,
								 	"devEui": devEui,
								 	"LoraService": LoraService
								};
							}
						}
					});

					function confirmLoraMoteRemoveModalController($scope, $uibModalInstance, parentScope)
					{

						$scope.modal = $uibModalInstance;
						$scope.message = parentScope.message;
						$scope.buttons = {
							ok: function()
							{
								parentScope.LoraService.trashMote(parentScope.devEui).then(function(returned)
								{
									LoraService.loraMotes({"force": true}).then(function(response)
									{
										BroadCastService.broadcast('loramotesrefresh');
										$scope.modal.close();
										parentScope.modal.close();
									});
								},
								function(error)
								{
									console.error(error);
								});
							},
							cancel: function()
							{
								$scope.modal.close();
							}
						};
					}
				}
			};
		};
	}
]);
