// Google Maps API

// Global Variables
var map;
// Create a new blank array for all the listing markers.
var markers = [];
// This global polygon variable is to ensure only ONE polygon is rendered.
var polygon = null;
// Create placemarkers array to use in multiple functions to have control
// over the number of places that show.
var placeMarkers = [];
// Define drawingManager as a global variable
var drawingManager;

function initMap() {
    // Create a styles array to use with the map.
    var styles = [{
        stylers: [{
            hue: '#2c3e50'
        }, {
            saturation: 250
        }]
    }, {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{
            lightness: 50
        }, {
            visibility: 'simplified'
        }]
    }, {
        featureType: 'road',
        elementType: 'labels',
        stylers: [{
            visibility: 'off'
        }]
    }];

    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 43.803646,
            lng: -79.418942
        },
        zoom: 13,
        styles: styles,
        mapTypeControl: false
    });


    // This autocomplete is for use in the search within time entry box.
    var timeAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById('search-within-time-text'));
    // This autocomplete is for use in the geocoder entry box.
    var zoomAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById('zoom-to-area-text'));
    // Bias the boundaries within the map for the zoom to area text.
    zoomAutocomplete.bindTo('bounds', map);
    // Create a searchbox in order to execute a places search
    var searchBox = new google.maps.places.SearchBox(
        document.getElementById('places-search'));
    // Bias the searchbox to within the bounds of the map.
    searchBox.setBounds(map.getBounds());
    // Initialize the drawing manager.
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_LEFT,
            drawingModes: [
                google.maps.drawing.OverlayType.POLYGON
            ]
        }
    });
    var largeInfowindow = new google.maps.InfoWindow();
    // Style the markers a bit. This will be our listing marker icon.
    var defaultIcon = makeMarkerIcon('0091ff');
    // Create a "highlighted location" marker color for when the user
    // mouses over the marker.
    var highlightedIcon = makeMarkerIcon('12D9E6');
    // The following group uses the location array to create an array of markers on initialize.
    locations.forEach(function(location, i) {
        // Get the position from the location array.
        var position = location.location;
        var title = location.title;
        // Create a marker per location, and put into markers array.
        var marker = new google.maps.Marker({
            position: position,
            title: title,
            animation: google.maps.Animation.DROP,
            icon: defaultIcon,
            id: i,
            map: map
        });
        // Push the marker to our array of markers.
        markers.push(marker);
        // Create an onclick event to open the large infowindow at each marker.
        marker.addListener('click', function() {
            populateInfoWindow(this, largeInfowindow);
        });
        // Two event listeners - one for mouseover, one for mouseout,
        // to change the colors back and forth.
        marker.addListener('mouseover', function() {
            this.setIcon(highlightedIcon);
        });
        marker.addListener('mouseout', function() {
            this.setIcon(defaultIcon);
        });
    });
    // Listen for the event fired when the user selects a prediction from the
    // picklist and retrieve more details for that place.
    searchBox.addListener('places_changed', function() {
        searchBoxPlaces(this);
    });

    drawingManager.addListener('overlaycomplete', function(event) {
        // First, check if there is an existing polygon.
        // If there is, get rid of it and remove the markers
        if (polygon) {
            polygon.setMap(null);
            hideMarkers(markers);
        }
        // Switching the drawing mode to the HAND (i.e., no longer drawing).
        drawingManager.setDrawingMode(null);
        // Creating a new editable polygon from the overlay.
        polygon = event.overlay;
        polygon.setEditable(true);
        // Searching within the polygon.
        searchWithinPolygon(polygon);
        // Make sure the search is re-done if the poly is changed.
        polygon.getPath().addListener('set_at',
            searchWithinPolygon);
        polygon.getPath().addListener('insert_at',
            searchWithinPolygon);
    });
}

// Return a city name that matches a marker id
function getCityName(locations, marker) {
    for (var i = 0, iLen = locations.length; i < iLen; i++) {
        if (locations[i].id == marker.id) return locations[i].city;
    }
}

// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position.
function populateInfoWindow(marker, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        // Clear the infowindow content to give the streetview time to load.
        infowindow.setContent('');
        infowindow.marker = marker;
        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });
        // Set Animation on clicked marker
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            marker.setAnimation(null);
        }, 850);
        var streetViewService = new google.maps.StreetViewService();
        var radius = 50;
        var city = getCityName(locations, marker);
        // API Powered by weatherAPIXU
        var weatherAPIXU = "http://api.apixu.com/v1/current.json?key=453477e8eec14cbc805210143171706&q=" + city;
        // In case the status is OK, which means the pano was found, compute the
        // position of the streetview image, then calculate the heading, then get a
        // panorama from that and set the options
        var getStreetView = function(data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                $.getJSON(weatherAPIXU, function(data) {
                    var forecast = data.current.temp_c;
                    infowindow.setContent('<div>' + marker.title + '<p> The Current Weather is ' + forecast + '° C</p></div><div id="pano"></div>');
                    var panorama = new google.maps.StreetViewPanorama(
                        document.getElementById('pano'),
                        panoramaOptions);
                }).fail(function(e) {
                    infowindow.setContent('<div>' + marker.title + '<font color="red"> Sorry! Could Not Be Loaded</font></p></div><div id="pano"></div>');
                });
                var nearStreetViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(
                    nearStreetViewLocation, marker.position);
                var panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 30
                    }
                };
            } else {
                $.getJSON(weatherAPIXU, function(data) {
                    var forecast = data.current.temp_c;
                    infowindow.setContent('<div>' + marker.title + '<p> The Current Weather is ' + forecast + '° C</p></div><div>No Street View Found</div>');
                }).fail(function(e) {
                    infowindow.setContent('<div>' + marker.title + '<font color="red"> Sorry! Could Not Be Loaded</font></p></div><div id="pano"></div>');
                });

            }
        };
        // Use streetview service to get the closest streetview image within
        // 50 meters of the markers position
        streetViewService.getPanoramaByLocation(marker.position,
            radius, getStreetView);
        // Open the infowindow on the correct marker.
        infowindow.open(map, marker);
    }
}

// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon will be 21 px wide by 34 high, have an origin
// of 0, 0 and be anchored at 10, 34).
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' +
        markerColor +
        '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21, 34));
    return markerImage;
}

// This function hides all markers outside the polygon,
// and shows only the ones within it. This is so that the
// user can specify an exact area of search.
function searchWithinPolygon() {
    for (var i = 0; i < markers.length; i++) {
        if (google.maps.geometry.poly.containsLocation(markers[i].position,
                polygon)) {
            markers[i].setMap(map);
        } else {
            markers[i].setMap(null);
        }
    }
}

// This function fires when the user selects a searchbox picklist item.
// It will do a nearby search using the selected query string or place.
function searchBoxPlaces(searchBox) {
    hideMarkers(placeMarkers);
    var places = searchBox.getPlaces();
    if (places.length === 0) {
        window.alert(
            'We did not find any places matching that search!');
    } else {
        // For each place, get the icon, name and location.
        createMarkersForPlaces(places);
    }
}

