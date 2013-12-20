var util = require('util');
var Device = require('./Device');
var P = require('../lib/protocol');

util.inherits(Light, Device);

function Light(address, headers, zigbeeDevice, socket) {
    Light.super_.apply(this, arguments);

    this.writable = true;
    this.V = 0;
    this.D = 1010; //224; // Light

    this.update = true;

    this.onCommand(P.RPCS_GET_DEV_STATE_RSP, function(address, reader) {
        reader.word8('value');
        this.log.debug('State change value : ', reader.vars.value);
        if(this.update === true)
        {  
          this.emit('data', JSON.stringify({on: reader.vars.value}));
        }
    }.bind(this));    

    this.onCommand(P.RPCS_GET_DEV_LEVEL_RSP, function(address, reader) {
        reader.word8('value');
        this.log.debug('State change value : ', reader.vars.value);
        this.emit('data', JSON.stringify({bri: reader.vars.value}));
    }.bind(this)); 
    
    this.onCommand(P.RPCS_GET_DEV_HUE_RSP, function(address, reader) {
        reader.word8('value');
        this.log.debug('State change value : ', reader.vars.value);
        var hueVal = reader.vars.value << 8;
        this.emit('data', JSON.stringify({hue: hueVal}));    
    }.bind(this)); 
    
    this.onCommand(P.RPCS_GET_DEV_SAT_RSP, function(address, reader) {
        reader.word8('value');
        this.log.debug('State change value : ', reader.vars.value);
        this.emit('data', JSON.stringify({sat: reader.vars.value}));
    }.bind(this));

    this.pollRate = 2000;

    this.statePoll = setInterval(this.pollForState.bind(this), this.pollRate);
    this.levelPoll = setInterval(this.pollForLevel.bind(this), this.pollRate);
    this.huePoll = setInterval(this.pollForHue.bind(this), this.pollRate);
    this.satPoll = setInterval(this.pollForSat.bind(this), this.pollRate);
}

Light.prototype.pollForState = function() {
    this.sendCommand(P.RPCS_GET_DEV_STATE);
};

Light.prototype.pollForLevel = function() {
    this.sendCommand(P.RPCS_GET_DEV_LEVEL);
};

Light.prototype.pollForHue = function() {
    this.sendCommand(P.RPCS_GET_DEV_HUE);
};

Light.prototype.pollForSat = function() {
    this.sendCommand(P.RPCS_GET_DEV_SAT);
};

Light.prototype.hasLevelControl = function() {
    return this.hasServerCluster('Level Control');
};

Light.prototype.hasColorControl = function() {
    return this.hasServerCluster('Color Control');
};

Light.prototype.write = function(data) {

    //Avoid an incoming response changing the UI while     
    //the user is making an adjustment
    this.update = false;
    clearInterval(this.statePoll);
    clearInterval(this.levelPoll);
    clearInterval(this.huePoll);
    clearInterval(this.satPoll);

    if (typeof data == 'string') {
        data = JSON.parse(data);
    }

    this.log.info('Setting to ' + JSON.stringify(data));

    this.sendCommand(P.RPCS_SET_DEV_STATE, function(msg) {
        msg.UInt8(data.on? 0xFF : 0x0);
    });

    if (this.hasLevelControl()) {
        this.sendCommand(P.RPCS_SET_DEV_LEVEL, function(msg) {
            msg.UInt8(data.bri);
            msg.UInt16LE(data.transitionTime || 10);
        });
    }

    if (this.hasColorControl()) {
        var hue = data.hue >> 8;

        this.sendCommand(P.RPCS_SET_DEV_COLOR, function(msg) {
            msg.UInt8(hue);
            msg.UInt8(data.sat);
            msg.UInt16LE(data.transitionTime || 10);
        });
    }

    this.statePoll = setInterval(this.pollForState.bind(this), this.pollRate);
    this.levelPoll = setInterval(this.pollForLevel.bind(this), this.pollRate);
    this.huePoll = setInterval(this.pollForHue.bind(this), this.pollRate);
    this.satPoll = setInterval(this.pollForSat.bind(this), this.pollRate);
    this.update = true;
};

module.exports = Light;
