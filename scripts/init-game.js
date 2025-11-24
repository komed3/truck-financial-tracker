#!/usr/bin/env node

import { Database } from '../src/database.js';
import clc from 'cli-color';
import inquirer from 'inquirer';

console.log( clc.bold.yellow( 'Init new ETS2 / ATS game save file' ) );
console.log( '' );
console.log( 'You`ll be prompted some questions about the game itself and your company.' );
console.log( 'The script will generate a new save file to store financial data.' );
console.log( 'When finished, you`ll get a link to your created profile.' );
console.log( '' );

inquirer.prompt( [ {
    type: 'select', name: 'game', message: 'Which game are you playing?',
    choices: [
        { value: 'ets2', name: 'Euro Truck Simulator 2' },
        { value: 'ats', name: 'American Truck Simulator' }
    ]
}, {
    type: 'input', name: 'playerName', message: 'Enter your player/profile name:',
    validate: i => i.trim() !== '' || 'Player name is required'
}, {
    type: 'input', name: 'companyName', message: 'Enter your company name:',
    validate: i => i.trim() !== '' || 'Company name is required'
}, {
    type: 'input', name: 'startingLocation', message: 'Enter your HQ town:',
    validate: i => i.trim() !== '' || 'Headquarters location is required'
}, {
    type: 'select', name: 'currency', message: 'Select your currency:',
    choices: a => {
        if ( a.game === 'ets2' ) return [ 'EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN' ];
        else return [ 'USD' ];
    }
}, {
    type: 'input', name: 'startingDay', message: 'Enter the starting day number:', default: '0',
    validate: i => ! isNaN( i ) && i >= 0 || 'Starting day must be a number'
}, {
    type: 'select', name: 'startingWeekday', message: 'Select the starting day of the week:',
    choices: [
        { value: 0, name: 'Sunday' }, { value: 1, name: 'Monday' }, { value: 2, name: 'Tuesday' },
        { value: 3, name: 'Wednesday' }, { value: 4, name: 'Thursday' }, { value: 5, name: 'Friday' },
        { value: 6, name: 'Saturday' } ]
}, {
    type: 'input', name: 'startingCash', message: 'Enter your starting cash amount:', default: '2000',
    validate: i => ! isNaN( i ) && i >= 0 || 'Starting cash must be a number'
}, {
    type: 'confirm', name: 'confirm', message: 'Do you want to confirm and create the game?'
} ] ).then( async ( answers ) => {

    console.log( '' );

    if ( ! answers.confirm ) {
        console.log( clc.bold.red( 'Game initialization cancelled.' ) );
        return;
    }

    console.log( 'New game save file will be created ...' );
    console.log( '' );

    const { profileId, err } = await Database.create( answers );

    if ( profileId ) {

        console.log( clc.bold.green( 'Game initialized successfully!' ) );
        console.log( clc.bold( `Your profile ID is [${profileId}]` ) );
        console.log( '' );
        console.log( 'To start the web application, run:' );
        console.log( '   npm start' );
        console.log( '' );
        console.log( `Then open http://localhost:3000?profile=${profileId} in your browser` );
        console.log( '' );

    } else if ( err ) {

        console.log( '' );
        console.error( clc.bold.red( 'Error initializing game:', err.message ) );
        console.log( '' );

        process.exit( 1 );

    }

} );
