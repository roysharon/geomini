// geomini.js - Geographical Javascript Micro Library
// by Roy Sharon <roy@roysharon.com>, 2012-02-06
// with a friendly MIT License (http://creativecommons.org/licenses/MIT/)

(function () {

    'use strict';

	//-------- Utilities ----------------------------------------------------------
	
	var math = Math, int = parseInt, float = parseFloat, isnan = isNaN, PI = math.PI, PI2 = 2 * PI, PI3 = 3 * PI, PI_4 = PI / 4,
	    min = math.min, max = math.max, abs = math.abs, pow = math.pow, round = math.round, floor = math.floor, sqrt = math.sqrt,
	    sin = math.sin, cos = math.cos, atan2 = math.atan2, asin = math.asin, acos = math.acos, log = math.log, tan = math.tan,
	    EARTH_RADIUS = 3440; // NM
	
	function toRad(v) { return v * PI / 180; }
	function toDeg(v) { return v * 180 / PI; }
	
	
	//-------- LatLng class --------------------------------------------------------
	
	function LatLng(lat, lng, format, radius) {
		this.y = min(90, max(-90, lat));
		this.x = (lng % 180 ? 1 : -1) * (lng < 0 ? -1 : 1) * ((abs(lng) + 180) % 360 - 180);
		if (radius && radius != EARTH_RADIUS) this.r = radius;
		this.format = format;
	};
	window['LatLng'] = LatLng;
	
	LatLng.prototype = {
	
		equals :
		function (other) {
			return other && other.y == this.y && other.x == this.x && other.r == this.r;
		},
		
		clone :
		function () {
			return new LatLng(this.y, this.x, this.format, this.r);
		},
		
		lat :
		function () {
			return this.y;
		},
		
		lng :
		function () {
			return this.x;
		},
		
		rad :
		function () {
			return this.r || EARTH_RADIUS;
		},
		
		flip :
		function (flipLat, flipLng) {
			if (flipLat) this.y = -this.y;
			if (flipLng) this.x = -this.x;
		},
		
		toString :
		function (format) {
			if (!format) format = this.format || '%yd2\xb0%ym2.1\'%yc %xd3\xb0%xm2.1\'%xc';
			var x = this.x, y = this.y;
			return format.replace(/%(x|y)(?:(d|m)(\d)?(?:\.(\d))?|([cC]))/g, function(ig, a, w, p1, p2, cardinal) {
				p1 = int(p1); if (isnan(p1) || p1 <= 0) p1 = 0;
				p2 = int(p2); if (isnan(p2) || p2 <= 0) p2 = 0;
				var m = pow(10, p2) * 60, isX = a == 'x', val = round((isX ? x : y) * m) / m;
				if (cardinal) return (cardinal == 'c' ? val >= 0 : val < 0) ? (isX ? 'E' : 'N') : (isX ? 'W' : 'S');
				
				var deg = abs(val), min = round((deg % 1) * 60 * pow(10, p2));
				var v = w == 'd' ? deg : min, v1 = p1 == 0 ? '' : '0000000000';
				v1 += floor(v);
				var s = v1.substr(v1.length - p1);
				if (p2 == 0) return s;
				
				var v2 = ((v - v1) + '').replace(/^\d*\./, '');
				p2 -= v2.length;
				while (p2 > 0) v2 += '0';
				return s + '.' + v2;
			});
		},
		
		
		//----- Spherical geodesy formulae -----
		
		// Adaptation from http://www.movable-type.co.uk/scripts/latlong.html
		// (c) Chris Veness 2002-2011
	
		distance :
		function (point) {
			var R = this.rad();
			var lat1 = toRad(this.y), lon1 = toRad(this.x);
			var lat2 = toRad(point.y), lon2 = toRad(point.x);
			var dLat = lat2 - lat1;
			var dLon = lon2 - lon1;
			
			var a = sin(dLat/2) * sin(dLat/2) +
			        cos(lat1) * cos(lat2) * 
			        sin(dLon/2) * sin(dLon/2);
			var c = 2 * atan2(sqrt(a), sqrt(1-a));
			return R * c;
		},
	
		bearing : // initial bearing; during a great circle course the bearing changes
		function (point) {
			var lat1 = toRad(this.y), lat2 = toRad(point.y);
			var dLon = toRad(point.x - this.x);
			
			var y = sin(dLon) * cos(lat2);
			var x = cos(lat1) * sin(lat2) -
			        sin(lat1) * cos(lat2) * cos(dLon);
			var brng = atan2(y, x);
			
			return (toDeg(brng) + 360) % 360;
		},
	
		finalBearing :
		function (point) {
			// get initial bearing from supplied point back to this point...
			var brng = point.bearingTo(this);
			      
			// ... & reverse it by adding 180°
			return (brng + 180) % 360;
		},
	
		midpoint :
		function (point) {
			var lat1 = toRad(this.y), lon1 = toRad(this.x);
			var lat2 = toRad(point.y);
			var dLon = toRad(point.x - this.x);
			
			var Bx = cos(lat2) * cos(dLon);
			var By = cos(lat2) * sin(dLon);
			
			var lat3 = atan2(sin(lat1) + sin(lat2),
			                 sqrt((cos(lat1) + Bx) * (cos(lat1) + Bx) + By * By));
			var lon3 = lon1 + atan2(By, cos(lat1) + Bx);
			lon3 = (lon3 + PI3) % PI2 - PI;  // normalise to -180..+180º
			
			return new LatLng(toDeg(lat3), toDeg(lon3));
		},
	
		destination :
		function (brng, dist) {
			dist = dist / this.rad();  // convert dist to angular distance in radians
			brng = toRad(brng);
			var lat1 = toRad(this.y), lon1 = toRad(this.x);
			
			var lat2 = asin(sin(lat1) * cos(dist) + 
			                cos(lat1) * sin(dist) * cos(brng));
			var lon2 = lon1 + atan2(sin(brng) * sin(dist) * cos(lat1), 
			                        cos(dist) - sin(lat1) * sin(lat2));
			lon2 = (lon2 + PI3) % PI2 - PI;  // normalise to -180..+180º
			
			return new LatLng(toDeg(lat2), toDeg(lon2));
		},
	
		intersection :
		function (brng1, p2, brng2) {
			var lat1 = toRad(this.y), lon1 = toRad(this.x);
			var lat2 = toRad(p2.y), lon2 = toRad(p2.x);
			var brng13 = toRad(brng1), brng23 = toRad(brng2);
			var dLat = lat2 - lat1, dLon = lon2 - lon1;
			
			var dist12 = 2 * asin(sqrt(sin(dLat / 2) * sin(dLat / 2) + 
			                           cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2)));
			if (dist12 == 0) return null;
			
			// initial/final bearings between points
			var brngA = acos((sin(lat2) - sin(lat1) * cos(dist12)) / 
			                 (sin(dist12) * cos(lat1)));
			if (isnan(brngA)) brngA = 0;  // protect against rounding
			var brngB = acos((sin(lat1) - sin(lat2) * cos(dist12)) / 
			                 (sin(dist12) * cos(lat2)));
			
			if (sin(lon2 - lon1) > 0) {
				var brng12 = brngA;
				var brng21 = PI2 - brngB;
			} else {
				brng12 = PI2 - brngA;
				brng21 = brngB;
			}
			
			var alpha1 = (brng13 - brng12 + PI) % PI2 - PI;  // angle 2-1-3
			var alpha2 = (brng21 - brng23 + PI) % PI2 - PI;  // angle 1-2-3
			
			if (sin(alpha1) == 0 && sin(alpha2) == 0) return null;  // infinite intersections
			if (sin(alpha1) * sin(alpha2) < 0) return null;         // ambiguous intersection
			
			//alpha1 = abs(alpha1);
			//alpha2 = abs(alpha2);
			// ... Ed Williams takes abs of alpha1/alpha2, but seems to break calculation?
			
			var alpha3 = acos(-cos(alpha1) * cos(alpha2) + 
			                   sin(alpha1) * sin(alpha2) * cos(dist12));
			var dist13 = atan2(sin(dist12) * sin(alpha1) * sin(alpha2), 
			                   cos(alpha2) + cos(alpha1) * cos(alpha3))
			var lat3 = asin(sin(lat1) * cos(dist13) + 
			                cos(lat1) * sin(dist13) * cos(brng13));
			var dLon13 = atan2(sin(brng13) * sin(dist13) * cos(lat1), 
			                   cos(dist13) - sin(lat1) * sin(lat3));
			var lon3 = lon1 + dLon13;
			lon3 = (lon3 + PI3) % PI2 - PI;  // normalise to -180..+180°
			
			return new LatLng(toDeg(lat3), toDeg(lon3));
		},
	
		rhumbDistance:
		function (point) {
			var R = this.rad();
			var lat1 = toRad(this.y), lat2 = toRad(point.y);
			var dLat = toRad(point.y - this.y);
			var dLon = toRad(abs(point.x - this.x));
			
			var dPhi = log(tan(lat2 / 2 + PI_4) / tan(lat1 / 2 + PI_4));
			var q = !isnan(dLat / dPhi) ? dLat / dPhi : cos(lat1);  // E-W line gives dPhi=0
			// if dLon over 180° take shorter rhumb across 180° meridian:
			if (dLon > PI) dLon = PI2 - dLon;
			var dist = sqrt(dLat * dLat + q * q * dLon * dLon) * R; 
			return dist;
		},
	
		rhumbBearing:
		function (point) {
			var lat1 = toRad(this.y), lat2 = toRad(point.y);
			var dLon = toRad(point.x - this.x);
			
			var dPhi = log(tan(lat2 / 2 + PI_4) / tan(lat1 / 2 + PI_4));
			if (abs(dLon) > PI) dLon = dLon > 0 ? -(PI2 - dLon) : (PI2 + dLon);
			var brng = atan2(dLon, dPhi);
			
			return (toDeg(brng) + 360) % 360;
		},
	
		rhumbDestination :
		function (brng, dist) {
			var R = this.rad();
			var d = dist / R;  // d = angular distance covered on earth's surface
			var lat1 = toRad(this.y), lon1 = toRad(this.x);
			brng = toRad(brng);
			
			var lat2 = lat1 + d * cos(brng);
			var dLat = lat2 - lat1;
			var dPhi = log(tan(lat2 / 2 + PI_4) / tan(lat1 / 2 + PI_4));
			var q = !isnan(dLat / dPhi) ? dLat / dPhi : cos(lat1);  // E-W line gives dPhi=0
			var dLon = d * sin(brng) / q;
			// check for some daft bugger going past the pole
			if (abs(lat2) > PI / 2) lat2 = lat2 > 0 ? PI - lat2 : lat2 - PI;
			var lon2 = (lon1 + dLon + PI3) % PI2 - PI;
			
			return new LatLng(toDeg(lat2), toDeg(lon2));
		},
		
		crossTrack :
		function (p1, p2) {
			var R = this.rad();
			var d13 = p1.distance(this);
			var brng13 = toRad(p1.bearing(this));
			var brng12 = toRad(p1.bearing(p2));
			var dXt = asin(sin(d13 / R) * sin(brng13 - brng12)) * R;
			return dXt;
		},
		
		alongTrack :
		function (p1, p2) {
			var R = this.rad();
			var d13 = p1.distance(this);
			var dXt = this.crossTrack(p1, p2);
			var dAt = acos(cos(d13 / R) / cos(dXt / R)) * R;
			return dAt;
		},
		
		maxLat :
		function (brng) {
			var latMax = acos(abs(sin(brng) * cos(toRad(this.y))));
			return latMax;
		}
		
	};
	
	LatLng.parse =
	function (s, format) {
		function dpat(n) { return '\\d' + (n > 1 ? '{' + n + '}' : ''); }
		var list = [];
		var f = format.replace(/%(x|y)(?:(d|m)(\d+)?(?:\.(\d+))?|([cC]))|(\s|\S)/g, function(ig, a, w, p1, p2, cardinal, e) {
			var o = {a:a};
			if (cardinal) {
				o.c = cardinal == 'c' ? 1 : -1;
				o.p = a == 'x' ? 'E|W' : 'N|S';
			} else if (w) {
				o.w = w == 'd' ? 1 : 1/60;
				p1 = int(p1) || 0;
				p2 = int(p2) || 0;
				o.p = (p1 ? dpat(p1) : '') + (p2 ? '.' + dpat(p2) : '');
			} else return e;
			list.push(o);
			return '(' + o.p + ')';
		});
		var re = new RegExp('^\\s*' + f, 'i');
		var m = re.exec(s);
		if (!m) return;
		var r = {x:0, xs:1, y:0, ys:1};
		for (var i = list.length - 1; i >= 0; --i) {
			var o = list[i], mi = m[i + 1];
			if (o.c) r[o.a + 'c'] = o.c * (/W|S/i.test(mi) ? -1 : 1);
			else r[o.a] += o.w * float(mi);
		}
		return new LatLng(r.ys * r.y, r.xs * r.x, format);
	};
	
	
	//-------- LatLngBounds class --------------------------------------------------
	
	function LatLngBounds(sw, ne) { 
		this.init(sw && sw.y, sw && sw.x, ne && ne.y, ne && ne.x);
	};
	window['LatLngBounds'] = LatLngBounds;
	
	LatLngBounds.prototype = {
	
		init :
		function (s, w, n, e) {
			if (s != undefined && w != undefined) this.sw = this.ne = new LatLng(s, w);
			if (n != undefined && e != undefined) {
				this.ne = new LatLng(n, e);
				if (!this.sw) this.sw = this.ne;
			}
			this.valid = this.sw && this.ne;
			if (this.valid) this.c = this.sw.x == -180 ^ this.ne.x == 180 || this.sw.x > this.ne.x;
		},
		
		getNorthEast :
		function () {
			return this.ne;
		},
		
		getSouthWest :
		function () {
			return this.sw;
		},
		
		equals :
		function (other) {
			return this.valid && other && other.valid && other.ne.equals(this.ne) && other.sw.equals(this.sw); 
		},
		
		clone :
		function () {
			return new LatLngBounds(this.sw, this.ne);
		},
		
		isEmpty :
		function () {
			return !this.valid || this.ne.y < this.sw.y;
		},
		
		contains :
		function (point) {
			var p = new LatLng(point.y, point.x);
			return this.valid && this.sw.y <= p.y && p.y <= this.ne.y && 
				(this.c ? this.sw.x <= p.x && p.x <= 180 || -180 <= p.x && p.x <= this.ne.x : (this.sw.x <= p.x && p.x <= this.ne.x));
		},
		
		getCenter :
		function () {
			return this.valid && new LatLng((this.sw.y+this.ne.y)/2, this.c ? (360-this.sw.x+this.ne.x)/2+this.sw.x : (this.sw.x+this.ne.x)/2);
		},
		
		toSpan :
		function () {
			return new LatLng(this.valid ? this.ne.y-this.sw.y : 0, this.valid ? this.ne.x-this.sw.x+(this.c ? 360 : 0) : 0);
		},
		
		extend :
		function (point) {
			if (this.valid) {
				var p = new LatLng(point.y, point.x);
				var sm = min(p.y, this.sw.y), nm = max(p.y, this.ne.y);
				var c = this.getCenter(), d = p.x - c.x, w = -180 <= d && d <= 0 && (d != -180 || this.c);
				var wm = min(w ? p.x : 360, this.sw.x), em = max(w ? -360 : d < 0 ? p.x + 360 : p.x == 180 ? -180 : p.x, this.ne.x);
				this.init(sm, wm, nm, em);
			} else this.init(point.y, point.x);
			return this;
		},
		
		intersects :
		function (other) {
			if (!this.valid || this.ne.y < other.sw.y || other.ne.y < this.sw.y) return false;
			var tc = this.c , oc = other.c, tw = this.sw.x, ow = other.sw.x, te = this.ne.x, oe = other.ne.x;
			return tc && oc || (tc || oc || te >= ow && oe >= tw) && (!tc || te >= ow || oe >= tw) && (!oc || oe >= tw || te >= ow);
		},
		
		toString :
		function (format) {
			return this.valid ? this.sw.toString(format)+', '+this.ne.toString(format) : '';
		}
	
	};
	
})();
