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

/*
Adds legend to svg using a gradient as rectangle

Parameters
----------
svg: d3.svg object
colors: An array containing offset and corresponding color
for the legend, e.g.
colors = [
    {offset: "0%", color: "#2c7bb6"},
    {offset: "50%", color: "#ffff8c"},
    {offset: "100%", color: "#d7191c"}
]
*/
function add_legend_gradient(svg,colors,width,height,pos){
    //Append a defs (for definition) element to your SVG
    var defs = svg.append("defs");

    //Append a linearGradient element to the defs and give it a unique id
    var linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient");

    //Vertical gradient
    linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");

    //Set the color for the start (0%)
    linearGradient.selectAll("stop")
        .data(colors)
        .enter()
        .append("stop")
        .attr("offset",(d,i)=>d.offset)
        .attr("stop-color",d=>{return d.color});

    //Draw the rectangle and fill with gradient
    svg.append("rect")
        .attr("x", pos[0])
        .attr("y", pos[1])
        .attr("width", width)
        .attr("height", height)
        .style("fill", "url(#linear-gradient)")
        .on("mousemove", function(d) {
            // Possible to add a legend handler here
            //console.log((d.clientY-pos[1])/height);
        }.bind(pos[1]).bind(height));
}

function getAllIndexes(arr, val) {
    var indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}

// seconds * minutes * hours * milliseconds = 1 day 
var oneDay = 60 * 60 * 24 * 1000;
