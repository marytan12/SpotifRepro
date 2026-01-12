// Spotify API Configuration
const SPOTIFY_CONFIG = {
    clientId: '56005d24a56a4c32bf0c13384a944802',
    clientSecret: '893e2261d39c49f79f6cd2091f146645',
    redirectUri: window.location.origin + '/spotify-player.html',
    scopes: [
        'user-read-currently-playing',
        'user-read-playback-state',
        'user-modify-playback-state',
        'streaming',
        'user-read-email',
        'user-read-private'
    ]
};

class SpotifyPlayer {
    constructor() {
        this.accessToken = null;
        this.player = null;
        this.deviceId = null;
    }

    // Generate authorization URL
    getAuthUrl() {
        const params = new URLSearchParams({
            client_id: SPOTIFY_CONFIG.clientId,
            response_type: 'code',
            redirect_uri: SPOTIFY_CONFIG.redirectUri,
            scope: SPOTIFY_CONFIG.scopes.join(' '),
            show_dialog: true
        });
        return `https://accounts.spotify.com/authorize?${params.toString()}`;
    }

    // Exchange authorization code for access token
    async getAccessToken(code) {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: SPOTIFY_CONFIG.redirectUri,
            client_id: SPOTIFY_CONFIG.clientId,
            client_secret: SPOTIFY_CONFIG.clientSecret
        });

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            const data = await response.json();
            this.accessToken = data.access_token;
            localStorage.setItem('spotify_access_token', data.access_token);
            localStorage.setItem('spotify_refresh_token', data.refresh_token);
            localStorage.setItem('spotify_token_expiry', Date.now() + (data.expires_in * 1000));
            
            return data.access_token;
        } catch (error) {
            console.error('Error getting access token:', error);
            throw error;
        }
    }

    // Refresh access token
    async refreshAccessToken() {
        const refreshToken = localStorage.getItem('spotify_refresh_token');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: SPOTIFY_CONFIG.clientId,
            client_secret: SPOTIFY_CONFIG.clientSecret
        });

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            const data = await response.json();
            this.accessToken = data.access_token;
            localStorage.setItem('spotify_access_token', data.access_token);
            localStorage.setItem('spotify_token_expiry', Date.now() + (data.expires_in * 1000));
            
            return data.access_token;
        } catch (error) {
            console.error('Error refreshing token:', error);
            throw error;
        }
    }

    // Check if token is valid
    isTokenValid() {
        const expiry = localStorage.getItem('spotify_token_expiry');
        return expiry && Date.now() < parseInt(expiry);
    }

    // Get current token
    async getValidToken() {
        const storedToken = localStorage.getItem('spotify_access_token');
        
        if (storedToken && this.isTokenValid()) {
            this.accessToken = storedToken;
            return storedToken;
        }

        if (!this.isTokenValid()) {
            return await this.refreshAccessToken();
        }

        return null;
    }

    // Get currently playing track
    async getCurrentlyPlaying() {
        const token = await this.getValidToken();
        if (!token) {
            throw new Error('No valid token');
        }

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 204) {
                return null; // Nothing playing
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching currently playing:', error);
            throw error;
        }
    }

    // Get playback state
    async getPlaybackState() {
        const token = await this.getValidToken();
        if (!token) {
            throw new Error('No valid token');
        }

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 204) {
                return null;
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching playback state:', error);
            throw error;
        }
    }

    // Playback controls
    async play() {
        const token = await this.getValidToken();
        await fetch(`https://api.spotify.com/v1/me/player/play`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async pause() {
        const token = await this.getValidToken();
        await fetch(`https://api.spotify.com/v1/me/player/pause`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async skipNext() {
        const token = await this.getValidToken();
        await fetch(`https://api.spotify.com/v1/me/player/next`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async skipPrevious() {
        const token = await this.getValidToken();
        await fetch(`https://api.spotify.com/v1/me/player/previous`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async seek(positionMs) {
        const token = await this.getValidToken();
        await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async setVolume(volumePercent) {
        const token = await this.getValidToken();
        await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async toggleShuffle(state) {
        const token = await this.getValidToken();
        await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async setRepeatMode(mode) {
        // mode: 'track', 'context', 'off'
        const token = await this.getValidToken();
        await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${mode}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }
}

// Export for use in main app
window.SpotifyPlayer = SpotifyPlayer;
window.SPOTIFY_CONFIG = SPOTIFY_CONFIG;
