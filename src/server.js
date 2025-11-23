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

app.post( '/api/dailyRecord', async ( req, res ) => {
    if ( ! conn.test( req.body.profileId ) ) res.sendStatus( 500 );
    else res.json( await conn.addRecord( req.body.cashBalance ) );
} );

app.post( '/api/garage/edit', async ( req, res ) => {
    if ( ! conn.test( req.body.profileId ) ) res.sendStatus( 500 );
    else res.json( await conn.editGarage( req.body ) );
} );

app.post( '/api/garage/delete', async ( req, res ) => {
    if ( ! conn.test( req.body.profileId ) ) res.sendStatus( 500 );
    else res.json( await conn.deleteGarage( req.body.garageId ) );
} );

app.post( '/api/truck/edit', async ( req, res ) => {
    if ( ! conn.test( req.body.profileId ) ) res.sendStatus( 500 );
    else res.json( await conn.editTruck( req.body ) );
} );

app.post( '/api/truck/delete', async ( req, res ) => {
    if ( ! conn.test( req.body.profileId ) ) res.sendStatus( 500 );
    else res.json( await conn.deleteTruck( req.body.truckId ) );
} );

app.post( '/api/trailer/edit', async ( req, res ) => {
    if ( ! conn.test( req.body.profileId ) ) res.sendStatus( 500 );
    else res.json( await conn.editTrailer( req.body ) );
} );

app.post( '/api/trailer/delete', async ( req, res ) => {
    if ( ! conn.test( req.body.profileId ) ) res.sendStatus( 500 );
    else res.json( await conn.deleteTrailer( req.body.trailerId ) );
} );

app.post( '/api/driver/edit', async ( req, res ) => {
    if ( ! conn.test( req.body.profileId ) ) res.sendStatus( 500 );
    else res.json( await conn.editDriver( req.body ) );
} );

app.post( '/api/driver/delete', async ( req, res ) => {
    if ( ! conn.test( req.body.profileId ) ) res.sendStatus( 500 );
    else res.json( await conn.deleteDriver( req.body.driverId ) );
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
