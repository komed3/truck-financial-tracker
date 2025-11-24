const _ = ( id ) => document.getElementById( id );

const openProfile = ( profileId ) => location.href = '?profile=' + profileId;

async function deleteProfile ( profileId ) {

    if ( confirm( 'Do you really want to delete this profile? This action cannot be undone.' ) ) {

        await fetch( '/api/delete', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( { profileId } )
        } );

        await loadProfiles();

    }

}

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

async function createProfile ( form ) {

    try {

        const res = await fetch( '/api/create', {
            method: 'post',
            body: JSON.stringify( Object.fromEntries( new FormData( form ) ) ),
            headers: { 'Content-Type': 'application/json' }
        } );

        if ( ! res.ok ) return;
        form.reset();

        const { profileId, err } = await res.json();
        if ( profileId ) openProfile( profileId );
        else if ( err ) throw err;
        else await loadProfiles();

    } catch ( err ) { alert( 'Error occured: ' + err.message ) }

}

document.addEventListener( 'DOMContentLoaded', function () {

    loadProfiles();

    _( 'createProfileForm' ).addEventListener( 'submit', async ( e ) => {
        e.preventDefault(); await createProfile( e.target );
    } );

} );
