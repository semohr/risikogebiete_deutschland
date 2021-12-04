
// Global map instance
var map;
var polygonSeries;
var polygonTemplate;

// Global data instances
var geo_json;
var data_json;
var age_groups = ["A00-A04","A05-A14","A15-A34","A35-A59","A60-A79","A80+"];

// Where to find the data and scripts
var scripts = document.getElementsByTagName('script');
var path = scripts[scripts.length-1].src.split('?')[0];      // remove any ?query
var mydir = path.split('/').slice(0, -1).join('/')+'/';  // remove last filename part of path

//Main function call
window.addEventListener("load", setup_highchartsmap);

// Config for the colors of the map (default are colorblind friendly)
var default_dataClasses  = {dataClasses: [{
        to: 25
    }, {
        from: 25,
        to: 50
    }, {
        from: 50,
        to: 100
    }, {
        from: 100,
        to: 200
    }, {
        from: 200,
        to: 500
    }, {
        from: 500,
        to: 1000
    }, {
        from: 1000,
        to: 2000
    }, {
        from: 2000
    }]
};
var default_colors = {colors: ['#15b01a', '#f0f921', '#fdb42f', '#ed7953', '#cb4679', '#9c179e', '#5c01a6', "#0d0887"]};
var old_colors = {colors: ["#15b01a","#fac205","#f97c0e","#c50000","#8c53d1","#4d00fe","#00009c","#303030"]};


/**
 * Main setup function to plot a highcharts map
 * - loads the incidence data and the geojson data
 */
function setup_highchartsmap(){

    //Load raw geojson
    var request = new XMLHttpRequest();
    request.open("GET", mydir+"../data/landkreise_edited.geojson", false);
    request.send(null)
    geo_json = JSON.parse(request.responseText);
    project(
        geo_json,
        '+proj=merc +lat_1=33 +lat_2=45 +lat_0=0 +lon_0=0'
    );

    //Load incidence data
    var request = new XMLHttpRequest();
    request.open("GET", mydir+"../data/data_latest.json?nocache="+Date.now(), false);
    request.send(null)
    data_json = JSON.parse(request.responseText);


    // Preprocess data for plotting
    var data = []
    for (id_d in data_json) {
        // Convert id from incidence data to string
        if (String(id_d).length == 4){
            var id_m = "0"+String(id_d)
        }
        else {
            var id_m = String(id_d)
        }

        // Get the data for the current id
        var dat = []
        dat.push(id_m)
        var vars = [
        "weekly_cases",	           "inzidenz",
        "weekly_cases_A00-A04",	   "inzidenz_A00-A04",
        "weekly_cases_A05-A14",	   "inzidenz_A05-A14",
        "weekly_cases_A15-A34",	   "inzidenz_A15-A34",
        "weekly_cases_A35-A59",	   "inzidenz_A35-A59",
        "weekly_cases_A60-A79",	   "inzidenz_A60-A79",
        "weekly_cases_A80+",	     "inzidenz_A80+",
        "weekly_cases_unbekannt",	 "inzidenz_unbekannt"]

        for (index in vars){
            dat.push(data_json[id_d][vars[index]])
        }
        // Add the data to the data array
        data.push(dat)
    }

    // Show data in console
    //console.log(data);

    //Create series dict
    var input_series = [{
        //Config
        name: "All age groups",
        colorKey: "inzidenz",

        //Data
        data: data,
        keys: ["id",
            "weekly_cases",	"inzidenz",
            "weekly_cases_A00-A04",	"inzidenz_A00-A04",
            "weekly_cases_A05-A14",	"inzidenz_A05-A14",
            "weekly_cases_A15-A34",	"inzidenz_A15-A34",
            "weekly_cases_A35-A59",	"inzidenz_A35-A59",
            "weekly_cases_A60-A79",	"inzidenz_A60-A79",
            "weekly_cases_A80+",	"inzidenz_A80+",
            "weekly_cases_unbekannt",	"inzidenz_unbekannt"],
        joinBy: null,
        animation: false,
    }];

    
    for (a of age_groups) {
        input_series.push({
            //Config
            name: a,
            colorKey: "inzidenz_"+a,
            //Data
            data: data,
            keys: ["id",
                "weekly_cases",	"inzidenz",
                "weekly_cases_A00-A04",	"inzidenz_A00-A04",
                "weekly_cases_A05-A14",	"inzidenz_A05-A14",
                "weekly_cases_A15-A34",	"inzidenz_A15-A34",
                "weekly_cases_A35-A59",	"inzidenz_A35-A59",
                "weekly_cases_A60-A79",	"inzidenz_A60-A79",
                "weekly_cases_A80+",	"inzidenz_A80+",
                "weekly_cases_unbekannt",	"inzidenz_unbekannt"],
            joinBy: null,
            visible: false,
            animation: false,
        });
    }



    map = new Highcharts.Map('chartdiv', {  
        //First add geojson data
        chart:{
            styleMode: true,
            map:geo_json,
            allAreas: true,
            resetZoomButton: {
                theme: {
                    display: 'none'
                }
            }
        },
        mapNavigation: {
            enabled: true,
            buttonOptions: {
                align: 'right',
                verticalAlign: 'bottom',
            }
        },

        //Options for the map visuals
        plotOptions:{
            states: {
                hover: {
                    brightness: 0.2,
                    borderColor: 'gray'
                }
            },
        },

        //Formatted incidence data for the map
        series: input_series,

        //Formatting text and create tooltips
        title: {
            text: undefined,
        },
        tooltip: {
            useHTML: true,
            formatter: function(tooltip){
                var name_ = localAuthorityToolTip(this.point.properties);
                var wc = this.point["weekly_cases"];
                var i = this.point["inzidenz"];
                
                var wc_a = {};
                var i_a = {};
                for (a of age_groups) {
                    wc_a[a] = this.point["weekly_cases_"+a];
                    i_a[a] = this.point["inzidenz_"+a];
                }

                //Construct html element as string
                str = `
                    <h5> ${name_}</h5>
                    <hr>
                    <table>
                        <tr>
                            <th style="text-align: left; padding-right:10px;">Altersgruppe</th>
                            <th style="text-align: right;padding-left: 10px">Fälle der letzte Woche</th>
                            <th style="text-align: right;padding-left: 10px">pro 100.000 EW</th>
                        </tr>
                    `;
                str +=`
                        <tr>
                            <td>Alle</td>
                            <td style="text-align: right;">${wc}</td>
                            <td style="text-align: right;">${i.toFixed(2).replace(".", ",")}</td>
                        </tr>
                    `;
                for (a of age_groups) {
                    console.log(i_a[a],name_,this.point.properties.id)
                    str +=`
                        <tr>
                            <td>${a}</td>
                            <td style="text-align: right;">${wc_a[a]}</td>
                            <td style="text-align: right;">${i_a[a].toFixed(2).replace(".", ",")}</td>
                        </tr>
                        `;    			
                }
                str += "</table>";
                return str
            },
            pointFormat: '{point.properties.GEN}: {point.properties.id}'
        },
        colors: default_colors["colors"],
        colorAxis: {
            dataClassColor: 'category',
            dataClasses: default_dataClasses["dataClasses"],
            events:{
                legendItemClick: function(e){
                    e.preventDefault();
                    //console.log(e)
                },
            }
        },
        legend: {
            title: {
                text: '<label class="legend_title">Fälle/100.000 EW</label><br/> <span class="legend_subtitle">in der jeweiligen Altersgruppe</span>'
            },
            align: 'left',
            verticalAlign: 'bottom',
            floating: true,
            labelFormatter: function () {
                return (this.from || '<') + ' - ' + (this.to || '>');
            },
            layout: 'vertical',
            valueDecimals: 0,
            backgroundColor: 'rgba(0,0,0,0.1)',
            symbolRadius: 0,
            symbolHeight: 14,
            borderRadius: 5,
            itemStyle:{
                color: colorFont()
            }
        },
    });
}

