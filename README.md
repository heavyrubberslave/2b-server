# 2B e-stim server

A client can connect through websocket to this server.

## Installation

```
$ yarn install
```

## Run instructions

```
$ node server.js
```

## Commands

|Command|Data|
|---|---|
|`pulseFrequency`|2-99|
|`pulsePwm`|2-99|
|`power`|{channel: A or B, percentage: 0-99}|
|`mode`|0-13|
