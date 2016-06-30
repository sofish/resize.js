(function(win) {
  'use strict';

  var ExifRestorer = require('./ExifRestorer');

  var originDataURL, input;
  var defaults = {
    maxWidth: 640,
    maxHeight: 640,
    callback: function () {},
    readAsDataURL: false,
    keepExif: true
  };

  /**
   * Resize image with canvas
   * @param options {Object}
   *  options = {
   *    file: file                        // HTMLImageElement or File
   *    maxWidth: 640
   *    maxHeight: 640
   *    callback: function(result, length) {},
   *    readAsDataURL: false,             // by default return a blob
   *    keepExif: true                    // by default keep Exif for image/jpeg
   *  }
   */
  function resize(options) {
    for(let p in options) {
      if(options.hasOwnProperty(p)) defaults[p] = options[p];
    }

    if (!defaults.file) return console.log('specific a file to resize.');
    var img = new Image();

    if (is(defaults.file) === 'File') {
      let reader = new FileReader();
      reader.onload = function () {
        img.onload = function() {
          defaults.callback(resizer(img, defaults));
        };
        img.src = originDataURL = this.result;
      };
      reader.readAsDataURL(defaults.file);
    } else if (is(defaults.file) === 'HTMLImageElement') {
      img = defaults.file;
      loadToDataURL(defaults.file.src, function(dataURL) {
        originDataURL = dataURL;
        defaults.callback(resizer(img, defaults));
      });
    } else {
      console.log('`options.file` is not a File or HTMLImageElement.')
    }
  }

  /**
   * Resize image with canvas
   * @param img {HTMLImageElement}
   * @param options {Object}
   * @return {Blob|String(Base64)}
   */
  function resizer(img, options) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var width = img.width;
    var height = img.height;
    var radio = width / height;
    var maxWidth = options.maxWidth;
    var maxHeight = options.maxHeight;
    var dataURL, type;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / radio;
    }

    if (height > maxHeight) {
      height = maxWidth;
      width = height * radio;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    type = originDataURL.split('base64')[0].slice(5, -1);
    dataURL = canvas.toDataURL(type);

    if(options.keepExif) {
      // ExifRestore will check if it is a jpeg
      dataURL = ExifRestorer.restore(originDataURL, dataURL);
      if(!dataURL.match('data:image')) dataURL = 'data:image/jpeg;base64,' + dataURL;
    }

    canvas = null;
    img = null;

    return {
      file: options.readAsBlob ? dataURLtoBlob(dataURL) : dataURL,
      originSize: size(originDataURL),
      size: size(dataURL),
      input: input
    };
  }

  function is(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
  }

  /**
   * Covert data-uri to blob
   * CopyRight: http://stackoverflow.com/a/11954337
   */
  function dataURLtoBlob(dataURL) {
    var binary = atob(dataURL.split(',')[1]);
    var array = [];
    for(var i = 0; i < binary.length; i++) array.push(binary.charCodeAt(i));

    return new Blob([new Uint8Array(array)], {
      type: dataURL.slice(5, dataURL.indexOf(';'))
    });
  }

  /**
   * Retry dataURL from url
   * @param url
   * @param callback
   */
  function loadToDataURL(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function() {
      var reader  = new FileReader();
      reader.onloadend = function () {
        callback(reader.result);
        reader = null;
      }
      reader.readAsDataURL(xhr.response);
      xhr = null;
    };
    xhr.open('GET', url);
    xhr.send();
  }

  /**
   * Size from dataURL
   * @param dataURL {String(base64)}
   */
  function size(dataURL) {
    var headLength = dataURL.split('base64,')[0].length + 7;
    return Math.floor((dataURL.length - headLength) * 3 / 4);
  }

  win.resize = resize;
})(window);