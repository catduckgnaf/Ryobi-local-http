'use strict';

/* Directives */


angular.module('tcapp.directives', [])
.directive('appVersion', ['version', function (version)
{
		return function(scope, elm, attrs) {
			elm.text(version);
		};
	}
])
.directive('tcToggleButton', function()
{
	function link(scope, element, attrs)
	{
		function _init(val)
		{
			if (typeof val !== "boolean")
			{
				if (attrs.initState)
				{
					scope.model = scope.initState();
				}
				else
				{
					scope.model = false;
				}
			} else {
				scope.model = val;
			}

		}
		_init(scope.model);

		scope.$watch('model', _init);

		scope.toggle = function()
		{
			scope.model = !scope.model;
			if (scope.callback)
			{
				scope.$eval(scope.callback);
			}
		};
	}

	return {
		restrict: 'E',
		scope : {
			callback: "&",
			initState: "&",
			model: "=?"
		},
		link:link,
		templateUrl: 'modules/tc.webapp/partials/dir-toggle.html'
	};

})
.directive('deviceUpdownAction', function(DeviceService, $timeout, $interval, $sce)
{
	return {
		scope: {
			actionDevice: "=",
			actionPath: "=",
			actionValue: "=",
			actionParams: "=?",
			actionValueMax: "=?",
			actionValueMin: "=?"
		},
		restrict: 'E',
		templateUrl: 'modules/tc.webapp/partials/dir-updown-action.html',
		link: function(scope, element, attr)
		{
			var _finish_action = function()
			{
				delete scope.actionAckIds[scope.actionPath];
//				scope.actionValue.value = scope.actionParamValue;
				startValue = null;
			};

			var _cancel_action = function()
			{
				delete scope.actionAckIds[scope.actionPath];
				scope.actionParamValue = startValue;
				startValue = null;
				scope.resetExpectedAttribute();
			};


			scope.$on('cancel_action', _cancel_action);

			scope.actionAckIds = {};
			scope.liveEditParam = false;
			scope.resetExpectedAttribute = function()
			{
				scope.expectedAttribute = {
					"value": null,
					"expected": null,
					"error": false,
					"timeout": false,
					"status": "ready"
				};
			};
			scope.resetExpectedAttribute();
			var _split = [];

			scope.cancelLiveEdit = function()
			{
				startValue = null;
				scope.live.actionParamValue = null;
				scope.liveEditParam = !scope.liveEditParam;
			};

			scope.liveEdit = function(path)
			{
				$timeout.cancel(debounce[path]);

				if (scope.live.actionParamValue === null)
				{
					if (startValue === null)
					{
						startValue = scope.actionParamValue;
					}

					scope.live.actionParamValue = scope.actionParamValue;
				}
				else
				{
					scope.actionParamValue = scope.live.actionParamValue;
					scope.live.actionParamValue = null;
				}
				scope.liveEditParam = !scope.liveEditParam;
			};

			//set the init value
			scope.$watch('actionDevice', function(newVal, oldVal)
			{
				function _expected_funk()
				{
					if (scope.expectedAttribute.expected)
					{
						scope.expectedAttribute.status = "expected";

						// timeout for 15 Seconds, reset.
						if (!scope.expectedAttribute.timeout)
						{
							scope.expectedAttribute.timeout = $timeout(function()
							{
								scope.expectedAttribute.error = !scope.expectedAttribute.expected;
								scope.expectedAttribute.expected = null;
								scope.expectedAttribute.value = null;
								scope.expectedAttribute.timeout = false;
								scope.expectedAttribute.status = "ready";
							},7.5*1000);
						}
					}
					else
					{
						scope.expectedAttribute.status = "unexpected";
					}
				}

				if (newVal)
				{
					try{
						_split = scope.actionPath.split('.');
						if (_split.length < 3) { throw("Invalid Action Path. Expected: profile.action.param"); }

						scope.actionParam = scope.actionDevice.deviceTypeMap[_split[0]].ac[_split[1]].params[_split[2]];

						if (!scope.actionParam || !scope.actionParam.varType)
						{
							throw ("Invalid Action Path. Expected: profile.action.param");
						}
						if (scope.actionParam.varType.indexOf('int') != -1)
						{
							scope.actionType ='number';
						}
						else if (scope.actionParam.varType == 'tc_bool')
						{
							scope.actionType = 'boolean';
						}
						else
						{
							throw("Invalid Param Type: ", scope.actionParam.varType);
						}

					} catch(err)
					{
						//return console.error(err);
					}
					scope.actionValid = true;
					if (scope.hasOwnProperty('actionValue') && scope.actionValue !== undefined)
					{
						if (scope.actionValue.hasOwnProperty('value'))
						{
							scope.$watch('actionValue.value', function(newVal,oldVal)
							{
								// if I'm waiting on an expected value
								if (scope.expectedAttribute.status == "unexpected" || scope.expectedAttribute.status == "waiting")
								{
									scope.expectedAttribute.expected = scope.expectedAttribute.value == scope.actionValue.value;
									_expected_funk();
								}
								scope.actionParamValue = scope.actionValue.value;
							});
						}
						else
						{
							scope.$watch('actionValue', function(newVal,oldVal)
							{
								// if I'm waiting on an expected value
								if (scope.expectedAttribute.status == "unexpected" || scope.expectedAttribute.status == "waiting")
								{
									scope.expectedAttribute.expected = scope.expectedAttribute.value == scope.actionValue;
									_expected_funk();
								}
								scope.actionParamValue = scope.actionValue;
							});
						}
					}
					else
					{
						if (scope.actionParam && scope.actionParam !== undefined)
						{
							scope.actionParamValue = scope.actionParam.defv;
						}
					}
				}
			});
			var debounce = {};
			var iterate_debounce;
			var iterate_bouncing;
			var startValue = null;
			scope.live = {
				"actionParamValue":null
			};
			scope.buttons = {
				finishAction: _finish_action,
				iterateAction: function(path,v,s)
				{
					if (startValue === null)
					{
						startValue = scope.actionParamValue;
					}

					if (debounce[path])
					{
						$timeout.cancel(debounce[path]);
					}

					if (scope.actionValueMin != undefined)
					{
						scope.actionValue.min = scope.actionValueMin;
					}
					if (scope.actionValueMax !== undefined)
					{
						scope.actionValue.max = scope.actionValueMax;
					}

					if (typeof v == 'number')
					{
						if (scope.actionParamValue + v <= scope.actionValue.max && scope.actionParamValue + v >= scope.actionValue.min)
						{
							scope.actionParamValue = scope.actionParamValue + v;
						}
					}
					else if (typeof v == 'boolean')
					{
						scope.actionParamValue = !scope.actionParamValue;
					}
					else if (s !== null)
					{
						scope.actionParamValue = s;
					}
				},
				debounceAction: function(path)
				{
					// if the value isn't set, this was trigger by a mouseleave, so just ignore it
					if (startValue === undefined || startValue === null){ return;}

					if (debounce[path])
					{
						$timeout.cancel(debounce[path]);
					}

					if (iterate_debounce)
					{
						console.log("cancel iterate debounce");
						$timeout.cancel(iterate_debounce);
					}

					if (iterate_bouncing)
					{
						console.log("cancel iterate bouncing");
						$interval.cancel(iterate_bouncing);
					}


					debounce[path] = $timeout(function()
					{
						delete debounce[path];
						// the current value is the same as the original value, don't send an action
						if (scope.actionParamValue == startValue)
						{
							startValue = null;
							return;
						}
						startValue = null;

						var param = {};
						param[_split[2]] = scope.actionParamValue;


						if (scope.actionParams && typeof scope.actionParams == 'object')
						{
							for (var k in scope.actionParams)
							{
								param[k] = scope.actionParams[k];
							}
						}
						DeviceService.postAction(scope.actionDevice._id+'.'+_split[0]+'.'+_split[1], param).then(function(action){
							scope.actionAckIds[path] = action.ackid;
							scope.expectedAttribute.value = scope.actionParamValue;
							scope.expectedAttribute.status = "waiting";
						});

					}, 1500);
				}
			};
		}
	};
})

