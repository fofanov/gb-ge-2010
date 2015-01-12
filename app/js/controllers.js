// Get the full constituency name
function getConstituency(name) {
    switch(name) {
        case "C":
            return "Conservative Party";
        case "Lab":
        case "Lab Co-op":
            return "Labour Party";
        case "LD":
            return "Liberal Democrats";
        case "Green":
            return "Green Party";
        case "SNP":
            return "Scottish National Party";
        case "PC":
            return "Plaid Cymru";
        case "Speaker":
            return "Speaker";
        default:
            return "Unknown";
    }
}

// Function to read the csv and when complete proccess the constituencies
function readCSV() {
    // Function to process CSV file
    var processCSVData = function(dT) {
        return function(items, request) {
        
            // Loop goes through each item in the csv file to find it's attributes and stores them 
            for (var i = 0; i < items.length; i++) {
            
                var item = items[i];
                var row = {};
                var attrs = store.getAttributes(item);
                
                for (var key in attrs) {
                    
                    var value = store.getValue(item, attrs[key]);
                    
                    if (OpenLayers.String.isNumeric(value)) {
                        value = parseFloat(value);
                    }
                    row[attrs[key]] = value;
                    
                }

                // Add the MAJ and TURN value to represent the strength of the 
                // party majorities and voter turnout.  
                // Here we try to capture the strenghth of the majority and
                // turnout so that they can be displayed on the map in 10
                // discrete bands.
                row[majorityKey] = Math.ceil(row["MAJORITY"]  / 6.0);
                row[turnoutKey] = Math.ceil((row["TURNOUT"] - 45.0)  / 4.0);
                dT[store.getValue(item, primaryKey)] = row;
                
            }
        }
    }

    var dataTable = {};
    var store = new dojox.data.CsvStore({url: "data/general_election_2010_openspace.csv", label: primaryKey});
    store.fetch({onComplete: processCSVData(dataTable)});
    return dataTable;
}


// Function to then create the constituency boundary layer
function createBoundaryLayer(context) {
    var defaultStyle = new OpenLayers.Style({fillOpacity: 1, fillColor: "black", strokeColor: "black"});
    var selectStyle = new OpenLayers.Style({strokeColor: "white", graphicZIndex: 100, cursor: "pointer"});
    
    // Add the style rules
    var codeToColourStyle = {
        "C" : {fillColor: "blue"},
        "Lab" : {fillColor: "red"},
        "Lab Co-op" : {fillColor: "red"},
        "LD" : {fillColor: "orange"},
        "Green" : {fillColor: "green"},
        "PC" : {fillColor: "darkgreen"},
        "SNP" : {fillColor: "yellow"},
        "Speaker" : {fillColor: "gray"},
        "TURNOUT" : {fillColor: "black"},
    }

    var codeToIntensityStyle = {
        0 : {fillOpacity: 0.1},
        1 : {fillOpacity: 0.2},
        2 : {fillOpacity: 0.3},
        3 : {fillOpacity: 0.4},
        4 : {fillOpacity: 0.5},
        5 : {fillOpacity: 0.6},
        6 : {fillOpacity: 0.7},
        7 : {fillOpacity: 0.8},
        8 : {fillOpacity: 0.9},
        9 : {fillOpacity: 1},
        10 : {fillOpacity: 1}
    }
    
    var styleMap = new OpenLayers.StyleMap({"default" : defaultStyle,
                                            "select": selectStyle});

    styleMap.addUniqueValueRules("default", colourKey, codeToColourStyle, context);
    styleMap.addUniqueValueRules("default", intensityKey, codeToIntensityStyle, context);
   
    // Finally create the boundary layer with the style map   
    var boundaryLayer = new OpenSpace.Layer.Boundary("Boundaries", {
        rendererOptions: { zIndexing: true }, 
        strategies: [new OpenSpace.Strategy.BBOX()],
        area_code: ["WMC"],
        styleMap: styleMap});
    
    return boundaryLayer;

}

var westminsterControllers = angular.module('westminsterControllers', []);
var primaryKey = "ADMIN_UNIT_ID";
var intensityKey = "INTENSITY";
var colourKey = "COLOUR";
var partyKey = "PARTY";
var majorityKey = "MAJ";
var turnoutKey = "TURN";
var londonEastings = 530567
var londonNorthings = 181408
var minZoomLevel = 3;

westminsterControllers.controller('MapCtrl', function ($scope) {
    var boundaryLayer = null;
    $scope.constituency = null;
    $scope.visualisationModel = 'majority';
    $scope.$watch('visualisationModel', function() {
        if (boundaryLayer) {
            boundaryLayer.redraw();
        }
    });
    $scope.constituencyCodeToName = getConstituency;
    $scope.initMap = function() {
        
        // Create new map
        var osMap = new OpenSpace.Map('map');
        
        var dataTable = readCSV();

        var context = function(feature) {
            var key = feature.attributes[primaryKey];

            var value = dataTable[key];
            if ($scope.visualisationModel == 'majority') {
                value[colourKey] = value[partyKey];
                value[intensityKey] = value[majorityKey];
            } else {
                value[colourKey] = "TURNOUT";
                value[intensityKey] = value[turnoutKey];
            }
            return value;
        };
        
        // Add boundary layer via function below
        boundaryLayer = createBoundaryLayer(context);
        osMap.addLayer(boundaryLayer);

        // This function is called when a boundary is selected by hovering over it with the mouse
        var onFeatureHover = function(feature) {
        
            // When the feature (i.e. the boundary) is selected, get the constituency data of from the dataTable
            // and insert into the scope.
            var key = feature.attributes[primaryKey];
            var value = dataTable[key]; 
            $scope.$apply(function() {
                $scope.constituency = value;
            });
            
        }

        var offFeatureHover = function(feature) {
        
            // When move outside of the feature (boundary), remove the constituency data
            // from the scope.
            $scope.$apply(function() {
                $scope.constituency = null;
            });
        }

        var hoverControl = new OpenLayers.Control.SelectFeature(boundaryLayer,
            {hover:true, onSelect: onFeatureHover, onUnselect: offFeatureHover});

        // Maintain map draggability with selectFeature enabled
        // See http://trac.osgeo.org/openlayers/wiki/SelectFeatureControlMapDragIssues
        if (typeof(hoverControl.handlers) != "undefined") { // OL 2.7
            hoverControl.handlers.feature.stopDown = false;
        } else if (typeof(hoverControl.handler) != "undefined") { // OL < 2.7
            hoverControl.handler.stopDown = false; 
            hoverControl.handler.stopUp = false; 
        }

        // Add hover control to map
        osMap.addControl(hoverControl);
        hoverControl.activate();
        
        // Set map centre to be London select zoom level 3
        osMap.setCenter(new OpenSpace.MapPoint(londonEastings, londonNorthings), minZoomLevel);
    }
});
