const EventHandler = require('./EventHandler');
const MatchRotator = require('./MatchRotator');
const WebSocketServer = require('./WebSocketServer');
const PlayerConnector = require('./PlayerConnector');

MatchRotator.enable();
WebSocketServer.enable();
PlayerConnector.enable();
