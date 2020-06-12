const shp = require("shpjs");
const fs = require("fs");

module.exports.getPolys = getPolys;

//let internalIndices = new Set();

//return array of multipolygon level coordinate geometries and bboxes
/*
[{
    geometry: [polygon[ring[coordinates[lng, lat]]]]
    bbox: [min_lng, min_lat, max_lng, max_lat]
    properties? ignore for now
},
...]
*/

function getPolys(shapefile) {
    let polyList = [];
    return new Promise((resolve, reject) => {
        fs.readFile(shapefile, (e, data) => {
            if(e) {
                reject(e);
            }
        
            shp(data).then((data) => {
                if(Array.isArray(data)) {
                    for(geojson of data) {
                        handleGeojson(geojson, polyList);
                    }
                }
                else {
                    handleGeojson(data, polyList);
                }
                resolve(polyList);
            }, (e) => {
                reject(e);
            });
        });
    })
}



function handleGeojson(geojson, polyList) {
    switch(geojson.type) {
        case "FeatureCollection": {
            for(let feature of geojson.features) {
                handleGeometry(feature.geometry, polyList);
                //do something with properties?
            }
            break;
        }
        case "Feature": {
            handleGeometry(geojson.geometry, polyList);
            //do something with properties?
            break;
        }
        default: {
            //possible for there to be no outer type (just geometry)
            handleGeometry(geojson);
        }
    }
}

//need to decompose shapes to a list of segments (array or coordinate arrays)
function handleGeometry(geometry, polyList) {
    let type = geometry.type;
    let details = {
        geometry: null,
        bbox: null
    }
    switch(type) {
        case "Polygon": {
            //wrap coords in array so multipolygon depth
            details.geometry = [geometry.coordinates];
            break;
        }
        case "MultiPolygon": {
            details.geometry = geometry.coordinates;
            break;
        }
        case "GeometryCollection": {
            for(let subGeometry of geometry.geometries) {
                handleGeometry(subGeometry);
            }
            return;
        }
        default: {
            console.log("Warning: Skipping geometry not of type 'Polygon' or 'MultiPolygon'.");
            return;
        }
    }
    bbox = geometry.bbox;
    if(!bbox) {
        bbox = getbbox(geometry.coordinates, type);
    }
    details.bbox = bbox;

    polyList.push(details);
}

//coordinate order lng, lat
function getbbox(coordinates, type) {
    //bbox order min_lng, min_lat, max_lng, max_lat
    let bbox = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];

    let handlePoly = (polygon) => {
        //only care about outer polygon, holes are internal
        outerPoly = polygon[0];
        for(let coords of outerPoly) {
            let lng = coords[0];
            let lat = coords[1];
            if(lng < bbox[0]) {
                bbox[0] = lng;
            }
            if(lng > bbox[2]) {
                bbox[2] = lng;
            }
            if(lat < bbox[1]) {
                bbox[1] = lat;
            }
            if(lat > bbox[3]) {
                bbox[3] = lat;
            }

        }
    }
    switch(type) {
        case "Polygon": {
            handlePoly(coordinates);
            break;
        }
        case "MultiPolygon": {
            for(polygon of coordinates) {
                handlePoly(polygon);
            }
            break;
        }
        default: {
            throw new Error("getbbox is only implemented for 'Polygon' and 'MultiPolygon' coordinate hierarchies.");
        }
    }
    return bbox;
}






