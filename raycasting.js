  
  module.exports.isInternal = isInternal;


  //edges as ordered lists of vertices with multipolygon depth (greatest depth, can wrap single polygons)
  //geometry[polygon[ring[coordinates[]]]]
  
  //can specify origin if 0,0 is in range, not necessary for cover being used (0,0 not in range)
  function isInternal(geometry, point, origin = [0, 0]) {
    //raycasting algorithm, point is internal if intersects an odd number of edges
    let internal = false;

    for(let polygon of geometry) {
        for(let ring of polygon) {
            for(let i = 0; i < ring.length - 1; i++) {
                let a = ring[i];
                let b = ring[i + 1];
                //segments intersect iff endpoints of each segment are on opposite sides of the other segment
                //check if angle formed is counterclockwise to determine which side endpoints fall on
                if(ccw(a, origin, point) != ccw(b, origin, point) && ccw(a, b, origin) != ccw(a, b, point)) {
                    internal = !internal
                }
            }
        }
    }

    return internal;
  }


  //points as [lng, lat] ([x, y])

  //determinant formula yields twice the signed area of triangle formed by 3 points
  //counterclockwise if negative, clockwise if positive, collinear if 0
  function ccw(p1, p2, p3) {
    //if on line counts, both will be 0, probably need to add special value (maybe return -1, 0, or 1)
    return ((p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1])) > 0;
  }