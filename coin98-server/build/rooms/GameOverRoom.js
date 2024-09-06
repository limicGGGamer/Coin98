"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameOverRoom = void 0;
const core_1 = require("@colyseus/core");
const GGGamersApi_1 = require("../thirdparties/GGGamersApi");
const DynamodbAPI_1 = require("../thirdparties/DynamodbAPI");
class GameOverRoom extends core_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 1;
    }
    async onJoin(client, options) {
        //client.send("disconnect");
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async StartUploadGameReport(message) {
        const _players = message?.data?.players;
        const _roomId = message?.roomId;
        const tokens = message?.tokens;
        let payload;
        for (let i = 0; i < 4; i++) {
            payload = await (0, GGGamersApi_1.ReportGameInfo)(tokens[i], _players);
            console.log(`${_roomId} Gameover payload attempt ${i + 1}:`, payload?.data);
            if (payload?.data?.code === 1) {
                break;
            }
            if (i === tokens.length - 1) {
                console.log(`${_roomId} All tokens failed. Returning error.`);
            }
            else
                console.log(`${_roomId} Bad access token ${i + 1}. Trying next token.`);
        }
        for (let i = 0; i < _players.length; i++) {
            const player = _players[i];
            const syncTicketData = {
                "userId": player?.userId,
                "ticket_id": player?.gameSessionId,
                "state": "gameover",
                "game_id": "baycSoccer",
                "reconnectToken": "N/A"
            };
            const syncTicketPayload = await (0, DynamodbAPI_1.syncTicket)(tokens[i], JSON.stringify(syncTicketData));
            console.log(`${_roomId} sync ticket result:`, syncTicketPayload.data, player?.userId);
            await this.delay(250);
            const gameOverData = {
                "userId": player?.userId,
                "gameSessionId": player?.gameSessionId,
                "result": player?.result
            };
            const gameOverPayload = await (0, DynamodbAPI_1.gameover)(tokens[i], JSON.stringify(gameOverData));
            console.log(`${_roomId} dynamo Gameover payload:`, gameOverPayload.data);
            await this.delay(250);
        }
        console.log(_roomId + ": gameover room disconnect....");
        setTimeout(() => {
            this.disconnect();
        }, 10000);
        return true;
    }
    onLeave(client) {
        // this.disconnect();
    }
    onDispose() {
        console.log(`Game over room ${this.roomId} : Disposing`);
    }
}
exports.GameOverRoom = GameOverRoom;
