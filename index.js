var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var ffmpeg = require('./ffmpeg');
var each = require('sync-each');

// Initalize console

require('console-stamp')(console, {
    pattern: 'mm/dd/yyyy | HH:MM:ss.l',
    colors: {
        stamp: 'yellow',
        label: 'white'
    }
});

// Initalize configuration

process.env.NODE_CONFIG_DIR = __dirname;
var config = require('config');

// Authorize Google API

var service = google.youtube('v3');
var scopes = ['https://www.googleapis.com/auth/youtube'];

var tokenDir = __dirname + '/credentials/';
var tokenPath = tokenDir + 'token.json';

var auth = null;

var streams = [];
var broadcasts = [];

fs.readFile('client_secret.json', function(error, content) {
    if (error) {
        console.error('Error while loading client secret file: ' + error);
        return;
    } else authorize(JSON.parse(content), function(token) {
        auth = token;
        start();
    });
})

function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientID = credentials.installed.client_id;
    var redirectURL = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var authClient = new auth.OAuth2(clientID, clientSecret, redirectURL);

    fs.readFile(tokenPath, function(error, token) {
        if (error) {
            getNewToken(authClient, callback);
        } else {
            authClient.credentials = JSON.parse(token);
            callback(authClient);
        }
    });
}

function getNewToken(authClient, callback) {
    var authUrl = authClient.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
    console.log('----------------========[GOOGLE]========----------------');
    console.log('Please authorize this app by visiting the following');
    console.log('url and pasting the code in the prompt below.');
    console.log('- ' + authUrl);
    console.log('----------------========================----------------');
    var r1 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    r1.question('Access code: ', function(code) {
        r1.close();
        authClient.getToken(code, function(error, token) {
            if (error) {
                console.error('Error while trying to retrieve access token.');
                console.error(error.stack);
                return;
            } else {
                console.log('Client has been successfully authorized.');
                authClient.credentials = token;
                storeToken(token);
                callback(authClient);
            }
        })
    })
}

function storeToken(token) {
    try {
        fs.mkdir(tokenDir);
    } catch (error) {
        if (err.code != 'EEXIST') throw error;
    }
    fs.writeFile(tokenPath, JSON.stringify(token));
    console.log('Stored client token to ' + tokenPath + '.');
}

// Remove possible duplicates from previous run

function cleanup(streamCount, streamTitle, callback) {

    deleteBroadcasts(function(count, total) {
        console.log('[' + streamCount + '] Deleted ' + count + '/' + total + ' duplicate broadcasts.');
        deleteStreams(function(count, total) {
            console.log('[' + streamCount + '] Deleted ' + count  + '/' + total + ' duplicate streams.');
            callback();
        })
    })

    function deleteBroadcasts(callback) {
        service.liveBroadcasts.list({
            auth: auth,
            part: 'id,snippet',
            mine: true,
            maxResults: 50
        }, function (error, response) {
            if (error) {
                console.error('[' + streamCount + '] Error while retrieving existing broadcasts.');
                console.error('[' + streamCount + '] ' + error.stack);
            } else {
                var broadcasts = response.items;
                var deleted = 0;
                each(broadcasts, function(broadcast, next) {
                    var title = broadcast.snippet.title;
                    var id = broadcast.id;
                    if (title === streamTitle) {
                        service.liveBroadcasts.delete({
                            auth: auth,
                            id: id
                        }, function (error, response) {
                            if (error) {
                                console.error('[' + streamCount + '] Error while deleting broadcast: ' + id + '.');
                                console.error('[' + streamCount + '] ' + error.stack);
                            } else {
                                deleted++;
                            }
                            next();
                        })
                    } else next();
                }, function() {
                    callback(deleted, broadcasts.length)
                });
            }
        })
    }

    function deleteStreams(callback) {
        service.liveStreams.list({
            auth: auth,
            part: 'id,snippet',
            mine: true,
            maxResults: 50
        }, function (error, response) {
            if (error) {
                console.error('Error while retrieving existing streams.');
                console.error('[' + streamCount + '] ' + error.stack);
            } else {
                var streams = response.items;
                var deleted = 0;
                each(streams, function(stream, next) {
                    var title = stream.snippet.title;
                    var id = stream.id;
                    if (title === streamTitle) {
                        service.liveStreams.delete({
                            auth: auth,
                            id: id
                        }, function (error, response) {
                            if (error) {
                                console.error('Error while deleting stream: ' + id + '.');
                                console.error('[' + streamCount + '] ' + error.stack);
                            } else {
                                deleted++;
                            }
                            next();
                        })
                    } else next();
                }, function() {
                    callback(deleted, streams.length);
                });
            }
        })
    }

}

