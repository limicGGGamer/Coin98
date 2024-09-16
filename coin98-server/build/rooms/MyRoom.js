"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyRoom = void 0;
const core_1 = require("@colyseus/core");
const MyRoomState_1 = require("./schema/MyRoomState");
const GGGamersApi_1 = require("../thirdparties/GGGamersApi");
const DynamodbAPI_1 = require("../thirdparties/DynamodbAPI");
class MyRoom extends core_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 4;
        this.waitingPlayerTime = 10;
    }
    onCreate(options) {
        this.setState(new MyRoomState_1.MyRoomState());
        this.onMessage("*", async (client, type, message) => {
            switch (type) {
                case "player-state":
                    if (message?.type === "getLatestState") {
                        const player = this.state.players.get(client.sessionId);
                        player.accessToken = message?.data?.accessToken;
                        if (this?.battleRoom) {
                            const options = { accessToken: player?.accessToken, sessionId: player?.sessionId, walletId: player?.walletId, userId: player?.uid, ticket: player?.ticket, passCred: player?.passCred, playerId: player.playerId };
                            const matchData = await core_1.matchMaker.reserveSeatFor(this?.battleRoom, options);
                            if (matchData && !player.reserveSeat) {
                                client.send("reserveSeatFor", { data: matchData });
                                player.reserveSeat = true;
                                client.send("game-event", {
                                    state: "game-connecting",
                                    message: "Connecting to server"
                                });
                            }
                        }
                        const syncTicketData = {
                            "userId": message?.data?.userId,
                            "ticket_id": player?.ticket,
                            "state": "queue",
                            "game_id": "FlappyHero",
                            "reconnectToken": this.roomId + ":" + client?._reconnectionToken
                        };
                        console.log("battle reconnection check:", syncTicketData);
                        const syncTicketPayload = await (0, DynamodbAPI_1.syncTicket)(message?.data?.accessToken, JSON.stringify(syncTicketData));
                        //client.send('game-event', { state: 'game-play', result: 1, data: message });
                        console.log("reconnection Sync Ticket:", syncTicketPayload.data);
                    }
                    break;
            }
        });
    }
    async onAuth(client, options, request) {
        try {
            // options.player.sessionId = client.sessionId;
            if (process.env.NODE_ENV !== "production" && options?.debug === true) {
                options.player.isBot = true;
                return true;
            }
            if (!options?.accessToken) {
                throw new Error("Token not exists");
            }
            console.log("onAuth options: ", options.data);
            const payload = await (0, GGGamersApi_1.userinfo)(options.accessToken);
            // console.log("onAuth payload: ",payload);
            options.player.accessToken = options.accessToken;
            options.player.uid = payload?.data?.data?.userId;
            options.player.walletId = payload?.data?.data?.connectedWallets[0].walletAddress;
            options.player.name = payload?.data?.data?.nickname;
            // console.log("onAuth userinfo payload?.data?.data: ",payload?.data?.data);
            if (!payload) {
                throw new Error("User not found");
            }
            let ticket = null;
            const userInfo = await (0, DynamodbAPI_1.userme)(options?.accessToken);
            // console.log("onAuth userme userInfo: ",userInfo);
            const _userInfo = userInfo?.data?.data;
            if (!_userInfo)
                throw new Error("userInfo not exists");
            const currentTime = new Date().getTime();
            const createTime = _userInfo?.ticket?.create_time ? new Date(_userInfo?.ticket?.create_time).getTime() : null;
            if (_userInfo?.ticket_id && _userInfo?.ticket?.state && ["NEW", "gameover"].indexOf(_userInfo?.ticket?.state) === -1 && createTime && currentTime - createTime <= 5 * 60 * 1000) {
                ticket = _userInfo?.ticket_id;
                return false;
            }
            //user no ticket, check the game pass first..
            const gamePassPayload = await (0, GGGamersApi_1.getGamePass)(options.accessToken);
            // console.log("onAuth gamePassPayload: ",gamePassPayload?.data?.data);
            if (gamePassPayload.data.code !== 1)
                throw new Error("Get Game Pass Error.");
            //console.log("gamePassPayload:", gamePassPayload.data);
            //Get unlocked ticket
            (gamePassPayload?.data?.data || []).forEach((_data) => {
                if (!_data.locked)
                    ticket = _data.passId;
            });
            if (ticket == null) {
                //no ticket, pay to buy a new ticket
                throw new Error("Error: No ticket");
            }
            //sync-ticket state (NEW)
            const syncTicketData = {
                "userId": options?.player?.uid,
                "ticket_id": ticket,
                "state": "NEW",
                "game_id": "FlappyHero",
                "reconnectToken": this.roomId + ":" + client?._reconnectionToken
            };
            const syncTicketPayload = await (0, DynamodbAPI_1.syncTicket)(options.accessToken, JSON.stringify(syncTicketData));
            if (syncTicketPayload.data.result !== 1)
                throw new Error("Sync Ticket Error.");
            // console.log('Sync Ticket successful:', syncTicketPayload.data);
            // redeem ticket
            const gameStartPayload = await (0, GGGamersApi_1.gameStart)(options.accessToken, ticket);
            //console.log("gameStartPayload:", gameStartPayload.data);
            if (gameStartPayload.data.code !== 1)
                throw new Error("Game Start Error.");
            client.passCred = gameStartPayload.data?.data?.passCred;
            client.ticket = ticket;
            return true;
        }
        catch (error) {
            console.error(error);
            throw new core_1.ServerError(400, "Bad access token");
        }
    }
    async onJoin(client, options) {
        console.log("queue room on join reconnect token:", this.roomId + ":" + client?._reconnectionToken);
        console.log("onJoin options: ", options);
        let shouldContinue = true;
        this.state.players.forEach((player, sessionId) => {
            if (options?.player?.uid == player.userId) {
                console.log(`Queue room ${this.roomId} player ${player.userId} exist, sessionId: ${sessionId}.`);
                try {
                    this.state.players.delete(client.sessionId);
                    console.log(`create-new-room player ${player.userId}`);
                    client.send("create-new-room", {});
                }
                catch (e) {
                    console.log(`Queue room ${this.roomId} remove old player ${player.userId} failed.`);
                }
                shouldContinue = false;
                return false;
            }
        });
        if (!shouldContinue)
            return false;
        const syncTicketData = {
            "userId": options?.player?.uid,
            "ticket_id": client?.ticket,
            "state": "queue",
            "game_id": "FlappyHero",
            "reconnectToken": this.roomId + ":" + client?._reconnectionToken
        };
        const syncTicketPayload = await (0, DynamodbAPI_1.syncTicket)(options?.player?.accessToken, JSON.stringify(syncTicketData));
        const player = this.state.createPlayer(client.sessionId, options?.player, this.state.players.size, options?.player?.uid, "queue", options?.player?.walletId, client?.ticket, client?.passCred);
        console.log("this.state.players.size: ", this.state.players.size);
        const canStartGame = this.state.players.size == this.maxClients;
        this.startBattleRoomSearch(canStartGame);
        if (this.state.players.size > 1) {
            if (!this.isCountingTime)
                this.roomStartTime = Date.now();
            this.isCountingTime = true;
            this.CountingTime();
        }
        // if (this.state.players.size === this.maxClients) {
        //   this.lock();
        //   this.delayedInterval = this.clock.setInterval(async () => {          //send room length to clients
        //     const battleRoom = await matchMaker.findOneRoomAvailable("battleRoom", { mode: 'autogame' });
        //     console.log("have battleRoom: ", battleRoom);
        //     if (battleRoom) {
        //       this.battleRoom = battleRoom;
        //       let players: any = [];
        //       this.state.players.forEach(async (player) => {
        //         players[players?.length] = { ...player, player: player };
        //         const client = this.clients.getById(player.sessionId);
        //         console.log("player.playerId; ", player.playerId);
        //         const options = { accessToken: player?.accessToken, sessionId: player?.sessionId, walletId: (player as any)?.walletId, userId: (player as any)?.uid, ticket: player?.ticket, passCred: player?.passCred, playerId: player.playerId };
        //         if (client) {
        //           client.send("get-my-sessionId", { data: player?.sessionId });
        //           const matchData = await matchMaker.reserveSeatFor(this.battleRoom, options);
        //           client.send("reserveSeatFor", { data: matchData });
        //           player.reserveSeat = true;
        //         }
        //       });
        //       console.log("battle-room-id");
        //       this.broadcast("battle-room-id", {});
        //       const payload = await matchMaker.remoteRoomCall(battleRoom.roomId, "setPlayer", [{ roomId: this.roomId, player: players }]);
        //       if (payload) {
        //         this.broadcast("game-event", {
        //           state: "game-join",
        //           message: "Connecting to server"
        //         });
        //       }
        //       this.delayedInterval.clear();
        //     }
        //   }, 2000);
        //   this.state.waitingForServer = true;
        // }
    }
    CountingTime() {
        // Create an interval to update the time counter
        this.timeInterval = this.clock.setInterval(() => {
            const currentTime = Date.now();
            const elapsedTime = Math.floor((currentTime - this.roomStartTime) / 1000); // Convert to seconds
            this.state.timeCounter = elapsedTime;
            console.log("My Room CountingTime: ", this.state.timeCounter);
            let timerCounter = this.waitingPlayerTime - elapsedTime;
            if (timerCounter < 0)
                timerCounter = 0;
            // Optionally, broadcast the time to all clients
            this.broadcast("counting-waiting-player-time", { timeCounter: timerCounter });
            // Check if 2 minutes have passed
            if (this.state.timeCounter >= this.waitingPlayerTime && !this.state.waitingForServer && this.state.players.size >= 2) {
                this.lock();
                this.startBattleRoomSearch(true);
                this.broadcast("counting-waiting-player-time", { timeCounter: 0 });
                this.timeInterval.clear();
            }
        }, 1000); // Update every second
    }
    startBattleRoomSearch(canStartGame) {
        // When room is full
        if (canStartGame) {
            this.delayedInterval = this.clock.setInterval(async () => {
                const battleRoom = await core_1.matchMaker.findOneRoomAvailable("battleRoom", { mode: 'autogame' });
                console.log("have battleRoom: ", battleRoom);
                if (battleRoom) {
                    this.lock();
                    this.battleRoom = battleRoom;
                    const lockPayload = await core_1.matchMaker.remoteRoomCall(battleRoom.roomId, "lockTheRoom", [{}]);
                    if (!lockPayload)
                        return;
                    let players = [];
                    this.state.players.forEach(async (player) => {
                        players[players?.length] = { ...player, player: player };
                        const client = this.clients.getById(player.sessionId);
                        console.log("player.playerId; ", player.playerId);
                        const options = { accessToken: player?.accessToken, sessionId: player?.sessionId, walletId: player?.walletId, userId: player?.uid, ticket: player?.ticket, passCred: player?.passCred, playerId: player.playerId };
                        if (client) {
                            client.send("get-my-sessionId", { data: player?.sessionId });
                            const matchData = await core_1.matchMaker.reserveSeatFor(this.battleRoom, options);
                            client.send("reserveSeatFor", { data: matchData });
                            player.reserveSeat = true;
                        }
                    });
                    console.log("battle-room-id");
                    this.broadcast("battle-room-id", {});
                    const payload = await core_1.matchMaker.remoteRoomCall(battleRoom.roomId, "setPlayer", [{ roomId: this.roomId, player: players }]);
                    if (payload) {
                        this.broadcast("game-event", {
                            state: "game-join",
                            message: "Connecting to server"
                        });
                    }
                    this.delayedInterval.clear();
                }
            }, 2000);
            this.state.waitingForServer = true;
        }
        else {
            this.unlock();
        }
    }
    async onLeave(client, consented) {
        this.state.players.get(client.sessionId).connected = false;
        try {
            if (consented) {
                throw new Error("consented leave");
            }
            const reconnection = this.allowReconnection(client, "manual");
            // now it's time to `await` for the reconnection
            await reconnection;
            // client returned! let's re-activate it.
            this.state.players.get(client.sessionId).connected = true;
            const promise = await reconnection.promise;
            console.log("queue room reconnection token:", promise._reconnectionToken);
            //sync ticket
        }
        catch (e) {
            //console.log("error:",e);
            console.log(`Queue room ${this.roomId} reconnection has been rejected. remove the client...`);
            // reconnection has been rejected. let's remove the client.
            this.state.players.delete(client.sessionId);
            this.unlock();
        }
    }
    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
    closeRoom() {
        // this.broadcast("game-event", {
        //   state: "game-joined",
        //   message: "Connecting to server"
        // });
        // setTimeout(() => {
        //   this.disconnect();
        // }, 5000);
        this.disconnect();
    }
}
exports.MyRoom = MyRoom;
