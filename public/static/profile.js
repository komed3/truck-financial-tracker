const _ = ( id ) => document.getElementById( id );

async function loadProfiles () {

    const list = _( 'profilesList' );

    try {

        const res = await fetch( '/api/index' );
        if ( ! res.ok ) throw new Error( 'Failed to fetch profiles' );

        const profiles = await res.json();

        if ( ! profiles || profiles.length === 0 ) {
            list.innerHTML = '<div class="empty">No profiles found. Create a new one below.</div>';
            return;
        }

        list.innerHTML = profiles.map( p => `<div class="profile-card">` +
            `<h3>${p.gameInfo.playerName} — ${ p.gameInfo.game.toUpperCase() }</h3>` +
            `<p class="info">${p.gameInfo.companyName} • ${p.gameInfo.startingLocation} • ${p.gameInfo.currency}</p>` +
            `<p class="date">Created at ${ new Intl.DateTimeFormat( 'en-US' ).format( new Date( p.gameInfo.createdAt ) ) }</p>` +
            `<button class="btn primary" onclick="location.href='?profile=${p.profileId}'">Open Profile</button>` +
        `</div>` ).join( '' );

    } catch ( err ) { list.innerHTML = `<div class="empty">Error loading profiles: ${err.message}</div>` }

}

document.addEventListener( 'DOMContentLoaded', function () {

    loadProfiles();

} );
