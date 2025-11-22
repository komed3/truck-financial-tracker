const $ = ( selector ) => document.querySelector( selector );
const $$ = ( selector ) => document.querySelectorAll( selector );
const _ = ( id ) => document.getElementById( id );

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

        const { currentDay } = this.data;
        const latestRecord = this.data.dailyRecords.at( -1 );

        _( 'currentDay' ).textContent = currentDay;

        if ( latestRecord ) {

            //

        } else {

            _( 'cashBalance' ).textContent = 'N/A';
            _( 'totalCapital' ).textContent = 'N/A';
            _( 'dailyChange' ).textContent = 'N/A';

        }

    }

}

document.addEventListener( 'DOMContentLoaded', () => {
    window.app = new TruckFinancialTracker();
} );
