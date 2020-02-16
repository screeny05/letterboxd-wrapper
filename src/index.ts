import { CookieJar } from 'tough-cookie';
import got, { Got } from 'got';

const LETTERBOXD_ORIGIN = 'https://letterboxd.com';

export class LetterboxdApi {
    private cookieJar: CookieJar = new CookieJar();
    private got: Got;

    private get csrfToken(): string|undefined {
        return this.cookieJar
            .getCookiesSync(LETTERBOXD_ORIGIN)
            .find(cookie => cookie.key.includes('csrf'))?.value;
    }

    constructor(private username: string, private password: string) {
        this.got = got.extend({
            cookieJar: this.cookieJar
        });
    }

    async authenticate(): Promise<void> {
        // Pre-flight to fetch csrf-token
        await this.got.head(LETTERBOXD_ORIGIN);

        const login = await this.got.post(`${LETTERBOXD_ORIGIN}/user/login.do`, {
            form: {
                __csrf: this.csrfToken,
                remember: true,
                username: this.username,
                password: this.password
            }
        }).json<any>();

        if(login.result !== 'success'){
            throw new Error(login.messages.join('\n'));
        }
    }

    async getSlug(tmdbId?: string, imdbId?: string): Promise<string|undefined> {
        if(tmdbId){
            try {
                return await this.getSlugByDbId('tmdb', tmdbId);
            } catch (e){ }
        }
        if(imdbId){
            try {
                return await this.getSlugByDbId('imdb', imdbId);
            } catch (e){ }
        }
        throw new Error(`Letterboxd movie with IMDB-ID ${imdbId}/TMDB-ID ${tmdbId} not found.`);
    }

    async getSlugByDbId(dbName: 'imdb' | 'tmdb', id: string): Promise<string|undefined> {
        const response = await this.got.head(`${LETTERBOXD_ORIGIN}/${dbName}/${id}/`, {
            followRedirect: false
        });

        if(response.statusCode !== 302){
            throw new Error(`Letterboxd db-request ${dbName}-${id} failed with status ${response.statusCode}`);
        }

        return response.headers.location?.replace(/^\/film\/(.*?)\//, '$1');
    }

    async markAsWatched(slug: string, isWatched = true): Promise<void> {
        const action = isWatched ? 'mark-as-watched' : 'mark-as-not-watched';

        const response = await this.got.post(`${LETTERBOXD_ORIGIN}/film/${slug}/${action}/`, {
            form: { __csrf: this.csrfToken },
        }).json<any>();

        if(response.result !== true){
            throw new Error(response.data);
        }
    }
}