.directive('deviceAction', function(DeviceService, AjaxService, $timeout)
{
	return {
		scope: {
			actionDevice: "=",
			actionPath: "=?",
			actionAckId: "=?",
			actionListener: "=?",
			actionLabel: "=?",
			actionParams: "&?",
			actionStartCallback: "=?",
			actionFinishCallback: "=?"
		},
		restrict: 'E',
		templateUrl: 'modules/tc.webapp/partials/dir-device-action.html',
		link: function(scope, element, attr)
		{
			if (!scope.actionLabel)
			{
				scope.actionLabel = "Send Action";
			}

			if (!scope.actionPath && scope.actionListener)
			{
				scope.actionPath = scope.actionListener;
				scope.listenerOnly = true;

				scope.$watch('actionAckId', function(newVal, oldVal)
				{
					if (newVal)
					{
						scope.actionRequest.status = 'queued';
						_start_status(newVal);
					}
				});
			}

			scope.$watch('actionDevice', function(newVal, oldVal)
			{
				if (newVal)
				{
					try {
						var _split = scope.actionPath.split(".");

						if (_split.length == 2)
						{
							scope.action = scope.actionDevice.deviceTypeMap[_split[0]].ac[_split[1]];
						}
						else if (_split.length == 3)
						{
							scope.action = scope.actionDevice.deviceTypeMap[_split[0]].ac[_split[2]];
						}
						else
						{
							throw "Action Directive: Invalid Action Path: " + scope.actionPath;
						}
						scope.hasAction = true;
					} catch(err)
					{
						console.error(err);
					}
				}
			});

			var params = {};

			if (attr.actionParams)
			{
				params = attr.actionParams();
				scope.hasParams = false;

				// parse to JSON?
				try {
					params = JSON.parse(params);
				}
				catch(error)
				{
					console.log(error);
				}
			}

			scope.getDataType = DeviceService.getDataType;

			scope.waitingAck;
			scope.actionRequest = {"status": "ready", "cssClass": "btn-primary"};
			var listener;
			var _start_status = function(ackid,cancel)
			{
				scope.waitingAck = ackid;
				listener = scope.$on('bcm.ss.wskClientActionEvent', function(event,pkg)
				{
					pkg = pkg.msg;
					if (pkg.params.data == ackid)
					{
						if (pkg.params.eventName == 'actionGet')
						{
							scope.actionRequest.status = 'fetched';
						}

						if (pkg.params.eventName == 'actionAck')
						{
							if (scope.waitingAck == pkg.params.data)
							{
								scope.waitingAck = false;
								scope.actionRequest.status = 'acked';
								listener();

								scope.actionRequest.cssClass = 'btn-success';

								$timeout(function(){
									scope.actionRequest.status = 'ready';
									scope.actionRequest.cssClass = 'btn-primary';

									if (typeof scope.actionFinishCallback == 'function')
									{
										scope.actionFinishCallback();
									}
								}, 7500);
							}
						}
					}
					else if (pkg.params.data == "FORCE")
					{
						if (pkg.params.eventName == 'actionForce')
						{
							scope.actionRequest.status = 'error';
							if (typeof scope.actionFinishCallback == 'function')
							{
								scope.actionFinishCallback('Device Force Unqueued Actions');
							}
						}
					}
				});
			};

			scope.cancelAction = function()
			{
				if (listener)
				{
					listener();
				}

				scope.$emit('cancel_action', scope.waitingAck);
				scope.actionRequest.status = 'ready';
				scope.actionRequest.cssClass = 'btn-primary';

				AjaxService.delete('/action/'+scope.waitingAck).then(function(response)
				{
					scope.waitingAck = false;
				}, function(err){console.error(err);});
			};

			scope.sendAction = function()
			{
				if (scope.listenerOnly || scope.actionRequest.status != 'ready') { return; }
				var path = scope.actionDevice._id + '.' + scope.actionPath;

				scope.actionRequest.status = 'sent';
				DeviceService.postAction(path).then(function(action)
				{
					if (action.ackid)
					{
						scope.actionRequest.status = 'queued';
					}

					if (typeof scope.actionStartCallback == 'function')
					{
						scope.actionStartCallback(false, action);
					}
					_start_status(action.ackid);
				},
				function(error)
				{
					scope.actionRequest.cssClass = 'btn-danger';
					scope.actionRequest.status = 'error';

					$timeout(function(){
						scope.actionRequest.status = 'ready';
						scope.actionRequest.cssClass = 'btn-primary';

						if (typeof scope.actionFinishCallback == 'function')
						{
							scope.actionFinishCallback();
						}

					}, 5000);

					if (typeof scope.actionStartCallback == 'function')
					{
						scope.actionStartCallback(error);
					}
				});
			};
		}
	};
})
.directive('tcUserImageEdit', function($upload)
{
	function link(scope, element, attrs)
	{
		scope.fileName = "file";
		scope.uploadFiles = false;

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

		scope.$watch('uploadFiles', function(){
			if (scope.uploadFiles && scope.uploadFiles.length)
			{
	            sendFile(scope.uploadFiles[0], function(err, file, data){
	                console.log(err, file, data);
					scope.uploadFiles = false;
					scope.imgSrc = data;
	            });
			}
		});
	}
	return {
		restrict: 'E',
		scope : {
			imgSrc: '=',
			imgSize: '=?'
		},
		link:link,
		templateUrl: 'modules/tc.webapp/partials/dir-image-edit.html'
	};
})
.directive('tiwiMetaEdit', function()
{
	function link(scope, element, attrs)
	{
		var watcher = scope.$watch('meta', function()
		{
			if (scope.meta)
			{
				for (var k in scope.meta)
				{
					scope.metaList.push([k, scope.meta[k]]);
				}
				watcher();
			}
		});
		scope.metaList = [];

		scope.buttons = {
			deleteMeta: function(idx)
			{
				scope.metaList.splice(idx,1);
				scope.updateModel();
			},
			addMeta: function()
			{
				scope.metaList.push(["newkey", "new value"]);
				scope.updateModel();
			}
		};

		scope.noskip = function(value)
		{
			return typeof value !== 'object';
		};

		scope.updateModel = function()
		{
			scope.meta = {};
			scope.metaList.forEach(function(item)
			{
				var i = 0;
				var key = item[0];
				while(scope.meta.hasOwnProperty(item[0]))
				{
					item[0] = key + i;
					i++;
				}
				scope.meta[item[0]] = item[1];
			});
		};
	}

	return {
		restrict: 'E',
		scope : {
			meta: "=",
			exclude: "=?"
		},
		link:link,
		templateUrl: 'modules/tc.webapp/partials/dir-meta-edit.html'
	};
})
.directive('tcAlerts', ['$timeout', function ($timeout)
{
	function link(scope, element, attrs) {
		scope.$watch('alerts.length', function(newVal, oldVal)
		{
			if (newVal > 0)
			{
				$timeout(function(){
					scope.alerts.pop();
				}, 2500);
			}
		});
	}

	return {
		restrict: 'AE',
		scope: {
			alerts: '='
		},
		template: '<div ng-repeat="alert in alerts" class="alert {{alert.type}}">{{alert.message}}</div>',
		link: link
	};
}])
.directive('tcSortHeader', function()
{
	function link(scope, element, attrs)
	{
		var predicate = '';
		scope.$watch('attrs.tcSortHeader', function()
		{
			if (attrs.tcSortHeader)
			{
				predicate = attrs.tcSortHeader;
				if (typeof attrs.tcSortHeaderDefault !== "undefined"){
					scope.sortPredicate = predicate;
					if (typeof attrs.tcSortHeaderReverse !== "undefined"){
						scope.sortReverse = !scope.sortReverse;
					}
				}
			}
		});

		element.on('click', function()
		{
			if (scope.sortPredicate == predicate)
			{
				scope.sortReverse = !scope.sortReverse;
			}
			scope.sortPredicate = predicate;
		});
	}
	return {
		restrict: 'AE',
		link: link,
		transclude: true,
		template: '<a href=""><i class="fa" ng-class="{\'fa-chevron-down\': sortReverse, \'fa-chevron-up\': !sortReverse}"></i><span ng-transclude></span></a>'
	};
})
.directive('tcRoleShow', function(UserService)
{
	function link(scope, element, attrs)
	{
		scope.$watch('attrs.tcRoleShow', _check_role);
		scope.$on('bcm.usersessionchange', _check_role);

		function _check_role()
		{
			UserService.hasRole(attrs.tcRoleShow).then(function(boo)
			{
				if (boo)
				{
					return element.removeClass('hidden');
				}
				element.addClass('hidden');
			},
			function(error){
				return element.addClass('hidden');
			});
		}
	}

	return {
		restrict: 'A',
		link: link
	};
})
.directive('tcEndnodeLogs', function(UserService, DeviceService, DownloadService, $timeout)
{
	function link(scope, element, attrs)
	{
		scope.emailForLogs = UserService.get('email');
		scope.logLimit = 1000;

		scope.buttons = {
			emailLogs: function()
			{
				scope.sending = true;
				DeviceService.emailLogs(scope.path, 'csv', scope.emailForLogs).then(function(result)
				{
					scope.sending = false;
					scope.sent = true;
					$timeout(function(){ scope.sent = false;}, 2000);
				});
			},
			getLogs: function(format)
			{
				DeviceService.getLogs(scope.path, format, {"download": true, "limit": scope.logLimit}).then(function(result) {
					if (!format)
					{
						format = "csv";
					}
					DownloadService[format](result, scope.path+'.csv');
				});
			}
		};
		scope.dlLink = '/api/logfile/'+scope.path;
	}


	return {
		restrict: "AE",
		scope: {
			path: '=',
			attributeLogs: '=',
		},
		templateUrl: 'modules/tc.webapp/partials/dir-endnode-logs.html',
		link: link
	};
})
.directive('tcLastSeen', function($interval, $timeout)
{
	function link(scope, element, attrs) {
		var _lastSeen = 0;
		var _offline = 30000; //offline delta / 30 second default
		var _isOnline = false;
		var _offlineTimeout;


		function _check_online ()
		{
			var now = new Date().getTime();
			if (_offline + _lastSeen > now)
			{
				_isOnline = true;

				//set timeout
				$timeout.cancel(_offlineTimeout);
				clearTimeout(_offlineTimeout);
				var _wait = _offline + _lastSeen - now;
				if (_wait < 30000)
				{
					_wait = 30000;
				}
				_offlineTimeout = $timeout(_check_online, _wait);
			}
			else
			{
				_isOnline = false;
			}
			_update_last_seen();
		}

		var ticktock = $interval(_check_online, 10*1000);
		scope.$on(
            "$destroy",
            function( event )
            {
				$interval.cancel( ticktock );
            }
        );

		function _get_last_seen ()
		{
			var returned = {
				"days": 0,
				"hours": 0,
				"minutes": 0,
				"seconds": 0,
				"msg": ''
			};

			var now = new Date().getTime();

			var ts = new Date();
			ts.setTime(_lastSeen);

			returned.timeStamp = ts.toString();
			var _s = Math.floor(( now - _lastSeen ) / 1000);

			if (_s < 1)
			{
				_s = 0;
			}
			var _ss = 's';

			returned.hours = Math.floor(_s / 3600);
			returned.minutes = Math.floor((_s - (returned.hours * 3600)) / 60);
			returned.seconds = _s - (returned.hours * 3600) - (returned.minutes * 60);

			returned.days = Math.floor(returned.hours / 24);
			returned.hours = Math.floor(returned.hours - (returned.days * 24));
			returned.weeks = Math.floor(returned.days / 7);

			if (returned.seconds > 0)
			{
				returned.msg = returned.seconds + ' seconds';
				if (returned.seconds == 1)
				{
					returned.msg = returned.seconds + ' second';
				}
			}
			if (returned.minutes > 0)
			{
				returned.msg = returned.minutes + ' minutes';
				if (returned.minutes == 1)
				{
					returned.msg = returned.minutes + ' minute';
				}
			}
			if (returned.hours > 0)
			{
				returned.msg = returned.hours + ' hours';
				if (returned.hours == 1)
				{
					returned.msg = returned.hours + ' hour';
				}
			}
			if (returned.days > 0)
			{
				returned.msg = returned.days + ' days';
				if (returned.days == 1)
				{
					returned.msg = returned.days + ' day';
				}
			}
			return returned;
		}

		function _update_last_seen()
		{
			if (_isOnline)
			{
				element.text( "Online" );
			}
			else
			{
				var _ls = _get_last_seen();
				if (_lastSeen+'' != 'NaN' && _ls.msg !== "" && _lastSeen > 0)
				{
					element.text( _ls.msg+" ago." );
					element.prop( "title", "Last checkin was at "+_ls.timeStamp+', which was '+_ls.days + ' days, '+_ls.hours + ' hours, '+_ls.minutes + ' minutes, '+_ls.seconds + ' seconds ago.' );
				}
				else
				{
					element.text("?");
				}
			}
		}

		scope.$watch(attrs.tcLastSeen, function(value) {
			if (typeof value == 'string')
			{
				value = parseInt(value, 10);
			}

			if (typeof value == 'number' && isNaN(value))
			{
				var _date = new Date();
				_lastSeen = _date.setTime(value);
				_check_online();
			}
		});

		if (attrs.hasOwnProperty("tcOnline"))
		{
			scope.$watch(attrs.tcOnline, function(value, lastValue) {
				if (value)
				{
					if (typeof value != 'number')
					{
						_offline = parseInt(value, 10);
					}
					else
					{
						_offline = value;
					}
					_check_online();
				}
			});
		}
	}

    return {
	    link: link
    };
  })
