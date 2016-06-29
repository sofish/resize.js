(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// CopyRight: http://www.perry.cz/files/ExifRestorer.js
// Based on MinifyJpeg
// http://elicon.blog57.fc2.com/blog-entry-206.html

var ExifRestorer = (function () {

  var ExifRestorer = {};

  ExifRestorer.KEY_STR = "ABCDEFGHIJKLMNOP" +
    "QRSTUVWXYZabcdef" +
    "ghijklmnopqrstuv" +
    "wxyz0123456789+/" +
    "=";

  ExifRestorer.encode64 = function (input) {
    var output = "",
      chr1, chr2, chr3 = "",
      enc1, enc2, enc3, enc4 = "",
      i = 0;

    do {
      chr1 = input[i++];
      chr2 = input[i++];
      chr3 = input[i++];

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output +
        this.KEY_STR.charAt(enc1) +
        this.KEY_STR.charAt(enc2) +
        this.KEY_STR.charAt(enc3) +
        this.KEY_STR.charAt(enc4);
      chr1 = chr2 = chr3 = "";
      enc1 = enc2 = enc3 = enc4 = "";
    } while (i < input.length);

    return output;
  };

  ExifRestorer.restore = function (origFileBase64, resizedFileBase64) {
    if (!origFileBase64.match("data:image/jpeg;base64,")) {
      return resizedFileBase64;
    }

    var rawImage = this.decode64(origFileBase64.replace("data:image/jpeg;base64,", ""));
    var segments = this.slice2Segments(rawImage);

    var image = this.exifManipulation(resizedFileBase64, segments);

    return this.encode64(image);

  };


  ExifRestorer.exifManipulation = function (resizedFileBase64, segments) {
    var exifArray = this.getExifArray(segments),
      newImageArray = this.insertExif(resizedFileBase64, exifArray),
      aBuffer = new Uint8Array(newImageArray);

    return aBuffer;
  };


  ExifRestorer.getExifArray = function (segments) {
    var seg;
    for (var x = 0; x < segments.length; x++) {
      seg = segments[x];
      if (seg[0] == 255 & seg[1] == 225) //(ff e1)
      {
        return seg;
      }
    }
    return [];
  };


  ExifRestorer.insertExif = function (resizedFileBase64, exifArray) {
    var imageData = resizedFileBase64.replace("data:image/jpeg;base64,", ""),
      buf = this.decode64(imageData),
      separatePoint = buf.indexOf(255, 3),
      mae = buf.slice(0, separatePoint),
      ato = buf.slice(separatePoint),
      array = mae;

    array = array.concat(exifArray);
    array = array.concat(ato);
    return array;
  };


  ExifRestorer.slice2Segments = function (rawImageArray) {
    var head = 0,
      segments = [];

    while (1) {
      if (rawImageArray[head] == 255 & rawImageArray[head + 1] == 218) {
        break;
      }
      if (rawImageArray[head] == 255 & rawImageArray[head + 1] == 216) {
        head += 2;
      }
      else {
        var length = rawImageArray[head + 2] * 256 + rawImageArray[head + 3],
          endPoint = head + length + 2,
          seg = rawImageArray.slice(head, endPoint);
        segments.push(seg);
        head = endPoint;
      }
      if (head > rawImageArray.length) {
        break;
      }
    }

    return segments;
  };


  ExifRestorer.decode64 = function (input) {
    var output = "",
      chr1, chr2, chr3 = "",
      enc1, enc2, enc3, enc4 = "",
      i = 0,
      buf = [];

    // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
    var base64test = /[^A-Za-z0-9\+\/\=]/g;
    if (base64test.exec(input)) {
      alert("There were invalid base64 characters in the input text.\n" +
        "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
        "Expect errors in decoding.");
    }
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    do {
      enc1 = this.KEY_STR.indexOf(input.charAt(i++));
      enc2 = this.KEY_STR.indexOf(input.charAt(i++));
      enc3 = this.KEY_STR.indexOf(input.charAt(i++));
      enc4 = this.KEY_STR.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      buf.push(chr1);

      if (enc3 != 64) {
        buf.push(chr2);
      }
      if (enc4 != 64) {
        buf.push(chr3);
      }

      chr1 = chr2 = chr3 = "";
      enc1 = enc2 = enc3 = enc4 = "";

    } while (i < input.length);

    return buf;
  };


  return ExifRestorer;
})();

if(module.exports) {
  module.exports = ExifRestorer;
}
},{}],2:[function(require,module,exports){
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
      if(!dataURL.match('data:image/jp')) dataURL = 'data:image/jpeg;base64,' + dataURL;
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
},{"./ExifRestorer":1}]},{},[2]);
