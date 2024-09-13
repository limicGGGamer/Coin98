import { Room, Client, Delayed, matchMaker } from "@colyseus/core";
import { MyRoomState } from "./schema/MyRoomState";
import { syncTicket } from "../thirdparties/DynamodbAPI";

export class BattleRoom extends Room<MyRoomState> {
    maxClients = 4;
    startedAt = 0;
    remoteRoomId: string = "";
    isGameover = false;

    async onCreate(options: any) {
        this.lock();
        this.setPatchRate(34);
        this.setState(new MyRoomState());
        console.log("onCreate BattleRoom id: ", this.roomId);

        this.onMessage("*", async (client, type, message) => {
            switch (type) {
                case "game-input":
                    // console.log("game-input message:", message);
                    this.broadcast('game-event', { event: 'game-input', data: message });
                    break;
                case "update-player":
                    // console.log("update-player message:", message);

                    this.state.players.forEach((player) => {
                        if (player.playerId == message.playerId) {
                            player.posX = message.posX;
                            player.posY = message.posY;
                            player.angle = message.angle;
                            player.score = message.score;
                        }
                    })

                    break;
                case "game-started":
                    this.startedAt = Date.now();

                    let players: any = [];

                    this.state.players.forEach((player) => {
                        const p = {
                            playerId: player.playerId,
                            shortWalletId: player.shortWalletId
                        }

                        players.push(p);
                    })

                    this.broadcast('gameScene', { result: 1, data: { players: players } });
                    try {
                        await matchMaker.remoteRoomCall(this.remoteRoomId, "closeRoom", [{ roomId: this.roomId }]);
                    } catch (error) {
                        console.error("Error calling remote room:", error);
                    }
                    break;
                case "game-over":
                    console.log("gameover:", message);
                    // this.broadcast('game-over', { data: message });
                    this.gameOver(options, message?.playerId);
                    break;
                case "update-score":

                    this.broadcast('game-event', { event: 'update-score', data: message.data });

                    break;
                case "player-ready":
                    console.log("player-ready:", message);
                    this.broadcast('game-event', { event: 'player-ready', data: message });
                    break;
                case "go-to-game":
                    console.log("go-to-game:", message);
                    this.broadcast('game-event', { event: 'go-to-game', data: message.data });
                    break;
                case "create-block":

                    // console.log("create-block:", message);
                    this.state.createBlock(message.id, message.frame, message.posX, message.posY);

                    break;
                case "destroy-block":
                    this.broadcast('game-event', { event: 'destroy-block', data: message });
                    this.state.blocks.delete(message.id);

                    break;
                case "update-block":
                    let block = this.state.blocks.get(message.id);
                    block.posX = message.posX;
                    block.posY = message.posY;

                    break;
                case "collide-block":
                    // console.log("collide-block:", message);
                    this.broadcast('game-event', { event: 'collide-block', data: message });

                    break;
                case "ping":
                    // Respond with a "pong" message containing the same timestamp
                    // console.log("ping:", message);
                    client.send("pong", { data: message });
                    break;
                // case "counting-waiting-player-time":
                //     // console.log("counting-waiting-player-time:", message);
                //     this.broadcast('game-event', { event: 'counting-waiting-player-time', data: message });
                //     break;
                case "player-ready-counter":
                    // console.log("player-ready-counter:", message);
                    this.broadcast('game-event', { event: 'player-ready-counter', data: message });
                    break;
            }
        })

    }


    async onJoin(client: Client, options: any) {
        if (!options?.passCred) {
            this.unlock();
            console.log(`${this.roomId} battle room unlocked`);
            //console.log(`Battle ${this.roomId} connected.`);
        } else {
            console.log("Battle room reconnect token:", this.roomId + ":" + client?._reconnectionToken);
        }

        (client as any).options = options;
        if (options?.ticket) {
            let _player = this.state.players.get(options?.sessionId);


            // sync-ticket state
            const syncTicketData = {
                "userId": options?.userId,
                "ticket_id": options?.ticket,
                "state": "battle",
                "game_id": "FlappyHero",
                "reconnectToken": this.roomId + ":" + client?._reconnectionToken
            }

            //console.log(syncTicketData);

            const syncTicketPayload = await syncTicket(options.accessToken, JSON.stringify(syncTicketData));
            console.log("battle syncTicketPayload:", syncTicketPayload?.data);


            client.send("updateMessage", { message: "Player Ready" });
            let _this = this;
            console.log("_this.state.players.size: ", _this.state.players.size);
            setTimeout(function () {
                _this.broadcast("setPlayerReady", { data: { playerId: _player?.playerId, walletId: _player?.walletId.substring(0, 10), totalPlayerCount: _this.state.players.size } });
            }, 1000);

        }

    }


