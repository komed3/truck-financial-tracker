const $ = ( selector ) => document.querySelector( selector );
const $$ = ( selector ) => document.querySelectorAll( selector );
const _ = ( id ) => document.getElementById( id );

class TruckFinancialTracker {

    constructor () {

        this.profileId = new URLSearchParams( window.location.search ).get( 'profile' );
        this.data = null;
        this.currency = 'EUR';

        this.loadData();

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

}

document.addEventListener( 'DOMContentLoaded', () => {
    window.app = new TruckFinancialTracker();
} );
