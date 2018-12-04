/**
 * Lovelace Custom Card for multiple sensor/entity charts
 * @author Fredrik Grääs
 */
class SensorGraphs extends HTMLElement {

    set hass(hass) {

        this._hass = hass;

        if( !this.loading ) {
            
            /**
             * Only run this the first time we load the card,
             * otherwise do the updating in the ELSE below.
             */
            if (!this.content) {
                
                const card = document.createElement('ha-card');
                const style = document.createElement('style');
                
                /**
                 * I had trouble loading the c3.min.css - file, so for now I'll just put this here..
                 */
                style.innerHTML = `
                    .c3 svg{font:10px sans-serif;-webkit-tap-highlight-color:transparent}.c3 line,.c3 path{fill:none;stroke:#000}.c3 text{-webkit-user-select:none;-moz-user-select:none;user-select:none}.c3-bars path,.c3-event-rect,.c3-legend-item-tile,.c3-xgrid-focus,.c3-ygrid{shape-rendering:crispEdges}.c3-chart-arc path{stroke:#fff}.c3-chart-arc rect{stroke:#fff;stroke-width:1}.c3-chart-arc text{fill:#fff;font-size:13px}.c3-grid line{stroke:#aaa}.c3-grid text{fill:#aaa}.c3-xgrid,.c3-ygrid{stroke-dasharray:3 3}.c3-text.c3-empty{fill:grey;font-size:2em}.c3-line{stroke-width:1px}.c3-circle._expanded_{stroke-width:1px;stroke:#fff}.c3-selected-circle{fill:#fff;stroke-width:2px}.c3-bar{stroke-width:0}.c3-bar._expanded_{fill-opacity:1;fill-opacity:.75}.c3-target.c3-focused{opacity:1}.c3-target.c3-focused path.c3-line,.c3-target.c3-focused path.c3-step{stroke-width:2px}.c3-target.c3-defocused{opacity:.3!important}.c3-region{fill:#4682b4;fill-opacity:.1}.c3-brush .extent{fill-opacity:.1}.c3-legend-item{font-size:12px}.c3-legend-item-hidden{opacity:.15}.c3-legend-background{opacity:.75;fill:#fff;stroke:#d3d3d3;stroke-width:1}.c3-title{font:14px sans-serif}.c3-tooltip-container{z-index:10}.c3-tooltip{border-collapse:collapse;border-spacing:0;background-color:#fff;empty-cells:show;-webkit-box-shadow:7px 7px 12px -9px #777;-moz-box-shadow:7px 7px 12px -9px #777;box-shadow:7px 7px 12px -9px #777;opacity:.9}.c3-tooltip tr{border:1px solid #ccc}.c3-tooltip th{background-color:#aaa;font-size:14px;padding:2px 5px;text-align:left;color:#fff}.c3-tooltip td{font-size:13px;padding:3px 6px;background-color:#fff;border-left:1px dotted #999}.c3-tooltip td>span{display:inline-block;width:10px;height:10px;margin-right:6px}.c3-tooltip td.value{text-align:right}.c3-area{stroke-width:0;opacity:.2}.c3-chart-arcs-title{dominant-baseline:middle;font-size:1.3em}.c3-chart-arcs .c3-chart-arcs-background{fill:#e0e0e0;stroke:#fff}.c3-chart-arcs .c3-chart-arcs-gauge-unit{fill:#000;font-size:16px}.c3-chart-arcs .c3-chart-arcs-gauge-max{fill:#777}.c3-chart-arcs .c3-chart-arcs-gauge-min{fill:#777}.c3-chart-arc .c3-gauge-value{fill:#000}.c3-chart-arc.c3-target g path{opacity:1}.c3-chart-arc.c3-target.c3-focused g path{opacity:1}.c3-drag-zoom.enabled{pointer-events:all!important;visibility:visible}.c3-drag-zoom.disabled{pointer-events:none!important;visibility:hidden}.c3-drag-zoom .extent{fill-opacity:.1}
                    .c3-line {
                        stroke-width: 3px
                    }

                    #chart {
                        width: 100%
                    }
                `;

                this.content = document.createElement('div');

                this.content.style.padding = '16px 0';
                this.content.id = 'chart';

                card.appendChild(style);
                card.appendChild(this.content);
                this.appendChild(card);

                this.loading = true;
                this.init();
            }
            /**
             * Already initilized the graph, but HASS has given us new state.
             * We´ll need to parse through it to see if our entities have changed, and if enough time has passed to update the graph
             */
            else {
                var entityStates = {};

                for( var e = 0; e < this.entity_ids.length; e++ ) {
                    let entity_id = this.entity_ids[ e ];

                    for( var state_entity in hass.states ) {
                        if( state_entity == entity_id ) {
                            
                            let oldEntityState = this.historyDataObj[ entity_id ];
                            let lastChanged  = moment( oldEntityState[ oldEntityState.length - 1 ].last_changed );
                            let newStateChanged = moment( hass.states[ state_entity ].last_changed );

                            // Has an hour passed?
                            if( lastChanged.diff( newStateChanged, 'hours' ) >= 1 ) {
                                // Add to updated entities array
                            }
                        }
                    }
                }

                //this.update();
            }
        }
        else {
            // Already Loading!
        }
    }

    /**
     * Helper to load and append scripts to the head
     * @param  {String}   url
     * @param  {Function} callback
     * @return {Void}
     */
    loadScript(url,callback){
        let script = document.createElement('script');

        script.onload = function()  {
            if (callback) { 
                callback();
            }
        };
        script.src = url;
        document.getElementsByTagName('head')[0].appendChild(script);
    }

