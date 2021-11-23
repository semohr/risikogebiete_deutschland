// Project the data using Proj4
function project(geojson, projection) {
    const projectPolygon = coordinate => {
        coordinate.forEach((lonLat, i) => {
            coordinate[i] = window.proj4(projection, lonLat);
        });
    };
    geojson.features.forEach(function (feature) {
        if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates.forEach(projectPolygon);
        } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach(items => {
                items.forEach(projectPolygon);
            });
        }
    });
}