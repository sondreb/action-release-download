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
const { callbackify } = require('util');

(async () => {
    try {
        // const api = github.getOctokit(core.getInput('token'));
        const url = core.getInput('url');

        // Create an array of the initial URL, which will be populated with paging URLs after initial request.
        let urls = [url];

        const verbose = core.getInput('verbose') == 'true'; // input is always string, not boolean.
        const folder = core.getInput('folder');
        var timeout = 10000;

        // Options for HTTP requests against GitHub APIs. User-Agent is required.
        const options = {
            headers: { 'User-Agent': 'sondreb/action-release-download' }
        };

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

        function completed() {
            info('All is norminal 🚀. Execution has ended.');
        }

        function get(url, file, callback) {

            const options = {
                headers: { 'User-Agent': 'sondreb/action-release-download' }
            };

            http.get(url, options, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    console.log('Forwarding to: ' + res.headers.location);
                    return get(res.headers.location, file, callback);
                }

                debug(`Download completed: ${url}`);

                res.pipe(file);
                callback();
            });
        }

        function downloadFiles(urls) {
            var url = urls.pop();

            if (!url) {
                completed();
                return;
            }

            const uri = parse(url);
            const fileName = basename(uri.path);
            const filePath = path.join(folder, fileName);

            var file = fs.createWriteStream(filePath);

            // Get the file then continue on the next.
            get(url, file, () => {
                downloadFiles(urls);
            });
        }

        function getFiles(urls, files, processLinks) {
            const url = urls.pop();

            // When all URLs has been processes, start downloading the files.
            if (!url) {
                downloadFiles(files);
                return;
            }

            http.get(url, options, res => {
                let data = [];
                const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
                console.log('Status Code:', res.statusCode);
                console.log('Date in Response header:', headerDate);

                if (processLinks) {
                    // Process all paging links, but only on first request.
                    console.log(res.headers.link);
                    var links = res.headers.link.split(', ');

                    for (i = 0; i < links.length; i++) {
                        let link = links[i];
                        link = link.substring(1, link.indexOf('>'));
                        console.log('link:' + link);
                        urls.push(link);
                    }
                }

                res.on('data', chunk => {
                    data.push(chunk);
                });

                res.on('end', () => {
                    console.log('Response ended: ');
                    const assets = JSON.parse(Buffer.concat(data).toString());

                    for (asset of assets) {
                        console.log(`Download: ${asset.browser_download_url}`);
                        files.push(asset.browser_download_url);
                    }

                    getFiles(urls, files, false);
                });
            }).on('error', err => {
                console.log('Error: ', err.message);
            });
        }

        const files = [];

        getFiles(urls, files, true);

    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
})();