    async onLeave(client: Client, consented: boolean) {
        console.log("onLeave client.id: ", client.id, "   consented: ", consented);
        //this.disconnect();    
        this.state.players.get((client as any).options?.userId).connected = false;
        try {
            if (consented) {
                throw new Error("consented leave");
            }
            const reconnection = this.allowReconnection(client, "manual");

            // now it's time to `await` for the reconnection
            await reconnection;


            // client returned! let's re-activate it.
            this.state.players.get((client as any).options.userId).connected = true;

            const promise = await reconnection.promise;
            console.log("battle room reconnection token:", promise._reconnectionToken);
        } catch (e) {
            console.log("onLeave catch error: ", e);
            // reconnection has been rejected. let's remove the client.
            //this.state.players.delete((client as any).options.userId);
        }
    }

    async gameOver(options: any, winnerId: number) {
        if (this.isGameover)
            return;
        this.isGameover = true;

        const gameOverRoom = await matchMaker.createRoom("gameOver", {});
        console.log("Battle room:", this.roomId + " , GameOver Room:" + gameOverRoom?.roomId);
        const endedAt = Date.now();

        let _ret = { gameid: this.roomId, players: [] as any[] };
        let gameMessage: any = [];
        let tokens: string[] = [];
        console.log("winnerId: ", winnerId);

        this.state.players.forEach(async (player, sessionId) => {



            _ret.players[_ret.players.length] = {
                "userId": (player as any)?.player?.userId,
                "gameSessionId": (player as any)?.player?.ticket,
                "passCred": (player as any)?.player?.passCred,
                "startedAt": this.startedAt,
                "endedAt": endedAt,
                "result": player?.playerId == winnerId ? "win" : "lose",
                "score": player?.playerId == winnerId ? 100 : 1,
                "serviceFee": 0.1,
                "extra": options.password ? { message: "this is private room. It is event data." } : {},
                // "rewardTokenAmount": player?.playerNumber == winnerId ? 0.1 * this.state.players.size : 0,
            };

            console.log("player?.playerId: ", player?.playerId);
            gameMessage[_ret.players.length] = {
                "userId": (player as any)?.player?.userId,
                "walletid": (player as any)?.player?.walletId,
                "playerId": (player as any)?.player?.playerId,
                "isWin": player?.playerId == winnerId ? 1 : 0
            }
            tokens[tokens.length] = player?.accessToken;
        });

        this.broadcast('game-over', { data: gameMessage });
        const payload = await matchMaker.remoteRoomCall(gameOverRoom.roomId, "StartUploadGameReport", [{ data: _ret, tokens: tokens, roomId: this.roomId }]);
        if (!payload) {
            console.log(`Battle ${this.roomId} => Gameover room ${gameOverRoom.roomId} upload report error`);
        }

        setTimeout(() => {
            this.disconnect();
        }, 5000);
        return true;
    }

    async setPlayer(playerstate: any[]) {
        // @ts-ignore
        console.log(`Battle ${this.roomId} Set Player- received ${playerstate?.roomId} : true`);
        // @ts-ignore
        this.remoteRoomId = playerstate?.roomId;
        // @ts-ignore
        Object.entries(playerstate?.player).forEach(([sessionId, options], index) => {
            const _player = this.state.createPlayer((options as { sessionId: string })?.sessionId, options,
                (options as { playerId: string })?.playerId,
                (options as { uid: string })?.uid, "battle",
                (options as { walletId: string })?.walletId,
                (options as { ticket: string })?.ticket,
                (options as { passCred: string })?.passCred);


            console.log(`(options as { playerId: string })?.playerId: ${(options as { playerId: string })?.playerId}`);

            this.broadcast("game-event", {
                event: `set-player`, data: {
                    sessionId: (options as { sessionId: string })?.sessionId,
                    walletId: (options as { walletId: number })?.walletId
                }
            });
        });

        return true;
    }
}