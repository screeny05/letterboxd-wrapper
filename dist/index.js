"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tough_cookie_1 = require("tough-cookie");
const got_1 = __importDefault(require("got"));
const LETTERBOXD_ORIGIN = 'https://letterboxd.com';
class LetterboxdApi {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.cookieJar = new tough_cookie_1.CookieJar();
        this.got = got_1.default.extend({
            cookieJar: this.cookieJar
        });
    }
    get csrfToken() {
        var _a;
        return (_a = this.cookieJar
            .getCookiesSync(LETTERBOXD_ORIGIN)
            .find(cookie => cookie.key.includes('csrf'))) === null || _a === void 0 ? void 0 : _a.value;
    }
    async authenticate() {
        // Pre-flight to fetch csrf-token
        await this.got.head(LETTERBOXD_ORIGIN);
        const login = await this.got.post(`${LETTERBOXD_ORIGIN}/user/login.do`, {
            form: {
                __csrf: this.csrfToken,
                remember: true,
                username: this.username,
                password: this.password
            }
        }).json();
        if (login.result !== 'success') {
            throw new Error(login.messages.join('\n'));
        }
    }
    async getSlug(tmdbId, imdbId) {
        if (tmdbId) {
            try {
                return await this.getSlugByDbId('tmdb', tmdbId);
            }
            catch (e) { }
        }
        if (imdbId) {
            try {
                return await this.getSlugByDbId('imdb', imdbId);
            }
            catch (e) { }
        }
        throw new Error(`Letterboxd movie with IMDB-ID ${imdbId}/TMDB-ID ${tmdbId} not found.`);
    }
    async getSlugByDbId(dbName, id) {
        var _a;
        const response = await this.got.head(`${LETTERBOXD_ORIGIN}/${dbName}/${id}/`, {
            followRedirect: false
        });
        if (response.statusCode !== 302) {
            throw new Error(`Letterboxd db-request ${dbName}-${id} failed with status ${response.statusCode}`);
        }
        return (_a = response.headers.location) === null || _a === void 0 ? void 0 : _a.replace(/^\/film\/(.*?)\//, '$1');
    }
    async markAsWatched(slug, isWatched = true) {
        const action = isWatched ? 'mark-as-watched' : 'mark-as-not-watched';
        const response = await this.got.post(`${LETTERBOXD_ORIGIN}/film/${slug}/${action}/`, {
            form: { __csrf: this.csrfToken },
        }).json();
        if (response.result !== true) {
            throw new Error(response.data);
        }
    }
}
exports.LetterboxdApi = LetterboxdApi;
