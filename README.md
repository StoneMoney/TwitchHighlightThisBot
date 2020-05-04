# TwitchHighlightThisBot
Whisper to a bot to stamp a highlight, which then gets recorded to a google sheet

[Google sheet template](https://docs.google.com/spreadsheets/d/1Mqo54FrKb1i4-P5xFrR9yCn5WZ8kuSsdOPNZlMWLihU/)

## Required setup steps

* `SPREADSHEET_ID` - ID of the spreadsheet you want to modify, for example, the template's ID is `1Mqo54FrKb1i4-P5xFrR9yCn5WZ8kuSsdOPNZlMWLihU`

* `SPREADSHEET_SHEET_NAME` - Name of the sheet you want to modify, for example, the template's sheet name is `AutoHighlights`

* `GOOGLE_AUTH_INFO` - `client_id`, `client_secrets`, and `redirect_uris` that match what you set in your [Google console](https://console.cloud.google.com/)

  * [For additional help on this step](https://github.com/StoneMoney/TwitchHighlightThisBot/wiki/Guide-on-obtaining-Google-auth-info)
  
* `TOKEN_PATH` - Where to save tokens to disk (Default: `token.json`)

* `REFRESH_TOKEN_PATH` - Where to save refresh tokens to disk (Default `r-token.json`)

* `TWITCH_API_KEY` - [An api key obtained from twitch](https://dev.twitch.tv/console) a.k.a Client ID

* `TWITCH_CHANNEL_NAME` - Name of the channel you want targetted for highlighting

* `TWITCH_CHAT_BOT_NAME` - Name of the twitch account users will DM to stamp a highlight

* `TWITCH_CHAT_BOT_KEY` - Password of the twitch account set above. OR: oauth token for that account ([see this](https://twitchapps.com/tokengen/))

## Using the bot
In any chat window (including mobile chat) send a whisper by doing `/w <BOTNAME> <Name of the highlight>` without <>
This will (if you're authenticated), record a highlight with that name at the exact timestamp (minus offset) of the stream.
### Offsetting time
To offset the highlight, start your message with how much you want to offset. ex `-30 funny stuff happened` would stamp the time 30 seconds before now
*By default, the offset is 5000 (5 seconds)*
### Authenticating yourself to the bot
If your password matches what cell G2 has on the specified sheet you will be authenticated

Whisper the bot the password `/w <BOTNAME> PASSWORD=<Password>` without <>