.directive('tcAttrIcon', function()
{
	return {
		restrict: 'AE',
		scope: {
			imgSrc: '='
		},
		template: '<div class="tc-attr-icon" style="padding:3px 4px 3px 4px; display: inline-block">' +
			'<img width="20px" ng-show="imgSrc" onError="this.onerror=null;this.src=\'/img/attributes/default.png\';" ng-src="{{imgSrc}}"/>'+
			'</div>'
	};
})
.directive('tcDeviceIcon', function()
{
	return {
		restrict: 'AE',
		scope: {
			imgSrc: '=',
			imgSize: '=?'
		},
		template: '<img onError="this.onerror=null;this.src=\'/img/devices/default.png\';" width="{{imgSize}}" ng-src="{{imgSrc}}"/>'
	};
})

// AJAX file uploader, can be called from anything (use the .fake-uploader class) to make something clickable
// and trigger the file upload dialog box
.directive('uploader', ['BroadCastService', function (BroadCastService)
{
	return {
		restrict: 'E',
		scope: {
			action: '@'
		},
		controller: ['$scope', function($scope)
		{
			$scope.progress = 0;
			$scope.response = '';
			$scope.sendFile = function(el)
			{
				var $form = $(el).parents('form');
				if ($(el).val() === '')
				{
					return false;
				}

				$form.attr('action', $scope.action);
				$scope.$apply(function()
				{
					$scope.progress = 0;
				});

				$form.ajaxSubmit(
				{
					type: 'POST',
					uploadProgress: function(event, position, total, percentComplete)
					{
						$scope.$apply(function()
						{
							// upload the progress bar during the upload
							$scope.progress = percentComplete;
						});
					},
					error: function(event, statusText, responseText, form)
					{
						// remove the action attribute from the form
						$form.removeAttr('action');
						/* handle the error ...*/
					},
					success: function(response, statusText, xhr, form)
					{
						var ar = $(el).val().split('\\'),
							filename = ar[ar.length - 1];
						// remove the action attribute from the form
						$form.removeAttr('action');
						$scope.$apply(function()
						{
							$scope.response = response;
							BroadCastService.broadcast("updateadmindevicetypelist");
						});
					}
				});
			};
		}],
		link: function (scope, elem, attrs, ctrl) {
			elem.find('.fake-uploader').click(function () {
				elem.find('input[type="file"]').click();
			});
			var fileInputEl = elem.find('input[type=file]');
				fileInputEl.change(function () {
				scope.sendFile(fileInputEl[0]);
			});
		},
		replace: false
	};
}])


