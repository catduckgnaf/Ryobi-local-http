/* global io */
/* global angular */
/* global console */
/* global document */
'use strict';

angular.module('tcapp.services', ['tcapp.services.core', 'tcapp.services.tiwi']);

/* Core Services */
angular.module('tcapp.services.core', [])
.service('ConfigService', function(AjaxService, $q)
{
	var _config = false;
	return {
		get: function(key)
		{
			if (key && _config.hasOwnProperty(key))
			{
				return _config[key];
			}
			else
			{
				if (_config)
				{
					return $q.when(_config);
				}
				else
				{
					var deferred = $q.defer();
					AjaxService.get('/config').then(function(response)
					{
						_config = response;

						_config.webapp.appTitle = _config.webapp.siteTitle+' - '+_config.webapp.siteVersion;
						deferred.resolve(_config);
					},
					function(error){
						deferred.reject(error);
					});
					return deferred.promise;
				}
			}
		}
	};
})
.service('DownloadService', function()
{
	function _spawn(data, name)
	{
		var link = document.createElement('a');
		link.setAttribute('href', encodeURI(data));
		link.setAttribute('download', name);
		link.click();
		link.remove();
	}

	// This service creates links in the down for the specific type of download, and clicks the link to spawn the download window
	return {
		csv: function(filedata, filename)
		{
			if (!filename) {
				filename = 'untitled.csv';
			}
			var csvContent = 'data:text/csv;charset=utf-8,' + filedata;
			_spawn(csvContent, filename);
		},
		json: function(filedata, filename)
		{
			if (!filename) {
				filename = 'untitled.json';
			}
			var jsonContent = 'data:application/json;charset=utf-8,' + JSON.stringify(filedata, undefined, 4);
			_spawn(jsonContent, filename);

		}
	};
})
.service('SocketService', ['$rootScope', '$q', 'LogService', '$timeout', 'ConfigService', 'BroadCastService', '$websocket', '$location',
function($rootScope, $q, $log, $timeout, ConfigService, BroadCastService, $websocket, $location)
{
	var dataStream;
	var Service = this;
	this.connected = false;
	this.isAuthorized = false;
	var subscribedTopics = [];

	Service.reconnect = false;
	Service.auth = {};


	$rootScope.$on('bcm.socket.connected', function(evt, msg)
	{
		console.log('bcm.socket.connected', msg);
		//Service.connected = msg;
		$timeout.cancel(Service.reconnect);
		Service.reconnect = false;

		if (!msg.msg)
		{
			console.log("Starting Reconnect");
			//start the reconnect
			Service.reconnect = $timeout(function()
			{
				console.log("__to__");
				if (!Service.connected)
				{
					console.log("Trying Reconnect");
					Service.connect(Service.auth);
				}
				else
				{
					console.log("Canceling Reconnect");
					$timeout.cancel(Service.reconnect);
					Service.reconnect = false;
				}
			},2000);
		}
	});

	$rootScope.$on("bcm.ss.authorizedWebSocket", function(evt, msg)
	{
		if (msg.msg.params.authorized)
		{
			Service.isAuthorized = true;
			console.log("Sending Subscriptions");
			Service.socketId = msg.msg.params.socketId;
			// send all my subs
			subscribedTopics.forEach(Service.subscribeTopic);

			BroadCastService.broadcast('socket.socketId', Service.socketId);

		}
		else
		{
			Service.isAuthorized = false;
			console.log("Authorize Error");
		}
		BroadCastService.broadcast('socket.authorized', Service.isAuthorized);
	});


	this.connect = function(authObj, cb)
	{
		if (!authObj && !cb)
		{
			authObj = function(){};
		}

		if (!cb && typeof authObj === 'function')
		{
			cb = authObj;
			authObj = {};
		}
		//authObj = {"varName":"","apiKey":""}
		Service.auth = authObj;

		dataStream = $websocket('wss://' + $location.host() + '/api/wsrpc');
		dataStream.onOpen(function()
		{
			Service.connected = true;

			// send authentication request
			$log.warn("Socket <=> Connected");
			BroadCastService.broadcast('socket.connected', Service.connected);

			if (authObj.varName && authObj.apiKey)
			{
				Service.authorize(authObj.varName, authObj.apiKey, cb);
			}
			else
			{
				return cb();
			}
		});

		dataStream.onError(function()
		{
			console.log("$websocket errored");
		});

		dataStream.onClose(function()
		{
			Service.connected = false;
			Service.isAuthorized = false;
			$log.warn("Socket > < Disconnected");
			BroadCastService.broadcast('socket.connected', Service.connected);
			BroadCastService.broadcast('socket.authorized', Service.isAuthorized);
		});


		dataStream.onMessage(function(data)
		{
			var msg = data.data;
			console.log("Got Socket Message", msg);
			try {
				msg = JSON.parse(msg);
				BroadCastService.broadcast("ss." + msg.method, msg);
			}
			catch(error)
			{
				console.log("string data?", error);
				return;
			}

			if ('ID_' + msg.id in _requests && 'result' in msg)
			{
				_requests['ID_' + msg.id].resolve(msg);
				delete _requests['ID_' + msg.id];
			}
			else if ('ID_' + msg.id in _requests && 'error' in msg)
			{
				_requests['ID_' + msg.id].reject(msg);
				delete _requests['ID_' + msg.id];
			}
		});
	};

	var _requests = {};
	var _rpcid = 0;
	function rpcid()
	{
		_rpcid++;
		if (_rpcid > 9999)
		{
			_rpcid = 1;
		}
		return _rpcid;
	}

	this.request = function(method, params)
	{
		var id = rpcid();
		_requests['ID_'+id] = $q.defer();
		Service.emit(method, params, id);
		return _requests['ID_'+id].promise;
	};

	this.authorize = function(varName, apiKey)
	{
		console.log("authorizing", varName, apiKey);
		Service.notify("srvWebSocketAuth", {"varName": varName,"apiKey": apiKey});
	};

	var _add_topic = function(topic)
	{
		if (subscribedTopics.indexOf(topic) == -1)
		{
			subscribedTopics.push(topic);
		}
	};

	var _remove_topic = function(topic)
	{
		var idx = subscribedTopics.indexOf(topic);
		subscribedTopics.splice(idx, 1);
	};

	this.subscribeTopic = function(topic)
	{
		console.log("wskSubscribe", topic);

		Service.emit("wskSubscribe",{"topic": topic});
		_add_topic(topic);
	};
	this.subscribe = function(clientVarName, method)
	{
		if (!clientVarName || !method)
		{
			return;
		}

		var topic = clientVarName + "." + method;
		Service.subscribeTopic(topic);
	};

	this.unsubscribeAll = function()
	{
		Service.emit("wskClearSubscriptions");
		subscribedTopics.length = 0;
	};

	this.unsubscribe = function(clientVarName, method)
	{
		var topic = clientVarName + "." + method;
		console.log("wskUnsubscribe", topic);

		Service.emit("wskUnsubscribe",{"topic": topic});
		_remove_topic(topic);
	};

	this.on = function(eventName, cb)
	{
		if (!eventName && !cb)
		{
			return;
		}

		if (cb)
		{
			dataStream.onMessage(eventName, cb);
		}
		else
		{
			dataStream.onMessage(cb);
		}
	};

	this.disconnect = function()
	{
		if ('close' in dataStream)
		{
			dataStream.close();
		}
	};

	this.notify = function(method, params)
	{
		Service.emit(method, params);
	};

	this.emit = function(method, params, id)
	{
		var rpc = {"jsonrpc":"2.0", "method": method};
		if (params)
		{
			rpc.params = params;
		}
		if (id)
		{
			rpc.id = id;

		}

		if (Service.isAuthorized || rpc.method == "srvWebSocketAuth")
		{
			console.log("emit", rpc);

			dataStream.send(JSON.stringify(rpc));
		}
		else
		{
			console.error(method, "not emitted, not authorized yet...");
		}
	};


	this.socketed = function()
	{
		return Service.connected;
	};

	this.authorized = function()
	{
		return Service.isAuthorized;
	};

}])
.service('AjaxService', ['$rootScope', '$http', '$q', '$timeout', 'LogService', 'BroadCastService',
function($rootScope, $http, $q, $timeout, $log, BroadCastService)
{
	var sitePrefix = '/api'; //ConfigService.getSitePrefix();
	var apiVersion = "";

	var httpConnected = false;
	var _loading = false;


	function loading()
	{
		if (_loading)
		{
			//BroadCastService.broadcast("loading", true);
		}
	}

	function doneLoading(_to)
	{
		_loading = false;
		//BroadCastService.broadcast("loading", false);
		$timeout.cancel(_to);
	}

	var _active_promises = {};
	var _http_op_wrapper = function(op, path, body, apiV)
	{
		var _valid_ops = ["get", "post", "put", "delete"];
		if (_valid_ops.indexOf(op) == -1)
		{
			$q.reject("Invalid Operation");
		}

		var _version = apiVersion;
		if (apiV && body)
		{
			_version = apiV;
		}

		if (!body)
		{
			body = {};
		}
		var deferred = $q.defer();

		$http[op](sitePrefix + _version + path, body).then(
			function(result)
			{
				if (!httpConnected)
				{
					httpConnected = true;
					//$log.debug("http connected");
					BroadCastService.broadcast("debug", "httpconnection "+ httpConnected);
					BroadCastService.broadcast("httpconnection", httpConnected);

				}

				result = result.data;
				result = result.data || result.result || result;
				deferred.resolve(result);
			},
			function(error)
			{
				if (httpConnected && error.status == 502)
				{
					httpConnected = false;
					BroadCastService.broadcast("debug", "httpconnection "+ httpConnected);
					BroadCastService.broadcast("httpconnection", httpConnected);
				}

				error = error.data || error.result || error;
				deferred.reject(error);
			});
		return deferred.promise;
	};

	var _methods = {
		get: function(path, apiV)
		{
			return _http_op_wrapper("get", path, apiV);
		},
		post: function(path, body, apiV)
		{
      console.log("posting " + path + " body: " + JSON.stringify(body));
			return _http_op_wrapper("post", path, body, apiV);
		},
		put: function(path, body, apiV)
		{
			return _http_op_wrapper("put", path, body, apiV);
		},
		delete: function(path, body, apiV)
		{
			return _http_op_wrapper("delete", path, body, apiV);
		},
		httpConnected: function()
		{
			return httpConnected;
		}
	};
	_methods.trash = _methods.delete;
	_methods.getDeferred = _methods.get;
	return _methods;
}])

