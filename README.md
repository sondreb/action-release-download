# action-release-download

GitHub Action: GitHub Release Download Action

## What this does, and does not do

This action will take the "assets_url" variable from a workflow triggered by a published release, and download all files based on the "browser_download_url" field.

## Usage

Here is an example on how to use this Action:

```
    - name: Release Download
      uses: sondreb/action-release-download@master
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        files: "action.js;README.md"
        folder: "${{github.workspace}}/package/"
        draft: true
        prerelease: true
        body: 'This is a pre-release'
        name: "Draft Release"
        tag: v0.0.1
```

### Notes

This is built as a quick and dirty proof-of-concept and is likely ridled with bugs and problems. Use at your own discretion.

## Releases

0.0.1

- Adds support for folders.

0.0.2

- Update packages and clean up test data and repo.

## License

[MIT](LICENSE)