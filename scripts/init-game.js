#!/usr/bin/env node

import clc from 'cli-color';
import inquirer from 'inquirer';

console.log( clc.bold.yellow( 'Init new ETS2 / ATS game save file' ) );
console.log( '' );
console.log( 'You`ll be prompted some questions about the game itself and your company.' );
console.log( 'The script will generate a new save file to store financial data.' );
console.log( 'When finished, you`ll get a link to your created profile.' );
console.log( '' );

const answers = await inquirer.prompt( [ {
    type: 'select', name: 'game', message: 'Which game are you playing?',
    choices: [
        { value: 'ets2', name: 'Euro Truck Simulator 2' },
        { value: 'ats', name: 'American Truck Simulator' }
    ]
}, {
    type: 'input', name: 'player', message: 'Enter your player/profile name:',
    validate: i => i.trim() !== '' || 'Player name is required'
}, {
    type: 'input', name: 'company', message: 'Enter your company name:',
    validate: i => i.trim() !== '' || 'Company name is required'
}, {
    type: 'input', name: 'location', message: 'Enter your HQ town:'
}, {
    type: 'select', name: 'currency', message: 'Select your currency:',
    choices: a => {
        if ( a.game === 'ets2' ) return [ 'EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN' ];
        else return [ 'USD' ];
    }
}, {
    type: 'input', name: 'startingDay', message: 'Enter the starting day number:', default: 1,
    validate: i => ! isNaN( i ) && i > 0 || 'Starting day must be a number'
}, {
    type: 'select', name: 'startingWeekday', message: 'Select the starting day of the week:',
    choices: [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday' ]
}, {
    type: 'confirm', name: 'confirm', message: 'Do you want to confirm and create the game?'
} ] );
