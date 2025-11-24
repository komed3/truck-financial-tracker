import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = join( process.cwd(), 'data' );

export class Database {

    static async index () {

        const files = ( await readdir( DATA_DIR ) ).filter( f => f.endsWith( '.json' ) );
        const profiles = [];

        for ( const file of files ) {

            const fileContent = await readFile( join( DATA_DIR, file ) );
            const { profileId, gameInfo } = JSON.parse( fileContent ?? '{}' );

            profiles.push( { profileId, gameInfo } );

        }

        return profiles;

    }

    static async create ( data ) {

        try {

            const profileId = uuidv4();
            const cash = Number( data.startingCash ?? 2000 );
            const gameData = {
                profileId,
                gameInfo: {
                    playerName: data.playerName || 'Player',
                    companyName: data.companyName || '',
                    game: data.game || 'ets2',
                    startingLocation: data.startingLocation || '',
                    currency: data.currency || ( data.game === 'ats' ? 'USD' : 'EUR' ),
                    startingCash: cash,
                    startingWeekday: Number( data.startingWeekday ?? 1 ) % 7,
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
                currentDay: Number( data.startingDay ?? 0 )
            };

            if ( gameData.currentDay === 0 ) {

                gameData.currentDay++;

                gameData.dailyRecords.push( {
                    id: uuidv4(), day: 0, totalCap: cash,
                    assets: { cashBalance: cash, garageValue: 0, truckValue: 0, trailerValue: 0, totalLoans: 0 },
                    profit: { today: 0, avg7: 0, avg30: 0, avg90: 0 },
                    report: { netAssets: cash, totalDebt: 0, cashOnHand: cash, cashRatio: 1 },
                    stats: { garages: 1, parkingLots: 1, trucks: 0, trailers: 0, drivers: 0 }
                } );

                gameData.assets.garages.push( {
                    id: uuidv4(), location: gameData.gameInfo.startingLocation,
                    size: 'small', value: 0, day: 0
                } );

            }

            const path = join( DATA_DIR, profileId + '.json' );
            await mkdir( DATA_DIR, { recursive: true } );
            await writeFile( path, JSON.stringify( gameData, null, 2 ) );

            return { profileId };

        } catch ( err ) { return { profileId: false, err } }

    }

    constructor ( profileId ) {

        this.profileId = profileId;
        this.path = join( DATA_DIR, `${this.profileId}.json` );
        this.data = null;

    }

    #n ( v, digits = 0 ) { return Number( Number( v ).toFixed( digits ) ) }

    #assetById ( type, id ) { return ( this.data?.assets[ type ] ?? [] ).filter( r => r.id === id )[ 0 ] ?? null }

    #updateAsset ( type, data ) {

        if ( ! this.data?.assets ) this.data.assets = {};
        if ( ! this.data.assets[ type ] ) this.data.assets[ type ] = [];

        if ( ! data.id ) data.id = uuidv4();
        if ( ! ( 'day' in data ) ) data.day = this.data.currentDay;

        const assets = this.data.assets[ type ];
        const index = assets.findIndex( a => a.id === data.id );

        if ( index >= 0 ) assets[ index ] = data;
        else assets.push( data );

    }

    #deleteAsset ( type, id ) {

        if ( ! this.data?.assets ) return;
        if ( ! this.data.assets[ type ] ) return;

        const assets = this.data.assets[ type ];
        const index = assets.findIndex( a => a.id === id );

