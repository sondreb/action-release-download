require('child_process')
    .execSync(
        'npm install @actions/core @actions/github conventional-changelog-cli mime',
        { cwd: __dirname }
    );

const fs = require('fs');
const path = require('path');
const mime = require('mime');
const core = require('@actions/core');
const github = require('@actions/github');
const http = require('https');
const { parse } = require('url');
const { basename } = require('path');

(async () => {
    try {
        // const api = github.getOctokit(core.getInput('token'));
        const url = core.getInput('url');
        const verbose = core.getInput('verbose') == 'true'; // input is always string, not boolean.
        const folder = core.getInput('folder');
        var timeout = 10000;

        info(`Url input: ${url}`);
        info(`Folder input: ${folder}`);

        if (!fs.existsSync(folder)) {
            info(`Creating the destination folder: "${folder}".`);
            fs.mkdirSync(folder);
        }

        function info(text, ...params) {
            log(text, true, ...params);
        }

        function debug(text, ...params) {
            log(text, verbose, ...params);
        }

        function log(text, enabled, ...params) {
            if (enabled) {
                console.log(text, ...params);
            }
        }

        var timeout_wrapper = function (req) {
            return function () {
                console.log('abort');
                req.abort();
                // callback(true, { size: 0, downloaded: 0, progress: 0, status: 'Timeout' }, "File transfer timeout!");
            };
        };

        const options = {
            headers: { 'User-Agent': 'sondreb/action-release-download' }
        };

        function completed() {
            info('All is norminal 🚀. Execution has ended.');
        }

        function downloadFiles(urls) {
            var url = urls.pop();

            if (!url) {
                completed();
                return;
            }

            var blockchainDownloadRequest = http.get(url, options).on('response', function (res) {
                const uri = parse(url);
                const fileName = basename(uri.path);
                const filePath = path.join(folder, fileName);
                const len = parseInt(res.headers['content-length'], 10);
                let downloaded = 0;

                var file = fs.createWriteStream(filePath);

                res.on('data', function (chunk) {
                    file.write(chunk);
                    downloaded += chunk.length;

                    debug(`Downloaded ${(100.0 * downloaded / len).toFixed(2)}%, ${downloaded} bytes of total ${len} bytes.`);

                    // callback(false, { url: fileUrl, target: filePath, size: len, downloaded: downloaded, progress: (100.0 * downloaded / len).toFixed(2), status: 'Downloading' });
                    //process.stdout.write();
                    // reset timeout
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(fn, timeout);
                }).on('end', function () {
                    // clear timeout
                    clearTimeout(timeoutId);
                    file.end();

                    debug(`Download completed: ${url}`);

                    // Process the next file
                    downloadFiles(urls);
                }).on('error', function (err) {
                    info(`ERROR: Failed to write file: ${url}`)
                    // clear timeout
                    clearTimeout(timeoutId);
                    // callback(true, { size: 0, downloaded: downloaded, progress: (100.0 * downloaded / len).toFixed(2), url: fileUrl, target: filePath, status: 'Error' }, err.message);
                });
            });

            // generate timeout handler
            var fn = timeout_wrapper(blockchainDownloadRequest);

            // set initial timeout
            var timeoutId = setTimeout(fn, timeout);
        }

        // Fetch the assets JSON file to find all artifacts to download
        http.get(url, options, res => {
            let data = [];
            const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
            console.log('Status Code:', res.statusCode);
            console.log('Date in Response header:', headerDate);

            res.on('data', chunk => {
                data.push(chunk);
            });

            res.on('end', () => {
                console.log('Response ended: ');
                const assets = JSON.parse(Buffer.concat(data).toString());
                const files = [];

                for (asset of assets) {
                    console.log(`Download: ${asset.browser_download_url}`);
                    files.push(asset.browser_download_url);
                }

                downloadFiles(files);
            });
        }).on('error', err => {
            console.log('Error: ', err.message);
        });
    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
})();