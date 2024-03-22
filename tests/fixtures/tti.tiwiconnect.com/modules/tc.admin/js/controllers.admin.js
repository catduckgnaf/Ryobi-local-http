/* Admin Controllers */
angular.module('tcadmin.controllers', ['ui.sortable']).run(function($rootScope, $location) {
    $rootScope.baseAdminFolder = 'modules/tc.admin/';

  })
  .factory('AdminNavigator', ['$location', '$routeParams', function($location, $routeParams) {
    var _navi = {};

    _navi.sections = {
      "websockets": {
        "name": "WebSockets",
        "id": "websockets",
        "role": ["site_admin", "super_user"],
        "template": "modules/tc.admin/partials/tcadmin-websockets.html",
        "editTemplate": "modules/tc.admin/partials/tcadmin-devices-edit.html"
      },
      "devices": {
        "name": "Devices",
        "id": "devices",
        "role": ["site_admin", "super_user"],
        "template": "modules/tc.admin/partials/tcadmin-devices.html",
        "editTemplate": "modules/tc.admin/partials/tcadmin-devices-edit.html",
        "controller": 'AdminDevicesController'
      },
      "groups": {
        "name": "Groups",
        "id": "groups",
        "role": ["site_admin", "super_user"],
        "template": "modules/tc.admin/partials/tcadmin-groups.html",
        "editTemplate": "modules/tc.admin/partials/tcadmin-groups-edit.html",
        "controller": 'AdminGroupsController'
      },
      "users": {
        "name": "Users",
        "id": "users",
        "role": ["site_admin", "super_user"],
        "template": "modules/tc.admin/partials/tcadmin-users.html",
        "editTemplate": "modules/tc.admin/partials/tcadmin-users-edit.html",
        "controller": 'AdminUsersController'
      },
      "devicetypes": {
        "name": "Device Types",
        "id": "devicetypes",
        "role": ["site_admin", "super_user"],
        "template": "modules/tc.admin/partials/tcadmin-devicetypes.html",
        "editTemplate": "modules/tc.admin/partials/tcadmin-devicetypes-edit.html"
      },
      "auths": {
        "name": "Client Auths",
        "role": ["site_admin"],
        "id": "auths",
        "template": "modules/tc.admin/partials/tcadmin-auths.html",
        "editTemplate": "modules/tc.admin/partials/tcadmin-auths-edit.html"
      },
      "roles": {
        "name": "Client Roles",
        "role": ["site_admin"],
        "id": "roles",
        "template": "modules/tc.admin/partials/tcadmin-roles.html",
        "editTemplate": "modules/tc.admin/partials/tcadmin-roles-edit.html"
      },
      "migration": {
        "name": "Migrate",
        "role": ["site_admin"],
        "id": "migration",
        "template": "modules/tc.admin/partials/tcadmin-migration.html",
        "controller": 'AdminMigController'
      },
      "bulk": {
        "name": "Bulk Add Clients",
        "role": ["site_admin"],
        "id": "bulk",
        "template": "modules/tc.admin/partials/tcadmin-clients-import.html"
      }
    };

    _navi.section = $routeParams.section;
    _navi.mode = 'viewing';

    _navi.addSection = function(json) {
      _navi.sections[json.id] = json;
    };

    _navi.to = function(section, modeid) {
      if (_navi.sections.hasOwnProperty(section)) {
        _navi.section = section;
        if (modeid) {
          $location.url('/admin/' + section + '/' + modeid);
          return true;
        }


        $location.url('/admin/' + section);
        return true;
      }
      return false;
    };

    _navi.Home = function() {
      $location.url('/admin');
    };
    return _navi;
  }])
  .service('AdminMigService', ['$q', 'AjaxService', function($q, AjaxService) {
    var _m_c = {
      "clients": []
    };

    return function() {
      if (_m_c.clients.length > 0) {
        return $q.when(_m_c.clients);
      } else {
        return AjaxService.get('/admin/migrate-clients').then(function(response) {
          _m_c.clients = response;
          return _m_c.clients;
        });
      }
    };
  }])
  .controller('AdminMigController', ['$rootScope', '$scope', 'AdminMigService', 'LogService', '$uibModal', 'AjaxService',
    function($rootScope, $scope, AdminMigService, $log, $modal, AjaxService) {
      var AdminMig = this;
      $scope.loading = true;

      AdminMigService().then(function(response) {
        console.log(response);
        $scope.loading = false;
        $scope.migrateClients = response;
      });

      AdminMig.run = function(id) {
        AjaxService.get('/admin/migrate-clients/' + id).then(function(response) {

          for (var i = 0; i < $scope.migrateClients.length; i++) {
            if ($scope.migrateClients[i]._id == id) {
              $scope.migrateClients[i].metaData.migrated = true;
              break;
            }
          }
        }, function(error) {
          console.error(error);
        });
      };

    }
  ])
  .controller('AdminWebSocketsController', ['$rootScope', '$scope', '$interval', 'AdminNavigator', 'LogService', '$uibModal', 'AjaxService',
    function($rootScope, $scope, $interval, AdminNavigator, $log, $modal, AjaxService) {
      var Section = $scope.Section;
      var Controller = this;

      var g = $interval(function() {
        AjaxService.get('/admin/websockets/count').then(function(result) {
          Section.loaded = true;
          Controller.clientCount = result;
        }, function(error) {

        });
      }, 1000);

      $scope.$on("$destroy", function() {
        $interval.cancel(g);
      });
    }
  ])
  .controller('AdminHomeController', ['$rootScope', '$scope', 'AdminNavigator', '$routeParams', 'LogService', '$uibModal', 'AjaxService',
    function($rootScope, $scope, AdminNavigator, $log, $modal, AjaxService) {
      $scope.navigator = AdminNavigator;
    }
  ])
  .controller('AdminSectionController', ['$location', 'AdminNavigator', '$routeParams', 'LogService', '$uibModal', 'AjaxService',
    function($location, AdminNavigator, $routeParams, $log, $modal, AjaxService) {
      var Section = this;

      this.isBoolean = function(value, key) {
        return typeof value == 'boolean';
      };

      this.shown = function(key) {
        var exclude = "__v id";
        return exclude.indexOf(key) == -1
      };

      this.typeOf = function(value) {
        // assume a null value is an unset string
        if (value == null) {
          return 'string';
        }
        return typeof value;
      };

      this.navigator = AdminNavigator;
      this.def = this.navigator.sections[$routeParams.section];
      this.navigator.mode = "Viewing";

      this.savedSuccess = this.savedError = false;
      this.buttons = {
        section: function() {
          Section.loaded = false;
          Section.navigator.to($routeParams.section);
        },
        cancel: function() {
          Section.loaded = false;
          Section.navigator.to($routeParams.section);
        },
        edit: function(id) {
          Section.loaded = false;
          Section.navigator.to($routeParams.section, id);
        }
      }
    }
  ])

  .filter("bytesFilter", function() {
    return function(val, t) {
      if (!val) {
        return '0';
      }
      val = parseInt(val, 10);
      if (!t) {
        t = 'k';
      }
      var lab = false;
      switch (t) {
        case 'm':
          val = val / 1024;
          lab = lab || 'MB';
        case 'k':
          val = val / 1024;
          lab = lab || 'KB';
        case 'b':
          lab = lab || 'B';
      }
      val = Math.ceil(val * 100) / 100;

      return val + ' ' + lab;
    };
  })
  .controller('AdminDeviceTypesController', ['$scope', 'LogService', '$uibModal', 'AdminDevicesService', 'AjaxService',
    function($scope, $log, $modal, AdminService, AjaxService) {
      var Section = $scope.Section;

      var adminDeviceTypes = this;

      /* Move to Service */
      adminDeviceTypes.model = {
        deviceTypes: []
      };

      AdminService.getDeviceTypes().then(function(response) {
        Section.loaded = true;
        adminDeviceTypes.model.deviceTypes = response;
      });

      adminDeviceTypes.buttons = {
        add: function() {
          $modal.open({
            templateUrl: $scope.baseAdminFolder + 'partials/m-admin-devicetype-add.html',
            controller: 'AdminImportDeviceTypeController'
          });
        },
        remove: function(dtid) {
          $modal.open({
            templateUrl: $scope.baseAdminFolder + 'partials/m-confirm.html',
            controller: confirmCmdClientController,
            resolve: {
              parentScope: function() {
                return {
                  "clientid": dtid,
                  "message": "Are you sure you want to delete this device type?",
                  "cmd": "removeType",
                  "opt": true,
                  "AdminService": AdminService
                }
              }
            }
          });
        }
      };

    }
  ]).controller('AdminDeviceTypeEditController', ['$scope', 'LogService', '$routeParams', '$uibModal', '$timeout', 'AdminDevicesService', 'AjaxService',
    function($scope, $log, $routeParams, $modal, $timeout, AdminService, AjaxService) {
      var Section = $scope.Section;

      $scope.model = {};
      $scope.model.fieldOrder = ["varName", "_id", "metaData", "profileList"];

      AdminService.getDeviceTypes($routeParams.modeid).then(function(response) {
        $scope.model.editing = JSON.parse(JSON.stringify(response));
        Section.loaded = true;
      });

      Section.buttons.save = function() {
        AdminService.saveType($scope.model.editing).then(function(savedUser) {
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

    }
  ])
  .controller('AdminImportDeviceTypeController',
    function($scope, $uibModalInstance, AdminDevicesService) {
      $scope.model = {};

      $scope.$watch('model.importFile', function() {

        if ($scope.model.importFile && $scope.model.importFile.length > 0) {
          var reader = new FileReader();
          // Closure to capture the file information.
          reader.onload = (function(file) {
            return function(e) {
              $scope.model.importText = reader.result;
              $scope.model.checkJson();
            };
          })($scope.model.importFile[0]);
          reader.readAsText($scope.model.importFile[0]);
        }
      });

      $scope.model.checkJson = function() {
        $scope.newData = JSON.parse($scope.model.importText);
        $scope.newData.metaData = $scope.newData.metaData || {};
        $scope.newData.metaData.name = $scope.newData.metaData.name || "Imported Device Type";
        $scope.newData.varName = $scope.newData.varName;
        $scope.newData.profileList = $scope.newData.profileList || [];
        $scope.newData.owner = $scope.__currentAppUser._id;

        //remove _ids
        for (var p in $scope.newData.profileList) {
          delete $scope.newData.profileList[p]._id;
          for (var at in $scope.newData.profileList[p].attributeList) {
            delete $scope.newData.profileList[p].attributeList[at]._id;
          }
          for (var ac in $scope.newData.profileList[p].actionList) {
            delete $scope.newData.profileList[p].actionList[ac]._id;
          }
        }
        delete $scope.newData._id;

        $scope.jsonOk = true;
      };

      $scope.buttons = {
        ok: function() {
          AdminDevicesService.importDeviceTypes($scope.newData).then(function(returned) {
            // done saving
            $uibModalInstance.close(true);
          }, function(error) {});
        },
        cancel: function() {
          $uibModalInstance.close();
        }
      };
    })

  .controller('AdminImportClientsController', ['$scope', 'LogService', '$location', '$uibModal', 'AdminDevicesService', 'AjaxService',
    function($scope, $log, $location, $modal, AdminService, AjaxService) {
      var AdminImportClients = this;
      var Section = $scope.Section;

      AdminImportClients.newClients = [];

      AdminImportClients.deviceTypes = {};
      AdminImportClients.tcDeviceTypes = {};
      AdminImportClients.createdClients = '';

      AdminService.getDeviceTypes().then(function(response) {
        Section.loaded = true;
        response.forEach(function(d) {
          AdminImportClients.deviceTypes[d.varName] = d;
          AdminImportClients.tcDeviceTypes[d.varName] = false;
        });
      });

      function bulkAddDevices() {
        var _deviceTypeIds = [];
        for (var k in AdminImportClients.tcDeviceTypes) {
          if (AdminImportClients.tcDeviceTypes[k]) {
            _deviceTypeIds.push(k);
          }
        }

        var _create_device = function(newDevice, cb) {
          newDevice.deviceTypeIds = _deviceTypeIds;
          newDevice.varName = newDevice.varName.replace(/\s+/g, "");
          newDevice.varName = newDevice.varName.toLowerCase();

          AdminService.create(newDevice).then(function(result) {
              AdminImportClients.createdClients = AdminImportClients.createdClients + result.client.metaData.name + ', ' + result.client.varName + ', ' + result.clientAuth.regPin + ', ' + result.clientAuth.apiKey + ', ' + result.clientAuth._id + '\r\n';
              cb(false);
            },
            function(err) {
              console.error(err);
              AdminImportClients.createdClients = AdminImportClients.createdClients + '\r\n' + newDevice.varName + 'Error! (check console)\r\n';
            });
        };

        var _next = function(err) {
          if (AdminImportClients.newClients.length > 0) {
            _create_device(AdminImportClients.newClients.shift(), _next);
          } else {
            AdminImportClients.createdClients = AdminImportClients.createdClients + '\r\nDone\r\n';
          }
        };
        _next();
      }

      //load a CSV?
      //deviceTypeIds,metaData.name,varName,apiKey,regPin
      AdminImportClients.buttons = {
        load: function() {
          var _csvImported = parseCSV(AdminImportClients.textArea);
          if (_csvImported) {
            var _allowed_fields = ["name", "varname", "regpin", "apikey"];
            var _fields = ["name", "varName", "regPin", "apiKey"];
            var import_fields = ["name", "varName", "regPin", "apiKey"];
            var _start_import = 0;

            // check for header
            if (_allowed_fields.indexOf(_csvImported[0][0].toLowerCase()) != -1) {
              _start_import = 1;
              for (var ii = 0; ii < _csvImported[0].length; ii++) {
                var _index = _allowed_fields.indexOf(_csvImported[0][ii].toLowerCase());
                import_fields[ii] = "";
                if (_index != -1) {
                  import_fields[ii] = _fields[_index];
                }
              }
            }
            // start importing at
            for (var i = _start_import; i < _csvImported.length; i++) {
              var _nc = {};
              for (ii = 0; ii < import_fields.length; ii++) {
                if (import_fields[ii] != "") {
                  _nc[import_fields[ii]] = _csvImported[i][ii];
                }
              }
              _nc.metaData = {
                "name": _nc.name || _nc.varName
              };
              AdminImportClients.newClients.push(_nc);
            }
          }
        },
        import: bulkAddDevices,
        add: function() {
          AdminImportClients.newClients.push({});
        },
        help: function() {
          $modal.open({
            templateUrl: $scope.baseAdminFolder + 'partials/m-admin-bulkadd-help.html',
            controller: function addGroupModalController($scope, $uibModalInstance) {
              $scope.model = {};
              $scope.buttons = {
                ok: function() {
                  $uibModalInstance.close();
                }
              };
            }
          });
        }
      };

      function parseCSV(str) {
        var arr = [];
        var quote = false; // true means we're inside a quoted field

        // iterate over each character, keep track of current row and column (of the returned array)
        for (var row = col = c = 0; c < str.length; c++) {
          var cc = str[c],
            nc = str[c + 1]; // current character, next character
          arr[row] = arr[row] || []; // create a new row if necessary
          arr[row][col] = arr[row][col] || ''; // create a new column (start with empty string) if necessary

          // If the current character is a quotation mark, and we're inside a
          // quoted field, and the next character is also a quotation mark,
          // add a quotation mark to the current column and skip the next character
          if (cc == '"' && quote && nc == '"') {
            arr[row][col] += cc;
            ++c;
            continue;
          }

          // If it's just one quotation mark, begin/end quoted field
          if (cc == '"') {
            quote = !quote;
            continue;
          }

          // If it's a comma and we're not in a quoted field, move on to the next column
          if (cc == ',' && !quote) {
            ++col;
            continue;
          }

          // If it's a newline and we're not in a quoted field, move on to the next
          // row and move to column 0 of that new row
          if (cc == '\n' && !quote) {
            ++row;
            col = 0;
            continue;
          }

          // Otherwise, append the current character to the current column
          arr[row][col] += cc;
        }
        return arr;
      }
    }
  ])
  .controller('AdminGroupEditController', ['$scope', '$timeout', 'LogService', '$filter', '$location', '$uibModal', '$routeParams', 'AdminGroupsService', 'AjaxService', 'AdminDevicesService',
    function($scope, $timeout, $log, $filter, $location, $modal, $routeParams, AdminService, AjaxService, AdminAuthService) {
      var adminSection = this;
      var Section = $scope.Section;
      adminSection.model = {};
      adminSection.model.fieldOrder = ["varName", "_id", "members", "createdDate", "deleted", "enabled", "metaData"];
      adminSection.model.results = "";
      adminSection.model.allMembers = [];
      adminSection.model.selectedMembers = [];
      adminSection.model.allSelectedMembers = [];
      adminSection.model.filteredGroupMembers = [];
      var _groups;

      adminSection.showGroupLessOnly = true;
      adminSection.sortMembers = {
        connectWith: ".sortMembers",
        placeholder: "placeholder",
        update: function(newVal, oldVal) {
          if (!$scope.filterTextLeft || $scope.filterTextLeft === '') {
            // a member was added or removed, and not filtered
            if (adminSection.model.editing) {
              adminSection.model.editing.members = adminSection.model.selectedMembers.map(function(m) {
                return m.varName;
              });
            }
          }
        }
      };

      var _update_right = function(newVal, oldVal) {
        if (adminSection.showGroupLessOnly) {
          // remove clients from selection pool if they are members of any group
          adminSection.model.filteredGroupMembers = adminSection.model.filteredGroupMembers.filter(function(a) {
            for (var i = 0; i < _groups.length; i++) {
              if (_groups[i].members.indexOf(a.varName) != -1) {
                return false;
              }
            }
            return true;
          });
        } else {
          // remove clients from the selection pool if they are already members
          adminSection.model.filteredGroupMembers = adminSection.model.filteredGroupMembers.filter(function(a) {
            return adminSection.model.editing.members.indexOf(a.varName) == -1;
          });
        }

        //apply the text box filter to the remaining selection pool
        adminSection.model.filteredGroupMembers = $filter('filter')(adminSection.model.allMembers, {
          '$': newVal
        });

        // create an array of selected members that will be converted to members property before save
        adminSection.model.selectedMembers = adminSection.model.selectedMembers.filter(function(a) {
          return adminSection.model.editing.members.indexOf(a.varName) != -1;
        });
      };
      $scope.$watch('adminSection.showGroupLessOnly', _update_right);

      $scope.$watch('filterTextRight', _update_right);

      var _update_left = function(newVal, oldVal) {
        // create an array of selected members that will be converted to members property before save
        adminSection.model.selectedMembers = $filter('filter')(adminSection.model.allMembers, {
          '$': newVal
        });
        adminSection.model.selectedMembers = adminSection.model.selectedMembers.filter(function(a) {
          return adminSection.model.editing.members.indexOf(a.varName) != -1;
        });
      };
      $scope.$watch('filterTextLeft', _update_left);

      // get all groups
      AdminService.get().then(function(groups) {
        _groups = groups;
        for (var i = 0; i < groups.length; i++) {
          if (groups[i]._id == $routeParams.modeid) {
            adminSection.model.editing = groups[i];
            break;
          }
        }

        // get all client auths so that they can be added to the group
        AdminAuthService.get().then(function(response) {
          adminSection.model.allMembers = response;
          $scope.filterTextLeft = "";
          $scope.filterTextRight = "";

          $scope.loaded = true;
        });
      });

      Section.buttons.save = function() {
        $scope.filterTextLeft = '';

        AdminService.save(adminSection.model.editing).then(function(response) {
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
    }
  ])
  .controller('AdminGroupController', ['$rootScope', '$scope', 'LogService', '$location', '$uibModal', 'AdminGroupsService', 'AjaxService',
    function($rootScope, $scope, $log, $location, $modal, AdminService, AjaxService) {
      var Section = $scope.Section;
      var adminSection = this;
      adminSection.model = {};

      adminSection.clientSort = "metaData.name";
      AdminService.get().then(function(groups) {
        adminSection.model.clients = groups;
        Section.loaded = true;
      });

      adminSection.model.members = {};

      if (!$rootScope.addGroupModal) {
        $rootScope.addGroupModal = {};
      }

      $rootScope.addGroupModal.templateUrl = $rootScope.addGroupModal.templateUrl || $scope.baseAdminFolder + 'partials/m-admin-group-add.html';
      $rootScope.addGroupModal.controller = $rootScope.addGroupModal.controller || addGroupModalController;


      function addGroupModalController($scope, $uibModalInstance) {
        $scope.model = {};
        $scope.model.apiKeyError = false;
        $scope.newClient = {
          "metaData": {}
        };

        $scope.buttons = {
          ok: function() {
            AdminService.create($scope.newClient).then(function(client) {
                $uibModalInstance.close();
              },
              function(err) {
                alert(err);
                $log.error(err);
              });
          },
          cancel: function() {
            $uibModalInstance.close();
          },
          generateVarName: function() {
            AjaxService.get('/admin/clientgenvarname').then(function(ok) {
              //validation pass
              $scope.newClient.varName = ok;
              $scope.buttons.checkVarName();
            });
          },
          generateApiKey: function() {
            AjaxService.get('/admin/clientgenapikey').then(function(ok) {
              //validation pass
              $scope.newClient.apiKey = ok;
              $scope.buttons.checkApiKey();
            });
          },
          checkVarName: function() {
            if (!$scope.newClient.varName) {
              $scope.model.varNameError = "Undefined";
              return;
            }
            AjaxService.get('/admin/clientvarname/' + $scope.newClient.varName).then(function(ok) {
              //validation pass
              $scope.model.varNameError = ok == 'OK' ? false : ok;
            });
          },
          checkApiKey: function() {
            if (!$scope.newClient.apiKey) {
              $scope.model.apiKeyError = false;
              return;
            }
            AjaxService.get('/admin/clientapikey/' + $scope.newClient.apiKey).then(function(ok) {
              //validation pass
              $scope.model.apiKeyError = ok == 'OK' ? false : ok;
            });
          }
        };
        $scope.buttons.checkVarName();
        $scope.buttons.checkApiKey();

      }

      adminSection.buttons = {
        add: function() {
          $modal.open($rootScope.addGroupModal);
        },
        restore: function(clientid) {
          AdminService.restore(clientid).then(function(response) {});
        },
        remove: function(clientid, confirm) {
          if (confirm) {
            $modal.open({
              templateUrl: $scope.baseAdminFolder + 'partials/m-confirm.html',
              controller: confirmCmdClientController,
              resolve: {
                parentScope: function() {
                  return {
                    "clientid": clientid,
                    "message": "Are you sure you want to delete this group?",
                    "cmd": "remove",
                    "opt": true,
                    "AdminService": AdminService
                  };
                }
              }
            });
          } else {
            AdminService.remove(clientid).then(function(response) {
              console.log(response);
            });
          }
        },
        expand: function(client) {
          client.expanded = !client.expanded;
          // get members
          AdminService.getMembers(client._id).then(function(response) {
            adminSection.model.members[client._id] = response.members;
          });
        }
      };
    }
  ])
  .controller('AdminDevicesController', ['$rootScope', '$scope', 'LogService', '$location', '$uibModal', 'AdminDevicesService', 'AjaxService', '$http',
    function($rootScope, $scope, $log, $location, $modal, AdminService, AjaxService, $http) {
      var Section = $scope.Section;

      // define this on rootScope so it can be over ridden by custom modules
      if (!$rootScope.addDeviceModal) {
        $rootScope.addDeviceModal = {
          templateUrl: $scope.baseAdminFolder + 'partials/m-admin-device-add.html',
          controller: 'AddDeviceModalController'
        };
      }

      var Controller = this;
      Controller.model = {};
      Controller.sort = "metaData.name";
      Controller.currentPage = 1;
      Controller.itemsPerPage = 25;
      var searchQuery = "";
      var sortQuery = "";

      var _load = function() {
        $http.get("/api/admin/devices-paged?limit=" + Controller.itemsPerPage + "&page=" + (Controller.currentPage - 1) + sortQuery + searchQuery).then(function(response) {
          Controller.model.clients = response.data.result.data;
          Controller.totalClients = response.data.result.count;
          Section.loaded = true;
        });
      };
      _load();

      $scope.onPageChange = function(newPage) {
        Controller.currentPage = newPage;
        _load();
      };

      Controller.onSort = function(newVal) {
        if (newVal != Controller.sort) {
          Controller.sort = newVal;
        } else {
          Controller.reverse = !Controller.reverse;
        }
        var rev = Controller.reverse ? "-" : "";
        sortQuery = "&sort=" + rev + Controller.sort;
        _load();
      };

      $scope.$watch("AdminClients.listSearch", function(newVal, oldVal) {
        if (newVal && newVal != oldVal) {
          searchQuery = "&searchString=" + Controller.listSearch;
          _load();
        } else {
          searchQuery = "";
          _load();
        }
      });

      Controller.buttons = {
        add: function() {
          var CreateDeviceModal = $modal.open($rootScope.addDeviceModal);
          CreateDeviceModal.result.then(function(result) {
            console.log("device added, refresh");
            _load();
          }, function(error) {

          });
        },
        restore: function(clientid) {
          AdminService.restore(clientid).then(function(response) {});
        },
        remove: function(clientid, confirm) {
          if (confirm) {
            $modal.open({
              templateUrl: $scope.baseAdminFolder + 'partials/m-confirm.html',
              controller: confirmCmdClientController,
              resolve: {
                parentScope: function() {
                  return {
                    "clientid": clientid,
                    "message": "Are you sure you want to delete this device?",
                    "cmd": "remove",
                    "opt": true,
                    "AdminService": AdminService
                  };
                }
              }
            });
          } else {
            AdminService.remove(clientid).then(function(response) {
              console.log(response);
            });
          }
        },
        viewDevice: function(client) {
          AdminService.getAuth(client.varName).then(function(response) {
            if (response.length > 0) {
              var _varName = response[0]._id;
              $location.url('endnode/' + _varName);
            } else {
              client.noAuthError = true;
            }
          });
        }
      };

      Controller.changeLocation = function(url) {
        $location.url(url);
      };

    }
  ]).controller('AddDeviceModalController', function addDeviceModalController($scope, $log, $uibModalInstance, AjaxService, AdminDevicesService) {
    $scope.model = {};
    $scope.newDevice = {
      "metaData": {}
    };

    AdminDevicesService.getDeviceTypes().then(function(response) {
      $scope.model.deviceTypes = response;

      $scope.model.tcDeviceTypes = {};
      $scope.newDevice.deviceTypeIds = ['tiwicwBase'];
      response.forEach(function(dt) {
        $scope.model.tcDeviceTypes[dt.varName] = $scope.newDevice.deviceTypeIds.indexOf(dt.varName) != -1;
      });
    });

    $scope.buttons = {
      ok: function() {
        $scope.newDevice.deviceTypeIds = [];
        for (var k in $scope.model.tcDeviceTypes) {
          if ($scope.model.tcDeviceTypes[k]) {
            $scope.newDevice.deviceTypeIds.push(k);
          }
        }

        //$scope.newDevice.deviceTypeIds = [$scope.newDevice.deviceTypeId];
        AjaxService.post("/admin/devices", $scope.newDevice).then(function(device) {
            $uibModalInstance.close();
          },
          function(err) {
            $log.error(err);
          });
      },
      cancel: function() {
        $uibModalInstance.close();
      },
      generateVarName: function() {
        AjaxService.get('/admin/clientgenvarname').then(function(ok) {
          //validation pass
          $scope.newDevice.varName = ok;
          $scope.buttons.checkVarName();
        });
      },
      generateApiKey: function() {
        AjaxService.get('/admin/clientgenapikey').then(function(ok) {
          //validation pass
          $scope.newDevice.apiKey = ok;
          $scope.buttons.checkApiKey();
        });
      },
      checkVarName: function() {
        if (!$scope.newDevice.varName) {
          $scope.model.varNameError = "Undefined";
          return;
        }
        AjaxService.get('/admin/clientvarname/' + $scope.newDevice.varName).then(function(ok) {
          //validation pass
          console.log(ok);
          $scope.model.varNameError = ok == 'OK' ? false : ok;
        });
      },
      checkApiKey: function() {
        if (!$scope.newDevice.apiKey) {
          $scope.model.apiKeyError = "Undefined";
          return;
        }
        AjaxService.get('/admin/clientapikey/' + $scope.newDevice.apiKey).then(function(ok) {
          //validation pass
          console.log(ok);
          $scope.model.apiKeyError = ok == 'OK' ? false : ok;
        });
      }
    };
    $scope.buttons.checkVarName();
    $scope.buttons.checkApiKey();
  }).controller('AdminUsersController', ['$scope', 'LogService', '$uibModal', 'AdminUsersService', '$http',
    function($scope, $log, $modal, AdminService, $http) {
      var Section = $scope.Section;
      var Controller = this;
      Controller.model = {};
      Controller.sort = "varName";
      Controller.currentPage = 1;
      Controller.itemsPerPage = 25;
      var searchQuery = "";
      var sortQuery = "";

      Controller.model = {
        clients: []
      };

      var _load = function() {
        $http.get("/api/admin/users-paged?limit=" + Controller.itemsPerPage + "&page=" + (Controller.currentPage - 1) + sortQuery + searchQuery).then(function(response) {
          Controller.model.clients = response.data.result.data;
          Controller.totalClients = response.data.result.count;
          Section.loaded = true;
        });
      };
      _load();

      $scope.onPageChange = function(newPage) {
        Controller.currentPage = newPage;
        _load();
      };

      Controller.onSort = function(newVal) {
        if (newVal != Controller.sort) {
          Controller.sort = newVal;
        } else {
          Controller.reverse = !Controller.reverse;
        }
        var rev = Controller.reverse ? "-" : "";
        sortQuery = "&sort=" + rev + Controller.sort;
        _load();
      };

      $scope.$watch("AdminClients.listSearch", function(newVal, oldVal) {
        if (newVal && newVal != oldVal) {
          searchQuery = "&searchString=" + Controller.listSearch;
          _load();
        } else {
          searchQuery = "";
          _load();
        }
      });

      function addUserModalController($scope, $uibModalInstance) {
        $scope.model = {};
        $scope.buttons = {
          ok: function() {
            AdminService.add($scope.model).then(function(user) {
                $uibModalInstance.close();
              },
              function(err) {
                $log.error(err);
              });
          },
          cancel: function() {
            $uibModalInstance.close();
          }
        };
      }

      Controller.buttons = {
        add: function() {
          $modal.open({
            templateUrl: $scope.baseAdminFolder + 'partials/m-admin-user-add.html',
            controller: addUserModalController
          });
        },
        restore: function(clientid) {
          AdminService.restore(clientid).then(function(response) {});
        },
        remove: function(clientid, confirm) {
          if (confirm) {
            $modal.open({
              templateUrl: $scope.baseAdminFolder + 'partials/m-confirm.html',
              controller: confirmCmdClientController,
              resolve: {
                parentScope: function() {
                  return {
                    "clientid": clientid,
                    "message": "Are you sure you want to delete this user?",
                    "cmd": "remove",
                    "opt": true,
                    "AdminService": AdminService
                  }
                }
              }
            });
          } else {
            AdminService.remove(clientid).then(function(response) {
              console.log(response);
            });
          }
        },
        AuthReset: function(clientid) {
          $modal.open({
            templateUrl: $scope.baseAdminFolder + 'partials/m-confirm.html',
            controller: confirmCmdClientController,
            resolve: {
              parentScope: function() {
                return {
                  "clientid": clientid,
                  "message": "Are you sure you want to reset this user's password?",
                  "cmd": "reset",
                  "opt": false,
                  "AdminService": AdminService
                }
              }
            }
          });
        }
      };
    }
  ]).controller('AdminUserEditController', ['$scope', 'LogService', '$routeParams', '$uibModal', '$timeout', 'AdminUsersService', 'AjaxService',
    function($scope, $log, $routeParams, $modal, $timeout, AdminService, AjaxService) {
      var Section = $scope.Section;

      $scope.model = {};
      $scope.model.fieldOrder = ["varName", "_id", "accountOptions", "createdDate", "deleted", "enabled", "metaData", "ip"];

      var _load = function() {
        AjaxService.get("/admin/users/" + $routeParams.modeid).then(function(response) {
          $scope.model.editing = JSON.parse(JSON.stringify(response));
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

    }

  ]).controller('AdminRolesController', ['$scope', 'LogService', '$uibModal', 'AdminRoleService', 'AjaxService',
    function($scope, $log, $modal, AdminService, AjaxService) {
      var adminRoles = this;
      var Section = $scope.Section;
      adminRoles.model = {
        roles: []
      };

      AdminService.get().then(function(roles) {
        $scope.Section.loaded = true;
        adminRoles.model.roles = roles;
        Section.loaded = true;
      });
      adminRoles.buttons = {
        add: function() {

        }
      };
    }
  ])
  .controller('AdminRoleEditController', ['$scope', 'LogService', '$uibModal', '$routeParams', 'AdminRoleService', 'AjaxService', '$timeout',
    function($scope, $log, $modal, $routeParams, AdminService, AjaxService, $timeout) {
      var RoleEditor = this;
      var Section = $scope.Section;
      Section.invalid = false;

      RoleEditor.addRule = function() {
        RoleEditor.role.roleRegex = [].concat(RoleEditor.role.roleRegex);
        RoleEditor.role.roleRegex.push("");
      };

      RoleEditor.removeRule = function(idx) {
        RoleEditor.role.roleRegex.splice(idx, 1);
      };

      RoleEditor.regexValid = function(regexString) {
        try {
          var test = new RegExp(regexString);
          Section.invalid = false;
          return "";
        } catch (error) {
          Section.invalid = true;
          return "Invalid";
        }
      };

      RoleEditor.role = {
        "hashNew": true
      };
      if ($routeParams.modeid != 'create') {
        AdminService.get($routeParams.modeid).then(function(role) {
          role.metaData = role.metaData || {};
          RoleEditor.role = role;
        });
      }

      Section.buttons.save = function() {
        if (!RoleEditor.role.hashNew) {
          AjaxService.put('/admin/roles/' + RoleEditor.role._id, RoleEditor.role).then(function(response) {
            Section.savedSuccess = true;
            $timeout(function() {
              Section.savedSuccess = false;
            }, 3000);

          }, function(error) {
            Section.savedError = true;
            $timeout(function() {
              Section.savedError = false;
            }, 5000);
            console.error(error);
          });
        } else {
          AjaxService.post('/admin/roles/', RoleEditor.role).then(function(response) {
            Section.savedSuccess = true;
            $timeout(function() {
              Section.savedSuccess = false;
            }, 3000);

          }, function(error) {
            Section.savedError = true;
            $timeout(function() {
              Section.savedError = false;
            }, 5000);
            console.error(error);
          });
        }
      };
    }
  ])
  .controller('AdminAuthsController', ['$scope', 'LogService', '$uibModal', 'AdminAuthService', 'AjaxService', '$http',
    function($scope, $log, $modal, AdminService, AjaxService, $http) {
      var Section = $scope.Section;
      var Controller = this;
      Controller.model = {};
      Controller.sort = "metaData.name";
      Controller.currentPage = 1;
      Controller.itemsPerPage = 25;
      var searchQuery = "";
      var sortQuery = "";

      var _load = function() {
        $http.get("/api/admin/auths-paged?limit=" + Controller.itemsPerPage + "&page=" + (Controller.currentPage - 1) + sortQuery + searchQuery).then(function(response) {
          Controller.model.clients = response.data.result.data;
          Controller.totalClients = response.data.result.count;
          Section.loaded = true;
        });
      };
      _load();

      $scope.onPageChange = function(newPage) {
        Controller.currentPage = newPage;
        _load();
      };

      Controller.onSort = function(newVal) {
        if (newVal != Controller.sort) {
          Controller.sort = newVal;
        } else {
          Controller.reverse = !Controller.reverse;
        }
        var rev = Controller.reverse ? "-" : "";
        sortQuery = "&sort=" + rev + Controller.sort;
        _load();
      };

      $scope.$watch("AdminAuths.listSearch", function(newVal, oldVal) {
        if (newVal && newVal != oldVal) {
          searchQuery = "&searchString=" + Controller.listSearch;
          _load();
        } else {
          searchQuery = "";
          _load();
        }
      });

      Controller.buttons = {
        remove: function(auth, confirm) {
          if (confirm) {
            var uibModalInstance = $modal.open({
              templateUrl: $scope.baseAdminFolder + 'partials/m-confirm.html',
              controller: confirmCmdClientController,
              resolve: {
                parentScope: function() {
                  return {
                    "clientid": auth._id,
                    "message": "Are you sure you want to delete this client auth?",
                    "cmd": "remove",
                    "opt": true,
                    "AdminService": AdminService
                  };
                }
              }
            });

            uibModalInstance.result.then(function(done) {
              _load();
            });
          }
        }
      };
    }
  ])
  .controller('AdminAuthEditController', ['$scope', 'LogService', '$uibModal', '$routeParams', 'AjaxService', '$timeout',
    function($scope, $log, $modal, $routeParams, AjaxService, $timeout) {
      var Controller = this;
      var Section = $scope.Section;

      Section.buttons.save = function() {
        Controller.auth.roleIds.length = 0;
        for (var k in Controller.auth.tcRoles) {
          if (Controller.auth.tcRoles[k]) {
            Controller.auth.roleIds.push(k)
          }
        }

        if ('tcSelectors' in Controller.auth) {
          try {
            Controller.auth.childSelectors = Controller.auth.tcSelectors.split(",");
          } catch (error) {
            Controller.auth.childSelectors = [];
          }
        }

        if (Controller.auth._id) {
          AjaxService.put('/admin/auths/id/' + Controller.auth._id, Controller.auth).then(function(response) {
            Section.savedSuccess = true;
            $timeout(function() {
              Section.savedSuccess = false;
            }, 3000);

          }, function(error) {
            Section.savedError = true;
            $timeout(function() {
              Section.savedError = false;
            }, 5000);

            console.error(error);
          });
        } else {
          AjaxService.post('/admin/auths/', Controller.auth).then(function(response) {
            Section.savedSuccess = true;
            $timeout(function() {
              Section.savedSuccess = false;
            }, 3000);

          }, function(error) {
            Section.savedError = true;
            $timeout(function() {
              Section.savedError = false;
            }, 5000);

            console.error(error);
          });

        }
      };

      Controller.checkApiKey = function() {
        if (!Controller.auth.apiKey) {
          Controller.apiKeyError = "Undefined";
          return;
        }

        AjaxService.get('/admin/clientapikey/' + Controller.auth.apiKey).then(function(ok) {
          //validation pass
          Controller.apiKeyError = ok == 'OK' ? false : ok;
        });
      };

      Controller.loaded = false;
      AjaxService.get('/admin/roles').then(function(roles) {
        Controller.roles = roles;
        // Controller.auth = { "tcRoles": [], "roleIds": [], "_id":false};
        AjaxService.get("/admin/auths/id/" + $routeParams.modeid).then(function(response) {
          Controller.auth = response;
          Controller.auth.tcRoles = [];
          Controller.roles.forEach(function(r) {
            Controller.auth.tcRoles[r._id] = Controller.auth.roleIds.indexOf(r._id) != -1;
          });
          Controller.auth.tcSelectors = Controller.auth.childSelectors.toString();
          Controller.loaded = true;
        });
      }, function(err) {
        console.log(err);
      });
    }
  ]).controller('AdminAuthViewController', ['$scope', 'LogService', '$routeParams', 'AdminAuthService', 'AjaxService', '$timeout',
    function($scope, $log, $routeParams, AdminService, AjaxService, $timeout) {
      // sub controller ?
      var Controller = this;
      Controller.client = {};

      var _get_auths = function() {
        AjaxService.get('/admin/auths/' + Controller.client.varName).then(function(auths) {
          Controller.auths = auths;
          Controller.auths.forEach(function(a) {
            a.tcRoles = [];
            Controller.roles.forEach(function(r) {
              a.tcRoles[r._id] = a.roleIds.indexOf(r._id) != -1;
            });
          });
          $scope.authLoaded = true;

        }, function(err) {
          console.log(err);
        });
      };

      Controller.delete = function(auth) {
        AdminService.remove(auth._id).then(function() {
          auth.deleted = true;
        });
      };
      Controller.clone = function(auth) {
        var newAuth = {
          "clientVarName": auth.clientVarName
        };

        AjaxService.post('/admin/auths', newAuth).then(function(auth) {
          _get_auths();
        }, function(err) {
          console.log(err);
        });
      };

      AjaxService.get("/admin/users/" + $routeParams.modeid).then(function(response) {
        Controller.client = response;
        //get this all roles
        AjaxService.get('/admin/roles').then(function(roles) {
          Controller.roles = roles;
          _get_auths();
        }, function(err) {
          console.log(err);
        });
      });
    }
  ]).controller('AdminDeviceEditController', ['$http', '$scope', 'LogService', '$routeParams', '$uibModal', '$timeout', 'AdminDevicesService', 'AjaxService',
    function($http, $scope, $log, $routeParams, $modal, $timeout, AdminService, AjaxService) {
      var Section = $scope.Section;

      $scope.model = {};
      $scope.model.fieldOrder = ["varName", "_id", "createdDate", "deleted", "enabled", "metaData", "ip", "deviceTypeId"];
      $scope.model.results = "";

      AjaxService.get("/devices/" + $routeParams.modeid).then(function(response) {
        $scope.model.editing = response[0];
        $scope.clientLoaded = true;

        // get this value from the config?
        $scope.model.logUrl = '/logs/tc/' + $scope.model.editing.varName + '.tiwiCommon.lastSeen_savedLog';
        $scope.model.debugUrl = '/logs/debug/' + $scope.model.editing.varName + '_debug';

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
        });

        AjaxService.get("/admin/groups").then(function(response) {
          $scope.model.groups = response;
          AjaxService.get("/groups/" + $scope.model.editing.varName + "/memberships").then(function(response) {
            if (response && response.length == 1) {
              $scope.model.editing.tcGroup = response[0];
            }
            $scope.groupsLoaded = true;
          });
        });
      });

      function result(msg) {
        $scope.model.results = msg + "\n\r" + $scope.model.results;
      }

      $scope.buttons = {
        rebuild: function() {
          AjaxService.get('/admin/rebuild-devicetype/' + $scope.model.editing.varName)
            .then(function(returned) {
              result(returned.varName + " Device was rebuilt");
              AdminService.get($routeParams.modeid, true).then(function(response) {
                $scope.model.editing = JSON.parse(JSON.stringify(response));
              });
            }, result);
        },
        purgeActions: function(remove) {
          var q = '';
          if (remove) {
            q = '?remove=1';
          }
          AjaxService.get('/admin/purgeclientactions/' + $scope.model.editing.varName + q).then(result);
        },
        purgeLogs: function() {
          AjaxService.get('/admin/purgeclientlogs/' + $scope.model.editing.varName).then(function(result) {
            $scope.model.results = "Logs Purged";
          });
        },
        downloadAuth: function() {
          var encodedUri = encodeURI('/admin/genauthfiles/' + $scope.model.editing.varName);
          var link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.click();
        }
      };

      Section.buttons.save = function() {
        $scope.model.editing.deviceTypeIds.length = 0;
        for (var k in $scope.model.tcDeviceTypes) {
          if ($scope.model.tcDeviceTypes[k]) {
            $scope.model.editing.deviceTypeIds.push(k);
          }
        }

        // remove tcGroup and edit the group to have this device
        AjaxService.delete('/groups/all/members/' + $scope.model.editing.varName).then(function(response) {
            AjaxService.put('/groups/' + $scope.model.editing.tcGroup + '/members/' + $scope.model.editing.varName).then(function(response) {
                console.log(response);
              },
              function(error) {
                console.log(error);
              });
          },
          function(error) {
            console.log(error);
          });


        AdminService.save($scope.model.editing).then(function(saved) {
          Section.savedSuccess = true;
          $timeout(function() {
            Section.savedSuccess = false;
          }, 3000);

        }, function(error) {
          console.log(error.data);
          if (error.data.indexOf("duplicate key error index") != -1) {
            if (error.data.indexOf("varName") != -1) {
              Section.savedErrorMessage = "Hey, that varName is already being used!";
            }
          }

          Section.savedError = true;
          $timeout(function() {
            Section.savedError = false;
            Section.savedErrorMessage = false;
          }, 5000);
        });
      };
    }
  ]);


var confirmCmdClientController = function($scope, $uibModalInstance, $log, parentScope) {
  $scope.message = parentScope.message;
  var AdminService = parentScope.AdminService;
  $scope.buttons = {
    ok: function() {
      AdminService[parentScope.cmd](parentScope.clientid, parentScope.opt).then(function(user) {
          $uibModalInstance.close();
        },
        function(err) {
          $log.error(err);
        });
    },
    cancel: function() {
      $uibModalInstance.close();
    }
  };
};