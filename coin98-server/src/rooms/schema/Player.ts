import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
    public connected: boolean;
    @type("string") sessionId: string;
    public accessToken: string;
    public options: any;
    
    @type("number") posX!: number;
    @type("number") posY!: number;
    @type("number") angle!: number;
    @type("number") score!: number;
    @type("number") playerId!: number;
    @type("string") state: string;
    @type("string") userId: string;
    @type("string") walletId: string;    
    @type("string") shortWalletId: string;    
    @type("string") ticket: string;    
    @type("string") passCred: string;    
    @type("boolean") reserveSeat: boolean;
}