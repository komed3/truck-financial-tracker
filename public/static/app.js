const $ = ( selector ) => document.querySelector( selector );
const $$ = ( selector ) => document.querySelectorAll( selector );
const _ = ( id ) => document.getElementById( id );

const weekDays = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];

class TruckFinancialTracker {

    constructor () {

        this.profileId = new URLSearchParams( window.location.search ).get( 'profile' );
        this.data = null;
        this.currency = 'EUR';

        this.currentTab = null;
        this.charts = {};
        this.maxChartPoints = -250;

        this.setupEventListeners();
        this.init();

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
            return null;

        }

    }

    setupEventListeners () {

        // Tab navigation
        $$( '.tab-btn' ).forEach( btn => btn.addEventListener( 'click', e => {
                this.switchTab( e.target.dataset.tab );
        } ) );

        // Form submissions
        $$( 'form' ).forEach( form => form.addEventListener( 'submit', e => {
            e.preventDefault(); this[ e.target.id + 'Handler' ]( e.target );
        } ) );

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

    freeze () { _( 'loading' ).classList.add( 'active' ) }

    unfreeze () { _( 'loading' ).classList.remove( 'active' ) }

    formatDay ( n = null, numOnly = true ) {

        const { currentDay = 0, gameInfo: { startingWeekday = 1 } } = this.data;
        if ( n === null ) n = currentDay;

        const s = n % 10 == 1 && n % 100 != 11 ? 'st'
            : n % 10 == 2 && n % 100 != 12 ? 'nd'
                : n % 10 == 3 && n % 100 != 13 ? 'rd'
                    : 'th';

        return numOnly ? `${n}${s}` : `${n}${s}, ${ weekDays[ ( startingWeekday + n ) % 7 ] }`;

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
            rows.map( r => `<tr>${ r.map(
                c => `<td class="${c.class}">${c.value}</td>`
            ).join( '' ) }</tr>` ).join( '' )
        }</tbody></table>`;

    }

    createRecordsTable ( records ) {

        const cols = [ 'Day', 'Cash', 'Total Cap', 'Total Debt', 'Net Assets', 'Cash on Hand', 'Profit/Loss', 'Cash Ratio' ];
        const rows = records.map( ( r, i ) => ( [
            { value: this.formatDay( r.day ?? i ) },
            { class: 'currency', value: this.formatCurrency( r.assets.cashBalance ) },
            { class: 'currency', value: this.formatCurrency( r.totalCap ) },
            { class: 'currency', value: this.formatCurrency( r.report.totalDebt ) },
            { class: 'currency', value: this.formatCurrency( r.report.netAssets ) },
            { class: 'currency', value: this.formatCurrency( r.report.cashOnHand ) },
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
                            maxTicksLimit: 5,
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

            const { totalCap, report: { netAssets, totalDebt, cashOnHand, cashRatio } } = this.data.dailyRecords.at( -1 );
            _( 'totalCap' ).textContent = this.formatCurrency( Math.abs( totalCap ) );
            _( 'totalDebt' ).textContent = this.formatCurrency( Math.abs( totalDebt ) );
            _( 'netAssets' ).textContent = this.formatCurrency( Math.abs( netAssets ) );
            _( 'cashOnHand' ).textContent = this.formatCurrency( Math.abs( cashOnHand ) );
            _( 'cashRatio' ).textContent = cashRatio.toFixed( 2 );

            _( 'totalCap' ).classList.toggle( 'negative', totalCap < 0 );
            _( 'totalDebt' ).classList.toggle( 'negative', totalDebt > 0 );
            _( 'netAssets' ).classList.toggle( 'negative', netAssets < 0 );
            _( 'cashOnHand' ).classList.toggle( 'negative', cashOnHand < 0 );

        } else {

            _( 'totalCap' ).textContent = 'N/A';
            _( 'totalDebt' ).textContent = 'N/A';
            _( 'netAssets' ).textContent = 'N/A';
            _( 'cashOnHand' ).textContent = 'N/A';
            _( 'cashRatio' ).textContent = 'N/A';

            _( 'totalCap' ).classList.remove( 'negative' );
            _( 'totalDebt' ).classList.remove( 'negative' );
            _( 'netAssets' ).classList.remove( 'negative' );
            _( 'cashOnHand' ).classList.remove( 'negative' );

        }

    }

    renderRecentRecords () {

        const records = ( this.data?.dailyRecords ?? [] ).slice( -7 ).reverse();
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

        const table = this.createRecordsTable( this.data.dailyRecords.slice().reverse() );
        container.innerHTML = table;

    }

    async dailyFormHandler ( form ) {

        this.freeze();
        this.closeModal();

        this.data = await this.#fetch( 'dailyRecord', { cashBalance: parseFloat(
            new FormData( form ).get( 'cashBalance' )
        ) } ) || this.data;

        this.refreshTab();
        this.unfreeze();

        form.reset();

    }

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
                `<button class="btn" onclick="app.editGarage('${g.id}')">Edit</button>` +
                `<button class="btn danger" onclick="app.deleteGarage('${g.id}')">Delete</button>`
            }
        ] ) );

        container.innerHTML = this.renderTable( cols, rows );

    }

    async garageFormHandler ( form ) {

        this.freeze();
        this.closeModal();

        this.data = await this.#fetch( 'garage/update',
            Object.fromEntries( new FormData( form ) )
        ) || this.data;

        this.refreshTab();
        this.unfreeze();

        form.reset();

    }

    editGarage ( id ) {

        const garage = this.assetById( 'garages', id );
        if ( ! garage ) return;

        _( 'garageForm' ).reset();
        _( 'garageId' ).value = id;
        _( 'garageLocation' ).value = garage.location;
        _( 'garageValue' ).value = garage.value;
        _( 'garageSize' ).value = garage.size;

        this.openModal( 'garage', false );

    }

    async deleteGarage ( id ) {

        if ( confirm( 'Do you want to delete this garage?' ) ) {

            this.data = await this.#fetch( 'garage/delete', { garageId: id } ) || this.data;
            this.refreshTab();

        }

    }

    // Trucks & Trailers

    renderTrucks () {

        const container = _( 'trucksTable' );

        if ( this.data?.assets?.trucks?.length === 0 ) {
            container.innerHTML = '<div class="empty">No trucks yet. Add your first truck to get started!</div>';
            return;
        }

        const cols = [ 'Brand', 'Model', 'Day', 'Condition', 'Value', 'Actions' ];
        const rows = this.data.assets.trucks.map( t => ( [
            { value: t.brand }, { value: t.model }, { value: this.formatDay( t.day ) },
            { class: 'label', value: `<span>${t.condition}</span>` },
            { class: 'currency', value: this.formatCurrency( t.value ) },
            { class: 'actions', value:
                `<button class="btn" onclick="app.editTruck('${t.id}')">Edit</button>` +
                `<button class="btn danger" onclick="app.deleteTruck('${t.id}')">Delete</button>`
            }
        ] ) );

        container.innerHTML = this.renderTable( cols, rows );

    }

    renderTrailers () {

        const container = _( 'trailersTable' );

        if ( this.data?.assets?.trailers?.length === 0 ) {
            container.innerHTML = '<div class="empty">No trailers yet. Add your first trailer to get started!</div>';
            return;
        }

        const cols = [ 'Type', 'Capacity', 'Day', 'Condition', 'Value', 'Actions' ];
        const rows = this.data.assets.trailers.map( t => ( [
            { value: t.type }, { value: t.capacity }, { value: this.formatDay( t.day ) },
            { class: 'label', value: `<span>${t.condition}</span>` },
            { class: 'currency', value: this.formatCurrency( t.value ) },
            { class: 'actions', value:
                `<button class="btn" onclick="app.editTrailer('${t.id}')">Edit</button>` +
                `<button class="btn danger" onclick="app.deleteTrailer('${t.id}')">Delete</button>`
            }
        ] ) );

        container.innerHTML = this.renderTable( cols, rows );

    }

    // Modals

    openModal ( modalId, reset = true ) {

        if ( reset ) _( modalId + 'Form' ).reset();
        _( modalId + 'Modal' ).classList.add( 'active' );

    }

    closeModal () { $$( '.modal' ).forEach( modal => modal.classList.remove( 'active' ) ) }

}

document.addEventListener( 'DOMContentLoaded', () => {
    window.app = new TruckFinancialTracker();
} );