// This function creates markers for each place found in either places search.
function createMarkersForPlaces(places) {
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place, i) {
        var icon = {
            url: place.icon,
            size: new google.maps.Size(35, 35),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(15, 34),
            scaledSize: new google.maps.Size(25, 25)
        };
        // Create a marker for each place.
        var marker = new google.maps.Marker({
            map: map,
            icon: icon,
            title: place.name,
            position: place.geometry.location,
            id: place.place_id
        });
        // Create a single infowindow to be used with the place details information
        // so that only one is open at once.
        var placeInfoWindow = new google.maps.InfoWindow();
        // If a marker is clicked, do a place details search on it in the next function.
        marker.addListener('click', function() {
            if (placeInfoWindow.marker == this) {
                console.log(
                    "This infowindow already is on this marker!"
                );
            } else {
                getPlacesDetails(this, placeInfoWindow);
            }
        });
        placeMarkers.push(marker);
        if (place.geometry.viewport) {
            // Only geocodes have viewport.
            bounds.union(place.geometry.viewport);
        } else {
            bounds.extend(place.geometry.location);
        }
    });
    map.fitBounds(bounds);
}
// This is the PLACE DETAILS search - it's the most detailed so it's only
// executed when a marker is selected, indicating the user wants more
// details about that place.
function getPlacesDetails(marker, infowindow) {
    var service = new google.maps.places.PlacesService(map);
    service.getDetails({
        placeId: marker.id
    }, function(place, status) {
        if (status === google.maps.places.PlacesServiceStatus
            .OK) {
            // Set the marker property on this infowindow so it isn't created again.
            infowindow.marker = marker;
            var innerHTML = '<div>';
            if (place.name) {
                innerHTML += '<strong>' + place.name +
                    '</strong>';
            }
            if (place.formatted_address) {
                innerHTML += '<br>' + place.formatted_address;
            }
            if (place.formatted_phone_number) {
                innerHTML += '<br>' + place.formatted_phone_number;
            }
            if (place.opening_hours) {
                innerHTML +=
                    '<br><br><strong>Hours:</strong><br>' +
                    place.opening_hours.weekday_text[0] +
                    '<br>' +
                    place.opening_hours.weekday_text[1] +
                    '<br>' +
                    place.opening_hours.weekday_text[2] +
                    '<br>' +
                    place.opening_hours.weekday_text[3] +
                    '<br>' +
                    place.opening_hours.weekday_text[4] +
                    '<br>' +
                    place.opening_hours.weekday_text[5] +
                    '<br>' +
                    place.opening_hours.weekday_text[6];
            }
            if (place.photos) {
                innerHTML += '<br><br><img src="' + place.photos[
                    0].getUrl({
                    maxHeight: 100,
                    maxWidth: 200
                }) + '">';
            }
            innerHTML += '</div>';
            infowindow.setContent(innerHTML);
            infowindow.open(map, marker);
            // Make sure the marker property is cleared if the infowindow is closed.
            infowindow.addListener('closeclick', function() {
                infowindow.marker = null;
            });
        }
    });
}
// Hide markers as global variable
function hideMarkers() {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
}


// List, Filter and Other Support Functions



