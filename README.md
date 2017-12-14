# youtube-rtsp
Easily broadcast any number of RTSP streams to YouTube's livestream service.

[![NPM Version][npm-image]][npm-url]

## Install

1. Install this package using NPM:
	```bash
	npm i youtube-rtsp
	```
2. Install FFMPEG on your system. For Ubuntu 16.04, follow [these instructions.](http://ubuntuhandbook.org/index.php/2016/09/install-ffmpeg-3-1-ubuntu-16-04-ppa/)

3. Create a "client_secret.json" file from the Google Developer Console.
	1. Using [Google's Developer Console,](https://console.developers.google.com/projectselector/apis/credentials) generate a new OAuth2 credential.
	2. Enable YouTube Data API for the credential you just made.
	3. Download the "client_secret.json" file to the youtube-rtsp directory.
	4. Further instructions are located [here.](https://developers.google.com/youtube/v3/live/registering_an_application)

4. Open "local.json" and change the settings to match your needs.
	1. Change the "rtsp:" setting to the RTSP URL of your stream.
	2. If using a Ubiquiti camera with UniFi Video:
		1. Go to "Cameras."
		2. Click the camera you wish to broadcast.
		3. Click "RTSP Service" in the popout.
		4. Choose a resolution and copy the RTSP url after enabling the service.
	
5. Run with 'npm start' or 'node index.js.'

6. Upon the first run of the program, you will be asked to go to a Google webpage in order to link your account with the program. Choose the Google account that you want to manage the livestream.

## License

[MIT](http://vjpr.mit-license.org)

[npm-image]: https://img.shields.io/npm/v/youtube-rtsp.svg
[npm-url]: https://www.npmjs.com/package/youtube-rtsp