function start() {

    var stream = null;
    var broadcast = null;
    var streamID = null;
    var broadcastID = null;
    var ffmpegService = null;

    var streams = config.get('streams');

    console.log('Loaded ' + streams.length + ' stream configurations.');

    var streamCount = 1;
    streams.forEach(function(stream) {
        var title = stream.title;
        var desc = stream.description;
        var format = stream.format;
        var rtsp = stream.rtsp;
        cleanup(streamCount, title, function() {
            createStream(streamCount, title, desc, format, rtsp);
            streamCount++
        });
    });

}

function createStream(streamCount, title, desc, format, rtsp) {
    stream = service.liveStreams.insert({
        auth: auth,
        part: 'snippet,cdn',
        resource: {
            snippet: {
                title: title
            },
            cdn: {
                format: format,
                ingestionType: 'rtmp'
            }
        }
    }, function (error, response) {
        if (error) {
            console.error('[' + streamCount + '] Error while initalizing livestream service.');
            console.error('[' + streamCount + '] ' + error.stack);
            return;
        } else {
            var streamID = response.id;
            streams.push(streamID);
            var ingestionInfo = response.cdn.ingestionInfo;
            var ingestionAddress = ingestionInfo.ingestionAddress + '/' + ingestionInfo.streamName;
            console.log('[' + streamCount + '] Created livestream service: ' + streamID + '.');
            ffmpeg.start(streamCount, rtsp, ingestionAddress, function(service) {
                createBroadcast(streamCount, title, desc, format, streamID);
            });
        }
    })
};

function createBroadcast(streamCount, title, desc, format, streamID) {
    service.liveBroadcasts.insert({
        auth: auth,
        part: 'snippet,status,contentDetails',
        resource: {
            snippet: {
                title: title,
                description: desc,
                scheduledStartTime: new Date()
            },
            status: {
                privacyStatus: 'public'
            },
            contentDetails: {
                monitorStream: {
                    enableMonitorStream: false
                },
                enableDvr: false
            }
        }
    }, function (error, response) {
        if (error) {
            console.error('[' + streamCount + '] Error while initalizing broadcasting service.');
            if (error.errors[0].reason === "insufficientLivePermissions") {
                console.error('[' + streamCount + '] This is often the YouTube anti-spam system. Try manually creating a broadcast and read the error that appears, if any.');
            }
            console.error('[' + streamCount + '] ' + error.stack);
            return;
        } else {
            var broadcastID = response.id;
            broadcasts.push(broadcastID);
            console.log('[' + streamCount + '] Created broadcast service: ' + broadcastID + '.');
            service.liveBroadcasts.bind({
                auth: auth,
                id: broadcastID,
                part: 'id',
                streamId: streamID
            }, function (error, response) {
                if (error) {
                    console.error('[' + streamCount + '] Error while binding livestream service to broadcast service.');
                    console.error('[' + streamCount + '] ' + error.stack);
                    return;
                } else {
                    console.log('[' + streamCount + '] Bound livestream service to broadcast service.');
                    checkStream(streamCount, streamID, broadcastID);
                }
            })
        }
    })
}

function checkStream(streamCount, streamID, broadcastID) {
    process.stdout.write('[' + streamCount + '] Waiting for stream to become active.');
    var interval = setInterval(function() {
        service.liveStreams.list({
            auth: auth,
            id: streamID,
            part: 'id,status'
        }, function (error, response) {
            if (error) {
                process.stdout.write('\n');
                console.error('[' + streamCount + '] Error while requesting livestream service update.');
                console.error('[' + streamCount + '] ' + error.stack);
                return;
            } else {
                if (response.items[0].status.streamStatus === 'active') {
                    process.stdout.write('\n');
                    console.log('[' + streamCount + '] Stream has been activated - ready to go live.');
                    goLive(streamCount, broadcastID);
                    clearInterval(interval);
                } else {
                    process.stdout.write('.');
                }
            }
        })
    }, 1000);
}

function goLive(streamCount, broadcastID) {
    service.liveBroadcasts.transition({
        auth: auth,
        broadcastStatus: 'live',
        id: broadcastID,
        part: 'status,id'
    }, function (error, response) {
        if (error) {
            console.error('[' + streamCount + '] Error while updating broadcast service to "live."');
            console.error('[' + streamCount + '] ' + error.stack);
            return;
        } else {
            console.log('[' + streamCount + '] Broadcast is now live.');
            console.info('[' + streamCount + ']  - http://youtube.com/watch?v=' + broadcastID);
        }
    })
}