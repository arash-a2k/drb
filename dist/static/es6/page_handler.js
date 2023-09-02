/**
 *  Created by Arash on 28-Jul-17
 */
// check   if jquery is the
//TODO
import Utils from './utils.js';

window.$ = window.jQuery = jQuery;

const CONTENT_HEADER_ID = "content-header";
const TEXT_ID = "textarea-main";
const IMAGE_CONTAINER_ID = "img-con-id";
const REMOVE_IMG_BTN_ID = "btn-img-";
const IMG_ID = "img-";
const MAX_FILE_SIZE = 10000000;// 10 MB


class PageHandler {

    constructor(model) {
        this.utils = new Utils();
        this.formValidity = {
            header: true,
            content: true,
        };
        this.model = Utils.clone(model);
    }

    /**
     * to remove localhost/static/ from image src in order to find it in the list
     * of images in our model where just the names of the images are stored
     * @param src
     * @returns {*}
     */
    static
    adaptImgSrc(src) {
        return src.replace(/.*\/static\/images\//,"/static/images/");
    }

    onChangeModel(element, key){
            this.model[key] = element.value;
            console.log(this.model);

            if(this.isValid(element.value)) {
                this._makeElementValid(element);
                this.setFormValidity(key, true);
            }else {
                // it wasnt wrong before
                this._makeElementInvalid(element);
                this.setFormValidity(key, false);
            }
    }

    _makeElementValid(element) {
        if(element.className.indexOf("danger") >= 0) {
            // it was invalid before
            element.className = element.className.replace("danger", "success");
            // remove the warning msg
            Utils.removeNextSibling(element);
        }
    }

    _makeElementInvalid(element) {
        if (element.className.indexOf("danger") < 0) {
            element.className = element.className.replace("success", "");
            element.className += " danger";
            Utils.insertAfter(this.generateValidationWarning("This input cannot be empty!"),element);
        }
    }

    setFormValidity(key, validity) {
        if(!(key === "header" || key === "content")) {
            console.log("wrong key has been passed");
            console.log(key);
        } else {
            this.formValidity[key] = validity;
            this.reviseFormValidity();
        }
    }

    reviseFormValidity() {
        if(this.formValidity.header && this.formValidity.content) {
            // make button enable
            let submitBtn = $("#submit-button")[0];
            submitBtn.disabled = false;
        } else {
            // make button disable
            let submitBtn = $("#submit-button")[0];
            submitBtn.setAttribute('disabled', 'disabled');
        }
    }

    generateValidationWarning(msg) {
        let warning = document.createElement('p');
        warning.className = " form-validation text-danger";
        warning.innerHTML = msg;
        return warning
    }

    isValid(value) {
        let trimmed = value.trim();
        return !(trimmed === "" || trimmed === null);
    }

    resetHeader() {
        this.model.header = Utils.clone(initModel.header);
        this.reset(CONTENT_HEADER_ID, this.model.header);
        this._makeElementValid($("#" + CONTENT_HEADER_ID)[0]);
        this.setFormValidity('header', true);
    }

    resetContent() {
        this.model.content = Utils.clone(initModel.content);
        this.reset(TEXT_ID, this.model.content);
        this._makeElementValid($("#" + TEXT_ID)[0]);
        this.setFormValidity('content', true);
    }

    genImageInputContainer(tempImg,imgIndex) {
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.genImage(tempImg,imgIndex );
        const imageInputCnt = tempDiv.firstElementChild;
        return imageInputCnt;
    }

    genImage(img, index) {
       return `
       <div class="img-input-container">
          <button type="button" class="btn btn-default btn-xs" id="${REMOVE_IMG_BTN_ID}${index}" onclick="pageHandler.removeImage('${img.id}')">
            <span class="glyphicon glyphicon-remove danger" aria-hidden="true"></span>
          </button>
          <img id="${img.id}" class="img-responsive img-thumbnail" src="${img.src}"/>
          <input type="file" name="img-${index}" id="input-img-${index}" onchange="pageHandler.handleInputChange(this)" >
          </div>
       `;
    }


    handleInputChange(fileInput) {
        console.log(fileInput);
        let files = fileInput.files;
        let index = fileInput.id.split("-").pop();
        if (! files.length) {
            let warnElem = this.generateValidationWarning("no file has been selected");
            Utils.insertAfter(warnElem, fileInput);
        } else {
            // just get the first one !
            let currentFile = files[0];
            if (currentFile.size > MAX_FILE_SIZE) {
                // first remove warning note if exists
                Utils.removeNextSibling(fileInput);
                let warnElem = this.generateValidationWarning(`maximum size allowed is ${MAX_FILE_SIZE / 1000000} MB`);
                Utils.insertAfter(warnElem, fileInput);
                // fileinput value already has changed by selecting the file
                fileInput.value = "";
            }else {
                const imgTag = $(`#${IMG_ID}${index}`)[0];
                imgTag.src = window.URL.createObjectURL(files[0]);
                imgTag.onload = () => window.URL.revokeObjectURL(imgTag.src);
                const imgInModel = this.model.images.find((insider) => (insider.id === imgTag.id));
                imgInModel.src = imgTag.src;
                Utils.removeNextSibling(fileInput);
            }
        }
    }

    removeImage(id) {
        console.log("clicked");
        let src = $("#"+ id)[0].src;
        // src should be adapted for search into img.src tags for removal from dom
        src = PageHandler.adaptImgSrc(src);
        const img = {id, src};
        console.log(img);
        // updating model
        let index = this.model.images.findIndex((insider) => (insider.id === img.id && insider.src === img.src));
        if (index >=0){
            if (src.indexOf("blob") !== 0) {
                // do not need to request for remove a pic which
                // was just in fileInput and not yet sent on the server
                src = src.replace("/static/images/", "");
                this.model.removedImages.push(src);
            }
            this.model.images.splice(index,1);
            // remove from dom
            $("#" + img.id).parent().remove();
        } else {
            console.log("cannot remove the image!")
        }
    }

    addImage() {
        // updating model
        let imgIndex = this.model.images.length - 1;
        if (this.model.images.length > 0 ) {
            const lastImg = this.model.images[this.model.images.length - 1];
            imgIndex = parseInt(lastImg.id.split("-").pop()) + 1;
        } else {
            imgIndex = 0;
        }

        // either mao to a default image or just add this part so we can further recognize it in adaptImageSrc method
        let tempImg = {src: "/static/images/", id: `${IMG_ID}${imgIndex}`};
        // generate img with empty src and index of last element of images
        let imageInputCnt = this.genImageInputContainer(tempImg,imgIndex );
        this.model.images.push(tempImg);
        let imagesContainer = $("#" + IMAGE_CONTAINER_ID)[0];
        imagesContainer.appendChild(imageInputCnt);
    }

    resetImages() {
        // first remove all childs
        this.model.images = Utils.clone(initModel.images);
        this.model.removedImages = [];

        let imageContainer = $("#" + IMAGE_CONTAINER_ID)[0];
        while (imageContainer.hasChildNodes()) {
            imageContainer.removeChild(imageContainer.lastChild);
        }

        let allImgContainers = this.model.images.map((image,idx) => this.genImageInputContainer(image,idx));
        allImgContainers.forEach((item =>imageContainer.appendChild(item)));
    }

    reset(id, value) {
        console.log("reset called");
        $('#'+id)[0].value = value;
    }

    handleServerResponse(response) {
        try {
            console.log(response);
            response = JSON.parse(response);
            if(response && response.mode && response.message) {
                Utils.toast(response.mode,response.message);
                if(response.extra && response.extra != "")
                    Utils.toast("warning",response.extra);
            }else {
                Utils.toast("warning", response);
            }
        } catch (error) {
            Utils.toast("error", response);
        }
    }


    removeEmptyFiles(formData) {
        let emptyInputs = [];
        for (let key of formData.keys()) {
            let input = formData.get(key);
            if (input instanceof File && (input.name === "" || input.size === 0)) {
                emptyInputs.push(key);
            }
        }

        emptyInputs.forEach(inputName => formData.delete(inputName));
    }


    handleSubmit(event) {
        if (event) {
            event.preventDefault();
        }
        console.log("handle submit called");
        let formElement = document.getElementById("main-form");
        let formData = new FormData(formElement);
        this.removeEmptyFiles(formData);
        formData.append("removedImages", JSON.stringify(this.model.removedImages));
        this.utils.sendHTTPRequest("POST","", formData, this.handleServerResponse);
        return false;
    }

}


let initModel = (function getInitModel() {
    let tempModel = {};
    tempModel.header = $("#" + CONTENT_HEADER_ID)[0].value;
    tempModel.content = $("#" + TEXT_ID)[0].value;
    tempModel.removedImages = [];
    tempModel.images = (() => {
        let allImg = Array.from(document.getElementsByTagName("img"));
        let desiredImgs = allImg.filter((imgElement) => {
            return typeof imgElement.id === "string" && imgElement.id.indexOf(IMG_ID) >= 0
        });
        return desiredImgs.map(img =>({ id: img.id, src: PageHandler.adaptImgSrc(img.src)}));
    })();
    return tempModel;
})();

window.pageHandler = new PageHandler(initModel);
export default pageHandler;

window.onload = () => {
    document.getElementById('main-form').onsubmit = () => (pageHandler.handleSubmit());
};

