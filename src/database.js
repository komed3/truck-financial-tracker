import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

export class Database {

    constructor ( profileId ) {

        this.profileId = profileId;
        this.path = join( process.cwd(), `data/${this.profileId}.json` );
        this.data = null;

    }

    #n ( v, digits = 0 ) { return Number( Number( v ).toFixed( digits ) ) }

    #assetById ( type, id ) { return ( this.data?.assets[ type ] ?? [] ).filter( r => r.id === id ) }

    #updateAsset ( type, data ) {

        if ( ! this.data?.assets ) this.data.assets = {};
        if ( ! this.data.assets[ type ] ) this.data.assets[ type ] = [];

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

        const { assets } = this.data;
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
        const cashRatio = this.#n( cashBalance / totalCap, 4 );

        const rec = this.data.dailyRecords ?? [];
        const last = rec.length ? rec[ rec.length - 1 ].totalCap : null;
        const today = this.#n( last !== null ? totalCap - last : 0 );

        const avg = d => {

            if ( rec.length < 1 ) return 0;
            let sum = 0, count = 0;

            for ( let i = rec.length - 1; i >= 0 && count < d; i-- ) {

                const prev = i ? rec[ i - 1 ].totalCap : null;
                if ( prev === null ) break;

                sum += rec[ i ].totalCap - prev;
                count++;

            }

            return this.#n( count ? sum / count : 0, 2 );

        };

        this.data.currentDay++;
        this.data.dailyRecords.push( {
            id: uuidv4(), day: this.data.currentDay, totalCap,
            assets: { cashBalance, garageValue, truckValue, trailerValue },
            profit: { today, avg7: avg( 7 ), avg30: avg( 30 ), avg90: avg( 90 ) },
            report: { netAssets, totalDebt, cashOnHand, cashRatio },
            stats: { garages, parkingLots, trucks, trailers, drivers }
        } );

        this.saveGame();
        return this.data;

    }

    async updateGarage ( data ) {

        if ( ! this.data ) await this.loadGame();

        const garage = { ...( data.garageId && this.#assetById( 'garages', data.garageId ) || {} ), ...{
            location: data.location, size: data.size, value: data.value
        } };

        if ( ! garage.id ) garage.id = uuidv4();
        if ( ! garage.day ) garage.day = this.data.currentDay;

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

}
