"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = __importDefault(require("@colyseus/tools"));
const monitor_1 = require("@colyseus/monitor");
// import { playground } from "@colyseus/playground";
const express_basic_auth_1 = __importDefault(require("express-basic-auth"));
/**
 * Import your Room files
 */
const MyRoom_1 = require("./rooms/MyRoom");
const BattleRoom_1 = require("./rooms/BattleRoom");
const GameOverRoom_1 = require("./rooms/GameOverRoom");
exports.default = (0, tools_1.default)({
    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        gameServer.define('queue', MyRoom_1.MyRoom).filterBy(['password']);
        gameServer.define('battleRoom', BattleRoom_1.BattleRoom).filterBy(['password']);
        gameServer.define('gameOver', GameOverRoom_1.GameOverRoom).filterBy(['password']);
    },
    initializeExpress: (app) => {
        /**
         * Bind your custom express routes here:
         * Read more: https://expressjs.com/en/starter/basic-routing.html
         */
        // app.get("/hello_world", (req, res) => {
        //     res.send("It's time to kick ass and chew bubblegum!");
        // });
        const basicAuthMiddleware = (0, express_basic_auth_1.default)({
            // list of users and passwords
            users: {
                "coin98": "colyseus",
            },
            // sends WWW-Authenticate header, which will prompt the user to fill
            // credentials in
            challenge: true
        });
        /**
         * Use @colyseus/playground
         * (It is not recommended to expose this route in a production environment)
         */
        if (process.env.NODE_ENV !== "production") {
            // app.use("/", playground);
            app.use("/colyseus", (0, monitor_1.monitor)());
        }
        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
         */
        app.use("/colyseus", (0, monitor_1.monitor)());
    },
    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});
