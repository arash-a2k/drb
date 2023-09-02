/**
 * Created by Arash on 02-Aug-17 .
 */

const HTTP_TIMEOUT = 8000;
const TOAST_MODES = {
    info: "info",
    warning: "warning",
    error: "error",
    success: "success"
};

export default class Utils {
    constructor() {
		this._spinner = new Spinner(Utils.getSpinnerOptions());
	}

	static getSpinnerOptions() {
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
				}
	}

	static clone(obj) {
		let copy;

		// Handle the 3 simple types, and null or undefined
		if (null == obj || "object" != typeof obj) return obj;

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

	loadSpinUI() {
		let bodyTag = document.getElementsByTagName('body')[0];
		// make main opacity maat
		let mainTag = document.getElementsByTagName('main')[0];
		mainTag.style.opacity = 0.4;
		this._spinner.spin(bodyTag);
	}

	stopSpinUI() {
		let mainTag = document.getElementsByTagName('main')[0];
		mainTag.style.opacity = 1;
		this._spinner.stop();
	}

    sendHTTPRequest(method, url, data, callbackFunc) {
        let xhr = new XMLHttpRequest();
		xhr.open(method, url, true);
		xhr.ontimeout = () => {
			this.stopSpinUI();
			callbackFunc("Server did not respond on time. Please try again");
		};
		xhr.onreadystatechange =  () => {
            if(xhr.readyState === XMLHttpRequest.DONE){
                this.stopSpinUI();
                callbackFunc(xhr.responseText);
            }
		};

		xhr.timeout = HTTP_TIMEOUT;
		xhr.send(data);
		this.loadSpinUI();
    }

    static
    toast(mode, message) {
		console.log("toast called");
        switch(mode) {
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

	static insertAfter(newElement,targetElement) {
    	// target is what you want it to go after. Look for this elements parent.
    	let parent = targetElement.parentNode;

    	// if the parents lastchild is the targetElement...
    	if (parent.lastChild == targetElement) {
        // add the newElement after the target element.
        	parent.appendChild(newElement);
    	} else {
        	// else the target has siblings, insert the new element between the target and it's next sibling.
        	parent.insertBefore(newElement, targetElement.nextSibling);
    	}
	}

	static removeNextSibling(element) {

    	// target is what you want it to go after. Look for this elements parent.
    	let parent = element.parentNode;

    	// if the parents lastchild is the targetElement...
    	if (parent.lastChild == element || !element.nextSibling) {
        	console.log("it is the last child ! there is no next sibling to be removed");
    	} else {
        	// else the target has siblings
        	parent.removeChild(element.nextSibling);
    	}
	}
}