.service('BroadCastService', [ '$rootScope',
function ($rootScope)
{
  this.broadcast = function (key, message) {
    if (!key) {
      console.error('BroadCastService ERROR: broadcast requires a key');
      return;
    }
    if (message === undefined) {
      message = null;
    }
    $rootScope.$broadcast('bcm.' + key, {
        'key': key,
        'msg': message
      });
  };
}])

.service('RouteService', ['$rootScope', '$route', 'LogService', '$q', '$location', 'AjaxService', 'BroadCastService',
function($rootScope, $route, $log, $q, $location, AjaxService, BroadCastService)
{
	var _routesLoaded = false;
	var _routesCount = 0;
	var _routes = {};

	var constructRoutes = function(newRoutes, cb)
	{
		var _validRoutes = [];
		for (var i = 0; i < newRoutes.length; i++)
		{
			_validRoutes.push(newRoutes[i].viewId);
			if (!_routes.hasOwnProperty(newRoutes[i].viewId))
			{
				_routesCount++;

				if (newRoutes[i].controller === undefined)
				{
					newRoutes[i].controller = "viewController";
				}
				addRoute(newRoutes[i].viewRoute, {
					"templateUrl": newRoutes[i].templateUrl,
					"controller": newRoutes[i].controller
				});

				_routes[newRoutes[i].viewId] = newRoutes[i];
			}
		}

		//remove loaded routes that are no longer valid, ignore custom routes that don't have a DB _id
		for (var r in _routes)
		{
			if (_validRoutes.indexOf(r) == -1 && _routes[r].hasOwnProperty("_id"))
			{
				delete _routes[r];
			}
		}

		if (typeof cb == 'function')
		{
			cb();
		}
	};

	function addRoute(path, route)
	{
		$route.routes[path] = angular.extend(
		{
			reloadOnSearch: true
		}, route, path && pathRegExp(path, route));
		// create redirection for trailing slashes
		if (path)
		{
			var redirectPath = (path[path.length - 1] == '/') ? path.substr(0, path.length - 1) : path + '/';
			$route.routes[redirectPath] = angular.extend(
			{
				redirectTo: path
			}, pathRegExp(redirectPath, route));
		}
		return this;
	}
    function pathRegExp(path, opts)
	{
		var insensitive = opts.caseInsensitiveMatch,
			ret = {
				originalPath: path,
				regexp: path
			},
			keys = ret.keys = [];
		path = path.replace(/([().])/g, '\\$1').replace(/(\/)?:(\w+)([\?\*])?/g, function(_, slash, key, option)
		{
			var optional = option === '?' ? option : null;
			var star = option === '*' ? option : null;
			keys.push(
			{
				name: key,
				optional: !! optional
			});
			slash = slash || '';
			return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (star && '(.+?)' || '([^/]+)') + (optional || '') + ')' + (optional || '');
		}).replace(/([\/$\*])/g, '\\$1');
		ret.regexp = new RegExp('^' + path + '$', insensitive ? 'i' : '');
		return ret;
	}

	function defineRoute(route)
	{
		if (route.controller === undefined)
		{
			route.controller = "viewController";
		}

		if (!_routes.hasOwnProperty(route.viewId))
		{
			_routesCount++;
		}
		route.$$localRoute = true;
		_routes[route.viewId] = route;

		addRoute(route.viewRoute, {
			"templateUrl": route.templateUrl,
			"controller": route.controller
		});
	}

	function _change_view(viewid, param)
	{
		var urlParam = '';
		var url = '';
		if (param)
		{
			urlParam = '/'+param;
		}

		if (_routes.hasOwnProperty(viewid))
		{
			url = _routes[viewid].viewRoute + urlParam;
			$location.url(url);
		}
		else
		{
			$log.error("RouteService: invalid route ID: " + viewid);
		}
	}

	$rootScope.$on('$locationChangeSuccess', function () {
		BroadCastService.broadcast("loading", false);
    });

	return {
		get: function(viewId)
		{
			if (viewId && _routes.hasOwnProperty(viewId))
			{
				return $q.when(_routes[viewId]);
			}
			else if (viewId)
			{
				return $q.reject({});
			}

			if (_routesLoaded)
			{
				return $q.when(_routes);
			}

			var deferred = $q.defer();
			for (var i = 0; i < TcViews.length; i++)
			{
				TcViews[i].templateUrl = 'modules/tc.webapp/' + TcViews[i].templateUrl;
			}
			constructRoutes(TcViews, function() {
				_routesLoaded = true;
				deferred.resolve(_routes);
			});
			return deferred.promise;
		},
		define: function(routes, cb)
		{
			var array = [];
			routes = array.concat(routes);
			constructRoutes(routes, cb);
		},
		change : _change_view,
		count : function()
		{
			return _routesCount;
		},
		getByUrl: function(_routeUrl)
		{
			var view = _routeUrl.split('/');
			var regex = new RegExp("\\/"+view[1]+"\\/?:?\\w*");

			for (var r in _routes)
			{
				if (regex.exec(_routes[r].viewRoute))
				{
					return _routes[r];
				}
			}

		},
		getViewId: function (_routeUrl)
		{
			var view = _routeUrl.split('/');
			var regex = new RegExp("\\/"+view[1]+"\\/?:?\\w*");

			for (var r in _routes)
			{
				if (regex.exec(_routes[r].viewRoute))
				{
					return r;
				}
			}
		}
	};
}])
.service('LogService', ['$log', 'BroadCastService',
function($log, BroadCastService)
{
	var _debugTgl = true;
	function _log(cmd, _m)
	{
		$log[cmd](_m);
		if (_debugTgl)
		{
			_debug(_m);
		}
	}
	function _debug(_m)
	{
			BroadCastService.broadcast("debug", _m);
	}
	return {
		info: function(_m)
		{
			_log('info', _m);
		},
		error: function(_m)
		{
			_log('error', _m);
		},
		debug: function(_m)
		{
			_debug(_m);
		},
		warn: function(_m)
		{
			_log('info', _m);
		},
		log: function(_m)
		{
			_log('log', _m);
		}
	};
}]);
/* TiWi Services */
angular.module('tcapp.services.tiwi', [])
.service('UserService', ['$rootScope', '$q', 'LogService', '$timeout', 'AjaxService', 'SocketService', 'BroadCastService',
function($rootScope, $q, $log, $timeout, AjaxService, SocketService, BroadCastService)
{
	var _user = {},
		_loggedIn = false,
		_configDoc = false,
		_config = false;

	var _save_user = function()
	{
		AjaxService.put('/user', {"data": _user}).then(function (returned, status){
			console.log("Saved User", returned);
		});

	};

	var _save_config = function()
	{
		if (!_config)
		{
			return $q.when('No Config');
		}
		_save_user();
		var _promise = $q.defer();
		AjaxService.put('/user/config', {"config":_config}).then(function (returned, status)
		{
			$log.info("User Config Saved");
			_promise.resolve(_config);
		},function(error){
			$log.error("Error saving config", error);
			_promise.reject(error);
		});
		return _promise.promise;
	};

	var _get_config = function(force)
	{
		if (_config && !force)
		{
			return $q.when(_config);
		}

		var _promise = $q.defer();
		AjaxService.get('/user/config').then(
			function(returned)
			{
				_config = returned.config || {};
				_promise.resolve(_config);
			},
			function(error)
			{
				$log.error("Error loading config", error);
				_promise.reject(error);
			}
		);
		return _promise.promise;
	};

	var _log_in = function (request)
	{
		var _promise = $q.defer();
		AjaxService.post('/login', request).then(
			function (response)
			{
				return _activate_user(response).then(function(user)
				{
					_promise.resolve(user);
				});

			},function(response){
				$log.error("user couldn't be logged in");
				_promise.reject(response);
				//_deactivate_user();
			});
		return _promise.promise;

	};

	var _log_out = function()
	{
		return AjaxService.get('/logout').then(
			function (response)
			{
				return _deactivate_user();
			},
			function (error)
			{
				//error loggin out
				$log.error("log out error", error);
			}
		);
	};

	var _session_promise;
	var _get_session = function(force)
	{
		if (_loggedIn && !force)
		{
			return $q.when(_user);
		}

		if (_session_promise)
		{
			return _session_promise;
		}

		_session_promise = AjaxService.get('/user/session').then(
			function(returned)
			{
				returned.email = returned.accountOptions.email;
				returned.alertEmail = returned.accountOptions.alertEmail;
				return _activate_user(returned);
			},
			function(error)
			{
				$log.info("Error getting session", error);
				return _deactivate_user();
			}
		).then(function()
		{
			// clear the promise when everything is done, last in the chain.
			_session_promise = false;
		});
		return _session_promise;
	};

	var _activate_user = function(returnedUser)
	{
		$rootScope.__currentAppUser	= _user = returnedUser;
		//load the user's config

		return _get_config().then(function(config)
		{
			_loggedIn = true;
			$log.info("User Logged In");
			BroadCastService.broadcast('usersessionchange', true);
			BroadCastService.broadcast('userloggedin');

			// connect websocket
			SocketService.connect({"varName": _user.varName, "apiKey": _user.auth.apiKey});

			return _user;
		},function(err){
			$log.error("error getting config for user ", err);
		});
	};

	var _deactivate_user = function()
	{
		//save current user config options and then unset the config
		_config = false;

		$rootScope.__currentAppUser	= _user = {
			"auth": {
				"roleMap": {
					"roleNames": ["public", "guest"]
				}
			},
			"varName": "Guest"
		};

		//clear Devices
		//clear Alerts
		//clear Triggers
		//clear SocketSubs

		_loggedIn = false;
		$log.info("User Logged Out");
		BroadCastService.broadcast('usersessionchange', false);

		//remove all socketsubs
		SocketService.unsubscribeAll();

		return $q.reject(_user);
	};

	return {
		hasRole: function(role)
		{
			// this should wait until the user session is resolved
			var deferred = $q.defer();

			_get_session().then(function()
			{
				if (typeof role == 'string')
				{
					if (role.indexOf(",") != -1)
					{
						role = role.split(',');
					}
					else if (role.indexOf(" ") != -1)
					{
						role = role.split(' ');
					}
					else
					{
						role = [role];
					}
				}
				var _result = false;

				try {
					for (var i = 0; i < role.length; i++)
					{
						if (role[i].charAt(0) == '!')
						{
							_result = _user.auth.roleMap.roleNames.indexOf(role[i]) == -1 || _result;
						}
						else
						{
							_result = _user.auth.roleMap.roleNames.indexOf(role[i]) != -1 || _result;
						}
					}
				}
				catch(error)
				{
					//console.error(error);
				}
				deferred.resolve(_result);
			});

			return deferred.promise;
		},
		login: _log_in,
		logout: _log_out,
		loggedIn: function()
		{
			return _loggedIn;
		},
		saveConfig: _save_config,
		config: function(config)
		{
			if (config)
			{
				for (var k in config)
				{
					_config[k] = config[k];
				}
				return _save_config();
			}
			else
			{
				return _get_config();
			}
		},
		get: function(field)
		{
			if (field && _user && _user.hasOwnProperty(field))
			{
				return _user[field];
			}
			else
			{
				return _user;
			}
		},
		id: function()
		{
			return _user._id;
		},
		session: _get_session
	};
}
])
.service('NotificationsSrv', ['$rootScope', '$q', 'LogService', '$interval', 'AjaxService', 'BroadCastService', 'SocketService', 'UserService',
function($rootScope, $q, $log, $interval, AjaxService, BroadCastService, SocketService, UserService)
{
	var model = {
		"_inbox": [],
		"_unread": 0
	};
	var msgArray;
	var _loaded = false;

	var _load_messages = function(notif)
	{
		msgArray = [].concat(notif);
		for (var i = 0; i < msgArray.length; i++)
		{
			if (msgArray[i].status.queued){ model._unread++ };
			model._inbox.push(msgArray[i]);
		}
	};

	var _remove_message = function(notifId)
	{
		for (var i = 0; i < model._inbox.length; i++)
		{
			if (model._inbox[i]._id == notifId)
			{
				if (msgArray[i] && msgArray[i].status.queued){ model._unread--; }
				model._inbox.splice(i,1);
			}
			return;
		}
	};


	var _un_queue_message = function(notifId, q)
	{
		for (var i = 0; i < model._inbox.length; i++)
		{
			if (model._inbox[i]._id == notifId || notifId == 'ALL')
			{
				if (!q){ model._unread--; }
				if (q) { model._unread++; }
				model._inbox[i].status.queued = q;
			}
			return;
		}
	};

	var _clear = function(){
		model._inbox.length = 0;
		model._unread = 0;
	};

	var _promise = false;

	var _init_inbox = function(){
		if (_promise){
			return _promise;
		}
		_clear();
		var deferred = $q.defer();
		_promise = deferred.promise;

		AjaxService.get('/notifications').then(function(returned){
			_load_messages(returned.messages);
			_loaded = true;
			deferred.resolve(model);
			_promise = false;
		});
		return _promise;
	};

	$rootScope.$on('bcm.userloggedin', function(){
		_init_inbox();
		var user = UserService.get();
		SocketService.subscribe(user.varName,"wskNewClientNotification");
	});

	//this is the new way, the new notification is in the socket message
	$rootScope.$on('bcm.ss.wskNewClientNotification', function (event, pkg){
		_load_messages(pkg.msg.params.messages);
	});

	return {
		inbox: model._inbox,
		get: function(force){
			if (force || !_promise ){
				return _init_inbox();
			} else if (_promise) {
				return _promise;
			}
			return $q.when(model);
		},
		clear: _clear,
		queue: function(alert) {
			var notifId = alert._id || alert;
			return AjaxService.put('/notifications/'+notifId, {'queued': true}).then(function(response){
				_un_queue_message(notifId, true);
			});
		},
		unqueue: function(alert){
			var notifId = alert._id || alert;
			return AjaxService.put('/notifications/'+notifId, {'queued': false}).then(function(response)
		{
				if (notifId == 'ALL')
				{
					_un_queue_message(notifId, false);
				}
				else
				{
					_un_queue_message(notifId);
				}
			});
		},
		trash: function(alert)
		{
			var notifId = alert._id || alert;

			return AjaxService.delete('/notifications/'+notifId).then(function(response)
			{
				if (notifId == 'ALL')
				{
					_init_inbox();
				}
				else
				{
					_remove_message(notifId);
				}
				return notifId;
			});
		}
	};
}])
.service('DeviceService', ['$rootScope', '$q', 'LogService', 'AjaxService', 'UserService', 'SocketService', 'BroadCastService',
function($rootScope, $q, $log, AjaxService, UserService, SocketService, BroadCastService)
{
		var _devicesVarNameIdx = {};
		var _devices = {};
		var _loaded = 0;
		var _limit = 1000;

		// listen for devices to check in so that devices that were offline, can come online and add a subscription
		$rootScope.$on('bcm.ss.wskLastSeenNtfy', function(event, pkg)
		{
			var topic = pkg.msg.params.topic.split(".");
			var _dKey = topic[0];
			try
			{
				if (!('sys' in _devicesVarNameIdx[_dKey].metaData))
				{
					_devicesVarNameIdx[_dKey].metaData.sys = {};
				}
				_devicesVarNameIdx[_dKey].metaData.sys.lastSeen = pkg.msg.params.lastSeen;
			} catch(err) {
				console.error(err);
			}
		});

		$rootScope.$on('bcm.ss.wskAttributeUpdateNtfy', function(event, pkg)
		{
			if (!('topic' in pkg.msg.params))
			{
				return;
			}

			var topic = pkg.msg.params.topic.split(".");
			var _dKey = topic[0];

			for (var k in pkg.msg.params)
			{
				var _split = k.split(".");

				if (_split.length == 2)
				{
					// update the attribute
					try{
						_devicesVarNameIdx[_dKey].deviceTypeMap[_split[0]].at[_split[1]].lastValue = pkg.msg.params[k].lastValue || _devicesVarNameIdx[_dKey].deviceTypeMap[_split[0]].at[_split[1]].value;
						_devicesVarNameIdx[_dKey].deviceTypeMap[_split[0]].at[_split[1]].value = pkg.msg.params[k].value;
						_devicesVarNameIdx[_dKey].deviceTypeMap[_split[0]].at[_split[1]].lastSet = Date.now();
					} catch(err){
						//console.error(err);
					}
				}
			}
		});

/*
		$rootScope.$on('bcm.ss.ClientRefresh', function(event, pkg)
		{
			_query_for_device(_devicesVarNameIdx[pkg.msg.id]._id);
		});
*/

		// listener for changes to the devicelist, when devices are added to the system or to accounts, force a refresh of the local model
		// this should be emitted by controllers that modify the devices / user device permissions
		$rootScope.$on('bcm.updatedevicelist', function() {
			console.log("bcm.updatedevicelist");
			_get_devices(false, true);
		});

		function _parse_last_seen(intDate)
		{
			if (intDate !== parseInt(intDate))
			{
				intDate = Date.parse(intDate);
			}
			return intDate;
		}

		function _query_for_device(deviceid)
		{
			return AjaxService.get('/endnodes/'+deviceid).then(
				function(returned, status)
				{
					if (returned.length == 1)
					{
						return _load_device(returned[0]);
					}
				},
				function(err)
				{
					$log.debug(deviceid, " couldn't be loaded");
				}
			);
		}

		function _unload_device(oldDevice)
		{
			var _ndKey = oldDevice._id;
			if (_devices.hasOwnProperty(_ndKey))
			{
				_loaded--;
				SocketService.unsubscribeAll();
				delete _devices[_ndKey];
			}
		}

		function _load_devices(newDevices)
		{
			for (var i = 0; i < newDevices.length; i++)
			{
				_load_device(newDevices[i]);
			}
		}

		function _load_device(newDevice)
		{
			//add new device to the model
			var _ndKey = newDevice._id;

			if (!_devices.hasOwnProperty(_ndKey))
			{
				_devices[_ndKey] = {};
				_devicesVarNameIdx[newDevice.varName] = _devices[_ndKey];

				// SocketService.subscribe(newDevice.varName, 'ClientRefresh');
				SocketService.subscribe(newDevice.varName, 'ClientDebugNotification');
				//SocketService.subscribe(newDevice.varName, 'ClientDebugSystem');

				SocketService.subscribe(newDevice.varName, 'wskAttributeUpdateNtfy');
				SocketService.subscribe(newDevice.varName, 'wskLastSeenNtfy');

				_loaded++;
				if ('deviceTypeMap' in newDevice && !newDevice.metaData.sys.ff){
					newDevice.metaData.sys.ff = true;
					for (var varP in newDevice.deviceTypeMap){
						for (var varA in newDevice.deviceTypeMap[varP].at){
							// fix old array flags properties
							if (Object.prototype.toString.call( newDevice.deviceTypeMap[varP].at[varA].flags ) === '[object Array]'){
								var _flags = {};
								for (var i = 0; i < newDevice.deviceTypeMap[varP].at[varA].flags.length; i++){
									_flags[newDevice.deviceTypeMap[varP].at[varA].flags[i]] = true;
								}
								newDevice.deviceTypeMap[varP].at[varA].flags = _flags;
							}
						}
					}
					_save_device(_ndKey, false);
				}
			}

			for (var k in newDevice)
			{
				_devices[_ndKey][k] = newDevice[k];
			}

			if (_devices[_ndKey].hasOwnProperty('deviceTypeMap'))
			{
				SocketService.subscribe(newDevice.varName, 'wskClientActionEvent');
			}

			$rootScope.$on('bcm.ss.'+newDevice.varName+'wskLastSeenNtfy', function(event, pkg)
			{
				var _dKey = _devicesVarNameIdx[pkg.msg.params.varName]._id;
				//update last seen
				try{
					_devices[_dKey].metaData.sys.lastSeen = _parse_last_seen(pkg.msg.params.lastSeen);
				} catch(err){
					//device doesn't have a lastSeen value in the local instance, offline -> online, refresh from server
					_query_for_device(_dKey);
				}
			});
			return _devices[_ndKey];
		}

		var _query_for_devices_promise = false;
		function _query_for_devices(options)
		{
			var _lim = 1000;
			var _deep = '';

			if (options && typeof options === "object"){
				_deep = options.deep ? '&deep=true' : '';
				_lim = options.limit ? options.limit : _limit;
			}

			_query_for_devices_promise = $q.defer();
			AjaxService.get('/endnodes?limit='+_lim+_deep).then(
				function(returned, status)
				{
					_query_for_devices_promise.resolve(_devices);
					_query_for_devices_promise = false;

					_load_devices(returned);
				},
				function(err)
				{
					$log.debug("devices couldn't be loaded");
					_query_for_devices_promise.reject(_devices);
				}
			);
			return _query_for_devices_promise.promise;
		}

		function _save_device(deviceid, payload, rebuild){
			if (!_devices[deviceid]){
				return $q.reject();
			}

			if (typeof payload == 'object'){
				_devices[deviceid] = payload;
			} else  if (typeof payload == 'boolean'){
				rebuild = payload;
			}

			var deferred = $q.defer();
			rebuild = rebuild ? "?rebuild=true" : "";
			AjaxService.put('/endnodes/'+deviceid+rebuild,{
				"data": _devices[deviceid]
			}).then(function(returned){
				deferred.resolve(returned);
			},function(status){
				$log.error("There was an error saving the end node.");
				deferred.reject(status);
			});
			return deferred.promise;
		}

		function getDataType(varType)
		{
			switch (varType)
			{
				case "tc_int8":
				case "tc_uint8":
				case "tc_int16":
				case "tc_uint16":
				case "tc_int32":
				case "tc_uint32":
				case "tc_int64":
				case "tc_uint64":
				case "tc_ipaddr": //32 bit representation of IP Address
				//value = "0x" + value.toString(16);
				case "tc_float":
				case "tc_double":
				return "number";

				case "tc_bool":
				return "boolean";

				case "tc_json":
				case "tc_ipaddr":
				case "tc_string":
				return "string";
			}
		}

		function _parse_native(param)
		{
			if (typeof param != 'object')
			{
				return param;
			}
			switch (getDataType(param.varType))
			{
				case "number":
				return parseFloat(param.value);
				case "boolean":
				if (param.value == 'false')
				{
					return false;
				}

				if (param.value == 'true' || param.value == 'true' )
				{
					return true;
				}
				default:
				return param.value;

			}
		}

		function _do_action(path, type, params, options)
		{
			path = path.replace(/\.ac\./,".");
			var _promise = $q.defer(),
				_varNames = path.split("."),
				avar,
				_params;

			if (_varNames.length == 4)
			{
				avar = _varNames[3];
			}
			else if (_varNames.length == 3)
			{
				avar = _varNames[2];
			}
			if (params)
			{
				_params = params;
			}
			else
			{
				try
				{
					_params = _devices[_varNames[0]].deviceTypeMap[_varNames[1]].ac[avar].params;
				}
				catch(err)
				{
					console.log("error with params");
					return;
				}
			}

			var actionPackage = {
				'cmd': 'EndNodeAction',
				'sys': false,
				'cuspar': false,
				'path': path,
				'params': {}
			};

			if (options)
			{
				for (var o in options)
				{
					actionPackage[o] = options[o];
				}
			}

			if (_devices[_varNames[0]].deviceTypeMap[_varNames[1]].ac[avar].flags.SYS)
			{
				actionPackage.sys = true;
			}

			if (_devices[_varNames[0]].deviceTypeMap[_varNames[1]].ac[avar].flags.CUSPAR)
			{
				actionPackage.cuspar = true;
				actionPackage.params = _params;
			}
			else
			{
				for (var k in _params)
				{
					actionPackage.params[k] = {};
					actionPackage.params[k].value = _parse_native(_params[k]);
				}
			}

			$log.debug(JSON.stringify(actionPackage));
			$log.info(JSON.stringify(actionPackage));

			switch (type)
			{
				case "socket":
					//add listener for ack
					var listener = $rootScope.$on('ss.actionack', function(event, pkg)
					{
						//remove listener
						listener();
						//resolve promise
						_promise.resolve(actionPackage);
					});

					//send action
					//SocketService.emit('SendAction', actionPackage);
				break;
				case "http":
					AjaxService.post('/action', { "data": actionPackage }).then(
					function(returned)
					{
						_promise.resolve(returned);
						//simulate the socket ack
						BroadCastService.broadcast('ss.actionack', actionPackage);
					},function(error)
					{
						$log.error("There was an error sending the action: " + error);
						_promise.reject(error);
					});
				break;
			}
			return _promise.promise;
		}

		function _get_devices(options) {
		    // OPTIONS
		    var _force = options ? options.force : false;
		    if (!_force && _loaded > 1) {
		        return $q.when(_devices);
		    } else if (_query_for_devices_promise) {
		        return _query_for_devices_promise.promise;
		    }

		    if (_force) {
		        _devices = {};
		        _loaded = 0;
		        _limit = 1000;
		    }

		    return _query_for_devices(options);
		}

		function _get_devicetypes() {
		    var _deferred = $q.defer();

		    AjaxService.get('/dd/devicetypes').then(
		        function(returned) {
		            _deferred.resolve(returned);
		        },
		        function(error) {
		            $log.error(error);
		            _deferred.reject(error);
		        }
		    );
		    return _deferred.promise;
		}

		return {
			get: function(deviceid, options)
			{
				// OPTIONS
				var _force = options ? options.force : false;

				if (!deviceid)
				{
					return _get_devices(options);
				}
				else if (!_force && _devices.hasOwnProperty(deviceid) && _devices[deviceid].hasOwnProperty("deviceTypeMap"))
				{
					return $q.when(_devices[deviceid]);
				}
				else if (!_force && _devicesVarNameIdx.hasOwnProperty(deviceid) && _devicesVarNameIdx[deviceid].hasOwnProperty("deviceTypeMap"))
				{
					return $q.when(_devices[_devicesVarNameIdx[deviceid]._id]);

				}
				return _query_for_device(deviceid);
			},
			devices: _get_devices,
			getTypes: _get_devicetypes,
			moreDevices: function()
			{
				if (_limit <= _loaded)
				{
					_limit = _limit + 10;
				}
				return _get_devices();
			},
			clear: function()
			{
				for (var k in _devices)
				{
					_unload_device(_devices[k]);
				}
			},
			removeAttributeLogs: function(path)
			{
				var _split = path.split(".");
				_devices[_split[0]].deviceTypeMap[_split[1]].at[_split[2]].logs = 0;
				return AjaxService.delete('/logs/' + _split[0] + '/' + _split[1] + '/' + _split[2]);
			},
			getLogs: function(path, format, options)
			{
				if (!format)
				{
					format = 'csv';
				}

				var _dl = "", _li = "";
				if (options === true)
				{
					_dl = "&download=true";
				}
				else if (typeof options === 'object')
				{
					if (options.limit && typeof options.limit === 'number')
					{
						_li = '&limit='+options.limit;
					}

					if (options.download)
					{
						_dl = "&download=true";
					}
				}
				return AjaxService.get('/log/' + path + '?format='+format+_dl+_li);
			},
			emailLogs: function(path, format, email)
			{
				if (!format)
				{
					format = 'csv';
				}
				var _em = "&email="+email;
				return AjaxService.get('/log/' + path + '?format='+format+_em+"&filename="+path);
			},
			getDataType: getDataType,
			// this method allows controllers to change values in the device model, but it's not pushed up to the database unless push is true
			set: function(deviceid, obj, options)
			{
				if (!deviceid || !_devices[deviceid])
				{
					return $q.reject(null);
				}
				for (var k in obj)
				{
					_devices[deviceid][k] = obj[k];
				}
				//update the device in the database
				if (options.push) {
					return _save_device(deviceid, options.rebuild);
				} else {
					return $q.when(_devices[deviceid]);
				}
			},
			rebuild: function(deviceid)
			{
				return _save_device(deviceid, true);
			},
			save: function(deviceid, payload)
			{
				return _save_device(deviceid, payload, false);
			},
			loaded: function()
			{
				return _loaded;
			},
			loadedDelta: function()
			{
				return _limit - _loaded;
			},
			postAction: function (path, args, options)
			{
				return _do_action(path, "http", args, options);
			},
			sendAction: function (path, args, options)
			{
				return _do_action(path, "socket", args, options);
			},
			trash: function(_auth_id)
			{
				//
				// This method doesn't delete a device, it removes an auth from the current user's account
				//

//				AjaxService.trash('/endnodes/'+_devices[deviceid].varName)
				return AjaxService.trash('/auth-selector/'+_auth_id)
				.then(function(returned)
				{
					if (_devices[_auth_id])
					{
						delete _devices[_auth_id];
					}
					return "Auth Deleted From Account";
				},
				function(error)
				{
					$log.error("There was an error saving the end node.");
					return "There was an error removing the auth from account " + error;
				});
			}
		};
	}
])
.service('GenericModalService', [ '$uibModal', function($modal)
{

		return {
			open: function(data, callback, cancel, third)
			{
				var backdrop = 'true';
				if (typeof data.important === "undefined"){
					data.important = false;
				}

				if (data.important){
					backdrop = 'static';
				}

				if (typeof data.templateUrl === "undefined"){
					data.templateUrl = 'modules/tc.webapp/partials/m-generic-modal.html';
				}

				if (typeof data.controller === "undefined"){
					data.controller = 'GenericModal';
				}

				if (typeof data.windowClass === "undefined"){
					data.windowClass = "";
				}

				if (typeof cancel === "undefined"){
					cancel = function(){};
				}


		      var modalInstance = $modal.open({
		        templateUrl: data.templateUrl,
		        controller: data.controller,
		        'backdrop': backdrop,
		        windowClass: data.windowClass,
		        resolve: {
		          'data': function(){
		            return JSON.parse(JSON.stringify(data));
		          }
		        }
		      });
		      modalInstance.result.then(callback, cancel);
		    }
		};
	}
])
.controller('GenericModal', ['$scope', '$uibModalInstance', 'data',
function($scope, $uibModalInstance, data)
{
    $scope.data = data;
    $scope.ok = function (button) {
      if (typeof $scope.data.showInput){
        $uibModalInstance.close({"button": button, "result": $scope.data.input});
      }else{
        $uibModalInstance.close({"button": button});
      }
    };
    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
}
])
.service('TriggerService', ['LogService', 'AjaxService', '$q',
function($log, AjaxService, $q)
{
	var _triggers = {};
	var _triggersSort = [];

	var _sort = function()
	{
		_triggersSort.length = 0;
		for (var k in _triggers)
		{
			_triggersSort.push(_triggers[k]);
		}
	};

	var _load_trigger = function(trigger, update)
	{
		if (update || !_triggers.hasOwnProperty(trigger.varName))
		{
			_triggers[trigger.varName] = trigger;
			_sort();
		}
	};

	var _get_triggers = function()
	{
		var defer = $q.defer();
		AjaxService.get('/triggers').then(
			function(returned)
			{
				for (var i = 0; i < returned.length; i++)
				{
					_load_trigger(returned[i]);
				}
				defer.resolve(_triggers);
			},
			function(error)
			{
				$log.error('HTTP Error '+error);
				defer.reject([]);
			}
		);
		return defer.promise;
	};

	var _delete_trigger = function(triggerVarName)
	{
		var defer = $q.defer();
		AjaxService.trash('/triggers/'+ triggerVarName)
		.then(function(returned, status)
			{
				$log.info("Removed Trigger: "+triggerVarName);
				delete _triggers[triggerVarName];
				_sort();
				defer.resolve(true);
			},function(error)
			{
				$log.error(error);
				defer.reject(false);
			}
		);
		return defer.promise;
	};

	function _trim_conditionals(map)
	{
		//remove empty trigger conditions before saving
		for (var i = 0; i < map.length; i++)
		{
			if (map[i].cond_1 === "")
			{
				map.splice(i, 1);
			}
		}
		return map;
	}

	var _save_trigger = function(trigger)
	{
		_trim_conditionals(trigger.conditionalMap);

		var defer = $q.defer();
		AjaxService.put('/triggers/'+trigger.varName, trigger)
		.then(function(returned, status)
			{
				_load_trigger(returned, true);
				defer.resolve(returned);
			},function(error)
			{
				$log.error(error);
				defer.reject(false);
			}
		);
		return defer.promise;
	};

	var _create_trigger = function(trigger, cb)
	{
		_trim_conditionals(trigger.conditionalMap);

		var defer = $q.defer();
		AjaxService.post('/triggers', trigger)
		.then(function(returned, status)
			{
				//_load_trigger(returned);
				defer.resolve(returned);
			},function(error)
			{
				$log.error(error);
				defer.reject(false);
			}
		);
		return defer.promise;
	};

	var _trigger_subscribe = function(triggerVarName, subType, action)
	{
		var _action = action ? 'subscribe' : 'unsubscribe';

		var defer = $q.defer();
		AjaxService.get('/trigger/' + triggerVarName + '/'+ _action +'/' + subType)
		.then(function(returned, status)
			{
				defer.resolve(returned);
			},function(error)
			{
				$log.error(error);
				defer.reject(false);
			}
		);
		return defer.promise;
	};

	return {
		get: function(force)
		{
			if (force && typeof force == 'string')
			{
				if (_triggers[force])
				{
					return $q.when(_triggers[force]);
				}
				else
				{
					return $q.when({});
				}
			}
			else if (force || _triggersSort.length === 0)
			{
				return _get_triggers();
			}
			else
			{
				return $q.when(_triggers);
			}
		},
		getSort: function()
		{
			return $q.when(_triggersSort);
		},
		trash: _delete_trigger,
		delete: _delete_trigger,
		create: _create_trigger,
		save: function(triggerObj, cb)
		{
			if (triggerObj._id)
			{
				return _save_trigger(triggerObj);
			}
			return _create_trigger(triggerObj);
		},
		clear: function()
		{
			_triggers = {};
			_triggersSort.length = 0;
		},
		subscribe: function(varName, subType)
		{
			return _trigger_subscribe(varName, subType, true);
		},
		unsubscribe: function(varName, subType)
		{
			return _trigger_subscribe(varName, subType, false);
		}
	};
}]).service('LoraService', ['$rootScope', '$q', 'LogService', 'AjaxService', 'UserService', 'SocketService', 'BroadCastService',
function($rootScope, $q, $log, AjaxService, UserService, SocketService, BroadCastService)
{
		var _loraApplicationNameIdx = {};
		var _loraApplications = {};
		var _loraMoteNameIdx = {};
		var _loraMotes = {};
		var _loaded = 0;
		var _limit = 1000;

		// listener for changes to the loraapplicationlist
		// this should be emitted by controllers that modify the lora application list
		$rootScope.$on('bcm.updateloraapplicantionlist', function() {
			console.log("bcm.updateloraapplicationlist");
			_get_loraApplications(false, true);
		});

		function _query_for_loraApplication(appEui)
		{
			return AjaxService.get('/loraapplications/'+appEui).then(
				function(returned, status)
				{
					if (returned.length == 1)
					{
						return _load_loraApplication(returned[0]);
					}
				},
				function(err)
				{
					$log.debug(appEui, " couldn't be loaded");
				}
			);
		}

		function _unload_loraApplication(oldApp)
		{
			var _ndKey = oldApp.appEui;
			if (_loraApplications.hasOwnProperty(_ndKey))
			{
				_loaded--;
				delete _loraApplications[_ndKey];
			}
		}

		function _load_loraApplications(newApps)
		{
			for (var i = 0; i < newApps.length; i++)
			{
				_load_loraApplication(newApps[i]);
			}
		}

		function _load_loraApplication(newApp)
		{
			//add new application to the model
      if(!newApp)return {};
			var _ndKey = newApp.appEui;

			if (!_loraApplications.hasOwnProperty(_ndKey))
			{
				_loraApplications[_ndKey] = {};
				_loraApplicationNameIdx[newApp.appEui] = _loraApplications[_ndKey];
				_loaded++;
			}

			for (var k in newApp)
			{
				_loraApplications[_ndKey][k] = newApp[k];
			}
			return _loraApplications[_ndKey];
		}

		var _query_for_loraApplications_promise = false;
		function _query_for_loraApplications(options)
		{
			var _lim = 1000;
			var _deep = '';

			if (options && typeof options === "object"){
				_deep = options.deep ? '&deep=true' : '';
				_lim = options.limit ? options.limit : _limit;
			}

			_query_for_loraApplications_promise = $q.defer();
			AjaxService.get('/loraapplications?limit='+_lim+_deep).then(
				function(returned, status)
				{
					_query_for_loraApplications_promise.resolve(_loraApplications);
					_query_for_loraApplications_promise = false;

					_load_loraApplications(returned);
				},
				function(err)
				{
					$log.debug("lora applications couldn't be loaded");
					_query_for_loraApplications_promise.reject(_loraApplications);
				}
			);
			return _query_for_loraApplications_promise.promise;
		}

		function _save_loraApplication(appEui, cb)
		{

			if (!_loraApplications[appEui])
			{
				if (cb){ cb(false);}
				return;
			}

			AjaxService.put('/loraapplications/'+appEui,
			{
				"data": _loraApplications[appEui]
			})
			.then(function(returned)
			{
				if (cb){ cb(false);}
			},function(status)
			{
				$log.error("There was an error saving the application.");
				if (cb){ cb(true);}
			});
		}

		function _get_loraApplications(options)
		{
			// OPTIONS
			var _force = options ? options.force : false;
			if (!_force && _loaded > 1)
			{
				return $q.when(_loraApplications);
			}
			else if (_query_for_loraApplications_promise)
			{
				return _query_for_loraApplications_promise.promise;
			}

			if (_force)
			{
//				options.limit = 1000;
				_loraApplications = {};
				_loaded = 0;
				_limit = 1000;
			}

			return _query_for_loraApplications(options);
		}

    // LoRa Mote handlers

		// listener for changes to the loramotelist
		// this should be emitted by controllers that modify the lora application list
		$rootScope.$on('bcm.updateloramotelist', function() {
			console.log("bcm.updateloramotelist");
			_get_loraMotes(false, true);
		});

		function _query_for_loraMote(devEui)
		{
			return AjaxService.get('/loramotes/'+devEui).then(
				function(returned, status)
				{
					if (returned.length == 1)
					{
						return _load_loraMote(returned[0]);
					}
				},
				function(err)
				{
					$log.debug(devEui, " couldn't be loaded");
				}
			);
		}

		function _unload_loraMote(oldMote)
		{
			var _ndKey = oldMote.moteEui;
			if (_loraMotes.hasOwnProperty(_ndKey))
			{
				_loaded--;
				delete _loraMotes[_ndKey];
			}
		}

		function _load_loraMotes(newMotes)
		{
			for (var i = 0; i < newMotes.length; i++)
			{
				_load_loraMote(newMotes[i]);
			}
		}

		function _load_loraMote(newMote)
		{
			//add new mote to the model
			var _ndKey = newMote.devEui;

			if (!_loraMotes.hasOwnProperty(_ndKey))
			{
				_loraMotes[_ndKey] = {};
				_loraMoteNameIdx[newMote.devEui] = _loraMotes[_ndKey];
				_loaded++;
			}

			for (var k in newMote)
			{
				_loraMotes[_ndKey][k] = newMote[k];
			}
			return _loraMotes[_ndKey];
		}

		var _query_for_loraMotes_promise = false;
		function _query_for_loraMotes(options)
		{
			var _lim = 1000;
			var _deep = '';

			if (options && typeof options === "object"){
				_deep = options.deep ? '&deep=true' : '';
				_lim = options.limit ? options.limit : _limit;
			}

			_query_for_loraMotes_promise = $q.defer();
			AjaxService.get('/loramotes?limit='+_lim+_deep).then(
				function(returned, status)
				{
					_query_for_loraMotes_promise.resolve(_loraMotes);
					_query_for_loraMotes_promise = false;

					_load_loraMotes(returned);
				},
				function(err)
				{
					$log.debug("lora motes couldn't be loaded");
					_query_for_loraMotes_promise.reject(_loraMotes);
				}
			);
			return _query_for_loraMotes_promise.promise;
		}

		function _save_loraMote(devEui, cb)
		{

			if (!_loraMotes[devEui])
			{
				if (cb){ cb(false);}
				return;
			}

			AjaxService.put('/loramotes/'+devEui,
			{
				"data": _loraMotes[devEui]
			})
			.then(function(returned)
			{
				if (cb){ cb(false);}
			},function(status)
			{
				$log.error("There was an error saving the mote.");
				if (cb){ cb(true);}
			});
		}

		function _get_loraMotes(options)
		{
			// OPTIONS
			var _force = options ? options.force : false;
			if (!_force && _loaded > 1)
			{
				return $q.when(_loraMotes);
			}
			else if (_query_for_loraMotes_promise)
			{
				return _query_for_loraMotes_promise.promise;
			}

			if (_force)
			{
//				options.limit = 1000;
				_loraMotes = {};
				_loaded = 0;
				_limit = 1000;
			}

			return _query_for_loraMotes(options);
		}


		return {
			get: function(appEui, options)
			{
				// OPTIONS
				var _force = options ? options.force : false;

				if (!appEui)
				{
					return _get_loraApplications(options);
				}
				else if (!_force && _loraApplications.hasOwnProperty(appEui) && _loraApplications[appEui].hasOwnProperty("name"))
				{
					return $q.when(_loraApplications[appEui]);
				}
				return _query_for_loraApplication(appEui);
			},
			getMote: function(devEui, options)
			{
				// OPTIONS
				var _force = options ? options.force : false;

				if (!devEui)
				{
					return _get_loraMotes(options);
				}
				else if (!_force && _loraMotes.hasOwnProperty(devEui) && _loraMotes[devEui].hasOwnProperty("appEui"))
				{
					return $q.when(_loraMotes[devEui]);
				}
				return _query_for_loraMote(devEui);
			},
			loraApplications: _get_loraApplications,
      loraMotes: _get_loraMotes,
			moreLoraApplications: function()
			{
				if (_limit <= _loaded)
				{
					_limit = _limit + 10;
				}
				return _get_loraApplications();
			},
			moreLoraMotes: function()
			{
				if (_limit <= _loaded)
				{
					_limit = _limit + 10;
				}
				return _get_loraMotes();
			},
			clear: function()
			{
				for (var k in _loraApplications)
				{
					_unload_loraApplication(_loraApplications[k]);
				}
			},
			// this method allows controllers to change values in the application model, but it's not pushed up to the database unless push is true
			set: function(appEui, obj, options, cb)
			{
				if (!appEui) { return false; }
				if (!_loraApplications[appEui])
				{
					return cb(false);
				}
				for (var k in obj)
				{
					_loraApplications[appEui][k] = obj[k];
				}
				//update the lora application in the database
				if (options.push) { _save_loraApplication(appEui, cb);}
			},
			// this method allows controllers to change values in the application model, but it's not pushed up to the database unless push is true
			setMote: function(devEui, obj, options, cb)
			{
				if (!devEui) { return false; }
				if (!_loraMotes[devEui])
				{
					return cb(false);
				}
				for (var k in obj)
				{
					_loraMotes[devEui][k] = obj[k];
				}
				//update the lora application in the database
				if (options.push) {_save_loraMote(devEui, cb);}
			},
			save: function(appEui, cb)
			{
				return _save_loraApplication(appEui, cb);
			},
      saveMote: function(devEui, cb)
      {
				return _save_loraMote(devEui, cb);
      },
			loaded: function()
			{
				return _loaded;
			},
			loadedDelta: function()
			{
				return _limit - _loaded;
			},
			trashApplication: function(appEui)
			{
				return AjaxService.trash('/loraapplications/'+appEui)
				.then(function(returned)
				{
					if (_loraApplications[appEui])
					{
						delete _loraApplications[appEui];
					}
					return "Application Deleted";
				},
				function(error)
				{
					$log.error("There was an error deleting the lora application.");
					return "There was an error removing the lora application " + error;
				});
			},
			trashMote: function(devEui)
			{
				return AjaxService.trash('/loramotes/'+devEui)
				.then(function(returned)
				{
					if (_loraMotes[devEui])
					{
						delete _loraMotes[devEui];
					}
					return "Mote Deleted";
				},
				function(error)
				{
					$log.error("There was an error deleting the lora mote.");
					return "There was an error removing the lora mote " + error;
				});
			}

		};
	}
]);
