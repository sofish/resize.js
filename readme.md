# use canvas to resize image

## 1. API

```js
options = {
  file: file                              // HTMLImageElement or File
  maxWidth: 640
  maxHeight: 640
  callback: function(result) {},
  readAsDataURL: false,                   // by default return a blob
  keepExif: true                          // by default keep Exif for image/jpeg
}

resize(options);
```

click to view [demo](http://sofish.github.io/resize.js/).

## 2. Development

```bash
$ npm install .
$ npm run build         // build for production
$ npm run watch         // watch to develop
$ npm test              // test in browser
```