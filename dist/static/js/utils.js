"use strict";

System.register([], function (_export, _context) {
	"use strict";

	var _typeof, _createClass, HTTP_TIMEOUT, TOAST_MODES, Utils;

	function _classCallCheck(instance, Constructor) {
		if (!(instance instanceof Constructor)) {
			throw new TypeError("Cannot call a class as a function");
		}
	}

	return {
		setters: [],
		execute: function () {
			_typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
				return typeof obj;
			} : function (obj) {
				return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
			};

			_createClass = function () {
				function defineProperties(target, props) {
					for (var i = 0; i < props.length; i++) {
						var descriptor = props[i];
						descriptor.enumerable = descriptor.enumerable || false;
						descriptor.configurable = true;
						if ("value" in descriptor) descriptor.writable = true;
						Object.defineProperty(target, descriptor.key, descriptor);
					}
				}

				return function (Constructor, protoProps, staticProps) {
					if (protoProps) defineProperties(Constructor.prototype, protoProps);
					if (staticProps) defineProperties(Constructor, staticProps);
					return Constructor;
				};
			}();

			HTTP_TIMEOUT = 8000;
			TOAST_MODES = {
				info: "info",
				warning: "warning",
				error: "error",
				success: "success"
			};

			Utils = function () {
				function Utils() {
					_classCallCheck(this, Utils);

					this._spinner = new Spinner(Utils.getSpinnerOptions());
				}

				_createClass(Utils, [{
					key: "loadSpinUI",
					value: function loadSpinUI() {
						var bodyTag = document.getElementsByTagName('body')[0];
						// make main opacity maat
						var mainTag = document.getElementsByTagName('main')[0];
						mainTag.style.opacity = 0.4;
						this._spinner.spin(bodyTag);
					}
				}, {
					key: "stopSpinUI",
					value: function stopSpinUI() {
						var mainTag = document.getElementsByTagName('main')[0];
						mainTag.style.opacity = 1;
						this._spinner.stop();
					}
				}, {
					key: "sendHTTPRequest",
					value: function sendHTTPRequest(method, url, data, callbackFunc) {
						var _this = this;

						var xhr = new XMLHttpRequest();
						xhr.open(method, url, true);
						xhr.ontimeout = function () {
							_this.stopSpinUI();
							callbackFunc("Server did not respond on time. Please try again");
						};
						xhr.onreadystatechange = function () {
							if (xhr.readyState === XMLHttpRequest.DONE) {
								_this.stopSpinUI();
								callbackFunc(xhr.responseText);
							}
						};

						xhr.timeout = HTTP_TIMEOUT;
						xhr.send(data);
						this.loadSpinUI();
					}
				}], [{
					key: "getSpinnerOptions",
					value: function getSpinnerOptions() {
						return {
							lines: 9 // The number of lines to draw
							, length: 19 // The length of each line
							, width: 14 // The line thickness
							, radius: 25 // The radius of the inner circle
							, scale: 0.50 // Scales overall size of the spinner
							, corners: 1 // Corner roundness (0..1)
							, color: '#000' // #rgb or #rrggbb or array of colors
							, opacity: 0.2 // Opacity of the lines
							, rotate: 3 // The rotation offset
							, direction: 1 // 1: clockwise, -1: counterclockwise
							, speed: 1 // Rounds per second
							, trail: 62 // Afterglow percentage
							, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
							, zIndex: 2e9 // The z-index (defaults to 2000000000)
							, className: 'spinner' // The CSS class to assign to the spinner
							, top: '50%' // Top position relative to parent
							, left: '50%' // Left position relative to parent
							, shadow: false // Whether to render a shadow
							, hwaccel: false // Whether to use hardware acceleration
							, position: 'absolute' // Element positioning
						};
					}
				}, {
					key: "clone",
					value: function clone(obj) {
						var copy = void 0;

						// Handle the 3 simple types, and null or undefined
						if (null == obj || "object" != (typeof obj === "undefined" ? "undefined" : _typeof(obj))) return obj;

						// Handle Date
						if (obj instanceof Date) {
							copy = new Date();
							copy.setTime(obj.getTime());
							return copy;
						}

						// Handle Array
						if (obj instanceof Array) {
							copy = [];
							for (var i = 0, len = obj.length; i < len; i++) {
								copy[i] = this.clone(obj[i]);
							}
							return copy;
						}

						// Handle Object
						if (obj instanceof Object) {
							copy = {};
							for (var attr in obj) {
								if (obj.hasOwnProperty(attr)) copy[attr] = this.clone(obj[attr]);
							}
							return copy;
						}

						throw new Error("Unable to copy obj! Its type isn't supported.");
					}
				}, {
					key: "toast",
					value: function toast(mode, message) {
						console.log("toast called");
						switch (mode) {
							case TOAST_MODES.info:
								toastr.info(message);
								break;
							case TOAST_MODES.success:
								toastr.success(message);
								break;
							case TOAST_MODES.warning:
								toastr.warning(message);
								break;
							case TOAST_MODES.error:
								toastr.error(message);
								break;
							default:
								toastr.info(message);
						}
					}
				}, {
					key: "insertAfter",
					value: function insertAfter(newElement, targetElement) {
						// target is what you want it to go after. Look for this elements parent.
						var parent = targetElement.parentNode;

						// if the parents lastchild is the targetElement...
						if (parent.lastChild == targetElement) {
							// add the newElement after the target element.
							parent.appendChild(newElement);
						} else {
							// else the target has siblings, insert the new element between the target and it's next sibling.
							parent.insertBefore(newElement, targetElement.nextSibling);
						}
					}
				}, {
					key: "removeNextSibling",
					value: function removeNextSibling(element) {

						// target is what you want it to go after. Look for this elements parent.
						var parent = element.parentNode;

						// if the parents lastchild is the targetElement...
						if (parent.lastChild == element || !element.nextSibling) {
							console.log("it is the last child ! there is no next sibling to be removed");
						} else {
							// else the target has siblings
							parent.removeChild(element.nextSibling);
						}
					}
				}]);

				return Utils;
			}();

			_export("default", Utils);
		}
	};
});
