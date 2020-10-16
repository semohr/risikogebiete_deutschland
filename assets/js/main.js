
// Global map instance
var map;
var polygonSeries;
var polygonTemplate;
window.addEventListener("load", setup);

function setup(){

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




// INPUTS

var inputs;
function setup_inputs(){
	inputs = document.querySelectorAll('input[type=radio]');
	for (input of inputs){
		input.addEventListener('change', function(e) {
			for (input of inputs) {
				if (input.checked){
					polygonSeries = map.series.push(new am4maps.MapPolygonSeries());
					polygonTemplate = polygonSeries.mapPolygons.template;
					polygonSeries.useGeodata = true;
					if (input.id == "All") {
						polygonTemplate.propertyFields.fill = "fill";
					}
					else{
						polygonTemplate.propertyFields.fill = "fill_"+input.id;
					}
				}
			}
		})
	}
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


// return JSON data from any file path (asynchronous)
function getJSON(path) {
    return fetch(path).then(response => response.json());
}

