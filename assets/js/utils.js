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
Lighten or darken a given color

https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors

see stackoverflow for usage
*/
const pSBC=(p,c0,c1,l)=>{
    let r,g,b,P,f,t,h,i=parseInt,m=Math.round,a=typeof(c1)=="string";
    if(typeof(p)!="number"||p<-1||p>1||typeof(c0)!="string"||(c0[0]!='r'&&c0[0]!='#')||(c1&&!a))return null;
    if(!this.pSBCr)this.pSBCr=(d)=>{
        let n=d.length,x={};
        if(n>9){
            [r,g,b,a]=d=d.split(","),n=d.length;
            if(n<3||n>4)return null;
            x.r=i(r[3]=="a"?r.slice(5):r.slice(4)),x.g=i(g),x.b=i(b),x.a=a?parseFloat(a):-1
        }else{
            if(n==8||n==6||n<4)return null;
            if(n<6)d="#"+d[1]+d[1]+d[2]+d[2]+d[3]+d[3]+(n>4?d[4]+d[4]:"");
            d=i(d.slice(1),16);
            if(n==9||n==5)x.r=d>>24&255,x.g=d>>16&255,x.b=d>>8&255,x.a=m((d&255)/0.255)/1000;
            else x.r=d>>16,x.g=d>>8&255,x.b=d&255,x.a=-1
        }return x};
    h=c0.length>9,h=a?c1.length>9?true:c1=="c"?!h:false:h,f=this.pSBCr(c0),P=p<0,t=c1&&c1!="c"?this.pSBCr(c1):P?{r:0,g:0,b:0,a:-1}:{r:255,g:255,b:255,a:-1},p=P?p*-1:p,P=1-p;
    if(!f||!t)return null;
    if(l)r=m(P*f.r+p*t.r),g=m(P*f.g+p*t.g),b=m(P*f.b+p*t.b);
    else r=m((P*f.r**2+p*t.r**2)**0.5),g=m((P*f.g**2+p*t.g**2)**0.5),b=m((P*f.b**2+p*t.b**2)**0.5);
    a=f.a,t=t.a,f=a>=0||t>=0,a=f?a<0?t:t<0?a:a*P+t*p:0;
    if(h)return"rgb"+(f?"a(":"(")+r+","+g+","+b+(f?","+m(a*1000)/1000:"")+")";
    else return"#"+(4294967296+r*16777216+g*65536+b*256+(f?m(a*255):0)).toString(16).slice(1,f?undefined:-2)
}


/*
Adds colorbar to an html element by id

Parameters
----------
parent_id : string
    Id of the dom elements to add the colorbar to. 
    Creates a div with id "color-bar" inside parent
colors : array of strings
    Colors to use for the colorbar
classes : array of ints
    Classes to use as colormap annotations
*/
function add_colorbar_and_annotations(parent_id,colors,classes){
    //Append a defs (for definition) element to svg
    var cb = d3.select("#"+parent_id)
        .append("div")
        .attr("id","color-bar")
        .append("svg")
        .style("display", "block")
        .attr("width", 15+5)
        .attr("height", 20*(colors.length));

    //Append a linearGradient element to the defs and give it a unique id
    var linearGradient = cb.append("linearGradient")
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
        .attr("offset",(d,i)=>{
            return i/colors.length*100  + 1/colors.length*50+"%";
        })
        .attr("stop-color",d=>{return d});

    //Draw the rectangle and fill with gradient
    cb.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 15)
        .attr("height", "100%")
        .style("fill", "url(#linear-gradient)")
        .on("mousemove", mouseover_legend);

    // Add annotation lines
    console.log(classes);
    cb.selectAll("line")
        .data(classes)
        .enter()
        .append("line")
        .attr("stroke-width","1")
        .style("stroke", "black")
        // Set alpha to 100%
        .style("opacity",1)
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", (d,i)=>{
            return i*20 + 10
        })
        .attr("y2", (d,i)=>{
            return i*20 + 10
        });

    // Add annotation text
    let annotations = d3.select("#"+parent_id)
        .append("div")
        .attr("id","color-bar-texts")
        .style("height",20*(colors.length)+"px");
    annotations.selectAll("div")
        .data(classes)
        .enter()
        .append("div")
        .attr("class","color-bar-text")
        .html((d,i)=>{
            return d
        });
}

function mouseover_legend(d,i){
    //console.log(d.clientY - d3.select("#color-bar").node().getBoundingClientRect().top);
}

function getAllIndexes(arr, val) {
    var indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}

// throttle function, enforces a minimum time interval
function throttle(fn, interval) {
    var lastCall, timeoutId;
    return function () {
      var now = new Date().getTime();
      if (lastCall && now < (lastCall + interval) ) {
        // if we are inside the interval we wait
        clearTimeout(timeoutId);
        timeoutId = setTimeout(function () {
          lastCall = now;
          fn.call();
        }, interval - (now - lastCall) );
      } else {
        // otherwise, we directly call the function 
        lastCall = now;
        fn.call();
      }
    };
  }


