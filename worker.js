const SCWorker = require('socketcluster/scworker');
const express = require('express');
const serveStatic = require('serve-static');
const path = require('path');
const morgan = require('morgan');
const healthChecker = require('sc-framework-health-check');
const Serialport = require('serialport');
const Estim2B = require('estim2b');

class Worker extends SCWorker {
    run() {
        console.log('   >> Worker PID:', process.pid);
        const environment = this.options.environment;

        const app = express();

        const httpServer = this.httpServer;
        const scServer = this.scServer;

        if (environment === 'dev') {
            // Log every HTTP request. See https://github.com/expressjs/morgan for other
            // available formats.
            app.use(morgan('dev'));
        }
        app.use(serveStatic(path.resolve(__dirname, 'public')));

        // Add GET /health-check express route
        healthChecker.attach(this, app);

        httpServer.on('request', app);

        const port = new Serialport('/dev/cu.Bluetooth-Incoming-Port');
            port.on('open', function () {
            console.log('Established connection');
        }).on('error', function (err) {
            console.log('Error -> ' + err.message);
        });

        const device = new Estim2B(port);

        /*
         * In here we handle our incoming realtime connections and listen for events.
         */
        scServer.on('connection', function (socket) {

            // Some sample logic to show how to handle client events,
            // replace this with your own logic

            /*socket.on('sampleClientEvent', function (data) {
                count++;
                console.log('Handled sampleClientEvent', data);
                scServer.exchange.publish('sample', count);
            });*/

            socket.on('pulseFrequency', function (data) {
                try {
                    console.log('Set pulse frequency: ' + data);
                    device.setPulseFrequency(data);
                } catch (err) {
                    console.log('Set pulse frequency -> FAILED: ' + err.message);
                    scServer.exchange.publish('error', err);
                }
            });

            socket.on('pulsePwm', function (data) {
                try {
                    console.log('Set pulse PWM: ' + data);
                    device.setPulsePwm(data);
                } catch (err) {
                    console.log('Set pulse PWM -> FAILED: ' + err.message);
                    scServer.exchange.publish('error', err);
                }
            });

            socket.on('power', function (data) {
                try {
                    console.log('Set power -> channel ' + data.channel + ':' + data.percentage + '%');
                    device.setPower(data.channel, data.percentage);
                } catch (err) {
                    console.log('Set power -> FAILED: ' + err.message);
                    scServer.exchange.publish('error', err);
                }
            });

            socket.on('mode', function (data) {
                try {
                    console.log('Set mode -> ' + data);
                    device.setMode(data);
                } catch (err) {
                    console.log('Set mode -> FAILED: ' + err.message);
                    scServer.exchange.publish('error', err);
                }
            });

            const interval = setInterval(function () {
                socket.emit('status', {
                    batteryLevel: 79,
                    channelALevel: 43,
                    channelBLevel: 43,
                    pulseFrequency: 5,
                    pulsePwm: 70,
                    currentMode: 12,
                    powerMode: 'H',
                    channelsJoined: false,
                    firmwareVersion: '1.0.0'
                });
            }, 1000);

            socket.on('disconnect', function () {
                clearInterval(interval);
            });

            socket.on('status', function (data) {
                scServer.exchange.publish('status', {foo: 'bar'}/*device.getStatus()*/);
            });
        });
    }
}

new Worker();
