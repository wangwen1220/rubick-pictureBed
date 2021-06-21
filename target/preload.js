/**
 * @author muwoo
 * Date: 2018/6/26
 */
const fs = require('fs');
const imagemin = require('imagemin');
const imageminGifsicle = require('imagemin-gifsicle');
const imageminPngquant = require('imagemin-pngquant');
const imageminJpegRecompress = require('imagemin-jpeg-recompress');

class Operate {
  constructor() {}

  async compressFromImagemin(path, isCompress) {
    const sourceData = fs.readFileSync(path);
    const originSize = sourceData.length / 1024;
    if (!isCompress) {
      return {
        compressFile: sourceData,
        originSize
      };
    }
    const files = await imagemin.buffer(sourceData, {
      plugins: [imageminGifsicle(), imageminJpegRecompress(), imageminPngquant()]
    });
    return {
      compressFile: files,
      distSize: parseInt(files.length / 1024, 10),
      originSize
    };
  }

  upload(file) {
    const blobFile = new Blob([file.file]);
    return {
      ...file.file,
      ... new File([blobFile], file.filename, { type: blobFile.type })
    };
  }
}
window.operate = new Operate()
