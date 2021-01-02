QuickDiscover
=============

(Works with Spotify)

With QuickDiscover, you quickly decide whether or not you want to add the currently playing track to a chosen playlist. This helps with discovering & curating music because you can play a radio of a song you like (or some other collection) and either add or skip with a single click!

## Development Setup

(assumes [npm](https://www.npmjs.com/get-npm) is installed)

1. Log in to [Spotify's Developer Dashboard](https://developer.spotify.com/dashboard/login)
2. On the [dashboard](https://developer.spotify.com/dashboard/applications), press `CREATE AN APP`
3. Enter in any app name (e.g. QuickDiscover) & description and create the app
4. On the app homepage (https://developer.spotify.com/dashboard/applications/UNIQUE_ID), press `EDIT SETTINGS`
5. Add the Redirect URI: `http://localhost:4999` (or wherever you will be hosting the app)
6. Press `SAVE`
7. Copy the `Client ID` field from the page and paste it into the `SPOTIFY_CLIENT_ID` variable at the top of `script.js`
8. Open this project folder in terminal and run `npm install`

### Usage

1. Run `npm run start`
2. Open [http://localhost:4999](http://localhost:4999)

## Production Setup

1. Follow steps 1-7 in `Development Setup` above

    > For step 5, if you are hosting at `https://domain.com/quickdiscover`, add that instead
