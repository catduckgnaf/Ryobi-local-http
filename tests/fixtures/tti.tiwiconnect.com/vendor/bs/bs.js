(function() {

	var root = this;
	
	var bs = function(obj) 
	{
		if (obj instanceof bs) return obj;
		if (!(this instanceof bs)) return new bs(obj);
		this._wrapped = obj;
	};


		if (typeof exports !== 'undefined') 
		{
			if (typeof module !== 'undefined' && module.exports) 
			{
				exports = module.exports = bs;
			}	
			exports.bs = bs;
		} 
		else 
		{
			root.bs = bs;
		}
  
  		bs.arraysIntersect = function(array1, array2)
		{
			for (var i = 0; i < array1.length; i++)
			{
				if (array2.indexOf( array1[i] ) != -1)
				{
					return true;
				}
			}
			return false;
		};
		
		bs.isInt = function(n) {
		   return typeof n === 'number' && n % 1 === 0;
		};

		bs.isFunction = function(f)
		{
			var getType = {};
			return f && getType.toString.call(f) === '[object Function]';
		};
		
		bs.toLocal = function(milliseconds)
		{
			if (milliseconds)
			{
				var _s = new Date(milliseconds);
				return _s.toLocaleString();
			}
			else
			{
				return '';
			}
		};
		
		bs.getTimeStamp = function()
		{
			var now = Date.now();
			var newdate = new Date();
			newdate.setTime(now);
			return newdate.toLocaleString("en-US", {hour12: false});
		};

		bs.queryLink = function(__q)
		{
			if (__q === '')
			{
				return '?';
			}
			else
			{
				return __q + '&';
			}
		};


		
		bs.randNum = function(min, max)
		{
			max++; //increase the max by one, the function includes the max, but the random Method excludes it.
			return Math.floor((Math.random() * max) + min);
		};
		
		bs.randNumString = function(length)
		{
			var _str = "";
			
			for (var i = 0; i < length; i++)
			{
				_str = _str + '' + bs.randNum(0,9);
			}
			
			return _str;
		};
		
		bs.randBoo = function()
		{	
			var boo = bs.randNum(0,1);
			
			if( boo == 0)
			{
				return false;
			}
			else
			{
				return true;
			}
		};
		
		bs.randDate = function(offsetstart, offsetend)
		{
			var offsetstart = offsetstart * 86400000;
			var offsetend = offsetend * 86400000;
			var now = Date.now();
			
			var _randDate = new Date();
			var _r = bs.randNum(offsetstart,offsetend);
			_randDate.setTime(now - _r);
			
		
			return _randDate.toLocaleString("en-US", {hour12: false});
		}

}).call(this);