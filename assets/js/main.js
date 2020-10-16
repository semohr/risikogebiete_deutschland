
// Global map instance
var map;
var polygonSeries;
var polygonTemplate;
//window.addEventListener("load", setup_amChartmap);

function setup_amChartmap(){

	// Create map object
	map = am4core.create("chartdiv", am4maps.MapChart);

	//Performance
	map.svgContainer.autoResize = false;
	map.svgContainer.measure();
	am4core.options.onlyShowOnViewport = true;
	am4core.options.deferredDelay = 500;
	am4core.options.queue = true;
	map.maxZoomLevel = 1;
	map.zoomDuration = 0;

	map.geodataSource.url = "/assets/data/minified_landkreise.geo.json";

	map.projection = new am4maps.projections.Miller();

	polygonSeries = new am4maps.MapPolygonSeries();
	polygonSeries.useGeodata = true;
	polygonSeries.calculateVisualCenter = true;
	map.series.push(polygonSeries);


	var polygonTemplate = polygonSeries.mapPolygons.template;
	polygonTemplate.applyOnClones = true;
	polygonTemplate.tooltipText = "{AGS}";
	polygonTemplate.fill = am4core.color("#74B266");

	// Create hover state and set alternative fill color
	var hs = polygonTemplate.states.create("hover");
	hs.properties.fill = am4core.color("#367B25");

}
window.addEventListener("load", setup_highchartsmap);

var data = [
["01001",10],
["01002",100],
["01003",1000],
["03159",1000],
]


var geo_json;
var rki_data;
function setup_highchartsmap(){

	//Raw geojson
	var request = new XMLHttpRequest();
	request.open("GET", "/assets/data/minified_landkreise.geo.json", false);
	request.send(null)
	geo_json = JSON.parse(request.responseText);

	//Rki data
	var request = new XMLHttpRequest();
	request.open("GET","https://opendata.arcgis.com/datasets/dd4580c810204019a7b8eb3e0b329dd6_0.geojson", false)
	request.send(null)
	rki_data = JSON.parse(request.responseText);

	map = new Highcharts.Map('chartdiv', {  
   	//First add geojson data
   	chart:{
   		map:geo_json
   	},

   	//Options for the map visuals
   	plotOptions:{
   		map:{
   			borderColor:"white",
   			borderWidth:0.7,
   		}
   	},


   	//Data for 
   	series: [{
   		data:data,
   		keys: ["id","value"],
   		joinBy: "id"
   	}],

	});
}



// ---------------------------------------------------------------------------- //
// Utils
// ---------------------------------------------------------------------------- //
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