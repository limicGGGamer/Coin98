
import { Schema, type, MapSchema } from "@colyseus/schema";
import { Player } from "./Player";
import { Block } from "./Block";

export class MyRoomState extends Schema {

  @type("boolean") waitingForServer = false;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Block }) blocks = new MapSchema<Block>();
  @type("number") timeCounter = 0;

  createPlayer(sessionId: string, props: any, playerId: any, userId: string, state: string, walletId: string, ticket: string, passCred: string) {
    console.log('createPlayer sessionId :', sessionId, '    playerId; ', playerId, '    walletId: ', walletId ? walletId : "");
    
    const player = new Player().assign(props?.data || props);
    player.posX = -9999;
    player.posY = -9999;

    player.reserveSeat = false;
    player.userId = userId;
    player.state = state;
    player.walletId = walletId ? walletId : "";
    if(walletId > "")
      player.shortWalletId = walletId.substring(0, 10);
    player.ticket = ticket;
    player.passCred = passCred;
    player.sessionId = sessionId;
    player.playerId = playerId;
    this.players.set(sessionId, player);
    return player;
  }
  
  createBlock(id: string, frame: number, posX: number, posY: number) {
    
    const block = new Block();
    block.id = id;
    block.frame = frame;
    block.posX = posX;
    block.posY = posY;

    this.blocks.set(id, block);
    return block;
  }
}
