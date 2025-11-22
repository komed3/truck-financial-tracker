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
            return null;

        }

    }

    setupEventListeners () {

        // Tab navigation
        $$( '.tab-button' ).forEach( btn => btn.addEventListener( 'click', ( e ) => {
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

        const { game, playerName, companyName, startingLocation, currency } = this.data?.gameInfo || {};

        _( 'profileInfo' ).textContent = `${playerName} — ${game.toUpperCase()}`;
        _( 'companyInfo' ).textContent = `${companyName} • ${startingLocation} • ${currency}`;

    }

    // Helper & Calculation

    getDay ( numOnly = true ) {

        const { currentDay: n = 0, gameInfo: { startingWeekday = 1 } } = this.data;
        const s = n % 10 == 1 && n % 100 != 11 ? 'st' : n % 10 == 2 && n % 100 != 12 ? 'nd' : n % 10 == 3 && n % 100 != 13 ? 'rd' : 'th';
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

    // Tab Navigation

    switchTab ( tabName ) {

        if ( tabName === this.currentTab ) return;
        this.currentTab = tabName;

        // Update tab buttons
        $$( '.tab-button' ).forEach( btn => btn.classList.remove( 'active' ) );
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
        }

    }

    // Dashboard

    renderDashboard () {

        this.renderOverviewCards();

    }

    renderOverviewCards () {

        _( 'currentDay' ).textContent = this.getDay();

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

}

document.addEventListener( 'DOMContentLoaded', () => {
    window.app = new TruckFinancialTracker();
} );