// ViewModel - provides list view of places, on click zooms map, shows the marker, infowindow, current weather, etc. It also works with show/hide listings and other functions.
function viewModel() {
    var self = this;
    self.places = ko.observableArray(locations);
    self.address = ko.observable();
    self.title = ko.observable();
    self.id = ko.observable();
    self.markers = ko.observableArray(markers);
    this.zaddress = ko.observable();
    this.taddress = ko.observable();
    this.paddress = ko.observable();
    this.filter = ko.observable();
    //Filters markers from the search field
    this.visiblePlaces = ko.computed(function() {
        return this.places().filter(function(place) {
            var match = !self.filter() || place.title.toLowerCase().indexOf(self.filter().toLowerCase()) !== -1;
            var id = Number(place.id);
            if (markers[id]) {
                markers[id].setVisible(match);
            }
            if (match) {
                return place;
            }
        });
    }, this);
    //Zooms to a selected marker, open infowindow and displays current weather
    self.zoomToPlace = function() {
        // Initialize the geocoder.
        var geocoder = new google.maps.Geocoder();
        // Get the place.
        var address = this.address;
        var id = this.id;
        // Geocode the address/area entered to get the center. Then, center the map on it and zoom in
        geocoder.geocode({
            address: address,
        }, function(results, status) {
            map.setCenter(results[0].geometry.location);
            map.setZoom(15);
            google.maps.event.trigger(markers[id], 'click');
            markers[id].setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(function() {
                markers[id].setAnimation(null);
            }, 850);
        });
    };
    // This function will loop through the markers array and display them all.
    self.showListings = function() {
        var bounds = new google.maps.LatLngBounds();
        // Extend the boundaries of the map for each marker and display the marker
        for (var i = 0; i < markers.length; i++) {
            markers[i].setVisible(true);
            markers[i].setMap(map);
            bounds.extend(markers[i].position);
        }
        map.fitBounds(bounds);
    };
    // This function takes the input value in the find nearby area text input
    // locates it, and then zooms into that area. This is so that the user can
    // show all listings, then decide to focus on one area of the map.
    self.zoomToArea = function() {
        // Initialize the geocoder.
        var geocoder = new google.maps.Geocoder();
        // Get the address or place that the user entered.
        var zaddress = this.zaddress();
        // Make sure the address isn't blank.
        if (zaddress === '') {
            window.alert('You must enter an area, or address.');
        } else {
            // Geocode the address/area entered to get the center. Then, center the map on it and zoom in
            geocoder.geocode({
                address: zaddress,
            }, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    map.setCenter(results[0].geometry.location);
                    map.setZoom(15);
                } else {
                    window.alert(
                        'We could not find that location - try entering a more' +
                        ' specific place.');
                }
            });
        }
    };
    // This function allows the user to input a desired travel time, in
    // minutes, and a travel mode, and a location - and only show the listings
    // that are within that travel time (via that travel mode) of the location
    self.searchWithinTime = function() {
        // Initialize the distance matrix service.
        var distanceMatrixService = new google.maps.DistanceMatrixService();
        var taddress = this.taddress();
        // Check to make sure the place entered isn't blank.
        if (taddress === '') {
            window.alert('You must enter an address.');
        } else {
            hideMarkers(markers);
            // Use the distance matrix service to calculate the duration of the
            // routes between all our markers, and the destination address entered
            // by the user. Then put all the origins into an origin matrix.
            var origins = [];
            for (var i = 0; i < markers.length; i++) {
                origins[i] = markers[i].position;
            }
            var destination = taddress;
            var mode = document.getElementById('mode').value;
            // Now that both the origins and destination are defined, get all the
            // info for the distances between them.
            distanceMatrixService.getDistanceMatrix({
                origins: origins,
                destinations: [destination],
                travelMode: google.maps.TravelMode[mode],
                unitSystem: google.maps.UnitSystem.IMPERIAL,
            }, function(response, status) {
                if (status !== google.maps.DistanceMatrixStatus
                    .OK) {
                    window.alert('Error was: ' + status);
                } else {
                    displayMarkersWithinTime(response);
                }
            });
        }
    };
    // This function fires when the user select "go" on the places search.
    // It will do a nearby search using the entered query string or place.
    self.textSearchPlaces = function() {
        var bounds = map.getBounds();
        var place = this.paddress();
        hideMarkers(placeMarkers);
        var placesService = new google.maps.places.PlacesService(map);
        placesService.textSearch({
            query: place,
            bounds: bounds
        }, function(results, status) {
            if (status === google.maps.places.PlacesServiceStatus
                .OK) {
                createMarkersForPlaces(results);
            }
        });
    };
    // This function will loop through the listings and hide them all.
    self.hideMarkers = function() {
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
    };
    // This shows and hides (respectively) the drawing options.
    toggleDrawing = function() {
        if (drawingManager.map) {
            drawingManager.setMap(null);
            // In case the user drew anything, get rid of the polygon
            if (polygon !== null) {
                polygon.setMap(null);
            }
        } else {
            drawingManager.setMap(map);
        }
    };
    // Shows and Hides instrument pannel
    self.showandhide = function() {
        var x = document.getElementById('myDIV');
        if (x.style.display === 'none') {
            x.style.display = 'block';
        } else {
            x.style.display = 'none';
        }
    };
}
var vm = new viewModel();
ko.applyBindings(vm);


//Error Handlers

function googleError() {
    alert("Google Maps has failed to load. Please check your internet connection and try again.");
}
