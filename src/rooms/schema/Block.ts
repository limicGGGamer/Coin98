import { Schema, type } from "@colyseus/schema";

export class Block extends Schema {
    @type("number") posX!: number;
    @type("number") posY!: number;
    @type("string") id: string;
    @type("number") frame: number;
}