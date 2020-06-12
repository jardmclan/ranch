const geotiff = require("geotiff");


module.exports.getDataFromGeoTIFFFile = getDataFromGeoTIFFFile;

function getDataFromGeoTIFFFile(fpath, customNoData = undefined) {
    return new Promise((resolve, reject) => {
        getRasterDataFromGeoTIFFArrayBuffer(fpath, customNoData).then((raster) => {
            
            //resolve with indexed values
            resolve({
                header: raster.header,
                values: raster.bands["0"]
            });
        }, (e) => {
            reject(e);
        });
    });
}


//return header and bands
function getRasterDataFromGeoTIFFArrayBuffer(fpath, customNoData = undefined, bands = undefined) {
    return geotiff.fromFile(fpath).then((tiff) => {
      return tiff.getImage().then((image) => {
        //are tiepoints indexed by cooresponding band? Assume at 0
        let tiepoint = image.getTiePoints()[0];
        let fileDirectory = image.getFileDirectory();
        return image.readRasters().then((rasters) => {
            return new Promise((resolve, reject) => {
                let geotiffData =  {
                    header: null,
                    bands: {}
                };
    
                //get scales from file directory
                let [xScale, yScale] = fileDirectory.ModelPixelScale;
    
                //if unspecified or null assume all bands
                if(bands == undefined || bands == null) {
                    bands = Array.from(rasters.keys());
                }
    
                let noData = Number.parseFloat(fileDirectory.GDAL_NODATA);
                
                geotiffData.header = {
                    ncols: image.getWidth(),
                    nrows: image.getHeight(),
                    xllcorner: tiepoint.x,
                    yllcorner: tiepoint.y - image.getHeight() * yScale,
                }
                
                
                //generally both scales should be the same (use epsi due to rounding errors)
                //use cellsize in this general case, or decouple if scales differ
                epsi = 0.00000001
                if(Math.abs(xScale - yScale) < epsi) {
                    geotiffData.header.cellsize = xScale;
                }
                else {
                    geotiffData.header.cellXSize = xScale;
                    geotiffData.header.cellYSize = yScale;
                }
                
                
    
                for(band of bands) {
                    let raster = rasters[band];
                    let valueMap = {};
                    if(raster == undefined) {
                        return reject("Could not find band: " + band);
                    }
                    for(let i = 0; i < raster.length; i++) {
                        let value = raster[i];
                        //map value to index if value exists
                        if(value != noData && value != customNoData) {
                            valueMap[i] = value;
                        }
                    }
                    geotiffData.bands[band] = valueMap;
                }
                resolve(geotiffData);
            });
        });
      });
      
    });
}