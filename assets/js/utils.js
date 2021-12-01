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
Adds legend to svg element using a rectangle
and gradient.

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
function add_legend_gradient(group,width,height,pos,colors,annotations){
    //Append a defs (for definition) element to svg
    var defs = group.append("defs");

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
    group.append("rect")
        .attr("x", pos[0])
        .attr("y", pos[1])
        .attr("width", width)
        .attr("height", height)
        .style("fill", "url(#linear-gradient)")
        .on("mousemove", function(d) {
            // Possible to add a legend handler here
            //console.log((d.clientY-pos[1])/height);
        }.bind(pos[1]).bind(height));

    annotations = [
        {pos: "0%", label: "0%"},
        {pos: "50%", label: "50%"},
        {pos: "100%", label: "100%"}
    ];
    _add_legend_annotations(group,width,height,pos,annotations);
}
/* Helper function to create legend labels
annotations: An array containing the legend annotations, e.g.
annotations = [
    {pos: "0%", label: "0"},
    {pos: "50%", label: "50"},
    {pos: "100%", label: "100"}
]
*/
function _add_legend_annotations(group,width,height,pos,annotations){
    // Get svg
    const x_pos = pos[0]+width;
    for (let i = 0; i < annotations.length; i++) {
        const an = annotations[i];
        if (an["pos"] == "0%"){
            var offset = - 2; // shift half stroke width
        }
        else if (an["pos"] == "100%") {
            var offset = 2; // shift half stroke width
        }
        else{
            var offset = 0
        }
        const y_pos = pos[1]+height*(1-parseFloat(an["pos"])/100) + offset;
        
        group.append("line")
            .style("stroke","black")
            .style("stroke-width", "4px")
            .attr("x1", x_pos-10)
            .attr("y1", y_pos)
            .attr("x2", x_pos + width/2)
            .attr("y2", y_pos).lower();
        group.append("text")
            .style("font-size","20px")
            .attr("class","label")
            .attr("x", x_pos + width/2+4)
            .attr("y", y_pos + 10 - 3 ) //shift half font size and half stroke
            .text(an["label"]);    
    }


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