// seconds * minutes * hours * milliseconds = 1 day 
var oneDay = 60 * 60 * 24 * 1000;

// ---------------------------------------
// Circle with population density as size transitions
// ---------------------------------------

// Transition to circles as shape of regions
function circles_svg(){
    // Transition paths to other shape
    var n = 0;
    var paths = map.selectAll("path");

    var path_to_circles = () => {
        map.selectAll("circle")
        .data(geojson.features)
        .enter().append("circle")
        .attr("r", (d)=>{return Math.sqrt(d.properties.index_data)})
        .attr("cx", (d)=>{return path.centroid(d)[0]})
        .attr("cy", (d)=>{return path.centroid(d)[1]})
        .attr("fill", d => {
            return color(d.properties.index_data)
        })
        .attr("stroke", "gray")
        .attr("stroke-width","0.8")
        .on("mouseover",mouseoverHandler)
        .on("mouseout",mouseoutHandler)
        .on("mousemove",mousemoveHandler);

        // Delete paths from svg
        paths.remove();
    };

    // Transition to circles (paths are inefficent)
    paths.each(()=>{
            n++;
        })
        .transition()
        .delay(function(d,i){
            // Delay by position of circle
            // From top to bottom
            let centroid = path.centroid(d);
            let y = centroid[1];
            return (y-100)*3;
        })
        .duration(1000)
        .ease(d3.easeSinInOut)
        .attr('d', circlePath)
        .on('end', function() { // use to be .each('end', function(){})
            n--;
            if (!n) {
                path_to_circles();
            }
        });
}

// Transition to "normal" shape of regions
function map_svg(){
    
    if (!experimental_circles){return}

    map.selectAll("path")
        .data(geojson.features)
        .enter().append("path")
        .attr("d", path)
        .attr("d", circlePath)
        .attr("fill", d => {
            return color(d.properties.index_data)
        })
        .attr("stroke", "gray")
        .attr("stroke-width","0.8")
        .on("mouseover",mouseoverHandler)
        .on("mouseout",mouseoutHandler)
        .on("mousemove",mousemoveHandler);

    //Delete circles
    map.selectAll("circle").remove();


    // Transition circlepaths to other path of region
    var paths = map.selectAll("path");
    paths.transition()
        .delay(function(d,i){
            // Delay by position of circle
            // From top to bottom
            let centroid = path.centroid(d);
            let y = centroid[1];
            return (svg.node().getBBox().height-y-100)*3;
        })
        .duration(1000)
        .ease(d3.easeSinInOut)
        .attr('d', path);
}

// Computes the circle svg path give a previous path
var limits = {
    "total":3669491,
    "A00-A04":193234,
    "A05-A14":326311,
    "A15-A34":964109,
    "A35-A59":1276145,
    "A60-A79":698465,
    "A80+":211227,
}
function circlePath(d,i){
    
    var n_points = this.pathSegList.length;
    var center = path.centroid(d);

    var r = Math.sqrt(d.properties.index_data);
    var points = _points_circle(center,r,n_points+1);
    //convert to string
    let str = "M" + points[0][0] + "," + points[0][1];
    for (let i = 1; i < points.length; i++) {
        str += "L" + points[i][0] + "," + points[i][1];
    }
    str+="Z";
    return str
}

// Returns a list of points on a circle
function _points_circle(center,radius,num_points){
    var points = [];
    for (var i = 0; i < num_points; i++) {
        var angle = i * 2 * Math.PI / num_points;
        points.push([center[0] + radius * Math.cos(angle),center[1] + radius * Math.sin(angle)]);
    }
    return points;
}
 
  /*--------------------------------------------------------------
  # Accordion
  # taken from my website at semohr.github.io
  --------------------------------------------------------------*/
document.addEventListener('DOMContentLoaded', function() {
    var acc = document.getElementsByClassName("accordion");
    var i;

    for (i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function() {
            /* Toggle between adding and removing the "active" class,
            to highlight the button that controls the panel */
            this.classList.toggle("active");

            /* Toggle between hiding and showing the active panel 
                // save old display style
            */
            var panel = this.nextElementSibling;
            var imges = this.getElementsByClassName("pm");
            if (panel.style.display !== "none") {
                panel.style.display = "none";    
                imges[0].src = "assets/img/plus.png";
            }
            else {
                
                imges[0].src = "assets/img/minus.png";
                panel.style.display = "";
            }
            let old = this.firstElementChild.innerHTML;
            this.firstElementChild.innerHTML = this.attributes["collapsed-header"].nodeValue;
            this.attributes["collapsed-header"].nodeValue = old;
        });
    }
});


function endAll (transition, callback) {
    var n;

    if (transition.empty()) {
        callback();
    }
    else {
        n = transition.size();
        transition.each("end", function () {
            n--;
            if (n === 0) {
                callback();
            }
        });
    }
}
