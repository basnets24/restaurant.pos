type User = { name?: string; role?: string | string[]; roles?: string[] } & Record<string, any>;
type Sub = number;

class AuthorizeService {
    private _auth = false;
    private _user: User | null = null;
    private _subs = new Map<Sub, () => void>();
    private _id = 0;

    async isAuthenticated() { return this._auth; }
    async getUser() { return this._user; }

    // mock sign in/out just for UI testing
    async signIn(name = "Demo User", role: string | string[] = "Admin") {
        this._auth = true;
        this._user = { name, role };
        this.emit();
    }
    async signOut() {
        this._auth = false;
        this._user = null;
        this.emit();
    }

    subscribe(cb: () => void): Sub { const id = ++this._id; this._subs.set(id, cb); return id; }
    unsubscribe(id: Sub) { this._subs.delete(id); }

    private emit() { for (const cb of this._subs.values()) cb(); }
}
const authService = new AuthorizeService();
export default authService;