function colorFont(){
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return "gray"
    }
    else{
        return "#333333"
    }
}

var inputs;
window.addEventListener("load", setup_inputs);

function setup_inputs(){
    inputs = document.querySelectorAll("input[type='radio']")
    for (input of inputs){
        input.onclick = function(e){
            for (series of map.series){
                if (series.name == e.target.id) {
                    series.show()
                }
                else{
                    series.hide()
                }
            }
        }
        if (input.checked){
            input.click();
        }
    }

    input_change_color = document.getElementById("change_color");
    input_change_color.onclick = function(e){
        if (input_change_color.checked){
            change_color(old_colors,default_dataClasses)
        }
        else{
            change_color(default_colors,default_dataClasses)
        }
    }
    // Check for initial input state
    if (input_change_color.checked){
        change_color(old_colors,default_dataClasses)
    }

    // Get last commit date
    commit_date();
}


function get_series_by_age_group(ag){
    for (series of map.series){
        if (series.name == ag){
            return series
        }
    }
    return "NOT FOUND" 
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

/**
 * Find a short tooltip label for local authority classes in germany.
 * Keep a reasonable default for unknown new classes.
 */
function localAuthorityToolTip(pointProperties) {
    var bez = pointProperties.BEZ;
    var prefix = bez + ' ';
    if (bez == 'Landkreis') {
        prefix = 'LK ';
    }
    if (bez == 'Kreis') {
        prefix = 'Kr ';
    }
    if (bez == 'Stadtkreis') {
        prefix = 'SK ';
    }
    if (bez == 'Kreisfreie Stadt') {
        prefix = 'Stadt ';
    }
    return prefix + pointProperties.GEN;
}



const commit_date = async () => {
    const response1 = await fetch('https://api.github.com/repos/semohr/risikogebiete_deutschland/git/refs/heads/master');
    const refmain = await response1.json()
    const response2 = await fetch('https://api.github.com/repos/semohr/risikogebiete_deutschland/git/commits/'+refmain.object.sha);
    const lastcommit = await response2.json();
    const lastcommitdate = lastcommit.committer.date;
    document.getElementById("lastcommitdate").innerHTML = lastcommitdate.replace("T"," ").replace("Z","");
}



// Change color of highcharts map dynamically
// Expects dicts:
// { color: ["#ffffff", "#ffffff"]}
/* { dataClasses: [{
            to: 25
        }, {
            from: 25,
            to: 50
        }]}
*/
function change_color(colours,dataClasses){
    map.update(colours,false);
    for (i=0;i<map.series.length;i++){
        map.series[i].colorAxis.update(dataClasses,false);
    }
    map.redraw();
}