const fs = require('fs');
const path = require('path');
// const core = require('@actions/core');
// const github = require('@actions/github');
const http = require('https');
const { parse } = require('url');
const { basename } = require('path');

let url = 'https://github.com/sondreb/action-release-download/releases/download/v0.0.1/Blockcore.Features.BlockExplorer.1.0.6.nupkg';

const folder = './artifact';

const uri = parse(url);
const fileName = basename(uri.path);
const filePath = path.join(folder, fileName);

const file = fs.createWriteStream(filePath);

// const options = {
//     headers: { 'User-Agent': 'sondreb/action-release-download' }
// };

function get(url) {

    const options = {
        headers: { 'User-Agent': 'sondreb/action-release-download' }
    };

    http.get(url, options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
            console.log('Forwarding to: ' + res.headers.location);
            return get(res.headers.location);
        }

        console.log('Saving file!');
        res.pipe(file);

        // let body = [];

        // res.on("data", (chunk) => {
        //     body.push(chunk);
        // });

        // res.on("end", () => {
        //     try {
        //         // remove JSON.parse(...) for plain data
        //         resolve(JSON.parse(Buffer.concat(body).toString()));
        //     } catch (err) {
        //         reject(err);
        //     }
        // });
    });
}

get(url)

// const request = http.get(url, options, function (response) {

//     if (res.statusCode === 301 || res.statusCode === 302) {
//         return get(res.headers.location, resolve, reject)
//     }

//     response.pipe(file);
// });

console.log('Done!');

// var parseChangelog = require('changelog-parser');

// parseChangelog(
//     {
//         filePath: 'CHANGELOG.md',
//         removeMarkdown: false
//     }
// )
//     .then(function (result) {
//         // changelog object
//         console.log(result)

//     })
//     .catch(function (err) {
//         console.error(err);
//     });

