import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

export class Database {

    constructor ( profileId ) {

        this.profileId = profileId;
        this.path = join( process.cwd(), `data/${this.profileId}.json` );
        this.data = null;

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
        const garageValue = assets.garages.reduce( ( s, a ) => s + a.value, 0 );
        const truckValue = assets.trucks.reduce( ( s, a ) => s + a.value, 0 );
        const trailerValue = assets.trailers.reduce( ( s, a ) => s + a.value, 0 );
        const totalDebt = assets.loans.reduce( ( s, a ) => s + a.remaining, 0 );

        const totalCap = cashBalance + garageValue + truckValue + trailerValue;
        const netAssets = totalCap - totalDebt;
        const cashOnHand = cashBalance;
        const cashRatio = cashBalance / totalCap;

        const rec = this.data.dailyRecords ?? [];
        const last = rec.length ? rec[ rec.length - 1 ].totalCap : null;
        const today = last !== null ? totalCap - last : 0;

        const avg = d => {

            if ( rec.length < 1 ) return 0;
            let sum = 0, count = 0;

            for ( let i = rec.length - 1; i >= 0 && count < d; i-- ) {

                const prev = i ? rec[ i - 1 ].totalCap : null;
                if ( prev === null ) break;

                sum += rec[ i ].totalCap - prev;
                count++;

            }

            return count ? sum / count : 0;

        };

        this.data.currentDay++;
        this.data.dailyRecords.push( {
            id: uuidv4(), day: this.data.currentDay, totalCap,
            assets: { cashBalance, garageValue, truckValue, trailerValue },
            profit: { today, avg7: avg( 7 ), avg30: avg( 30 ), avg90: avg( 90 ) },
            report: { netAssets, totalDebt, cashOnHand, cashRatio }
        } );

        this.saveGame();
        return this.data;

    }

}
