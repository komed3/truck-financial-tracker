const $ = ( selector ) => document.querySelector( selector );
const $$ = ( selector ) => document.querySelectorAll( selector );
const _ = ( id ) => document.getElementById( id );

const weekDays = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];

class TruckFinancialTracker {

    constructor () {

        this.profileId = new URLSearchParams( window.location.search ).get( 'profile' );
        this.data = null;
        this.currency = 'EUR';

        this.notifTimeout = null;
        this.currentTab = null;
        this.charts = {};
        this.maxChartPoints = -250;

        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.offset = false;
        Chart.defaults.layout.padding = 0;

        Chart.defaults.font.family = 'Rubik, sans-serif';
        Chart.defaults.font.size = 14;
        Chart.defaults.font.weight = 400;
        Chart.defaults.color = '#000';

        Chart.defaults.transitions = { active: { animation: { duration: 0 } } };
        Chart.defaults.animations = {
            x: { duration: 0 },
            y: { duration: 150, easing: 'easeOutBack' }
        };

        Chart.defaults.plugins.tooltip.padding = { top: 10, left: 12, right: 16, bottom: 10 };
        Chart.defaults.plugins.tooltip.animation = { duration: 150, easing: 'easeOutBack' };
        Chart.defaults.plugins.tooltip.titleColor = '#000';
        Chart.defaults.plugins.tooltip.bodyColor = '#000';
        Chart.defaults.plugins.tooltip.backgroundColor = '#fff';
        Chart.defaults.plugins.tooltip.borderColor = '#d5d6d7';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.cornerRadius = 5;
        Chart.defaults.plugins.tooltip.boxPadding = 4;

        this.setupEventListeners();
        this.init();

    }

    async #fetch ( endpoint, payload = {} ) {

