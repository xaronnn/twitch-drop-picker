# Twitch Drop Box

A script for idling [Twitch drops for Rust](https://twitch.facepunch.com/).

# Running

## Docker

```sh
docker run --name=twitch-drop-box -d -e TWITCH_AUTH_TOKEN=auth_token_here -e IGNORED_DROPS="DOOR|LR" github.com/xaronnn/twitch-drop-picker:latest
```

## CLI

Requires [Google Chrome](https://www.google.com/chrome/). Specify the installation path with the `CHROME_PATH` environment variable.

```shell
npm install
npm run start
```