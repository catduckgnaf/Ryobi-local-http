'use strict';

/* Admin Services */


var serviceModule = angular.module('tcadmin.services', []).
  value('version', '0.1');

serviceModule.service('AdminDevicesService', ['$rootScope', 'AjaxService', 'BroadCastService', 'LogService', '$q',
	function($rootScope, AjaxService, BroadCastService, $log, $q)
	{
		var _devices = {};
		var _devicesSort = [];

		var _deviceTypes = {};
		var _deviceTypesSort = [];

		var _sort = function()
		{
			//create the sortable array
			_devicesSort.length = 0;
			for (var k in _devices)
			{
				_devicesSort.push(_devices[k]);
			}
			return _devicesSort;
		};

		var _dtsort = function()
		{
			//create the sortable array
			_deviceTypesSort.length = 0;
			for (var k in _deviceTypes)
			{
				_deviceTypesSort.push(_deviceTypes[k]);
			}
			return _deviceTypesSort;
		};

		function _load_endnode(ed)
		{
			if (!_devices.hasOwnProperty(ed._id))
			{
				_devices[ed._id] = ed;
			}
		}

		function _load_devicetype(ed)
		{
			if (!_deviceTypes.hasOwnProperty(ed._id))
			{
				_deviceTypes[ed._id] = ed;
			}
		}

		function _get_endnodes()
		{
			return AjaxService.get('/admin/devices').then(
				function(returned)
				{
					for (var i = 0; i < returned.length; i++)
					{
						_load_endnode(returned[i]);
					}
					return _sort();
				},
				function(error)
				{
					$log.error(error);
					throw error;
				}
			);
		}
		function _get_devicetypes()
		{
			return AjaxService.get('/admin/devicetypes/system').then(
				function(returned)
				{
					for (var i = 0; i < returned.length; i++)
					{
						_load_devicetype(returned[i]);
					}
					return _dtsort();
				},
				function(error)
				{
					$log.error(error);
				}
			);
		}

		return {
			getSort: function()
			{
				return _devicesSort;
			},
			get: function(eid, force)
			{
				if (typeof eid == "boolean")
				{
					force = eid;
					eid = false;
				}
				if (force)
				{
					_devicesSort.length = 0;
				}

				if (!eid && _devicesSort.length == 0)
				{
					return _get_endnodes();
				}
				else if (!eid)
				{
					return $q.when(_devicesSort);
				}

				if (eid && _devices.hasOwnProperty(eid))
				{
					// refresh the device here?
					return $q.when(_devices[eid]);
				}
				else if (eid)
				{
					return _get_endnodes().then(function(response){
						return _devices[eid];
					});
				}
			},
			getAuth: function(varName)
			{
				return AjaxService.get('/admin/auths/'+varName);
			},
			getDeviceTypes: function(typeid, force)
			{
				if (typeof typeid == "boolean")
				{
					force = typeid;
					typeid = false;
				}
				if (force)
				{
					_deviceTypesSort.length = 0;
				}

				if (!typeid && _deviceTypesSort.length == 0)
				{
					return _get_devicetypes();
				}
				else if (!typeid)
				{
					return $q.when(_deviceTypesSort);
				}

				if (typeid && _deviceTypes.hasOwnProperty(typeid))
				{
					return $q.when(_deviceTypes[typeid]);
				}
				else if (typeid)
				{
					return _get_devicetypes().then(function(response){
						return _deviceTypes[typeid];
					});
				}
			},
			create: function(dt_template)
			{
				return AjaxService.post('/admin/devices', dt_template)
				.then(function(returned)
				{
					_load_endnode(returned);
					return returned;
				},function(error)
				{
					$log.error(error);
					throw error;
				});
			},
			save: function(editing)
			{
				return AjaxService.put('/admin/devices/'+editing._id, editing)
					.then(function(returned)
					{
						return returned;
					},function(error)
					{
						$log.error(error);
						throw error;
					});
			},
			saveType: function(editing)
			{
				return AjaxService.put('/admin/devicetypes/'+editing._id, editing)
					.then(function(returned)
					{
						return returned;
					},function(error)
					{
						$log.error(error);
						throw error;
					});
			},
			importDeviceTypes: function(deviceType)
			{
				return AjaxService.post('/admin/devicetypes', deviceType)
				.then(function(returned)
				{
					return returned;
				},function(error)
				{
					$log.error(error)
					throw error;
				});
			},
			restore: function(clientid)
			{
					return AjaxService.trash('/admin/devices/'+clientid+'?undo=1').then(
					function(returned)
					{
						_devices[clientid].deleted = false;
						return false;
					},
					function(error)
					{
						$log.error(error);
						throw error;
					}
				);
			},
			remove: function (clientid, confirm)
			{
				var confirmQ = confirm ? '?confirm=1' : '';

				return AjaxService.trash('/admin/devices/'+clientid+confirmQ).then(
					function(returned)
					{
						console.log(returned);
						if (confirmQ.length > 0)
						{
							delete _devices[clientid];
							return _sort();
						}
						else
						{
							_devices[clientid].deleted = true;
						}
						return false;
					},
					function(error)
					{
						$log.error(error);
						throw error;
					}
				);
			},
			removeType: function (typeid)
			{
				return AjaxService.trash('/admin/devicetypes/'+typeid).then(
					function(returned)
					{
							delete _deviceTypes[clientid];
							return _dtsort();
					},
					function(error)
					{
						$log.error(error);
						throw error;
					}
				);
			}

		};
	}
]);
serviceModule.service('AdminMaintService', ['$rootScope', 'AjaxService', 'BroadCastService', 'LogService', '$q',
	function($rootScope, AjaxService, BroadCastService, $log, $q)
	{
		return {
			run: function(type)
			{
				type = type || 'all';
				return AjaxService.get('/admin/maint/'+type);
			}
		}
	}
]);
serviceModule.service('AdminGroupsService', ['$rootScope', 'AjaxService', 'BroadCastService', 'LogService', '$q',
	function($rootScope, AjaxService, BroadCastService, $log, $q)
	{
		var _objects = {};
		var _sortObj = [];
		var _members = {};

		var api = 'groups';

		var _get = function()
		{
			return AjaxService.get('/admin/'+api).then(
				function(returned)
				{
					for (var i = 0; i < returned.length; i++)
					{
						_load(returned[i]);
					}
					return _sort();
				},
				function(error)
				{
					$log.error(error);
					throw error;
				}
			);
		};

		var _get_members = function(clientid)
		{
			return AjaxService.get('/'+api+'/'+clientid+'/members').then(
				function(returned)
				{
					_members[clientid] = returned;
					return _members[clientid];
				},
				function(error)
				{
					$log.error(error);
					throw error;
				}
			);
		};

		var _sort = function()
		{
			//create the sortable array
			_sortObj.length = 0;
			for (var k in _objects)
			{
				_sortObj.push(_objects[k]);
			}
			return _sortObj;
		};


		var _load = function(obj)
		{
			if (!_objects.hasOwnProperty(obj._id))
			{
				_objects[obj._id] = obj;
			}
		};

		return {
			create: function(client)
			{
				return AjaxService.post('/groups', client).then(function(response){
					_load(response);
					return _sort();
				},function(error){
					$log.error(error)
					throw error;
				});
			},
			save: function(editing)
			{
				var _deferred = $q.defer();

				AjaxService.put('/groups/'+editing.varName, editing)
					.then(function(returned)
					{
						console.log(returned);
						delete _objects[editing._id];
						_load(returned);
						_deferred.resolve(_objects[editing._id])
					},function(status)
					{
						$log.error("There was an error saving the group.", status);
						_deferred.reject(status);
					});
				return _deferred.promise;
			},
			getMembers: _get_members,
			get: function(eid, force)
			{
				if (typeof eid == "boolean")
				{
					force = eid;
					eid = false;
				}

				if (force)
				{
					_sortObj.length = 0;
				}

				if (!eid && _sortObj.length == 0)
				{
					return _get();
				}
				else if (!eid)
				{
					return $q.when(_sortObj);
				}

				if (eid && _objects.hasOwnProperty(eid))
				{
					// refresh the device here?
					return $q.when(_objects[eid]);
				}
				else if (eid)
				{
					return _get().then(function(response){
						return _objects[eid];
					});
				}
			},
			restore: function(clientid)
			{
					return AjaxService.trash('/admin/groups/'+clientid+'?undo=1').then(
					function(returned)
					{
						_objects[clientid].deleted = false;
						return false;
					},
					function(error)
					{
						$log.error(error);
						throw error;
					}
				);
			},
			remove: function (clientid, confirm)
			{
				var confirmQ = confirm ? '?confirm=1' : '';

				return AjaxService.trash('/admin/groups/'+clientid+confirmQ).then(
					function(returned)
					{
						if (confirmQ.length > 0)
						{
							delete _objects[clientid];
							return _sort();
						}
						else
						{
							_objects[clientid].deleted = true;
						}
						return false;
					},
					function(error)
					{
						$log.error(error);
						throw error;
					}
				);
			},

		}
	}
]);


