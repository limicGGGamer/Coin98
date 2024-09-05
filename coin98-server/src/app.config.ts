import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
// import { playground } from "@colyseus/playground";
import basicAuth from "express-basic-auth";

/**
 * Import your Room files
 */
import { MyRoom } from "./rooms/MyRoom";
import { BattleRoom } from "./rooms/BattleRoom";
import { GameOverRoom } from "./rooms/GameOverRoom";

export default config({

    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        gameServer.define('queue', MyRoom).filterBy(['password']);
        gameServer.define('battleRoom', BattleRoom).filterBy(['password']);
        gameServer.define('gameOver', GameOverRoom).filterBy(['password']);

    },

    initializeExpress: (app) => {
        /**
         * Bind your custom express routes here:
         * Read more: https://expressjs.com/en/starter/basic-routing.html
         */
        // app.get("/hello_world", (req, res) => {
        //     res.send("It's time to kick ass and chew bubblegum!");
        // });


        const basicAuthMiddleware = basicAuth({
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
            app.use("/colyseus", monitor());
        }
        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
         */
        app.use("/colyseus", monitor());
    },


    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});
