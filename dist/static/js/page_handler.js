"use strict";

System.register(["./utils.js"], function (_export, _context) {
    "use strict";

    var Utils, _createClass, CONTENT_HEADER_ID, TEXT_ID, IMAGE_CONTAINER_ID, REMOVE_IMG_BTN_ID, IMG_ID, MAX_FILE_SIZE, PageHandler, initModel;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    return {
        setters: [function (_utilsJs) {
            Utils = _utilsJs.default;
        }],
        execute: function () {
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

            window.$ = window.jQuery = jQuery;

            CONTENT_HEADER_ID = "content-header";
            TEXT_ID = "textarea-main";
            IMAGE_CONTAINER_ID = "img-con-id";
            REMOVE_IMG_BTN_ID = "btn-img-";
            IMG_ID = "img-";
            MAX_FILE_SIZE = 10000000;

            PageHandler = function () {
                function PageHandler(model) {
                    _classCallCheck(this, PageHandler);

                    this.utils = new Utils();
                    this.formValidity = {
                        header: true,
                        content: true
                    };
                    this.model = Utils.clone(model);
                }

                /**
                 * to remove localhost/static/ from image src in order to find it in the list
                 * of images in our model where just the names of the images are stored
                 * @param src
                 * @returns {*}
                 */


                _createClass(PageHandler, [{
                    key: "onChangeModel",
                    value: function onChangeModel(element, key) {
                        this.model[key] = element.value;
                        console.log(this.model);

                        if (this.isValid(element.value)) {
                            this._makeElementValid(element);
                            this.setFormValidity(key, true);
                        } else {
                            // it wasnt wrong before
                            this._makeElementInvalid(element);
                            this.setFormValidity(key, false);
                        }
                    }
                }, {
                    key: "_makeElementValid",
                    value: function _makeElementValid(element) {
                        if (element.className.indexOf("danger") >= 0) {
                            // it was invalid before
                            element.className = element.className.replace("danger", "success");
                            // remove the warning msg
                            Utils.removeNextSibling(element);
                        }
                    }
                }, {
                    key: "_makeElementInvalid",
                    value: function _makeElementInvalid(element) {
                        if (element.className.indexOf("danger") < 0) {
                            element.className = element.className.replace("success", "");
                            element.className += " danger";
                            Utils.insertAfter(this.generateValidationWarning("This input cannot be empty!"), element);
                        }
                    }
                }, {
                    key: "setFormValidity",
                    value: function setFormValidity(key, validity) {
                        if (!(key === "header" || key === "content")) {
                            console.log("wrong key has been passed");
                            console.log(key);
                        } else {
                            this.formValidity[key] = validity;
                            this.reviseFormValidity();
                        }
                    }
                }, {
                    key: "reviseFormValidity",
                    value: function reviseFormValidity() {
                        if (this.formValidity.header && this.formValidity.content) {
                            // make button enable
                            var submitBtn = $("#submit-button")[0];
                            submitBtn.disabled = false;
                        } else {
                            // make button disable
                            var _submitBtn = $("#submit-button")[0];
                            _submitBtn.setAttribute('disabled', 'disabled');
                        }
                    }
                }, {
                    key: "generateValidationWarning",
                    value: function generateValidationWarning(msg) {
                        var warning = document.createElement('p');
                        warning.className = " form-validation text-danger";
                        warning.innerHTML = msg;
                        return warning;
                    }
                }, {
                    key: "isValid",
                    value: function isValid(value) {
                        var trimmed = value.trim();
                        return !(trimmed === "" || trimmed === null);
                    }
                }, {
                    key: "resetHeader",
                    value: function resetHeader() {
                        this.model.header = Utils.clone(initModel.header);
                        this.reset(CONTENT_HEADER_ID, this.model.header);
                        this._makeElementValid($("#" + CONTENT_HEADER_ID)[0]);
                        this.setFormValidity('header', true);
                    }
                }, {
                    key: "resetContent",
                    value: function resetContent() {
                        this.model.content = Utils.clone(initModel.content);
                        this.reset(TEXT_ID, this.model.content);
                        this._makeElementValid($("#" + TEXT_ID)[0]);
                        this.setFormValidity('content', true);
                    }
                }, {
                    key: "genImageInputContainer",
                    value: function genImageInputContainer(tempImg, imgIndex) {
                        var tempDiv = document.createElement('div');
                        tempDiv.innerHTML = this.genImage(tempImg, imgIndex);
                        var imageInputCnt = tempDiv.firstElementChild;
                        return imageInputCnt;
                    }
                }, {
                    key: "genImage",
                    value: function genImage(img, index) {
                        return "\n       <div class=\"img-input-container\">\n          <button type=\"button\" class=\"btn btn-default btn-xs\" id=\"" + REMOVE_IMG_BTN_ID + index + "\" onclick=\"pageHandler.removeImage('" + img.id + "')\">\n            <span class=\"glyphicon glyphicon-remove danger\" aria-hidden=\"true\"></span>\n          </button>\n          <img id=\"" + img.id + "\" class=\"img-responsive img-thumbnail\" src=\"" + img.src + "\"/>\n          <input type=\"file\" name=\"img-" + index + "\" id=\"input-img-" + index + "\" onchange=\"pageHandler.handleInputChange(this)\" >\n          </div>\n       ";
                    }
                }, {
                    key: "handleInputChange",
                    value: function handleInputChange(fileInput) {
                        console.log(fileInput);
                        var files = fileInput.files;
                        var index = fileInput.id.split("-").pop();
                        if (!files.length) {
                            var warnElem = this.generateValidationWarning("no file has been selected");
                            Utils.insertAfter(warnElem, fileInput);
                        } else {
                            // just get the first one !
                            var currentFile = files[0];
                            if (currentFile.size > MAX_FILE_SIZE) {
                                // first remove warning note if exists
                                Utils.removeNextSibling(fileInput);
                                var _warnElem = this.generateValidationWarning("maximum size allowed is " + MAX_FILE_SIZE / 1000000 + " MB");
                                Utils.insertAfter(_warnElem, fileInput);
                                // fileinput value already has changed by selecting the file
                                fileInput.value = "";
                            } else {
                                var imgTag = $("#" + IMG_ID + index)[0];
                                imgTag.src = window.URL.createObjectURL(files[0]);
                                imgTag.onload = function () {
                                    return window.URL.revokeObjectURL(imgTag.src);
                                };
                                var imgInModel = this.model.images.find(function (insider) {
                                    return insider.id === imgTag.id;
                                });
                                imgInModel.src = imgTag.src;
                                Utils.removeNextSibling(fileInput);
                            }
                        }
                    }
                }, {
                    key: "removeImage",
                    value: function removeImage(id) {
                        console.log("clicked");
                        var src = $("#" + id)[0].src;
                        // src should be adapted for search into img.src tags for removal from dom
                        src = PageHandler.adaptImgSrc(src);
                        var img = { id: id, src: src };
                        console.log(img);
                        // updating model
                        var index = this.model.images.findIndex(function (insider) {
                            return insider.id === img.id && insider.src === img.src;
                        });
                        if (index >= 0) {
                            if (src.indexOf("blob") !== 0) {
                                // do not need to request for remove a pic which
                                // was just in fileInput and not yet sent on the server
                                src = src.replace("/static/images/", "");
                                this.model.removedImages.push(src);
                            }
                            this.model.images.splice(index, 1);
                            // remove from dom
                            $("#" + img.id).parent().remove();
                        } else {
                            console.log("cannot remove the image!");
                        }
                    }
                }, {
                    key: "addImage",
                    value: function addImage() {
                        // updating model
                        var imgIndex = this.model.images.length - 1;
                        if (this.model.images.length > 0) {
                            var lastImg = this.model.images[this.model.images.length - 1];
                            imgIndex = parseInt(lastImg.id.split("-").pop()) + 1;
                        } else {
                            imgIndex = 0;
                        }

                        // either mao to a default image or just add this part so we can further recognize it in adaptImageSrc method
                        var tempImg = { src: "/static/images/", id: "" + IMG_ID + imgIndex };
                        // generate img with empty src and index of last element of images
                        var imageInputCnt = this.genImageInputContainer(tempImg, imgIndex);
                        this.model.images.push(tempImg);
                        var imagesContainer = $("#" + IMAGE_CONTAINER_ID)[0];
                        imagesContainer.appendChild(imageInputCnt);
                    }
                }, {
                    key: "resetImages",
                    value: function resetImages() {
                        var _this = this;

                        // first remove all childs
                        this.model.images = Utils.clone(initModel.images);
                        this.model.removedImages = [];

                        var imageContainer = $("#" + IMAGE_CONTAINER_ID)[0];
                        while (imageContainer.hasChildNodes()) {
                            imageContainer.removeChild(imageContainer.lastChild);
                        }

                        var allImgContainers = this.model.images.map(function (image, idx) {
                            return _this.genImageInputContainer(image, idx);
                        });
                        allImgContainers.forEach(function (item) {
                            return imageContainer.appendChild(item);
                        });
                    }
                }, {
                    key: "reset",
                    value: function reset(id, value) {
                        console.log("reset called");
                        $('#' + id)[0].value = value;
                    }
                }, {
                    key: "handleServerResponse",
                    value: function handleServerResponse(response) {
                        try {
                            console.log(response);
                            response = JSON.parse(response);
                            if (response && response.mode && response.message) {
                                Utils.toast(response.mode, response.message);
                                if (response.extra && response.extra != "") Utils.toast("warning", response.extra);
                            } else {
                                Utils.toast("warning", response);
                            }
                        } catch (error) {
                            Utils.toast("error", response);
                        }
                    }
                }, {
                    key: "removeEmptyFiles",
                    value: function removeEmptyFiles(formData) {
                        var emptyInputs = [];
                        var _iteratorNormalCompletion = true;
                        var _didIteratorError = false;
                        var _iteratorError = undefined;

                        try {
                            for (var _iterator = formData.keys()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                var key = _step.value;

                                var input = formData.get(key);
                                if (input instanceof File && (input.name === "" || input.size === 0)) {
                                    emptyInputs.push(key);
                                }
                            }
                        } catch (err) {
                            _didIteratorError = true;
                            _iteratorError = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return) {
                                    _iterator.return();
                                }
                            } finally {
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                        }

                        emptyInputs.forEach(function (inputName) {
                            return formData.delete(inputName);
                        });
                    }
                }, {
                    key: "handleSubmit",
                    value: function handleSubmit(event) {
                        if (event) {
                            event.preventDefault();
                        }
                        console.log("handle submit called");
                        var formElement = document.getElementById("main-form");
                        var formData = new FormData(formElement);
                        this.removeEmptyFiles(formData);
                        formData.append("removedImages", JSON.stringify(this.model.removedImages));
                        this.utils.sendHTTPRequest("POST", "", formData, this.handleServerResponse);
                        return false;
                    }
                }], [{
                    key: "adaptImgSrc",
                    value: function adaptImgSrc(src) {
                        return src.replace(/.*\/static\/images\//, "/static/images/");
                    }
                }]);

                return PageHandler;
            }();

            initModel = function getInitModel() {
                var tempModel = {};
                tempModel.header = $("#" + CONTENT_HEADER_ID)[0].value;
                tempModel.content = $("#" + TEXT_ID)[0].value;
                tempModel.removedImages = [];
                tempModel.images = function () {
                    var allImg = Array.from(document.getElementsByTagName("img"));
                    var desiredImgs = allImg.filter(function (imgElement) {
                        return typeof imgElement.id === "string" && imgElement.id.indexOf(IMG_ID) >= 0;
                    });
                    return desiredImgs.map(function (img) {
                        return { id: img.id, src: PageHandler.adaptImgSrc(img.src) };
                    });
                }();
                return tempModel;
            }();

            window.pageHandler = new PageHandler(initModel);

            _export("default", pageHandler);

            window.onload = function () {
                document.getElementById('main-form').onsubmit = function () {
                    return pageHandler.handleSubmit();
                };
            };
        }
    };
});