        try {

            const res = await fetch( '/api/' + endpoint, {
                method: 'post',
                body: JSON.stringify( { profileId: this.profileId, ...payload } ),
                headers: { 'Content-Type': 'application/json' }
            } );

            return await res.json();

        } catch ( err ) {

            console.error( 'Error fetching data:', err );
            this.showError( 'Failed to fetch data. Please make sure the game is initialized.' );
            return null;

        }

    }

    async #handler ( endpoint, form ) {

        this.freeze();
        this.closeModal();

        this.data = await this.#fetch( endpoint,
            Object.fromEntries( new FormData( form ) )
        ) || this.data;

        this.refreshTab();
        this.unfreeze();

        form.reset();

    }

    setupEventListeners () {

        // Toggle tab menu
        document.addEventListener( 'click', e => {
            if ( e.target.closest( '#openTabMenu' ) ) _( 'tabMenu' ).classList.toggle( 'active' );
            else _( 'tabMenu' ).classList.remove( 'active' );
        } );

        // Close modal clicking on backdrop
        document.addEventListener( 'click', e => {
            if ( e.target.classList.contains( 'modal' ) ) this.closeModal();
        } );

        // Tab navigation
        $$( '.tab-btn' ).forEach( btn => btn.addEventListener( 'click', e => {
                this.switchTab( e.target.dataset.tab );
        } ) );

        // Form submissions
        $$( 'form' ).forEach( form => form.addEventListener( 'submit', e => {
            e.preventDefault(); this[ e.target.id + 'Handler' ]( e.target );
        } ) );

        // Redraw tabs (charts) on window resize
        window.addEventListener( 'resize', () => this.refreshTab() );

    }

    async init () {

        await this.loadData();
        this.switchTab( 'dashboard' );

    }

    async loadData () {

        this.data = await this.#fetch( 'profile' );
        this.currency = this.data?.gameInfo.currency;
        this.updateHeader();

    }

    updateHeader () {

        if ( ! this.data ) return;

        const { game, playerName, companyName, startingLocation, currency } = this.data?.gameInfo ?? {};

        _( 'profileInfo' ).textContent = `${playerName} — ${ game.toUpperCase() }`;
        _( 'companyInfo' ).textContent = `${companyName} • ${startingLocation} • ${currency}`;

    }

    // Helper & Calculation

    assetById ( type, id ) { return ( this.data?.assets[ type ] ?? [] ).filter( r => r.id === id )[ 0 ] ?? null }

    locationOptions ( el ) {

        el.innerHTML = ( this.data?.assets?.garages ?? [] ).map(
            g => `<option value="${g.location}">${g.location}</option>`
        ).join( '' );

    }

    freeze () { _( 'loading' ).classList.add( 'active' ) }

    unfreeze () { _( 'loading' ).classList.remove( 'active' ) }

    formatDay ( n = null, numOnly = true ) {

        const { currentDay = 0, gameInfo: { startingWeekday = 1 } } = this.data;
        if ( n === null ) n = currentDay;
        else n = Number( n );

        const s = n % 10 == 1 && n % 100 != 11 ? 'st'
            : n % 10 == 2 && n % 100 != 12 ? 'nd'
                : n % 10 == 3 && n % 100 != 13 ? 'rd'
                    : 'th';

        return numOnly ? `${n}${s}` : `${n}${s}, ${ weekDays[ ( startingWeekday + n - 1 ) % 7 ] }`;

    }

    formatCurrency ( amount ) {

        return new Intl.NumberFormat( 'en-US', {
            style: 'currency',
            currency: this.currency,
            currencyDisplay: 'symbol',
            notation: 'compact',
            minimumFractionDigits: 1,
            maximumFractionDigits: 2
        } ).format( amount );

    }

    // Tables

    renderTable ( cols, rows ) {

        return `<table><thead><tr>${
            cols.map( c => `<th>${c}</th>` ).join( '' )
        }</tr></thead><tbody>${
            rows.reverse().map( r => `<tr>${ r.map(
                c => `<td class="${c.class}">${c.value}</td>`
            ).join( '' ) }</tr>` ).join( '' )
        }</tbody></table>`;

    }

    createRecordsTable ( records ) {

        const cols = [
            'Day', 'Total Cap', 'Assets', 'Total Debt', 'Net Assets', 'Cash on Hand',
            'Est. Valutation', 'Profit/Loss', 'Cash Ratio'
        ];

        const rows = records.map( ( r, i ) => ( [
            { value: this.formatDay( r.day ?? i ) },
            { class: 'currency', value: this.formatCurrency( r.totalCap ) },
            { class: 'currency', value: this.formatCurrency( r.report.totalAssets ) },
            { class: 'currency', value: this.formatCurrency( r.report.totalDebt ) },
            { class: 'currency', value: this.formatCurrency( r.report.netAssets ) },
            { class: 'currency', value: this.formatCurrency( r.report.cashOnHand ) },
            { class: 'currency', value: this.formatCurrency( r.report.valutation ) },
            {
                class: 'currency ' + ( r.profit.today < 0 ? 'negative' : 'positive' ),
                value: this.formatCurrency( Math.abs( r.profit.today ) )
            },
            { value: r.report.cashRatio.toFixed( 2 ) }
        ] ) );

        return this.renderTable( cols, rows );

    }

    // Charts

    renderCapitalizationChart ( container ) {

        if ( this.charts.capitalization ) this.charts.capitalization.destroy();

        const dataset = { borderWidth: 3, hoverBorderWidth: 3, pointRadius: 0, pointHoverRadius: 0, fill: true, tension: 0.05 };
        const labels = [], cash = [], garages = [], trucks = [], trailers = [];

        ( this.data?.dailyRecords ?? [] ).slice( this.maxChartPoints ).map( ( r, i ) => {
            labels.push( r.day ?? i );
            cash.push( r.assets.cashBalance );
            garages.push( r.assets.garageValue );
            trucks.push( r.assets.truckValue );
            trailers.push( r.assets.trailerValue );
        } );

        this.charts.capitalization = new Chart( container, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [ {
                    label: 'Cash',
                    data: cash,
                    borderColor: '#27ae60',
                    hoverBorderColor: '#27ae60',
                    backgroundColor: '#bdf0d2',
                    ...dataset
                }, {
                    label: 'Garages',
                    data: garages,
                    borderColor: '#3498db',
                    hoverBorderColor: '#3498db',
                    backgroundColor: '#b9dcf3',
                    ...dataset
                }, {
                    label: 'Trucks',
                    data: trucks,
                    borderColor: '#f39c12',
                    hoverBorderColor: '#f39c12',
                    backgroundColor: '#fbdaa7',
                    ...dataset
                }, {
                    label: 'Trailers',
                    data: trailers,
                    borderColor: '#9b59b6',
                    hoverBorderColor: '#9b59b6',
                    backgroundColor: '#ddc6e6',
                    ...dataset
                } ]
            },
            options: {
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            maxTicksLimit: 10,
                            callback: v => this.formatDay( v )
                        },
                        grid: { display: false },
                        border: { color: '#e0e0e0' }
                    },
                    y: {
                        display: true,
                        position: 'left',
                        type: 'linear',
                        stacked: true,
                        ticks: {
                            maxTicksLimit: 6,
                            callback: v => this.formatCurrency( v )
                        },
                        grid: { color: '#e0e0e0' },
                        border: { dash: [ 5, 5 ], color: '#e0e0e0' }
                    }
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: {
                        title: ctx => this.formatDay( ctx[ 0 ].label, false ),
                        label: ctx => `${ ctx.dataset.label }: ${ this.formatCurrency( ctx.raw ) }`
                    } }
                }
            }
        } );

    }

    renderDistributionChart ( container ) {
        
        if ( this.charts.distribution ) this.charts.distribution.destroy();

        const { totalCap, assets } = ( this.data?.dailyRecords ?? [] ).at( -1 );
        if ( ! totalCap || ! assets ) return;

        this.charts.distribution = new Chart( container, {
            type: 'doughnut',
            data: {
                labels: [ 'Cash', 'Garages', 'Trucks', 'Trailers' ],
                datasets: [ {
                    data: [
                        assets.cashBalance,
                        assets.garageValue,
                        assets.truckValue,
                        assets.trailerValue
                    ],
                    borderWidth: 6,
                    hoverBorderWidth: 6,
                    borderColor: '#fff',
                    hoverBorderColor: '#fff',
                    backgroundColor: [ '#27ae60', '#3498db', '#f39c12', '#9b59b6' ],
                    hoverBackgroundColor: [ '#27ae60', '#3498db', '#f39c12', '#9b59b6' ]
                } ]
            },
            options: {
                radius: '80%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 18, boxHeight: 18 } },
                    tooltip: { callbacks: {
                        label: ctx => `${ this.formatCurrency( ctx.raw ) } (${ ( ctx.raw / totalCap * 100 ).toFixed() }%)`
                    } }
                }
            }
        } );

    }

    renderDailyProfitChart ( container ) {

        if ( this.charts.dailyProfit ) this.charts.dailyProfit.destroy();

        const labels = [], profit = [], loss = [];

        ( this.data?.dailyRecords ?? [] ).slice( this.maxChartPoints ).map( ( r, i ) => {
            labels.push( r.day ?? i );
            profit.push( Math.max( 0, r.profit.today ) );
            loss.push( Math.min( 0, r.profit.today ) );
        } );

        this.charts.dailyProfit = new Chart( container, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [ {
                    label: 'Profit',
                    data: profit,
                    backgroundColor: '#27ae60',
                    hoverBackgroundColor: '#27ae60',
                    borderWidth: 0,
                    hoverBorderWidth: 0
                }, {
                    label: 'Loss',
                    data: loss,
                    backgroundColor: '#e74c3c',
                    hoverBackgroundColor: '#e74c3c',
                    borderWidth: 0,
                    hoverBorderWidth: 0
                } ]
            },
            options: {
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            maxTicksLimit: 10,
                            callback: v => this.formatDay( v )
                        },
                        grid: { display: false },
                        border: { color: '#e0e0e0' }
                    },
                    y: {
                        display: true,
                        position: 'left',
                        type: 'linear',
                        stacked: true,
                        ticks: {
                            maxTicksLimit: 6,
                            callback: v => this.formatCurrency( v )
                        },
                        grid: { color: '#e0e0e0' },
                        border: { dash: [ 5, 5 ], color: '#e0e0e0' }
                    }
                },
                plugins: {
                    legend: false,
                    tooltip: {
                        displayColors: false,
                        bodyFont: { size: 22 },
                        callbacks: {
                            title: ctx => this.formatDay( ctx[ 0 ].label, false ),
                            label: ctx => ctx.raw === 0 ? null : this.formatCurrency( ctx.raw )
                        }
                    }
                }
            }
        } );

    }

    renderNetAssetsChart ( container ) {

        if ( this.charts.netAssets ) this.charts.netAssets.destroy();

        const labels = [], netAssets = [];

        ( this.data?.dailyRecords ?? [] ).slice( this.maxChartPoints ).map( ( r, i ) => {
            labels.push( r.day ?? i );
            netAssets.push( r.report.netAssets );
        } );

        this.charts.netAssets = new Chart( container, {
            type: 'area',
            data: {
                labels: labels,
                datasets: [ {
                    label: 'Net Assets',
                    data: netAssets,
                    color: '#3498db',
                    fillOpacity: 0.36,
                    borderWidth: 3,
                    hoverBorderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.05
                } ]
            },
            options: {
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 10,
                            callback: v => this.formatDay( v )
                        },
                        grid: { display: false },
                        border: { color: '#e0e0e0' }
                    },
                    y: {
                        position: 'left',
                        type: 'linear',
                        ticks: {
                            maxTicksLimit: 6,
                            callback: v => this.formatCurrency( v )
                        },
                        grid: { color: '#e0e0e0' },
                        border: { dash: [ 5, 5 ], color: '#e0e0e0' }
                    }
                },
                plugins: {
                    legend: false,
                    tooltip: {
                        displayColors: false,
                        bodyFont: { size: 22 },
                        callbacks: {
                            title: ctx => this.formatDay( ctx[ 0 ].label, false ),
                            label: ctx => this.formatCurrency( ctx.raw )
                        }
                    }
                }
            }
        } );

    }

    renderTotalDebtChart ( container ) {

        if ( this.charts.totalDebt ) this.charts.totalDebt.destroy();

        const labels = [], totalDebt = [];

        ( this.data?.dailyRecords ?? [] ).slice( this.maxChartPoints ).map( ( r, i ) => {
            labels.push( r.day ?? i );
            totalDebt.push( r.report.totalDebt );
        } );

        this.charts.totalDebt = new Chart( container, {
            type: 'area',
            data: {
                labels: labels,
                datasets: [ {
                    label: 'Total Debt',
                    data: totalDebt,
                    color: '#e74c3c',
                    fillOpacity: 0.36,
                    borderWidth: 3,
                    hoverBorderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.05
                } ]
            },
            options: {
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 10,
                            callback: v => this.formatDay( v )
                        },
                        grid: { display: false },
                        border: { color: '#e0e0e0' }
                    },
                    y: {
                        position: 'left',
                        type: 'linear',
                        ticks: {
                            maxTicksLimit: 6,
                            callback: v => this.formatCurrency( v )
                        },
                        grid: { color: '#e0e0e0' },
                        border: { dash: [ 5, 5 ], color: '#e0e0e0' }
                    }
                },
                plugins: {
                    legend: false,
                    tooltip: {
                        displayColors: false,
                        bodyFont: { size: 22 },
                        callbacks: {
                            title: ctx => this.formatDay( ctx[ 0 ].label, false ),
                            label: ctx => this.formatCurrency( ctx.raw )
                        }
                    }
                }
            }
        } );

    }

    renderValutationChart ( container ) {

        if ( this.charts.valutation ) this.charts.valutation.destroy();

        const labels = [], valutation = [];

        ( this.data?.dailyRecords ?? [] ).slice( this.maxChartPoints ).map( ( r, i ) => {
            labels.push( r.day ?? i );
            valutation.push( r.report.valutation );
        } );

        this.charts.valutation = new Chart( container, {
            type: 'area',
            data: {
                labels: labels,
                datasets: [ {
                    label: 'Valutation',
                    data: valutation,
                    color: '#27ae60',
                    negativeColor: '#e74c3c',
                    fillOpacity: 0.36,
                    borderWidth: 3,
                    hoverBorderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 0
                } ]
            },
            options: {
                clip: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 10,
                            callback: v => this.formatDay( v )
                        },
                        grid: { display: false },
                        border: { color: '#e0e0e0' }
                    },
                    y: {
                        position: 'left',
                        type: 'linear',
                        ticks: {
                            maxTicksLimit: 6,
                            callback: v => this.formatCurrency( v )
                        },
                        grid: { color: '#e0e0e0' },
                        border: { dash: [ 5, 5 ], color: '#e0e0e0' }
                    }
                },
                plugins: {
                    legend: false,
                    tooltip: {
                        displayColors: false,
                        bodyFont: { size: 22 },
                        callbacks: {
                            title: ctx => this.formatDay( ctx[ 0 ].label, false ),
                            label: ctx => this.formatCurrency( ctx.raw )
                        }
                    }
                }
            }
        } );

    }

    renderAvgProfitChart ( container ) {

        if ( this.charts.avgProfit ) this.charts.avgProfit.destroy();

        const dataset = { borderWidth: 3, hoverBorderWidth: 3, pointRadius: 0, pointHoverRadius: 0, tension: 0.05 };
        const labels = [], avg7 = [], avg30 = [], avg90 = [];

        ( this.data?.dailyRecords ?? [] ).slice( this.maxChartPoints ).map( ( r, i ) => {
            labels.push( r.day ?? i );
            avg7.push( r.profit.avg7 );
            avg30.push( r.profit.avg30 );
            avg90.push( r.profit.avg90 );
        } );

        this.charts.avgProfit = new Chart( container, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [ {
                    label: '7d Avg.',
                    data: avg7,
                    borderColor: '#27ae60',
                    hoverBorderColor: '#27ae60',
                    ...dataset
                }, {
                    label: '30d Avg.',
                    data: avg30,
                    borderColor: '#f39c12',
                    hoverBorderColor: '#f39c12',
                    ...dataset
                }, {
                    label: '90d Avg.',
                    data: avg90,
                    borderColor: '#9b59b6',
                    hoverBorderColor: '#9b59b6',
                    ...dataset
                } ]
            },
            options: {
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 10,
                            callback: v => this.formatDay( v )
                        },
                        grid: { display: false },
                        border: { color: '#e0e0e0' }
                    },
                    y: {
                        display: true,
                        position: 'left',
                        type: 'linear',
                        ticks: {
                            maxTicksLimit: 6,
                            callback: v => this.formatCurrency( v )
                        },
                        grid: { color: '#e0e0e0' },
                        border: { dash: [ 5, 5 ], color: '#e0e0e0' }
                    }
                },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: {
                        title: ctx => this.formatDay( ctx[ 0 ].label, false ),
                        label: ctx => `${ ctx.dataset.label }: ${ this.formatCurrency( ctx.raw ) }`
                    } }
                }
            }
        } );

    }

    renderCashRatioChart ( container ) {

        if ( this.charts.cashRatio ) this.charts.cashRatio.destroy();

        const labels = [], cashRatio = [];

        ( this.data?.dailyRecords ?? [] ).slice( this.maxChartPoints ).map( ( r, i ) => {
            labels.push( r.day ?? i );
            cashRatio.push( r.report.cashRatio );
        } );

        this.charts.cashRatio = new Chart( container, {
            type: 'area',
            data: {
                labels: labels,
                datasets: [ {
                    label: 'Cash Ratio',
                    data: cashRatio,
                    color: '#232323',
                    fillOpacity: 0.25,
                    borderWidth: 3,
                    hoverBorderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 0
                } ]
            },
            options: {
                clip: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 10,
                            callback: v => this.formatDay( v )
                        },
                        grid: { display: false },
                        border: { color: '#e0e0e0' }
                    },
                    y: {
                        position: 'left',
                        type: 'linear',
                        min: 0, max: 1,
                        ticks: {
                            maxTicksLimit: 6,
                            callback: v => v.toFixed( 2 )
                        },
                        grid: { color: '#e0e0e0' },
                        border: { dash: [ 5, 5 ], color: '#e0e0e0' }
                    }
                },
                plugins: {
                    legend: false,
                    tooltip: {
                        displayColors: false,
                        bodyFont: { size: 22 },
                        callbacks: {
                            title: ctx => this.formatDay( ctx[ 0 ].label, false ),
                            label: ctx => ctx.raw.toFixed( 2 )
                        }
                    }
                }
            }
        } );

    }

    // Tab Navigation

    switchTab ( tabName, force = false ) {

        if ( ! force && tabName === this.currentTab ) return;
        this.currentTab = tabName;

        // Update tab buttons
        $$( '.tab-btn' ).forEach( btn => btn.classList.remove( 'active' ) );
        $( `[data-tab="${tabName}"]` ).classList.add( 'active' );

        // Update tab content
        $$( '.tab-content' ).forEach( tab => tab.classList.remove( 'active' ) );
        _( tabName ).classList.add( 'active' );

        // Load content for the specific tab
        this.loadTabContent( tabName );

    }

    refreshTab () { this.switchTab( this.currentTab, true ) }

    async loadTabContent ( tabName ) {

        switch ( tabName ) {
            case 'dashboard': this.renderDashboard(); break;
            case 'daily': this.renderDailyRecords(); break;
            case 'garages': this.renderGarages(); break;
            case 'trucks': this.renderTrucks(); break;
            case 'trailers': this.renderTrailers(); break;
            case 'drivers': this.renderDrivers(); break;
            case 'loans': this.renderLoans(); break;
            case 'reports': this.renderReports(); break;
        }

    }

    // Modals

    openModal ( modalId, reset = true ) {

        _( modalId + 'Modal' ).classList.add( 'active' );

        if ( reset ) _( modalId + 'Form' ).reset();

        const maybeLocation = $( '#' + modalId + 'Form select[name="location"]' );
        if ( maybeLocation ) this.locationOptions( maybeLocation );

    }

    closeModal () { $$( '.modal' ).forEach( modal => modal.classList.remove( 'active' ) ) }

    // Switch profile

    switchProfile () { location.href = '/' }

    // Notification

    showNotification ( msg, status = 'success' ) {

        _( 'notification' ).textContent = msg;
        _( 'notification' ).classList.remove( 'success', 'error' );
        _( 'notification' ).classList.add( status );
        _( 'notification' ).style.display = 'block';

        clearTimeout( this.notifTimeout );
        this.notifTimeout = setTimeout( () =>
            _( 'notification' ).style.removeProperty( 'display' )
        , 2000 );

    }

    showError ( msg ) { this.showNotification( msg, 'error' ) }

    // Dashboard

    renderDashboard () {

        this.renderOverviewCards();
        this.renderRecentRecords();

        this.renderCapitalizationChart( _( 'capitalizationChart' ) );
        this.renderDistributionChart( _( 'distributionChart' ) );

    }

    renderOverviewCards () {

        _( 'currentDay' ).textContent = this.formatDay();

        if ( this.data?.dailyRecords?.length ) {

            const { totalCap, report: {
                netAssets, totalDebt, cashOnHand, valutation
            }, profit: { avg90 }, stats: {
                garages, parkingLots, trucks, trailers, drivers
            } } = this.data.dailyRecords.at( -1 );

            _( 'totalCap' ).textContent = this.formatCurrency( Math.abs( totalCap ) );
            _( 'totalDebt' ).textContent = this.formatCurrency( Math.abs( totalDebt ) );
            _( 'netAssets' ).textContent = this.formatCurrency( Math.abs( netAssets ) );
            _( 'cashOnHand' ).textContent = this.formatCurrency( Math.abs( cashOnHand ) );
            _( 'valutation' ).textContent = this.formatCurrency( Math.abs( valutation ) );
            _( 'avgProfit' ).textContent = this.formatCurrency( Math.abs( avg90 ) );

            _( 'totalCap' ).classList.toggle( 'negative', totalCap < 0 );
            _( 'totalDebt' ).classList.toggle( 'negative', totalDebt > 0 );
            _( 'netAssets' ).classList.toggle( 'negative', netAssets < 0 );
            _( 'cashOnHand' ).classList.toggle( 'negative', cashOnHand < 0 );
            _( 'valutation' ).classList.toggle( 'negative', valutation < 0 );
            _( 'avgProfit' ).classList.toggle( 'negative', avg90 < 0 );

            _( 'garageCount' ).textContent = garages;
            _( 'parkingLots' ).textContent = parkingLots;
            _( 'truckCount' ).textContent = trucks;
            _( 'trailerCount' ).textContent = trailers;
            _( 'driverCount' ).textContent = drivers;

        } else {

            _( 'totalCap' ).textContent = 'N/A';
            _( 'totalDebt' ).textContent = 'N/A';
            _( 'netAssets' ).textContent = 'N/A';
            _( 'cashOnHand' ).textContent = 'N/A';
            _( 'valutation' ).textContent = 'N/A';
            _( 'avgProfit' ).textContent = 'N/A';

            _( 'totalCap' ).classList.remove( 'negative' );
            _( 'totalDebt' ).classList.remove( 'negative' );
            _( 'netAssets' ).classList.remove( 'negative' );
            _( 'cashOnHand' ).classList.remove( 'negative' );
            _( 'valutation' ).classList.remove( 'negative' );
            _( 'avgProfit' ).classList.remove( 'negative' );

            _( 'garageCount' ).textContent = 'N/A';
            _( 'parkingLots' ).textContent = 'N/A';
            _( 'truckCount' ).textContent = 'N/A';
            _( 'trailerCount' ).textContent = 'N/A';
            _( 'driverCount' ).textContent = 'N/A';

        }

    }

    renderRecentRecords () {

        const records = ( this.data?.dailyRecords ?? [] ).slice( -7 );
        const container = _( 'recentRecordsTable' );

        if ( records.length === 0 ) {
            container.innerHTML = '<div class="empty">No daily records yet. Add your first record to get started!</div>';
            return;
        }

        const table = this.createRecordsTable( records );
        container.innerHTML = table;

    }

    // Daily records

    renderDailyRecords () {

        const container = _( 'dailyRecordsTable' );

        if ( this.data?.dailyRecords?.length === 0 ) {
            container.innerHTML = '<div class="empty">No daily records yet. Add your first record to get started!</div>';
            return;
        }

        const table = this.createRecordsTable( this.data.dailyRecords.slice() );
        container.innerHTML = table;

    }

    async dailyFormHandler ( form ) { await this.#handler( 'dailyRecord', form ) }

    // Garages

    renderGarages () {

        const container = _( 'garagesTable' );

        if ( this.data?.assets?.garages?.length === 0 ) {
            container.innerHTML = '<div class="empty">No garages yet. Add your first garage to get started!</div>';
            return;
        }

        const cols = [ 'Location', 'Day', 'Size', 'Value', 'Actions' ];
        const rows = this.data.assets.garages.map( g => ( [
            { value: g.location }, { value: this.formatDay( g.day ) }, { class: 'label', value: `<span>${g.size}</span>` },
            { class: 'currency', value: this.formatCurrency( g.value ) },
            { class: 'actions', value:
                `<button class="btn" onclick="app.garageDetails('${g.id}')">Details</button>` +
                `<button class="btn" onclick="app.editGarage('${g.id}')">Edit</button>` +
                `<button class="btn danger" onclick="app.deleteGarage('${g.id}')">Delete</button>`
            }
        ] ) );

        container.innerHTML = this.renderTable( cols, rows );

    }

    async garageFormHandler ( form ) { await this.#handler( 'garage/edit', form ) }

    editGarage ( id ) {

        const garage = this.assetById( 'garages', id );
        if ( ! garage ) return;

        this.openModal( 'garage' );

        _( 'garageId' ).value = id;
        _( 'garageLocation' ).value = garage.location;
        _( 'garageValue' ).value = garage.value;
        _( 'garageSize' ).value = garage.size;

    }

    async deleteGarage ( id ) {

        if ( confirm( 'Do you want to delete this garage?' ) ) {

            this.data = await this.#fetch( 'garage/delete', { garageId: id } ) || this.data;
            this.refreshTab();

        }

    }

    garageDetails ( id ) {

        const garage = this.assetById( 'garages', id );
        if ( ! garage ) return;

        const trucks = ( this.data?.assets?.trucks ?? [] ).filter( t => t.location === garage.location );
        const trailers = ( this.data?.assets?.trailers ?? [] ).filter( t => t.location === garage.location );
        const drivers = ( this.data?.assets?.drivers ?? [] ).filter( d => d.location === garage.location );

        const sizeCapacity = { small: 1, medium: 3, large: 5 }[ garage.size ] || 0;
        const spacesUsed = trucks.length + trailers.length;

        const truckValue = trucks.reduce( ( s, t ) => s + t.value, 0 );
        const trailerValue = trailers.reduce( ( s, t ) => s + t.value, 0 );
        const totalValue = truckValue + trailerValue;

        this.openModal( 'garageDetails', false );

        _( 'garageDetailsLocation' ).textContent = garage.location;
        _( 'garageDetailsParkingLots' ).textContent = spacesUsed + ' / ' + sizeCapacity;
        _( 'garageDetailsValue' ).textContent = this.formatCurrency( totalValue );

        $( '#garageDetailsTable tbody' ).innerHTML =
            trucks.map( t => `<tr>` +
                `<td>${t.brand}, ${t.model}</td>` +
                `<td>${ this.formatDay( t.day ) }</td>` +
                `<td>${ this.formatCurrency( t.value ) }</td>` +
            `</tr>` ).join( '' ) +
            trailers.map( t => `<tr>` +
                `<td>${t.type}, ${t.capacity}</td>` +
                `<td>${ this.formatDay( t.day ) }</td>` +
                `<td>${ this.formatCurrency( t.value ) }</td>` +
            `</tr>` ).join( '' ) +
            drivers.map( d => `<tr>` +
                `<td>${d.name}</td>` +
                `<td>${ this.formatDay( d.day ) }</td>` +
                `<td>—</td>` +
            `</tr>` ).join( '' );

    }

    // Trucks & Trailers

    renderTrucks () {

        const container = _( 'trucksTable' );

        if ( this.data?.assets?.trucks?.length === 0 ) {
            container.innerHTML = '<div class="empty">No trucks yet. Add your first truck to get started!</div>';
            return;
        }

        const cols = [ 'Brand', 'Model', 'Day', 'Condition', 'Location', 'Value', 'Actions' ];
        const rows = this.data.assets.trucks.map( t => ( [
            { value: t.brand }, { value: t.model }, { value: this.formatDay( t.day ) },
            { class: 'label', value: `<span>${t.condition}</span>` }, { value: t.location },
            { class: 'currency', value: this.formatCurrency( t.value ) },
            { class: 'actions', value:
                `<button class="btn" onclick="app.editTruck('${t.id}')">Edit</button>` +
                `<button class="btn danger" onclick="app.deleteTruck('${t.id}')">Delete</button>`
            }
        ] ) );

        container.innerHTML = this.renderTable( cols, rows );

    }

    async truckFormHandler ( form ) { await this.#handler( 'truck/edit', form ) }

    editTruck ( id ) {

        const truck = this.assetById( 'trucks', id );
        if ( ! truck ) return;

        this.openModal( 'truck' );

        _( 'truckId' ).value = id;
        _( 'truckBrand' ).value = truck.brand;
        _( 'truckModel' ).value = truck.model;
        _( 'truckValue' ).value = truck.value;
        _( 'truckCondition' ).value = truck.condition;
        _( 'truckLocation' ).value = truck.location;

    }

    async deleteTruck ( id ) {

        if ( confirm( 'Do you want to delete this truck?' ) ) {

            this.data = await this.#fetch( 'truck/delete', { truckId: id } ) || this.data;
            this.refreshTab();

        }

    }

    renderTrailers () {

        const container = _( 'trailersTable' );

        if ( this.data?.assets?.trailers?.length === 0 ) {
            container.innerHTML = '<div class="empty">No trailers yet. Add your first trailer to get started!</div>';
            return;
        }

        const cols = [ 'Type', 'Capacity', 'Day', 'Condition', 'Location', 'Value', 'Actions' ];
        const rows = this.data.assets.trailers.map( t => ( [
            { value: t.type }, { value: t.capacity }, { value: this.formatDay( t.day ) },
            { class: 'label', value: `<span>${t.condition}</span>` }, { value: t.location },
            { class: 'currency', value: this.formatCurrency( t.value ) },
            { class: 'actions', value:
                `<button class="btn" onclick="app.editTrailer('${t.id}')">Edit</button>` +
                `<button class="btn danger" onclick="app.deleteTrailer('${t.id}')">Delete</button>`
            }
        ] ) );

        container.innerHTML = this.renderTable( cols, rows );

    }

    async trailerFormHandler ( form ) { await this.#handler( 'trailer/edit', form ) }

    editTrailer ( id ) {

        const trailer = this.assetById( 'trailers', id );
        if ( ! trailer ) return;

        this.openModal( 'trailer' );

        _( 'trailerId' ).value = id;
        _( 'trailerType' ).value = trailer.type;
        _( 'trailerCapacity' ).value = trailer.capacity;
        _( 'trailerValue' ).value = trailer.value;
        _( 'trailerCondition' ).value = trailer.condition;
        _( 'trailerLocation' ).value = trailer.location;

    }

    async deleteTrailer ( id ) {

        if ( confirm( 'Do you want to delete this trailer?' ) ) {

            this.data = await this.#fetch( 'trailer/delete', { trailerId: id } ) || this.data;
            this.refreshTab();

        }

    }

    // Drivers

    renderDrivers () {

        const container = _( 'driversTable' );

        if ( this.data?.assets?.drivers?.length === 0 ) {
            container.innerHTML = '<div class="empty">No drivers yet. Add your first driver to get started!</div>';
            return;
        }

        const cols = [ 'Name', 'Hire Day', 'Location', 'Status', 'Skill Level', 'Actions' ];
        const rows = this.data.assets.drivers.map( d => ( [
            { value: d.name }, { value: this.formatDay( d.day ) }, { value: d.location },
            { class: 'label', value: `<span>${d.status}</span>` },
            { class: 'label', value: `<span>${d.skillLevel}</span>` },
            { class: 'actions', value:
                `<button class="btn" onclick="app.editDriver('${d.id}')">Edit</button>` +
                `<button class="btn danger" onclick="app.deleteDriver('${d.id}')">Delete</button>`
            }
        ] ) );

        container.innerHTML = this.renderTable( cols, rows );

    }

    async driverFormHandler ( form ) { await this.#handler( 'driver/edit', form ) }

    editDriver ( id ) {

        const driver = this.assetById( 'drivers', id );
        if ( ! driver ) return;

        this.openModal( 'driver' );

        _( 'driverId' ).value = id;
        _( 'driverName' ).value = driver.name;
        _( 'driverLocation' ).value = driver.location;
        _( 'driverStatus' ).value = driver.status;
        _( 'driverSkill' ).value = driver.skillLevel;

    }

    async deleteDriver ( id ) {

        if ( confirm( 'Do you want to fire this driver?' ) ) {

            this.data = await this.#fetch( 'driver/delete', { driverId: id } ) || this.data;
            this.refreshTab();

        }

    }

    // Loans

    renderLoans () {

        const container = _( 'loansTable' );

        if ( this.data?.assets?.loans?.length === 0 ) {
            container.innerHTML = '<div class="empty">No loans yet. Add your first loan to get started!</div>';
            return;
        }

        const cols = [ 'Amount', 'Day', 'Term', 'Interest Rate', 'Installment', 'Remaining', 'Actions' ];
        const rows = this.data.assets.loans.map( l => ( [
            { class: 'currency', value: this.formatCurrency( l.amount ) },
            { value: this.formatDay( l.day ) },
            { value: l.remaining > 0 ? Math.max( 0, this.data.currentDay - l.day - 1 ) + ' / ' + l.term : '—' },
            { value: `${ l.interestRate.toFixed( 1 ) }%` },
            { class: 'currency', value: this.formatCurrency( l.dailyInstallment ) },
            { class: 'currency', value: this.formatCurrency( l.remaining ) },
            { class: 'actions', value:
                `<button class="btn" onclick="app.editLoan('${l.id}')">Edit</button>` +
                `<button class="btn danger" onclick="app.clearingLoan('${l.id}')">Clearing</button>`
            }
        ] ) );

        container.innerHTML = this.renderTable( cols, rows );

    }

    async loanFormHandler ( form ) { await this.#handler( 'loan/edit', form ) }

    editLoan ( id ) {

        const loan = this.assetById( 'loans', id );
        if ( ! loan ) return;

        this.openModal( 'loan' );

        _( 'loanId' ).value = id;
        _( 'loanAmount' ).value = loan.amount;
        _( 'loanTerm' ).value = loan.term;
        _( 'loanInterestRate' ).value = loan.interestRate;
        _( 'loanInstallment' ).value = loan.dailyInstallment;
        _( 'loanRemaining' ).value = loan.remaining;

    }

    async clearingLoan ( id ) {

        if ( confirm( 'When confirmed, the remaining amount will be paid off entirely.' ) ) {

            this.data = await this.#fetch( 'loan/clearing', { loanId: id } ) || this.data;
            this.refreshTab();

        }

    }

    // Reports (stats)

    renderReports () {

        this.renderCapitalizationChart( _( 'capitalizationReport' ) );
        this.renderDailyProfitChart( _( 'dailyProfitReport' ) );
        this.renderNetAssetsChart( _( 'netAssetsReport' ) );
        this.renderTotalDebtChart( _( 'totalDebtReport' ) );
        this.renderValutationChart( _( 'valutationReport' ) );
        this.renderAvgProfitChart( _( 'avgProfitReport' ) );
        this.renderCashRatioChart( _( 'cashRatioReport' ) );

    }

}

document.addEventListener( 'DOMContentLoaded', () => {
    window.app = new TruckFinancialTracker();
} );