.directive('tcTimestamp', function ()
{
	function link(scope, element, attrs)
	{

		function _update_ts(value)
		{
			if (typeof value != 'number')
			{
				value = Date.parse(value);
			}
			var ts = new Date();
			ts.setTime(value);

			element.text( ts.toString() );

		}

		scope.$watch(attrs.tcTimestamp, function(value) {
			_update_ts(value);
		});
	}

    return {
	    link: link
    };
})

// this is a delayed callback that runs after the last ng-repeat item is rendered in the DOM. Usefull
// for running non-angular code (jquery) on an ng-repeat
.directive('onFinishRender', function ($timeout)
{
	return {
		restrict: 'A',
		link: function(scope, element, attr)
		{
			if (scope.$last === true)
			{
				$timeout(function()
				{
					scope.$emit('ngRepeatFinished');
				});
			}
		}
	};
})
// Fix autofill issues where Angular doesn't know about autofilled inputs
.directive('formAutofillFix', function()
{
  return function(scope, elem, attrs) {
    elem.prop('method', 'POST');

    if(attrs.ngSubmit) {
      setTimeout(function() {
        elem.unbind('submit').submit(function(e) {
          e.preventDefault();
          elem.find('input, textarea, select').trigger('input').trigger('change').trigger('keydown');
          scope.$apply(attrs.ngSubmit);
        });
      }, 0);
    }
  };
})

