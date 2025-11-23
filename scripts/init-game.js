#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import clc from 'cli-color';
import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';

const weekDays = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];

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
    choices: weekDays
}, {
    type: 'input', name: 'startingCash', message: 'Enter your starting cash amount:', default: '5000',
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

    try {

        const profileId = uuidv4();
        const cash = Number( answers.startingCash );
        const gameData = {
            profileId,
            gameInfo: {
                playerName: answers.playerName,
                companyName: answers.companyName,
                game: answers.game,
                startingLocation: answers.startingLocation,
                currency: answers.currency,
                startingCash: cash,
                startingWeekday: weekDays.indexOf( answers.startingWeekday ),
                createdAt: new Date().toISOString()
            },
            assets: {
                garages: [],
                trucks: [],
                trailers: [],
                drivers: [],
                loans: []
            },
            dailyRecords: [],
            currentDay: Number( answers.startingDay )
        };

        if ( gameData.currentDay === 0 ) {

            gameData.dailyRecords.push( {
                id: uuidv4(), day: 0, totalCap: cash,
                assets: { cashBalance: cash, garageValue: 0, truckValue: 0, trailerValue: 0, totalLoans: 0 },
                profit: { today: 0, avg7: 0, avg30: 0, avg90: 0 },
                report: { netAssets: cash, totalDebt: 0, cashOnHand: cash, cashRatio: 1 }
            } );

            gameData.assets.garages.push( {
                id: uuidv4(), location: answers.startingLocation,
                size: 'small', value: 0, day: 0
            } );

        }

        const dataDir = join( process.cwd(), 'data' );
        await mkdir( dataDir, { recursive: true } );

        const dataPath = join( dataDir, profileId + '.json' );
        await writeFile( dataPath, JSON.stringify( gameData, null, 2 ) );

        console.log( clc.bold.green( 'Game initialized successfully!' ) );
        console.log( clc.bold( `Your profile ID is [${profileId}]` ) );
        console.log( '' );
        console.log( 'To start the web application, run:' );
        console.log( '   npm start' );
        console.log( '' );
        console.log( `Then open http://localhost:3000?profile=${profileId} in your browser` );
        console.log( '' );

    } catch ( err ) {

        console.log( '' );
        console.error( clc.bold.red( 'Error initializing game:', err.message ) );
        console.log( '' );

        process.exit( 1 );

    }

} );
