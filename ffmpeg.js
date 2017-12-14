var ffmpeg = require('fluent-ffmpeg');

exports.start = function(streamCount, inputURL, outputURL, callback) {
    var service = ffmpeg(inputURL)
        .inputOptions([
            '-rtsp_transport',
            'tcp'
        ])
        .outputOptions([
            '-tune zerolatency',
            '-pix_fmt +',
            '-strict experimental',
            '-f flv',
            '-ar 44100'
        ])
        .videoCodec('libx264')
        .audioCodec('libmp3lame')
        .save(outputURL)
        .on('start', function() {
            console.log('[' + streamCount + '] Streaming RTSP feed to livestream service.');
            callback(ffmpeg);
        })
        .on('error', function(error) {
            console.error('[' + streamCount + '] RTSP stream error.');
            console.error('[' + streamCount + '] ' + error);
        })
        .on('end', function() {
            console.log('[' + streamCount + '] Stopped streaming RTSP feed to livestream service.');
        });
}