/**
 * Checklist-model
 * AngularJS directive for list of checkboxes
 */

.directive('checklistModel', ['$parse', '$compile', function($parse, $compile) {
  // contains
  function contains(arr, item, comparator) {
    if (angular.isArray(arr)) {
      for (var i = arr.length; i--;) {
        if (comparator(arr[i], item)) {
          return true;
        }
      }
    }
    return false;
  }

  // add
  function add(arr, item, comparator) {
    arr = angular.isArray(arr) ? arr : [];
      if(!contains(arr, item, comparator)) {
          arr.push(item);
      }
    return arr;
  }

  // remove
  function remove(arr, item, comparator) {
    if (angular.isArray(arr)) {
      for (var i = arr.length; i--;) {
        if (comparator(arr[i], item)) {
          arr.splice(i, 1);
          break;
        }
      }
    }
    return arr;
  }

  // http://stackoverflow.com/a/19228302/1458162
  function postLinkFn(scope, elem, attrs) {
    // compile with `ng-model` pointing to `checked`
    $compile(elem)(scope);

    // getter / setter for original model
    var getter = $parse(attrs.checklistModel);
    var setter = getter.assign;
    var checklistChange = $parse(attrs.checklistChange);

    // value added to list
    var value = $parse(attrs.checklistValue)(scope.$parent);


  var comparator = angular.equals;

  if (attrs.hasOwnProperty('checklistComparator')){
    comparator = $parse(attrs.checklistComparator)(scope.$parent);
  }

    // watch UI checked change
    scope.$watch('checked', function(newValue, oldValue) {
      if (newValue === oldValue) {
        return;
      }
      var current = getter(scope.$parent);
      if (newValue === true) {
        setter(scope.$parent, add(current, value, comparator));
      } else {
        setter(scope.$parent, remove(current, value, comparator));
      }

      if (checklistChange) {
        checklistChange(scope);
      }
    });

    // declare one function to be used for both $watch functions
    function setChecked(newArr, oldArr) {
        scope.checked = contains(newArr, value, comparator);
    }

    // watch original model change
    // use the faster $watchCollection method if it's available
    if (angular.isFunction(scope.$parent.$watchCollection)) {
        scope.$parent.$watchCollection(attrs.checklistModel, setChecked);
    } else {
        scope.$parent.$watch(attrs.checklistModel, setChecked, true);
    }
  }

  return {
    restrict: 'A',
    priority: 1000,
    terminal: true,
    scope: true,
    compile: function(tElement, tAttrs) {
      if (tElement[0].tagName !== 'INPUT' || tAttrs.type !== 'checkbox') {
        throw 'checklist-model should be applied to `input[type="checkbox"]`.';
      }

      if (!tAttrs.checklistValue) {
        throw 'You should provide `checklist-value`.';
      }

      // exclude recursion
      tElement.removeAttr('checklist-model');

      // local scope var storing individual checkbox model
      tElement.attr('ng-model', 'checked');

      return postLinkFn;
    }
  };
}]);
