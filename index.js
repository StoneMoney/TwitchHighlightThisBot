/*
  _  _ _____ ___  ___ _____  _   
 | || |_   _| _ )/ _ \_   _|| |_ 
 | __ | | | | _ \ (_) || ||_   _|
 |_||_| |_| |___/\___/ |_|  |_|  
 twitch-ht-bot-plus | ngiano 5.2.2020
*/
const tmi = require('tmi.js');
const axios = require('axios');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

//Google init
// Id of the spreadsheet, as seen in the url
const SPREADSHEET_ID = ''
// Name of the sheet you want the bot to post stuff into
const SPREADSHEET_SHEET_NAME = ''
// Generate Oauth2.0 credentials for Web Application | Add Sheets API scopes
// https://console.cloud.google.com/
const GOOGLE_AUTH_INFO = {
    "client_id": "",
    "client_secret": "",
    "redirect_uris": [
        ""
    ]
};
const { client_secret, client_id, redirect_uris } = GOOGLE_AUTH_INFO;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets']
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
// Refresh tokens are stored here
const REFRESH_TOKEN_PATH = "r-token.json"
// Store refresh tokens upon recieving
oAuth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
        fs.readFile(REFRESH_TOKEN_PATH, (err, reftokens) => {
            var jtoken;
            if (err) jtoken = { "refresh_tokens": [] }
            else jtoken = JSON.parse(reftokens);
            jtoken.refresh_tokens.unshift(tokens.refresh_token);
            fs.writeFile(REFRESH_TOKEN_PATH, JSON.stringify(jtoken), (err) => {
                if (err) return console.error(err);
                console.log('Refresh token stored to', REFRESH_TOKEN_PATH);
            });
        });
    }
});
// Load tokens
fs.readFile(TOKEN_PATH, (err, token) => {
    // If we don't have any tokens yet, start token retrival prompt
    if (err) return getNewToken(oAuth2Client);
    // Otherwise load them up
    oAuth2Client.setCredentials(JSON.parse(token));
});
//END GOOGLE INIT

//Twitch init

// Api key from twitch
// Obtain at dev.twitch.tv
const TWITCH_API_KEY = "";
// Channel that will be targetted for highlighting
const TWITCH_CHANNEL_NAME = "";
// Username of the chat bot
const TWITCH_CHAT_BOT_NAME = "";
// Password of the chat bot
// Recommended: using an oauth key instead (https://twitchapps.com/tokengen/ works)
const TWITCH_CHAT_BOT_KEY = '';
const twitchAPI = axios.create({
    baseURL: 'https://api.twitch.tv/helix/',
    timeout: 1000,
    contentType: 'application/json',
    headers: { 'Client-ID': TWITCH_API_KEY }
});
//tmi.js chat bot client
const client = new tmi.Client({
    options: { debug: true },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: TWITCH_CHAT_BOT_NAME,
        password: TWITCH_CHAT_BOT_KEY
    },
    channels: [TWITCH_CHANNEL_NAME]
});
//Start the bot
client.connect();
//Listen for whispers
client.on("whisper", (from, userstate, message, self) => {
    if (self) return;
    // If message starts with PASSWORD=, check if they have the correct password and add to user whitelist
    if (message.indexOf("PASSWORD=") == 0) {
        postWhitelist(oAuth2Client, from, message.substring(9))
        // Otherwise, it's a message for stamping highlights
    } else {
        // Get stream data from set channel
        twitchAPI.get('/streams?user_login=' + TWITCH_CHANNEL_NAME)
            .then(response => {
                // Check if stream online
                if (response.data.data.length != 0) {
                    var timeMod = 5000;
                    // Check for offset
                    if (message.indexOf('-') == 0) {
                        var timesplit = message.split(" ");
                        // Make sure it's a number
                        if (!isNaN(timesplit[0])) {
                            timeMod = parseInt(timesplit[0]) * 1000;
                            // Rebuild message w/o offset
                            message = "";
                            for (i = 1; i < timesplit.length; i++) {
                                message += timesplit[i];
                            }
                        }
                    }
                    // Uptime, retrieved from twitch api
                    var upDate = Date.parse(response['data']['data'][0]['started_at']);
                    var nowDate = Date.now();
                    // Generate timestamp by subtracting current time, offset, and time stream started
                    var timeStamp = msToTime(nowDate - Math.abs(timeMod) - upDate);
                    // Send to Google sheet
                    postHighlight(oAuth2Client, from, message, timeStamp);
                } else {
                    client.whisper(from, "The stream does not appear to be online")
                }
            })
            .catch(err => {
                console.log("ERROR " + err);
            })
    }
});
//END TWITCH bot code


//HELPER METHODS

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            // callback(oAuth2Client);
        });
    });
}

function postHighlight(auth, postFrom, postTitle, postTime) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SPREADSHEET_SHEET_NAME + '!E1:E',
    },
        (err, res) => {
            if (err) {
                console.error('The API returned an error.');
                throw err;
            }
            const rows = res.data.values;
            var searching = true;
            for (const row of rows) {
                if (searching && row[0]) {
                    if (row[0] === postFrom) {
                        searching = false;
                        sheets.spreadsheets.values.append({
                            spreadsheetId: SPREADSHEET_ID,
                            range: SPREADSHEET_SHEET_NAME + '!A1:C',
                            valueInputOption: 'USER_ENTERED',
                            requestBody: {
                                values: [
                                    [postTime, postTitle, postFrom],
                                ],
                            },
                        }, (err) => {
                            if (err) return console.log('The API returned an error: ' + err);
                            if (!err) {
                                client.whisper(postFrom, "Your highlight has been recorded (" + postTime + " " + postTitle + ")")
                            }
                        });
                    }
                }
            }
            if (searching) {
                client.whisper(postFrom, "You are not permitted to add highlights")
            }
        })
}

function postWhitelist(auth, user, password) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SPREADSHEET_SHEET_NAME + '!G2',
    },
        (err, res) => {
            if (err) {
                console.error('The API returned an error.');
                throw err;
            }
            const rows = res.data.values;
            console.log(rows[0][0] + " " + password)
            if (password === rows[0][0]) {
                sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: SPREADSHEET_SHEET_NAME + '!E1:E',
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: [
                            [user],
                        ]
                    },
                }, (err) => {
                    if (err) return console.log('The API returned an error: ' + err);
                    if (!err) {
                        client.whisper(user, "Password accepted. Added to whitelist")
                    }
                });
            } else {
                client.whisper(user, "This password is incorrect")
            }
        })
}

// msToTime function copied from:
// http://stackoverflow.com/questions/19700283/how-to-convert-time-milliseconds-to-hours-min-sec-format-in-javascript
// ive used this function SO MANY TIMES
function msToTime(duration) {
    // var milliseconds = parseInt((duration % 1000) / 100)
    var seconds = parseInt((duration / 1000) % 60);
    var minutes = parseInt((duration / (1000 * 60)) % 60);
    var hours = parseInt((duration / (1000 * 60 * 60)));
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds;
}