/**
 * ITERATION - Remote Leaderboard Adapter
 *
 * Optional global-leaderboard backend. DISABLED by default: until a URL +
 * key are configured (via window.ITERATION_LEADERBOARD), every method is a
 * no-op and the game behaves exactly as before (local-only scores).
 *
 * The request shape targets Supabase's auto-generated REST API (PostgREST),
 * which is the recommended host, but the contract is deliberately small —
 * a single POST to insert a row and a single GET to read the top N — so it
 * also fits a tiny Cloudflare Worker or any custom REST endpoint with minor
 * tweaks to buildSubmit()/buildFetch().
 *
 * --- Supabase setup (one time) -------------------------------------------
 *   1. Create a free project at supabase.com.
 *   2. SQL editor → run:
 *        create table scores (
 *          id           bigint generated always as identity primary key,
 *          board        text    not null,
 *          name         text    not null default 'ANON',
 *          score        double precision not null,
 *          display_score text,
 *          character    text,
 *          final_level  int,
 *          deaths       int,
 *          time_ms      bigint,
 *          week_id      text,
 *          created_at   timestamptz not null default now()
 *        );
 *        alter table scores enable row level security;
 *        create policy "read"   on scores for select using (true);
 *        create policy "insert" on scores for insert with check (true);
 *   3. In index.html set:
 *        window.ITERATION_LEADERBOARD = {
 *          url: "https://YOURPROJECT.supabase.co",
 *          anonKey: "YOUR-ANON-PUBLIC-KEY",
 *          table: "scores"
 *        };
 * -------------------------------------------------------------------------
 */

class RemoteLeaderboard {
    constructor(config) {
        const cfg = config ||
            (typeof window !== 'undefined' && window.ITERATION_LEADERBOARD) || {};
        this.url = (cfg.url || '').replace(/\/+$/, '');
        this.key = cfg.anonKey || cfg.key || '';
        this.table = cfg.table || 'scores';
        this.timeoutMs = cfg.timeoutMs || 6000;

        if (this.isEnabled()) {
            console.log('[LEADERBOARD] Remote backend configured:', this.url);
        } else {
            console.log('[LEADERBOARD] Remote backend not configured (local-only).');
        }
    }

    /** Remote sync only runs when a URL + key are present. */
    isEnabled() {
        return !!(this.url && this.key);
    }

    /** REST endpoint for the scores table. */
    endpoint() {
        return `${this.url}/rest/v1/${this.table}`;
    }

    /** Headers required by Supabase / PostgREST. */
    headers(extra) {
        return Object.assign({
            'Content-Type': 'application/json',
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`
        }, extra || {});
    }

    /** Map a local board entry to a remote row. */
    toRow(boardId, entry) {
        return {
            board: boardId,
            name: (entry.name || entry.character || 'ANON').toString().slice(0, 24),
            score: entry.score,
            display_score: entry.displayScore,
            character: entry.character,
            final_level: entry.finalLevel,
            deaths: entry.deaths,
            time_ms: entry.timeMs,
            week_id: entry.weekId || null
        };
    }

    /** Map a remote row back to the entry shape the UI already renders. */
    fromRow(row) {
        return {
            id: row.id,
            score: row.score,
            displayScore: row.display_score,
            name: row.name,
            character: row.character,
            finalLevel: row.final_level,
            deaths: row.deaths,
            timeMs: row.time_ms,
            weekId: row.week_id,
            date: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
            remote: true
        };
    }

    /** Build the insert request (exposed for non-Supabase backends to override). */
    buildSubmit(boardId, entry) {
        return {
            url: this.endpoint(),
            options: {
                method: 'POST',
                headers: this.headers({ 'Prefer': 'return=minimal' }),
                body: JSON.stringify(this.toRow(boardId, entry))
            }
        };
    }

    /** Build the top-N read request. */
    buildFetch(boardId, limit, sortOrder) {
        const order = sortOrder === 'asc' ? 'asc' : 'desc';
        const params = new URLSearchParams({
            board: `eq.${boardId}`,
            select: '*',
            order: `score.${order}`,
            limit: String(limit || 20)
        });
        return { url: `${this.endpoint()}?${params.toString()}`, options: { headers: this.headers() } };
    }

    async _fetch(url, options) {
        // AbortController-based timeout so a slow/blocked backend never hangs the UI.
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;
        try {
            return await fetch(url, Object.assign({}, options, controller ? { signal: controller.signal } : {}));
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    /**
     * Fire-and-forget insert. Never throws — a leaderboard outage must not
     * interrupt gameplay. Returns a promise resolving to true/false.
     */
    async submit(boardId, entry) {
        if (!this.isEnabled()) return false;
        try {
            const { url, options } = this.buildSubmit(boardId, entry);
            const res = await this._fetch(url, options);
            if (!res.ok) {
                console.warn('[LEADERBOARD] remote submit failed:', res.status);
                return false;
            }
            return true;
        } catch (e) {
            console.warn('[LEADERBOARD] remote submit error:', e.message);
            return false;
        }
    }

    /**
     * Fetch the global top-N for a board. Returns [] on any failure so the UI
     * can fall back to local scores.
     */
    async fetchTop(boardId, limit, sortOrder) {
        if (!this.isEnabled()) return [];
        try {
            const { url, options } = this.buildFetch(boardId, limit, sortOrder);
            const res = await this._fetch(url, options);
            if (!res.ok) {
                console.warn('[LEADERBOARD] remote fetch failed:', res.status);
                return [];
            }
            const rows = await res.json();
            return Array.isArray(rows) ? rows.map(r => this.fromRow(r)) : [];
        } catch (e) {
            console.warn('[LEADERBOARD] remote fetch error:', e.message);
            return [];
        }
    }
}

if (typeof window !== 'undefined') {
    window.RemoteLeaderboard = RemoteLeaderboard;
}
