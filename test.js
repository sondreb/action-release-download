const fs = require('fs');
const path = require('path');
// const core = require('@actions/core');
// const github = require('@actions/github');
const http = require('https');
const { parse } = require('url');
const { basename } = require('path');

let url = 'https://api.github.com/repositories/211867945/releases/39413272/assets';

const folder = './artifact';

const uri = parse(url);
const fileName = basename(uri.path);
const filePath = path.join(folder, fileName);
const file = fs.createWriteStream(filePath);

// const options = {
//     headers: { 'User-Agent': 'sondreb/action-release-download' }
// };

const options = {
    headers: { 'User-Agent': 'sondreb/action-release-download' }
};

function getFiles(urls, files, processLinks) {
    const url = urls.pop();

    if (!url) {
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
            // downloadFiles(files);
        });
    }).on('error', err => {
        console.log('Error: ', err.message);
    });
}

const files = [];
let urls = ['https://api.github.com/repositories/211867945/releases/39413272/assets'];

getFiles(urls, files, true)
