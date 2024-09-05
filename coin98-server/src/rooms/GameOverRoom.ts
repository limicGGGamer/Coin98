import { Room, Client, Delayed, matchMaker, ServerError } from "@colyseus/core";
import { MyRoomState } from "./schema/MyRoomState";
import { ReportGameInfo } from "../thirdparties/GGGamersApi";
import { syncTicket, gameover } from "../thirdparties/DynamodbAPI";

export class GameOverRoom extends Room<MyRoomState> {
    maxClients = 1;
    public delayedInterval!: Delayed;

    async onJoin(client: Client, options: any) {
        //client.send("disconnect");
    }

    async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



    async StartUploadGameReport(message: any[]) {
        const _players = (message as any)?.data?.players;
        const _roomId = (message as any)?.roomId;
        const tokens = (message as any)?.tokens;


        let payload;
        for (let i = 0; i < 4; i++) {
            payload = await ReportGameInfo(tokens[i], _players);
            console.log(`${_roomId} Gameover payload attempt ${i + 1}:`, payload?.data);

            if (payload?.data?.code === 1) {
                break;  
            }

            if (i === tokens.length - 1) {
                console.log(`${_roomId} All tokens failed. Returning error.`);
            } else
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
            }

            const syncTicketPayload = await syncTicket(tokens[i], JSON.stringify(syncTicketData));
            console.log(`${_roomId} sync ticket result:`, syncTicketPayload.data, player?.userId);

            await this.delay(250);

            const gameOverData = {
                "userId": player?.userId,
                "gameSessionId": player?.gameSessionId,
                "result": player?.result
            };

            const gameOverPayload = await gameover(tokens[i], JSON.stringify(gameOverData));
            console.log(`${_roomId} dynamo Gameover payload:`, gameOverPayload.data);

            await this.delay(250);
        }
        console.log(_roomId + ": gameover room disconnect....");

        setTimeout(() => {
            this.disconnect();
        }, 10000)
        return true;
    }

    onLeave(client: Client) {
        // this.disconnect();
    }

    onDispose() {
        console.log(`Game over room ${this.roomId} : Disposing`);
    }
}
