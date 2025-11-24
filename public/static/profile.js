const _ = ( id ) => document.getElementById( id );

const openProfile = ( profileId ) => location.href = '?profile=' + profileId;

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
            `<div class="profile-actions">` +
                `<button class="btn primary" onclick="openProfile('${p.profileId}')">Open Profile</button>` +
                `<button class="btn danger" onclick="deleteProfile('${p.profileId}')">Delete</button>` +
            `</div>` +
        `</div>` ).join( '' );

    } catch ( err ) { list.innerHTML = `<div class="empty">Error loading profiles: ${err.message}</div>` }

}

document.addEventListener( 'DOMContentLoaded', function () {

    loadProfiles();

} );
