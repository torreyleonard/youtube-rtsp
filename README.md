# youtube-rtsp
Easily broadcast any number of RTSP streams to YouTube's livestream service.

> ${DESCRIPTION}

[![NPM Version][npm-image]][https://www.npmjs.com/package/youtube-rtsp]

## Install

1. Install this package using NPM:
```bash
npm i -S live-xxx
```
2. Install FFMPEG on your system. For Ubuntu 16.04, follow [these instructions.](http://ubuntuhandbook.org/index.php/2016/09/install-ffmpeg-3-1-ubuntu-16-04-ppa/)
3. Using [Google's Developer Console,](https://console.developers.google.com/projectselector/apis/credentials) generate a new OAuth2 credential.
4. Enable YouTube Data API for the credential you just made.
5. Download the "client_secret.json" file to the youtube-rtsp directory.
6. Open "local.json" and change the settings to match your needs. Change the "rtsp:" setting to the RTSP URL of your stream.
8. Run with 'npm start' or 'node index.js.'
7. Upon the first run of the program, you will be asked to go to a Google webpage in order to link your account with the program. Choose the Google account that you want to manage the livestream.

## License

[MIT](http://vjpr.mit-license.org)
