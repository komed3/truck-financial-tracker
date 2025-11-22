import { join } from 'node:path';
import express from 'express';

const cwd = process.cwd();
const port = process.env.PORT || 3000;
const app = express();

// Middleware
app.use( express.json() );
app.use( express.urlencoded( { extended: true } ) );
app.use( express.static( join( cwd, 'public' ) ) );

// Main page
app.get( '/', ( _, res ) => res.sendFile( join( cwd, 'public/index.html' ) ) );

// Start server
app.listen( port || 3000, () =>
    console.log( `Truck Financial Tracker server running on http://localhost:${port}` )
);
