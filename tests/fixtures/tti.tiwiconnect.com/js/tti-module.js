angular.module('tti.controllers', [])
  .run(function($rootScope, AdminNavigator) {
    AdminNavigator.sections.users.editTemplate = "modules/tc.webapp/partials/tti-users-edit.html";
    AdminNavigator.sections.users.name = "TTI Admin User";

    AdminNavigator.sections.devices.editTemplate = "modules/tc.webapp/partials/tti-devices-edit.html";
    AdminNavigator.sections.devices.name = "TTI Admin Device";
  }).filter('join', function() {
    return function(value) {
      return value.join()
    }
  }).filter('ttiModelName', function() {
    function ttiModelName(value) {
      if (value.indexOf('gdoMasterUnit') !== -1) {
        return 'GD200'
      }
      if (value.indexOf('gdoMasterUnit_125') !== -1 || value.indexOf('GD125') !== -1) {
        return 'GD125'
      }
      if (value.indexOf('gda500hub') !== -1) {
        return 'GDA500'
      }
      if (value.indexOf('GD126') !== -1) {
        return 'GD126'
      }
      if (value.indexOf('GD201') !== -1) {
        return 'GD201'
      }
      return value.join()

    }
    return ttiModelName;
  })
  .controller('TtiDeviceController', ['$scope', '$routeParams', '$timeout', 'AjaxService', 'GenericModalService', 'AdminDevicesService',
    function($scope, $routeParams, $timeout, AjaxService, GenericModalService, AdminService) {
      $scope.model = {};
      AjaxService.get("/devices/" + $routeParams.modeid).then(function(response) {
        $scope.model.editing = JSON.parse(JSON.stringify(response[0]));

        if ($scope.model.editing.deviceTypeIds.indexOf('gda500hub') != -1) {
          for (var k in $scope.model.editing.deviceTypeMap) {
            if (/^garageDoorSensor.*/.test(k)) {
              $scope.model.sensorProfile = $scope.model.editing.deviceTypeMap[k]
              $scope.model.sensorProfileName = k
            }
          }
        }
        $scope.clientLoaded = true;
        AdminService.getDeviceTypes().then(function(response) {
          $scope.model.deviceTypes = response;
          $scope.model.tcDeviceTypes = {};

          if (!$scope.model.editing.deviceTypeIds) {
            $scope.model.editing.deviceTypeIds = [];
          }
          response.forEach(function(dt) {
            $scope.model.tcDeviceTypes[dt.varName] = $scope.model.editing.deviceTypeIds.indexOf(dt.varName) != -1;
          });
          $scope.deviceTypesLoaded = true;
        })
      })

      $scope.isModel20x = function() {
        return $scope.model.editing.deviceTypeIds.indexOf('gdoMasterUnit') !== -1 ||
          $scope.model.editing.deviceTypeIds.indexOf('GD201') !== -1
      }

      $scope.isModel12x = function() {
        return $scope.model.editing.deviceTypeIds.indexOf('gdoMasterUnit_125') !== -1 ||
          $scope.model.editing.deviceTypeIds.indexOf('GD125') !== -1 ||
          $scope.model.editing.deviceTypeIds.indexOf('GD126') !== -1
      }

      $scope.isModel500 = function() {
        return $scope.model.editing.deviceTypeIds.indexOf('gda500hub') !== -1
      }

      $scope.state = 0
      $scope.updateAssociatedMac = function() {
        $scope.state = 1
        AjaxService.put("/attributes/" + $scope.model.editing.varName + "/" + $scope.model.sensorProfileName + "/gdoMac", {
          "value": $scope.model.sensorProfile.at.gdoMac.value.trim()
        }).then(function(response) {
          $scope.state = 2
          $timeout(function() {
            $scope.state = 0
          }, 3000)
        }, function(error) {
          $scope.state = 3
          $timeout(function() {
            $scope.state = 0
          }, 3000)
        })
      }
    }
  ])
  .controller('TtiUserController', ['$scope', 'LogService', '$routeParams', '$uibModal', '$timeout', 'AdminUsersService', 'AjaxService', 'GenericModalService',
    function($scope, $log, $routeParams, $modal, $timeout, AdminService, AjaxService, GenericModalService) {
      var Section = $scope.Section;
      Section.skip = 0;
      Section.debugLogQueryParams = "";
      $scope.model = {};
      $scope.model.fieldOrder = ["varName", "_id", "accountOptions", "createdDate", "deleted", "enabled", "metaData", "ip"];

      var _load = function() {
        AjaxService.get("/admin/users/" + $routeParams.modeid).then(function(response) {
          $scope.model.editing = JSON.parse(JSON.stringify(response));
          Section.buttons.debugLogs();
          Section.buttons.getUserNDMs();
          Section.buttons.getUserDevices();
          Section.buttons.getUserSubs();
        });
      };
      _load();

      Section.buttons.save = function() {
        AjaxService.put("/admin/users/" + $routeParams.modeid, $scope.model.editing).then(function(savedUser) {
          Section.savedSuccess = true;
          $timeout(function() {
            Section.savedSuccess = false;
          }, 3000);
        }, function(unsaved) {
          Section.savedError = true;
          $timeout(function() {
            Section.savedError = false;
          }, 5000);

        });
      };

      Section.buttons.getUserNDMs = function() {
        Section.userNDMError = false;
        Section.userNDMLoading = true;
        AjaxService.get("/admin/notif-delivery/" + $scope.model.editing.varName).then(function(result) {
          Section.userNDMs = result;
          Section.userNDMLoading = false;
        });
      };

      Section.buttons.getUserSubs = function() {
        Section.userSubsError = false;
        Section.userSubsLoading = true;
        AjaxService.get("/admin/subscriptions/" + $scope.model.editing.varName).then(function(result) {
          for (var i = 0; i < result.length; i++) {
            var mapping = '';
            for (var k in result[i].services) {
              if (result[i].services[k]) {
                mapping = mapping + k + ",";
              }
            }
            result[i].services = mapping.slice(0, -1);
          }
          Section.userSubs = result;
          Section.userSubsLoading = false;
        });
      };

      Section.buttons.deleteSub = function(_id) {
        GenericModalService.open({
          'header': 'Confirm',
          'text': 'Remove this notification subscription?',
          'ok': 'Yes',
          'cancel': 'Cancel'
        }, function(result) {
          AjaxService.delete("/admin/subscriptions/" + _id).then(function(result) {
            Section.buttons.getUserSubs();
          }, function(error) {
            console.error(error);
          });
        }, function(error) {
          console.error(error);
        });
      };

      Section.buttons.getUserDevices = function() {
        Section.userDevicesError = false;
        Section.userDevicesLoading = true;
        AjaxService.get("/admin/devices-in-auth/" + $scope.model.editing.varName).then(function(result) {
          Section.userDevices = result;
          Section.userDevicesLoading = false;
        });
      };

      Section.buttons.debugLogs = function(s) {
        Section.debugLogsLoading = true;
        if (s) {
          Section.skip = Section.skip + s >= 0 ? Section.skip + s : 0;
        }
        var skip = "&skip=" + Section.skip;
        var limit = "&limit=1";
        AjaxService.get("/tti/app-debug-logs?header.clientVarName=" + $scope.model.editing.varName + skip + limit).then(function(debuglogs) {
          // iOS sends the clientUserName as the clientVarName which is allowed to have uppercase characters, unlike varName
          if (debuglogs.logs.length === 0) {
            AjaxService.get("/tti/app-debug-logs?header.clientVarName=" + $scope.model.editing.accountOptions.alertEmail + skip + limit).then(function(debuglogs) {
              Section.debugLogs = debuglogs.logs;
              Section.debugLogsLoading = false;
            });
          } else {
            Section.debugLogs = debuglogs.logs;
            Section.debugLogsLoading = false;
          }
        });
      };

      Section.buttons.unlinkDevice = function(clientVarName) {
        GenericModalService.open({
          'header': 'Confirm',
          'text': 'Unlink this Device from the user account?',
          'ok': 'Yes',
          'cancel': 'Cancel'
        }, function() {
          AjaxService.delete("/admin/auth-selectors/" + $scope.model.editing.varName + "/" + clientVarName).then(function(resp) {
            // refresh user devices
            Section.buttons.getUserDevices();
          }, function(error) {
            alert("Error Unlinking Device, check console.");
            console.error(error);
          });
        }, function(error) {
          console.error(error);
        });
      };
    }
  ])

  .controller('TtiGdoController', ['$scope', '$route', '$timeout', 'DeviceService', 'SocketService',
    function($scope, $route, $timeout, DeviceService, SocketService) {
      var Controller = this;
      Controller.currentModule = 5;
      Controller.currentPort = 6;

      Controller.activeTab = function(id) {
        if (!$scope.model.device) {
          return;
        }
        Controller.currentModule = $scope.model.modules[id].moduleType;
        Controller.currentPort = $scope.model.modules[id].portId;
        _reset_rpc_command();
      };

      $scope.$on('bcm.ss.wskAttributeUpdateNtfy', function(event, pkg) {
        for (var k in pkg.msg.params) {
          if (/^modulePort_/.test(k)) {
            // refresh the device model from the server
            _load_device_model($route.reload);
            break;
          }
        }
      });

      var _reset_rpc_command = function() {
        $scope.model.rpcCommand = {
          "msgType": 16,
          "moduleType": Controller.currentModule,
          "portId": Controller.currentPort,
          "moduleMsg": {},
          "topic": $scope.model.device.varName
        };
      };

      // setup model and identity
      $scope.model = {
        "viewDeviceId": $route.current.params.endnodeid,
        "rpcCommandString": "",
        "rpcMethod": "gdoModuleCommand",
        "modules": [{
            "portId": 0
          },
          {
            "portId": 1
          },
          {
            "portId": 2
          },
          {
            "portId": 3
          },
          {
            "portId": 4
          },
          {
            "portId": 5
          },
          {
            "portId": 6
          },
          {
            "portId": 7
          },
          {
            "portId": 8
          },
          {
            "portId": 9
          }
        ]
      };
      $scope.moduleTypes = [];
      $scope.moduleTypes[11] = {
        "moduleName": "GDO_125",
        "portId": 0,
        "moduleType": 11,
        "door": null,
        "light": null
      };
      $scope.moduleTypes[5] = {
        "moduleName": "GDO",
        "portId": 0,
        "moduleType": 5,
        "door": null,
        "light": null
      };
      $scope.moduleTypes[4] = {
        "moduleName": "Inflator",
        "portId": 0,
        "moduleType": 4,
        "inflator": null
      };
      $scope.moduleTypes[3] = {
        "moduleName": "Fan",
        "portId": 0,
        "moduleType": 3,
        "fan": null
      };
      $scope.moduleTypes[6] = {
        "moduleName": "Battery",
        "portId": 0,
        "moduleType": 6,
        "battery": null
      };
      $scope.moduleTypes[2] = {
        "moduleName": "BlueTooth Speaker",
        "portId": 0,
        "moduleType": 2,
        "btSpeaker": null
      };

      $scope.moduleTypes[1] = {
        "moduleName": "Laser Parking Assist",
        "portId": 0,
        "moduleType": 1,
        "laser": null
      };
      $scope.moduleTypes[0] = {
        "moduleName": "Environmental Sensor",
        "portId": 0,
        "moduleType": 0,
        "environmentalSensor": null
      };

      $scope.$watch('model.rpcCommandString', function(newVal, oldVal) {
        if (newVal !== "" && newVal != oldVal) {
          try {
            $scope.model.rpcCommand = JSON.parse('{' + $scope.model.rpcCommandString + '}');
            if (!('topic' in $scope.model.rpcCommand)) {
              $scope.model.rpcCommand.topic = $scope.model.device.varName;
            }
            $scope.model.invalidJson = false;
          } catch (err) {
            $scope.model.invalidJson = true;
          }
        }
      });

      $scope.resetCommand = function() {
        _reset_rpc_command();
        $scope.model.rpcCommandString = "";
        $scope.model.rpcMethod = "gdoModuleCommand";
        $scope.model.invalidJson = false;
      };

      $scope.getPreview = function() {
        return {
          "jsonrpc": "2.0",
          "method": $scope.model.rpcMethod,
          "params": $scope.model.rpcCommand
        };
      };

      $scope.debounce = null;
      $scope.rpcEdit = function() {
        if ($scope.debounce) {
          $timeout.cancel($scope.debounce);
        }

        //start debounce
        $scope.debounce = $timeout(function() {

          //send rpcCommand
          SocketService.emit($scope.model.rpcMethod, $scope.model.rpcCommand);
          //_reset_rpc_command();
          $scope.debounce = null;
          $scope.model.invalidJson = false;
        }, 1000);
      };

      var _find_profile = function(p, model, regex) {
        if ('moduleProfiles' in model[p].at && model[p].at.moduleProfiles.value.length > 0) {
          for (var i = 0; i < model[p].at.moduleProfiles.value.length; i++) {
            if (regex.test(model[p].at.moduleProfiles.value[i])) {
              return model[model[p].at.moduleProfiles.value[i]].at;
            }
          }
        }
      };

      $scope.get_fan_speed = function(s) {
        if (!s) {
          return 0;
        } else {
          return 10 * (100 - s.value);
        }
      };
      var _load_device_model = function(cb) {
        var gdoPort = 7;
        var _port = 0;
        DeviceService.get($route.current.params.endnodeid, {
          "force": true
        }).then(function(device) {
          device.deviceTypeMapSort = [];
          $scope.noModules = true;
          for (var _p in device.deviceTypeMap) {
            if (/^modulePort/.test(_p) && $scope.moduleTypes[device.deviceTypeMap[_p].at.moduleId.value]) {
              _port = device.deviceTypeMap[_p].at.portId.value;
              $scope.model.modules[_port] = JSON.parse(JSON.stringify($scope.moduleTypes[device.deviceTypeMap[_p].at.moduleId.value]));
              $scope.model.modules[_port].portId = _port;

              if ($scope.model.modules[_port].moduleType != 255) {
                $scope.noModules = false;
              }

              if ($scope.model.modules[_port].moduleType == 6) {
                $scope.model.modules[_port].battery = _find_profile(_p, device.deviceTypeMap, /^backupCharger/);
              }
              if ($scope.model.modules[_port].moduleType == 4) {
                $scope.model.modules[_port].battery = _find_profile(_p, device.deviceTypeMap, /^inflator/);
              }
              if ($scope.model.modules[_port].moduleType == 5 || $scope.model.modules[_port].moduleType == 11) {
                gdoPort = _port;
                $scope.model.modules[_port].door = _find_profile(_p, device.deviceTypeMap, /^garageDoor/);
                $scope.model.modules[_port].light = _find_profile(_p, device.deviceTypeMap, /^garageLight/);
              }
              if ($scope.model.modules[_port].moduleType == 3) {
                $scope.model.modules[_port].fan = _find_profile(_p, device.deviceTypeMap, /^fan/);
              }
              if ($scope.model.modules[_port].moduleType == 2) {
                $scope.model.modules[_port].btSpeaker = _find_profile(_p, device.deviceTypeMap, /^btSpeaker/);
              }
              if ($scope.model.modules[_port].moduleType == 1) {
                $scope.model.modules[_port].parkAssistLaser = _find_profile(_p, device.deviceTypeMap, /^parkAssistLaser/);
              }
              if ($scope.model.modules[_port].moduleType === 0); {
                $scope.model.modules[_port].environmentalSensor = _find_profile(_p, device.deviceTypeMap, /^environmentalSensor/);
              }
            }
          }

          return device;
        }).then(function(device) {
          $scope.model.device = device;
          Controller.activeTab(gdoPort);
          if (cb) {
            cb();
          }
        });
      };
      _load_device_model();
    }
  ]);