        if ( index >= 0 ) assets.splice( index, 1 );

    }

    test ( profileId ) { return this.profileId === profileId }

    async loadGame () {

        try {

            const fileContent = await readFile( this.path, 'utf8' );
            this.data = JSON.parse( fileContent );
            return this.data;

        } catch ( err ) {

            if ( err.code === 'ENOENT' ) throw new Error( 'Game data file not found. Please initialize a new game first.' );
            throw err;

        }

    }

    async saveGame ( data ) {

        await writeFile( this.path, JSON.stringify( this.data, null, 2 ), 'utf8' );
        this.data = data;

    }

    async getData () {

        if ( ! this.data ) await this.loadGame();
        return this.data;

    }

    async addRecord ( cashBalance ) {

        if ( ! this.data ) await this.loadGame();

        cashBalance = this.#n( cashBalance );
        const { assets } = this.data;

        assets.loans.forEach( l => { if ( l.remaining > 0 && this.data.currentDay > l.day )
            l.remaining = Math.max( 0, l.remaining - l.dailyInstallment );
        } );

        const garageValue = this.#n( assets.garages.reduce( ( s, a ) => s + a.value, 0 ) );
        const truckValue = this.#n( assets.trucks.reduce( ( s, a ) => s + a.value, 0 ) );
        const trailerValue = this.#n( assets.trailers.reduce( ( s, a ) => s + a.value, 0 ) );
        const totalDebt = this.#n( assets.loans.reduce( ( s, a ) => s + a.remaining, 0 ) );

        const garages = this.#n( assets.garages.length || 0 );
        const trucks = this.#n( assets.trucks.length || 0 );
        const trailers = this.#n( assets.trailers.length || 0 );
        const drivers = this.#n( assets.drivers.length || 0 );

        const parkingLots = this.#n( assets.garages.reduce( ( s, a ) => s + {
            small: 1, medium: 3, large: 5
        }[ a.size ], 0 ) );

        const totalCap = this.#n( cashBalance + garageValue + truckValue + trailerValue );
        const netAssets = this.#n( totalCap - totalDebt );
        const cashOnHand = this.#n( cashBalance );
        const cashRatio = this.#n( Math.min( 1, Math.max( 0, cashBalance / totalCap ) ), 4 );

        const rec = this.data.dailyRecords || [];
        const vals = rec.map( r => r.report.netAssets ); vals.push( netAssets );
        const m = vals.length;

        const avg = ( d ) => {

            const k = Math.min( d, Math.max( 0, m - 1 ) );
            if ( ! k ) return 0;

            let sum = 0;
            for ( let i = m - 1; i > m - 1 - k; i-- ) sum += vals[ i ] - vals[ i - 1 ];

            return sum / k;

        };

        this.data.dailyRecords.push( {
            id: uuidv4(), day: this.data.currentDay, totalCap,
            assets: { cashBalance, garageValue, truckValue, trailerValue },
            profit: { today: avg( 1 ), avg7: avg( 7 ), avg30: avg( 30 ), avg90: avg( 90 ) },
            report: { netAssets, totalDebt, cashOnHand, cashRatio },
            stats: { garages, parkingLots, trucks, trailers, drivers }
        } );

        this.data.currentDay++;
        this.saveGame();
        return this.data;

    }

    async editGarage ( data ) {

        if ( ! this.data ) await this.loadGame();

        const garage = { ...( data.garageId && this.#assetById( 'garages', data.garageId ) || {} ), ...{
            location: data.location, size: data.size, value: this.#n( data.value )
        } };

        this.#updateAsset( 'garages', garage );
        this.saveGame();
        return this.data;

    }

    async deleteGarage ( garageId ) {

        if ( ! this.data ) await this.loadGame();

        this.#deleteAsset( 'garages', garageId );
        this.saveGame();
        return this.data;

    }

    async editTruck ( data ) {

        if ( ! this.data ) await this.loadGame();

        const truck = { ...( data.truckId && this.#assetById( 'trucks', data.truckId ) || {} ), ...{
            brand: data.brand, model: data.model, value: this.#n( data.value ), condition: data.condition
        } };

        this.#updateAsset( 'trucks', truck );
        this.saveGame();
        return this.data;

    }

    async deleteTruck ( truckId ) {

        if ( ! this.data ) await this.loadGame();

        this.#deleteAsset( 'trucks', truckId );
        this.saveGame();
        return this.data;

    }

    async editTrailer ( data ) {

        if ( ! this.data ) await this.loadGame();

        const trailer = { ...( data.trailerId && this.#assetById( 'trailers', data.trailerId ) || {} ), ...{
            type: data.type, capacity: data.capacity, value: this.#n( data.value ), condition: data.condition
        } };

        this.#updateAsset( 'trailers', trailer );
        this.saveGame();
        return this.data;

    }

    async deleteTrailer ( trailerId ) {

        if ( ! this.data ) await this.loadGame();

        this.#deleteAsset( 'trailers', trailerId );
        this.saveGame();
        return this.data;

    }

    async editDriver ( data ) {

        if ( ! this.data ) await this.loadGame();

        const driver = { ...( data.driverId && this.#assetById( 'drivers', data.driverId ) || {} ), ...{
            name: data.name, status: data.status, skillLevel: data.skillLevel
        } };

        this.#updateAsset( 'drivers', driver );
        this.saveGame();
        return this.data;

    }

    async deleteDriver ( driverId ) {

        if ( ! this.data ) await this.loadGame();

        this.#deleteAsset( 'drivers', driverId );
        this.saveGame();
        return this.data;

    }

    async editLoan ( data ) {

        if ( ! this.data ) await this.loadGame();

        const loan = { ...( data.loanId && this.#assetById( 'loans', data.loanId ) || {} ), ...{
            amount: this.#n( data.amount ),
            remaining: this.#n( data.remaining || ( data.dailyInstallment * data.term ) ),
            term: this.#n( data.term ),
            interestRate: this.#n( data.interestRate ),
            dailyInstallment: this.#n( data.dailyInstallment )
        } };

        this.#updateAsset( 'loans', loan );
        this.saveGame();
        return this.data;

    }

    async clearingLoan ( loanId ) {

        if ( ! this.data ) await this.loadGame();

        const loan = this.#assetById( 'loans', loanId );
        if ( ! loan ) return;

        loan.remaining = 0;

        this.#updateAsset( 'loans', loan );
        this.saveGame();
        return this.data;

    }

}
