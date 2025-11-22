import { Database } from './database.js';
import { join } from 'node:path';
import express from 'express';

const cwd = process.cwd();
const port = process.env.PORT || 3000;
const app = express();

// Database connection
var conn = null;

// Middleware
app.use( express.json() );
app.use( express.urlencoded( { extended: true } ) );
app.use( '/static', express.static( join( cwd, 'public/static' ) ) );

// Serve API
app.post( '/api/profile', async ( req, res ) => {
    if ( ! conn.test( req.body.profileId ) ) res.sendStatus( 500 );
    else res.json( await conn.getData() );
} );

// Main page
app.get( '/', async ( req, res ) => {

    const profileId = req.query.profile;
    conn = new Database( profileId );

    res.sendFile( join( cwd, 'public/index.html' ) );

} );

// Start server
app.listen( port || 3000, () => console.log(
    `Truck Financial Tracker server running on http://localhost:${port}`
) );
