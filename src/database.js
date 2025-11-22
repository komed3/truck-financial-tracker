import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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

        await writeFile( this.path, JSON.stringify( data, null, 2 ), 'utf8' );
        this.data = data;

    }

    async getData () {

        if ( ! this.data ) await this.loadGame();
        return this.data;

    }

}