    /**
     * Initialize
     * @return {Void}
     */
    init() {

        console.log( 'init' );

        this.loadScript("/local/sensor-graphs/moment.min.js", () => {
            this.loadScript("/local/sensor-graphs/d3.v5.min.js", () => {
                this.loadScript("/local/sensor-graphs/c3.min.js", () => {
                
                    console.log( 'Scripts Loaded!' );
                    
                    this.getHistory();
                });
            });
        });

    }

    /**
     * Fetch sensor / entity history data
     * @param  {Bool} newData
     * @return {Void}
     */
    getHistory(newData) {
        
        console.log( 'Fetching data..' );
        var startTime = new Date();
        
        if (newData) {
            console.log( 'Fetching since last - ' + this.lastEndTime );
            startTime = this.lastEndTime;
        } else {
            startTime = new Date();
            startTime.setHours(startTime.getHours() - this.hoursToShow);
        }
        
        var endTime = new Date();
        this.lastEndTime = endTime;
        
        let timeFilter = startTime.toISOString() + '?end_time=' + endTime.toISOString();
        let entityFilter = '&filter_entity_id=' + this.entity_ids.join(',');

        let filter = timeFilter + entityFilter;

        let historyPromise = this._hass.callApi('GET', 'history/period/' + filter).then(
            historyData => this.prepareChartData(historyData, newData),
            () => null
        );
    }

    /**
     * Prepare the sensor history data for C3
     * @param  {Array} historyData
     * @param  {Bool} update
     * @return {Void}
     */
    prepareChartData(historyData, update) {

        // Store the data for later use
        let historyDataObj = {};

        for( let i = 0; i < historyData.length; i++ ) {
            let entityId = historyData[ i ][ 0 ].entity_id;
            historyDataObj[ entityId ] = historyData[ i ];
        }

        this.historyDataObj = historyDataObj;

        console.log( 'Prepare data for chart!' );

        if( !historyData ) {
            throw new Error('Missing state history');
        }
        var allData = {};

        // Soo.. create a reference array of times.
        // For now, let+s start with hourly since that's.. well.. simple
        const timeArr = [];
        const numHours = 24;
        
        for( var h = 0; h < numHours; h++ ) {
            timeArr.push( moment().subtract( h, 'hours' ).format( 'YYYY-MM-DD HH:00:00' ) );
        }
        
        // Per hour..
        for( let t = 0; t < timeArr.length; t++ ) {
            
            let time = timeArr[ t ];

            // Per entity...
            for (let entityHistory of historyData)
            {
                var data = [];
                var entity_id = '';
                var dataObj = {};
                
                // Per entity history state
                for (let state of entityHistory)
                {
                    if (entity_id === '') {
                        entity_id = state.entity_id;
                    }
                    
                    // Convert to full hour
                    var d = moment.utc(state.last_changed).format( 'YYYY-MM-DD HH:00:00' );

                    // Has this entry already been added?
                    if( typeof dataObj[ d ] !== 'undefined' ) {
                        // Skip, since we only add one per hour
                        continue;
                    }
                    else {
                        dataObj[ d ] = state.state == 'unknown' ? null : parseFloat(state.state);
                    }
                
                }
                
                allData[entity_id] = dataObj;
            }

        }

        var allDataArr = [ ['x'].concat( timeArr ) ];

        for( var entity_id in allData ) {
            let arr = [];
            for( var date in allData[ entity_id ] ) {
                arr.push( allData[ entity_id ][ date ] );
            }
            arr = arr.reverse();
            arr = [ entity_id ].concat( arr );
            allDataArr.push( arr );
        }
        
        this.renderChart( timeArr, allDataArr, update );
    }

    /**
     * Render the chart - ( or update it )
     * @param  {Array} timeArr
     * @param  {Array} columns
     * @param  {Bool} update
     * @return {Void}
     */
    renderChart(timeArr,columns,update) {

        console.log( 'renderChart!' );

        console.log( columns );

        var bounds = this.content.getBoundingClientRect();
        var width = bounds.width;

        if( update ) {
            console.log( 'Update with new data ' );
            this.chart.flow({
                    columns: columns,
                    duration: 1500
                });
        }
        else {
            if( !this.chart ) {
                this.chart = c3.generate({
                    bindto: this.content,
                    data: {
                        x: 'x',
                        xFormat: '%Y-%m-%d %H:%M:%S',
                        columns: columns,
                        type: 'spline'
                    },
                    axis: {
                        x: {
                            type: 'timeseries',
                            tick: {
                                format: '%H:00'
                            }
                        }
                    },
                    line: {
                        connectNull: true
                    },
                    point: {
                        r: 4
                    },
                    size: {
                        width: width,
                        height: 300
                    }
                });
            }
        }

        this.loading = false;

        /*setTimeout( () => {
            this.getHistory( true );
        }, 5 * 1000 );*/
    }

    setConfig(config) {

        //console.log( 'Set Config' );

        this.hoursToShow = config.hours_to_show || 24;
        
        this.entities = [];
        this.entity_ids = [];

        for (const entity of config.entities) {
          if (typeof entity == 'string') {
              this.entities.push({entity: entity});
              this.entity_ids.push(entity);
          } else {
              this.entities.push(entity);
              this.entity_ids.push(entity.entity);
          }
        }

        this.config = config;
    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns.
    getCardSize() {
        return 4;
    }
}

customElements.define('sensor-graphs', SensorGraphs);
