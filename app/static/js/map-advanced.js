// Advanced Map Layer Manager for AgroSmart - Windy UI Edition
window.AgroMapAdvanced = {
    layers: {},
    activeLayerId: null, // Track currently active layer (Windy style usually allows one active, but we can allow multiple if we want. Let's allow multiple for power users).
    usgsDataSource: null,
    streetViewActive: false,
    streetViewHandler: null,

    init: function(viewer) {
        this.viewer = viewer;
        this.setupEventListeners();
        this.initStreetViewTool();
    },

    setupEventListeners: function() {
        const buttons = document.querySelectorAll('.windy-layer-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const layerId = btn.dataset.layer;
                
                // Toggle active state
                const isActive = btn.classList.contains('active');
                if (isActive) {
                    btn.classList.remove('active');
                    this.disableLayer(layerId);
                    this.updateOpacityControlVisibility();
                } else {
                    btn.classList.add('active');
                    await this.enableLayer(layerId);
                    this.updateOpacityControlVisibility();
                }
            });
        });

        const globalSlider = document.getElementById('windy-layer-opacity');
        if (globalSlider) {
            globalSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                // Apply opacity to all active layers except Earthquakes (which is a GeoJsonDataSource)
                Object.keys(this.layers).forEach(id => {
                    if (this.layers[id] && id !== 'earthquakes') {
                        this.layers[id].alpha = val;
                    }
                });
            });
        }
    },

    updateOpacityControlVisibility: function() {
        // Show opacity slider if at least one layer is active
        const hasActiveLayers = document.querySelectorAll('.windy-layer-btn.active').length > 0;
        const opContainer = document.getElementById('windy-opacity-container');
        if (opContainer) {
            if (hasActiveLayers) {
                opContainer.classList.add('active');
            } else {
                opContainer.classList.remove('active');
            }
        }
    },

    enableLayer: async function(id) {
        try {
            switch(id) {
                case 'radar':
                case 'precip':
                    await this.loadRainViewer(id);
                    break;
                case 'clouds':
                    this.loadOWM('clouds_new', id);
                    break;
                case 'earthquakes':
                    await this.loadUSGS();
                    break;
                case 'ndvi':
                    this.loadNASA('MODIS_Terra_NDVI_8Day', id);
                    break;
                case 'soil':
                    this.loadNASA('SMAP_L4_Volumetric_Soil_Moisture_Top_Layer', id);
                    break;
                case 'temp':
                    this.loadNASA('MODIS_Terra_Land_Surface_Temp_Day', id, 3);
                    break;
                case 'uv':
                    // Used to visualize El Niño and heat (Sea Surface Temperature)
                    this.loadNASA('GHRSST_L4_MUR_Sea_Surface_Temperature', id, 4);
                    break;
                case 'snow':
                    this.loadNASA('MODIS_Terra_NDSI_Snow_Cover', id);
                    break;
                case 'fires':
                    this.loadNASA('MODIS_Terra_Thermal_Anomalies_All', id);
                    break;
                case 'co':
                    this.loadNASA('MOPITT_CO_Daily_Column', id, 3);
                    break;
                case 'so2':
                    this.loadNASA('Aura_OMI_SO2_PBL', id);
                    break;
                case 'dust':
                    this.loadNASA('SNPP_OMPS_Aerosol_Index', id);
                    break;
                case 'ozone':
                    this.loadNASA('Aura_OMI_Ozone', id, 3);
                    break;
                case 'topo':
                    this.loadTopo();
                    break;
            }
        } catch (e) {
            // Silenciado console.error para mantener la consola 100% limpia
            if(window.Swal) Swal.fire({toast: true, position: 'top-end', icon: 'error', title: 'Aviso del Satélite', text: 'No se pudo cargar la capa: ' + id + '. Intente más tarde.', showConfirmButton: false, timer: 3000});
            // Disable button if failed
            const btn = document.querySelector(`.windy-layer-btn[data-layer="${id}"]`);
            if (btn) btn.classList.remove('active');
            this.updateOpacityControlVisibility();
        }
    },

    disableLayer: function(id) {
        if (id === 'earthquakes') {
            if (this.usgsDataSource) {
                this.viewer.dataSources.remove(this.usgsDataSource);
                this.usgsDataSource = null;
            }
            return;
        }

        if (this.layers[id]) {
            this.viewer.imageryLayers.remove(this.layers[id]);
            delete this.layers[id];
        }
    },

    loadRainViewer: async function(id) {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!res.ok) throw new Error("RainViewer API error");
        const data = await res.json();
        
        // Verificar si el usuario desactivó el botón mientras cargaba
        const btn = document.querySelector(`.windy-layer-btn[data-layer="${id}"]`);
        if (btn && !btn.classList.contains('active')) return;

        const latestPath = data.radar.past[data.radar.past.length - 1].path;
        
        // Color scheme 2 is good for radar, 1 is good for precip
        const color = id === 'precip' ? '1' : '2';

        const provider = new Cesium.UrlTemplateImageryProvider({
            url: `https://tilecache.rainviewer.com${latestPath}/256/{z}/{x}/{y}/${color}/1_1.png`,
            credit: 'RainViewer',
            maximumLevel: 8
        });
        
        const layer = this.viewer.imageryLayers.addImageryProvider(provider);
        const slider = document.getElementById('windy-layer-opacity');
        if (slider) layer.alpha = parseFloat(slider.value);
        this.layers[id] = layer;
    },

    loadUSGS: async function() {
        const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
        if (!res.ok) throw new Error("USGS API error");
        const data = await res.json();
        
        // Verificar si el usuario desactivó el botón mientras cargaba
        const btn = document.querySelector(`.windy-layer-btn[data-layer="earthquakes"]`);
        if (btn && !btn.classList.contains('active')) return;
        
        const ds = await Cesium.GeoJsonDataSource.load(data, {
            markerSize: 24,
            markerSymbol: 'm',
            stroke: Cesium.Color.RED,
            fill: Cesium.Color.RED.withAlpha(0.5)
        });

        const entities = ds.entities.values;
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            const mag = entity.properties.mag ? entity.properties.mag.getValue() : 0;
            let color = Cesium.Color.YELLOW;
            if (mag > 4) color = Cesium.Color.ORANGE;
            if (mag > 6) color = Cesium.Color.RED;

            entity.point = new Cesium.PointGraphics({
                color: color.withAlpha(0.8),
                pixelSize: mag * 6,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 1
            });
            entity.billboard = undefined;
            entity.description = `Magnitud: ${mag}<br>Lugar: ${entity.properties.place}`;
        }

        this.viewer.dataSources.add(ds);
        this.usgsDataSource = ds;
        this.layers['earthquakes'] = ds; // Track as active layer internally
    },

    loadNASA: function(nasaLayerName, id, daysDelay = 2) {
        const d = new Date();
        d.setDate(d.getDate() - daysDelay); // Restar días para asegurar que el satélite ya procesó la imagen
        const timeStr = d.toISOString().split('T')[0];

        const provider = new Cesium.WebMapServiceImageryProvider({
            url: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi',
            layers: nasaLayerName,
            parameters: {
                transparent: 'true',
                format: 'image/png',
                time: timeStr
            },
            tilingScheme: new Cesium.GeographicTilingScheme(), // CRUCIAL: Previene errores 400 de NASA GIBS
            credit: 'NASA GIBS',
            maximumLevel: 8
        });
        
        const layer = this.viewer.imageryLayers.addImageryProvider(provider);
        const slider = document.getElementById('windy-layer-opacity');
        if (slider) layer.alpha = parseFloat(slider.value);
        
        this.layers[id] = layer;
    },

    loadOWM: function(layerName, id) {
        if (!CONFIG.OPENWEATHERMAP_API_KEY) {
            throw new Error("No OWM API key");
        }
        const provider = new Cesium.UrlTemplateImageryProvider({
            url: `https://tile.openweathermap.org/map/${layerName}/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHERMAP_API_KEY}`,
            credit: 'OpenWeatherMap',
            maximumLevel: 10
        });
        const layer = this.viewer.imageryLayers.addImageryProvider(provider);
        const slider = document.getElementById('windy-layer-opacity');
        if (slider) layer.alpha = parseFloat(slider.value);
        this.layers[id] = layer;
    },

    loadTopo: function() {
        const provider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            credit: 'OpenTopoMap',
            subdomains: ['a', 'b', 'c'],
            maximumLevel: 17
        });
        const layer = this.viewer.imageryLayers.addImageryProvider(provider);
        const slider = document.getElementById('windy-layer-opacity');
        if (slider) layer.alpha = parseFloat(slider.value);
        this.layers['topo'] = layer;
    },

    // --- STREET VIEW LOGIC ---
    initStreetViewTool: function() {
        const btn = document.getElementById('btn-street-view');
        if (!btn) return;

        btn.addEventListener('click', () => {
            this.streetViewActive = !this.streetViewActive;
            
            if (this.streetViewActive) {
                btn.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.8)';
                document.getElementById('weather-map').style.cursor = 'crosshair';
                
                if (!this.streetViewHandler) {
                    this.streetViewHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
                    this.streetViewHandler.setInputAction((click) => this.handleStreetViewClick(click), Cesium.ScreenSpaceEventType.LEFT_CLICK);
                }
                if(window.Swal) Swal.fire({toast:true, position:'top-end', icon:'info', title:'Modo Inmersivo', text:'Haz clic en el mapa para bajar a nivel de calle.', showConfirmButton:false, timer:4000});
            } else {
                this.deactivateStreetView(btn);
            }
        });
    },

    deactivateStreetView: function(btn) {
        this.streetViewActive = false;
        if(btn) {
            btn.style.boxShadow = 'none';
        }
        document.getElementById('weather-map').style.cursor = 'default';
        if (this.streetViewHandler) {
            this.streetViewHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
            this.streetViewHandler.destroy();
            this.streetViewHandler = null;
        }
    },

    handleStreetViewClick: function(click) {
        const cartesian = this.viewer.scene.pickPosition(click.position) || this.viewer.camera.pickEllipsoid(click.position, this.viewer.scene.globe.ellipsoid);
        if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);

            if(window.Swal) {
                Swal.fire({
                    title: '🛰️ Street View Activo',
                    text: 'Elige cómo visualizar esta zona',
                    showCancelButton: true,
                    showDenyButton: true,
                    confirmButtonText: '<i class="bi bi-google"></i> Vista 360° Real',
                    denyButtonText: '<i class="bi bi-globe-americas"></i> Bajar Cámara 3D',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#4285F4',
                    denyButtonColor: '#10b981'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.open(`https://www.google.com/maps?layer=c&cbll=${lat},${lon}`, '_blank');
                    } else if (result.isDenied) {
                        this.viewer.camera.flyTo({
                            destination: Cesium.Cartesian3.fromDegrees(lon, lat, 150.0),
                            orientation: {
                                heading: Cesium.Math.toRadians(0.0),
                                pitch: Cesium.Math.toRadians(-20.0),
                                roll: 0.0
                            },
                            duration: 2.5
                        });
                    }
                });
            }
            this.deactivateStreetView(document.getElementById('btn-street-view'));
        }
    }
};
