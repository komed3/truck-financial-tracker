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
        $$( '.tab-btn' ).forEach( btn => btn.addEventListener( 'click', ( e ) => {
                this.switchTab( e.target.dataset.tab );
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

    createRecordsTable ( records ) {

        const cols = [ 'Day', 'Cash', 'Total Cap', 'Total Debt', 'Net Assets', 'Cash on Hand', 'Profit/Loss' ].map( c => `<th>${c}</th>` ).join( '' );
        const rows = records.map( ( r, i ) => {

            const changeClass = r.profit.today < 0 ? 'negative' : 'positive';

            return `<tr>` +
                `<td>${ this.formatDay( r.day ?? i ) }</td>` +
                `<td class="currency">${ this.formatCurrency( r.assets.cashBalance ) }</td>` +
                `<td class="currency">${ this.formatCurrency( r.totalCap ) }</td>` +
                `<td class="currency">${ this.formatCurrency( r.report.totalDebt ) }</td>` +
                `<td class="currency">${ this.formatCurrency( r.report.netAssets ) }</td>` +
                `<td class="currency">${ this.formatCurrency( r.report.cashOnHand ) }</td>` +
                `<td class="currency ${changeClass}">${ this.formatCurrency( r.profit.today ) }</td>` +
            `</tr>`;

        } ).join( '' );

        return `<table><thead><tr>${cols}</tr></thead><tbody>${rows}</tbody></table>`;

    }

    // Charts

    renderCapitalizationChart ( container ) {

        if ( this.charts.capitalization ) this.charts.capitalization.destroy();

        const labels = [], cash = [], garages = [], trucks = [], loans = [];
        ( this.data?.dailyRecords ?? [] ).map( ( r, i ) => {
            labels.push( r.day ?? i );
            cash.push( r.assets.cashBalance );
            garages.push( r.assets.garageValue );
            trucks.push( r.assets.truckValue + r.assets.trailerValue );
            loans.push( -r.report.totalDebt );
        } );

        this.charts.capitalization = new Chart( container, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [ {
                    label: 'Cash',
                    data: cash,
                    borderColor: '#27ae60',
                    borderWidth: 3,
                    hoverBorderColor: '#27ae60',
                    hoverBorderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    backgroundColor: 'rgba( 39 174 96 / 0.1 )',
                    fill: true,
                    tension: 0.1
                }, {
                    label: 'Garages',
                    data: garages,
                    borderColor: '#3498db',
                    borderWidth: 4,
                    hoverBorderColor: '#3498db',
                    hoverBorderWidth: 4,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    backgroundColor: 'rgba( 52 152 219 / 0.1 )',
                    fill: true,
                    tension: 0.1
                }, {
                    label: 'Trucks & Trailers',
                    data: trucks,
                    borderColor: '#d1b43b',
                    borderWidth: 4,
                    hoverBorderColor: '#d1b43b',
                    hoverBorderWidth: 4,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    backgroundColor: 'rgba( 209 180 59 / 0.1 )',
                    fill: true,
                    tension: 0.1
                }, {
                    label: 'Loans',
                    data: loans,
                    borderColor: '#e74c3c',
                    borderWidth: 4,
                    hoverBorderColor: '#e74c3c',
                    hoverBorderWidth: 4,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    backgroundColor: 'rgba( 231 76 60 / 0.1 )',
                    fill: true,
                    tension: 0.1
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
                        ticks: { callback: v => this.formatDay( v ) },
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
                    legend: { position: 'bottom' }
                }
            }
        } );

    }

    // Tab Navigation

    switchTab ( tabName ) {

        if ( tabName === this.currentTab ) return;
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

    }

    renderOverviewCards () {

        _( 'currentDay' ).textContent = this.formatDay();

        if ( this.data?.dailyRecords?.length ) {

            const { totalCap, report: { netAssets, totalDebt, cashOnHand, cashRatio } } = this.data.dailyRecords.at( -1 );
            _( 'totalCap' ).textContent = this.formatCurrency( totalCap );
            _( 'totalDebt' ).textContent = this.formatCurrency( totalDebt );
            _( 'netAssets' ).textContent = this.formatCurrency( netAssets );
            _( 'cashOnHand' ).textContent = this.formatCurrency( cashOnHand );
            _( 'cashRatio' ).textContent = cashRatio.toFixed( 2 );

        } else {

            _( 'totalCap' ).textContent = 'N/A';
            _( 'totalDebt' ).textContent = 'N/A';
            _( 'netAssets' ).textContent = 'N/A';
            _( 'cashOnHand' ).textContent = 'N/A';
            _( 'cashRatio' ).textContent = 'N/A';

        }

    }

    renderRecentRecords () {

        const records = ( this.data?.dailyRecords ?? [] ).slice( -7 ).reverse();
        const container = _( 'recentRecordsTable' );

        if ( records.length === 0 ) {
            container.innerHTML = '<div class="loading">No daily records yet. Add your first record to get started!</div>';
            return;
        }

        const table = this.createRecordsTable( records );
        container.innerHTML = table;

    }

    // Daily records

    renderDailyRecords () {

        const container = _( 'dailyRecordsTable' );

        if ( this.data?.dailyRecords?.length === 0 ) {
            container.innerHTML = '<div class="loading">No daily records yet. Add your first record to get started!</div>';
            return;
        }

        const table = this.createRecordsTable( this.data.dailyRecords.slice().reverse() );
        container.innerHTML = table;

    }

}

document.addEventListener( 'DOMContentLoaded', () => {
    window.app = new TruckFinancialTracker();
} );