serviceModule.service('AdminUsersService', ['$rootScope', 'AjaxService', 'BroadCastService', 'LogService', '$q',
	function($rootScope, AjaxService, BroadCastService, $log, $q)
	{
		var _users = {};
		var _usersSort = [];

		var _sort = function()
		{
			//create the sortable array
			_usersSort.length = 0;
			for (var k in _users)
			{
				_usersSort.push(_users[k]);
			}
			return _usersSort;
		};

		function _load_user(user)
		{
			if (!_users.hasOwnProperty(user._id))
			{
				_users[user._id] = user;
			}
		}

		function _get_users()
		{
			_usersSort.length = 0;
			return AjaxService.get('/admin/users').then(
				function(returned)
				{
					for (var i = 0; i < returned.length; i++)
					{
						_load_user(returned[i]);
					}
					return _sort();
				},
				function(error)
				{
					$log.error(error);
					throw error;
				}
			);
		}
		return {
			add: function(user)
			{
				return AjaxService.post('/admin/users', user).then(function(returned){
					_load_user(returned);
					return returned;
				},function(error){
					throw error;
				});
			},
			get: function(userid, force)
			{
				if (_usersSort.length == 0 || force)
				{
					return _get_users();
				}
				if (!userid)
				{
					return $q.when(_usersSort);
				}
				else if (_users.hasOwnProperty(userid))
				{
					return $q.when(_users[userid]);
				}
			},
			save: function(editing)
			{
				var _deferred = $q.defer();

				AjaxService.put('/admin/users/'+editing._id,
					{
						"data": editing
					})
					.then(function(returned)
					{
						_load_user(returned);
						_deferred.resolve(_users[returned._id])
					},function(status)
					{
						$log.error("There was an error saving the user.");
						_deferred.reject(_users[editing._id]);
					});
				return _deferred.promise;
			},
			restore: function(clientid)
			{
					return AjaxService.trash('/admin/users/'+clientid+'?undo=1').then(
					function(returned)
					{
						_users[clientid].deleted = false;
						return false;
					},
					function(error)
					{
						$log.error(error);
						throw error;
					}
				);
			},
			remove: function (clientid, confirm)
			{
				var confirmQ = confirm ? '?confirm=1' : '';

				return AjaxService.trash('/admin/users/'+clientid+confirmQ).then(
					function(returned)
					{
						if (confirmQ.length > 0)
						{
							delete _users[clientid];
							return _sort();
						}
						else
						{
							_users[clientid].deleted = true;
						}
						return false;
					},
					function(error)
					{
						$log.error(error);
						throw error;
					}
				);
			}
			/*
			userTgl: function(userid)
			{
				_users[userid].timeStamp.expires = !_users[userid].timeStamp.expires;
				AjaxService.put('/admin/users/'+userid, {data: _users[userid]}).then(
					function(returned)
					{
						$log.info(returned + " user updated");
					},
					function(error)
					{
						$log.error(error);
					}
				);
			},
			reset: function (userid, cb)
			{
				AjaxService.get('/admin/users/'+userid+'/resetpassword').then(
					function(returned)
					{
						console.log(returned);
						if (returned.err != "true")
						{
							if (cb) { cb(false, "User password reset sent."); }
						}
						else
						{
							if (cb) { cb(true, "User password couldn't be reset!"); }
						}
					},
					function(error)
					{
						$log.error(error);
						if (cb) { cb(true, "User password couldn't be reset!"); }
					}
				);
			}*/
		};
	}
])
serviceModule.service('AdminRoleService', ['AjaxService', 'BroadCastService', 'LogService', '$q',
	function(AjaxService, BroadCastService, $log, $q)
	{
		return {
			get: function(roleid)
			{
				if (roleid)
				{
					return AjaxService.get('/admin/roles/'+roleid);
				}
				return AjaxService.get('/admin/roles');
			},
			save: function(role)
			{
				return AjaxService.put('/admin/roles/'+role._id, role);

			}
		}
	}
])
serviceModule.service('AdminAuthService', ['AjaxService', 'BroadCastService', 'LogService', '$q',
	function(AjaxService, BroadCastService, $log, $q)
	{
		return {
			getById: function(authid)
			{
				if (!authid)
				{
					$q.reject("No _id");
				}
				if (authid)
				{
					return AjaxService.get('/admin/auths/id/'+authid);
				}
			},
			get: function(authvarname)
			{
				if (authvarname)
				{
					return AjaxService.get('/admin/auths/'+authvarname);
				}
				else
				{
					return AjaxService.get('/admin/auths');
				}
			},
			save: function(clientAuth)
			{
				return AjaxService.put('/admin/auths/id/' + clientAuth._id, clientAuth);
			},
			restore: function(authid)
			{
				return AjaxService.trash('/admin/auths/id/'+authid+'?undo=1');
			},
			remove: function (authid, confirm)
			{
				var confirmQ = confirm ? '?confirm=1' : '';
				return AjaxService.trash('/admin/auths/id/'+authid+confirmQ);
			}
		};
	}
]);
