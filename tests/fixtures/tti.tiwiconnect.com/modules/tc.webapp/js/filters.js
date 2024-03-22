'use strict'; /* Filters */

function valueFormat(att)
{
	var _unit;
	if (!att)
	{
		return "";
	}
	if (att.varType == "tc_utcdate")
	{
		var _date = new Date();
		_date.setTime(att.value);
		return _date.toString();
	}
	else if (att.dataType == "boolean")
	{
		if (!att.units)
		{
			att.units = "false,true";
		}
		_unit = att.units.split(",");
		return _unit.length == 2 && att.value ? _unit[1] : _unit[0];
	}
	else if (att.dataType == 'number' && 'enum' in att)
	{
		_unit = att.units || "";
		try {
			return att.enum[att.value] + " " + _unit;
		}
		catch(error){
			return att.value;
		}
	}
	else
	{
		if (!att.units)
		{
			att.units = "";
		}
		return att.value + " " + att.units;
	}
}


angular.module('tcapp.filters', [])
.filter('tcLastSeen', function($filter)
{
	return function(value)
	{
		if (!value)
		{
			return "?";
		}
		if (Date.now() - value > (2*60*1000))
		{
			return $filter('date')(value,'short');
		}
		else
		{
			return "Online";
		}
	};
})
.filter('filterArrayToString', function()
{
	return function(array)
	{
		return array.join(", ");
	};
})
.filter('filterToString', function()
{
	return function(thing)
	{
		return thing.toString();
	};
})
.filter('interpolate', ['version', function(version)
{
	return function(text)
	{
		return String(text).replace(/\%VERSION\%/mg, version);
	};
}]).filter('prettify', function()
{
	function prettify(value)
	{
		return JSON.stringify(value, undefined, 4);
	}
	return prettify;
}).filter('attributeValueFormat', function()
{
	return valueFormat;

}).directive('attributeValue', function($timeout)
{
	return {
		restrict: 'E',
		link: function(scope,element,attr)
		{
			scope.attributeClasses = ['text-primary'];
			scope.iconClasses = ["fa-database"];

			var unfresh,stale;

			stale = $timeout(function(){
				scope.attributeClasses.length = 0;
				scope.attributeClasses.push('text-danger');
				scope.iconClasses.length = 0;
				scope.iconClasses.push("fa-warning");
				scope.titleText = "This value is older than 2 minutes or has not changed.";

			},1000*120);


			scope.titleText = "This value was fetched from the server database.";
			scope.$watch('attribute.lastSet', function(newVal, oldVal)
			{
				if (oldVal !== undefined)
				{
					_freshen_up();
				}
			});

			scope.$watch('attribute.value', function(newVal, oldVal)
			{
				scope.displayValue = valueFormat(scope.attribute);
				if (oldVal !== undefined)
				{
					_freshen_up();
				}
			});

			function _freshen_up()
			{
				scope.attributeClasses.length = 0;
				scope.attributeClasses.push('text-success');
				scope.iconClasses.length = 0;
				scope.iconClasses.push("fa-star");
				scope.titleText = "This value was just updated!";


				$timeout.cancel(unfresh);
				$timeout.cancel(stale);
				unfresh = $timeout(function(){
					scope.attributeClasses.length = 0;
					scope.iconClasses.length = 0;
					scope.titleText = "This value is older than 15 seconds or has not changed.";

				},1000*15);

				stale = $timeout(function(){
					scope.attributeClasses.length = 0;
					scope.attributeClasses.push('text-danger');
					scope.iconClasses.length = 0;
					scope.iconClasses.push("fa-warning");
					scope.titleText = "This value is older than 2 minutes or has not changed.";

				},1000*120);
			}
		},
		scope: {
			attribute: "=",
			attributeValue: "=?"
		},
		template: '<span title="{{titleText}}" ng-class="attributeClasses"><i class="fa" ng-class="iconClasses"></i> {{displayValue}}</span>'
	};
});
