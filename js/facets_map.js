/**
 * @file
 * Provides the faceted map functionality.
 */
(function ($, Drupal) {

    Drupal.facets = Drupal.facets || {};

    Drupal.behaviors.mapFacets = {
        attach: function (context, settings) {

            L.SolrHeatmap = L.GeoJSON.extend({
                options: {
                    type: 'geojsonGrid',
                    colors: ['#f1eef6', '#d7b5d8', '#df65b0', '#dd1c77', '#980043'],
                    maxSampleSize: Number.MAX_SAFE_INTEGER  // for Jenks classification
                },
                settings: NULL,

                initialize: function(options, settings) {
                    var _this = this;
                    options = L.setOptions(_this, options);
                    _this._layers = {};
                    _this._getData();
                    _this.settings = settings;

                },

                onAdd: function (map) {
                    var _this = this;
                    // Call the parent function
                    L.GeoJSON.prototype.onAdd.call(_this, map);

                    map.on('moveend', function () {
                        _this._clearLayers();
                        window.location.href = _this.settings.url.replace('__GEOM__', _this._mapViewToWkt());
                        _this._getData();
                    });
                },

                _computeHeatmapObject: function() {
                    var _this = this;
                    _this.facetHeatmap = {},

                        //facetHeatmapArray = ["gridLevel", 2, "columns", 32, "rows", 32, "minX", -180, "maxX", 180, "minY", -90, "maxY", 90, "counts_ints2D",[null,null,null,null,null,null,null,null,null,null,[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0],null,[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,0,0,0,0],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]];
                        facetHeatmapArray= JSON.parse(drupalSettings.facets.map.results);
                    // Convert array to an object
                    $.each(facetHeatmapArray, function(index, value) {
                        if ((index + 1) % 2 !== 0) {
                            // Set object keys for even items
                            _this.facetHeatmap[value] = '';
                        }else {
                            // Set object values for odd items
                            _this.facetHeatmap[facetHeatmapArray[index - 1]] = value;
                        }
                    });

                    this._computeIntArrays();

                },

                _clearLayers: function() {
                    var _this = this;

                    switch (_this.options.type) {
                        case 'geojsonGrid':
                            _this.clearLayers();
                            break;
                        case 'clusters':
                            _this.clusterMarkers.clearLayers();
                            break;
                        case 'heatmap':
                            _this._map.removeLayer(_this.heatmapLayer);
                            break;
                    }
                },

                _createGeojson: function() {
                    var _this = this;
                    var geojson = {};

                    geojson.type = 'FeatureCollection';
                    geojson.features = [];

                    $.each(_this.facetHeatmap.counts_ints2D, function(row, value) {
                        if (value === null) {
                            return;
                        }

                        $.each(value, function(column, val) {
                            if (val === 0) {
                                return;
                            }

                            var newFeature = {
                                type: 'Feature',
                                geometry: {
                                    type: 'Polygon',
                                    coordinates: [
                                        [
                                            [_this._minLng(column), _this._minLat(row)],
                                            [_this._minLng(column), _this._maxLat(row)],
                                            [_this._maxLng(column), _this._maxLat(row)],
                                            [_this._maxLng(column), _this._minLat(row)],
                                            [_this._minLng(column), _this._minLat(row)]
                                        ]
                                    ]
                                },
                                properties: {
                                    count: val
                                }
                            };
                            geojson.features.push(newFeature);
                        });
                    });

                    _this.addData(geojson);
                    var colors = _this.options.colors;
                    var classifications = _this._getClassifications(colors.length);
                    _this._styleByCount(classifications);
                },

                _createHeatmap: function(){
                    var _this = this;
                    var heatmapCells = [];
                    var cellSize = _this._getCellSize() * .75;
                    var colors = _this.options.colors;
                    var classifications = _this._getClassifications(colors.length - 1);
                    var maxValue = classifications[classifications.length - 1];
                    var gradient = _this._getGradient(classifications);

                    $.each(_this.facetHeatmap.counts_ints2D, function(row, value) {
                        if (value === null) {
                            return;
                        }

                        $.each(value, function(column, val) {
                            if (val === 0) {
                                return;
                            }
                            var scaledValue = Math.min((val / maxValue), 1);
                            var current = [_this._minLat(row), _this._minLng(column), scaledValue];
                            heatmapCells.push(current);
                            // need to create options object to set gradient, blu, radius, max
                        })
                    });

                    // settting max due to bug
                    // http://stackoverflow.com/questions/26767722/leaflet-heat-issue-with-adding-points-with-intensity
                    var options = {max: .0001, radius: cellSize, gradient: gradient};
                    var heatmapLayer = L.heatLayer(heatmapCells, options);
                    heatmapLayer.addTo(_this._map);
                    _this.heatmapLayer = heatmapLayer;
                },

                // heatmap display need hash of scaled counts value, color pairs
                _getGradient: function (classifications){
                    var gradient = {};
                    var maxValue = classifications[classifications.length - 1];
                    var colors = _this.options.colors;
                    // skip first lower bound, assumed to be 0 from Jenks
                    for (var i = 1 ; i < classifications.length ; i++)
                        gradient[classifications[i] / maxValue] = colors[i];
                    return gradient;
                },

                // compute size of heatmap cells in pixels
                _getCellSize: function(){
                    _this = this;
                    var mapSize = _this._map.getSize();  // should't we use solr returned map extent?
                    var widthInPixels = mapSize.x;
                    var heightInPixels = mapSize.y;
                    var heatmapRows = _this.facetHeatmap.rows;
                    var heatmapColumns = _this.facetHeatmap.columns;
                    var sizeX = widthInPixels / heatmapColumns;
                    var sizeY = heightInPixels / heatmapRows;
                    var size = Math.ceil(Math.max(sizeX, sizeY));
                    return size;
                },

                _setRenderTime: function() {
                    var _this = this;
                    _this.renderTime = (Date.now() - _this.renderStart);
                },

                _createClusters: function() {
                    var _this = this;

                    _this.clusterMarkers = new L.MarkerClusterGroup({
                        maxClusterRadius: 140
                    });

                    $.each(_this.facetHeatmap.counts_ints2D, function(row, value) {
                        if (value === null) {
                            return;
                        }

                        $.each(value, function(column, val) {
                            if (val === 0) {
                                return;
                            }

                            var bounds = new L.latLngBounds([
                                [_this._minLat(row), _this._minLng(column)],
                                [_this._maxLat(row), _this._maxLng(column)]
                            ]);
                            _this.clusterMarkers.addLayer(new L.Marker(bounds.getCenter(), {
                                count: val
                            }).bindPopup(val.toString()));
                        });
                    });
                    _this._map.addLayer(_this.clusterMarkers);
                },

                _computeIntArrays: function() {
                    var _this = this;

                    _this.lengthX = (_this.facetHeatmap.maxX - _this.facetHeatmap.minX) / _this.facetHeatmap.columns;
                    _this.lengthY = (_this.facetHeatmap.maxY - _this.facetHeatmap.minY) / _this.facetHeatmap.rows;

                    switch (_this.options.type) {
                        case 'geojsonGrid':
                            _this._createGeojson();
                            break;
                        case 'clusters':
                            _this._createClusters();
                            break;
                        case 'heatmap':
                            _this._createHeatmap();
                            break;
                    }
                    _this._setRenderTime();
                },

                _getClassifications: function(howMany)
                {
                    var _this = this;
                    var one_d_array = [];
                    for(var i = 0; i < _this.facetHeatmap.counts_ints2D.length; i++) {
                        if (_this.facetHeatmap.counts_ints2D[i] != null) {
                            one_d_array = one_d_array.concat(_this.facetHeatmap.counts_ints2D[i]);
                        }
                    }
                    var sampled_array = _this._sampleCounts(one_d_array);

                    var series = new geostats(sampled_array);
                    var scale = _this.options.colors;
                    var classifications = series.getClassJenks(howMany);
                    return classifications;
                },

                _styleByCount: function(classifications) {
                    var _this = this;
                    var scale = _this.options.colors;

                    _this.eachLayer(function(layer) {
                        var color;
                        $.each(classifications, function(i, val) {
                            if (layer.feature.properties.count >= val) {
                                color = scale[i];
                            }
                        });
                        layer.setStyle({
                            fillColor: color,
                            fillOpacity: 0.5,
                            weight: 0
                        });
                    });
                },

                // Jenks classification can be slow so we optionally sample the data
                // typically any big sample of counts are much the same, don't need to classify on all of them
                _sampleCounts: function(passedArray) {
                    var _this = this;
                    if (passedArray.length <= _this.options.maxSampleSize) {
                        return passedArray;   // array too small to sample
                    };

                    var maxValue = Math.max.apply(Math, passedArray);
                    var sampledArray = [];
                    var period = Math.ceil(passedArray.length / _this.options.maxSampleSize);
                    for (i = 0 ; i < passedArray.length ; i = i + period) {
                        sampledArray.push(passedArray[i]);
                    }

                    sampledArray.push(maxValue);  // make sure largest value gets in, doesn't matter much if duplicated
                    return sampledArray
                },

                _minLng: function(column) {
                    return this.facetHeatmap.minX + (this.lengthX * column);
                },

                _minLat: function(row) {
                    return this.facetHeatmap.maxY - (this.lengthY * row) - this.lengthY;
                },

                _maxLng: function(column) {
                    return this.facetHeatmap.minX + (this.lengthX * column) + this.lengthX;
                },

                _maxLat: function(row) {
                    return this.facetHeatmap.maxY - (this.lengthY * row);
                },

                _getData: function() {

                    var _this = this;
                    _this._computeHeatmapObject();

                },

                _mapViewToEnvelope: function() {
                    if (this._map === undefined) {
                        return ':"Intersects(ENVELOPE(-180, 180, 90, -90))"';
                    }
                    var bounds = this._map.getBounds();
                    var wrappedSw = bounds.getSouthWest().wrap();
                    var wrappedNe = bounds.getNorthEast().wrap();
                    return ':"Intersects(ENVELOPE(' + wrappedSw.lng + ', ' + wrappedNe.lng + ', ' + bounds.getNorth() + ', ' + bounds.getSouth() + '))"';
                },

                _mapViewToWkt: function() {
                    if (this._map === undefined) {
                        return '["-180 -90" TO "180 90"]';
                    }
                    var bounds = this._map.getBounds();
                    var wrappedSw = bounds.getSouthWest().wrap();
                    var wrappedNe = bounds.getNorthEast().wrap();
                    return '["' + wrappedSw.lng + ' ' + bounds.getSouth() + '" TO "' + wrappedNe.lng + ' ' + bounds.getNorth() + '"]';
                }


            });

            L.solrHeatmap = function(options) {
                return new L.SolrHeatmap(options, settings);
            };

// Check if L.MarkerCluster is included
            if (typeof L.MarkerCluster !== 'undefined') {
                L.MarkerCluster.prototype.initialize = function(group, zoom, a, b) {

                    L.Marker.prototype.initialize.call(this, a ? (a._cLatLng || a.getLatLng()) : new L.LatLng(0, 0), { icon: this });

                    this._group = group;
                    this._zoom = zoom;

                    this._markers = [];
                    this._childClusters = [];
                    this._childCount = 0;
                    this._iconNeedsUpdate = true;

                    this._bounds = new L.LatLngBounds();

                    if (a) {
                        this._addChild(a);
                    }
                    if (b) {
                        this._addChild(b);
                        this._childCount = b.options.count;
                    }
                };
            }




            //Add a leaflet map
            var map = L.map(drupalSettings.facets.map.id).setView([0, 0], 1);
            var layer = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
            }).addTo(map);

            function onEachFeature(feature, layer) {
                var count = feature.properties.count.toLocaleString();
                layer.bindPopup(count);
            }

            //Add a solr heatmap layer to the map
            var solr = L.solrHeatmap({type:'geojsonGrid', onEachFeature: onEachFeature}).addTo(map);

        }
    };


})(jQuery, Drupal);
