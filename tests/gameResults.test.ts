import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/core/engine.js";
import { QuestionBank } from "../src/core/questions.js";
import { InMemoryRoomRepository } from "../src/persistence/repository.js";
import { InMemoryGameResultRepository } from "../src/results/inMemoryGameResultRepository.js";
import { resultFromFinishedRoom } from "../src/results/gameResults.js";
import { GameService } from "../src/server/service.js";
import type { RoomState } from "../src/core/types.js";
import { GameError } from "../src/core/errors.js";

const finishedRoom=():RoomState=>({
  code:"ABC123",hostId:"p1",phase:"finished",settings:{modes:["habbedha"],packageIds:["egypt"],totalRounds:1,answerSeconds:30,voteSeconds:20,revealSeconds:8,allowHostTiming:true},
  players:{
    p1:{id:"p1",name:"أحمد",connected:true,score:5,joinedAt:1,userId:"11111111-1111-4111-8111-111111111111"},
    p2:{id:"p2",name:"محمود",connected:true,score:5,joinedAt:2,userId:"22222222-2222-4222-8222-222222222222"},
    p3:{id:"p3",name:"ضيف",connected:true,score:2,joinedAt:3},
  },round:null,usedQuestionIds:["secret-question"],createdAt:1,version:9,
});

test("finished result is a safe ranked snapshot and ties share a rank",()=>{
  const result=resultFromFinishedRoom(finishedRoom(),"content-v1",50);
  assert.deepEqual(result.players.map(player=>[player.playerId,player.rank]),[["p1",1],["p2",1],["p3",3]]);
  const serialized=JSON.stringify(result);
  assert.equal(serialized.includes("secret-question"),false);
  assert.equal(serialized.includes("submissions"),false);
  assert.equal(serialized.includes("votes"),false);
  assert.equal(serialized.includes("correctAnswer"),false);
});

test("finished match is persisted exactly once and history is owned, ordered and capped",async()=>{
  const results=new InMemoryGameResultRepository();
  const engine=new GameEngine(new QuestionBank([]));
  const service=new GameService(engine,new InMemoryRoomRepository(),results,"content-v1");
  await service.persist(finishedRoom());
  await service.persist({...finishedRoom(),version:10});
  assert.equal(results.results.size,1);
  for(let index=0;index<25;index++){
    const room=finishedRoom(); room.code=index.toString(36).toUpperCase().padStart(6,"0"); room.createdAt=index;
    await results.saveOnce(resultFromFinishedRoom(room,"content-v1",100+index));
  }
  const history=await service.history("11111111-1111-4111-8111-111111111111");
  assert.equal(history.length,20);
  assert.ok(history.every(item=>item.player.userId==="11111111-1111-4111-8111-111111111111"));
  assert.ok(history.every((item,index)=>index===0||history[index-1]!.finishedAt>=item.finishedAt));
  assert.equal((await service.history("33333333-3333-4333-8333-333333333333")).length,0);
});

test("profile stats are empty for an account with no persisted results",async()=>{
  const results=new InMemoryGameResultRepository();
  const service=new GameService(new GameEngine(new QuestionBank([])),new InMemoryRoomRepository(),results,"content-v1");
  assert.deepEqual(await service.stats("33333333-3333-4333-8333-333333333333"),{
    gamesPlayed:0,wins:0,totalScore:0,bestScore:0,averageRank:null,
  });
});

test("profile stats use only the authenticated account results and count tied first places as wins",async()=>{
  const results=new InMemoryGameResultRepository();
  const service=new GameService(new GameEngine(new QuestionBank([])),new InMemoryRoomRepository(),results,"content-v1");
  await results.saveOnce(resultFromFinishedRoom(finishedRoom(),"content-v1",100));
  const second=finishedRoom();
  second.code="XYZ789";
  second.players.p1!.score=3;
  second.players.p2!.score=9;
  second.players.p3!.score=6;
  await results.saveOnce(resultFromFinishedRoom(second,"content-v1",200));

  assert.deepEqual(await service.stats("11111111-1111-4111-8111-111111111111"),{
    gamesPlayed:2,wins:1,totalScore:8,bestScore:5,averageRank:2,
  });
  assert.deepEqual(await service.stats("22222222-2222-4222-8222-222222222222"),{
    gamesPlayed:2,wins:2,totalScore:14,bestScore:9,averageRank:1,
  });
  assert.deepEqual(await service.stats("33333333-3333-4333-8333-333333333333"),{
    gamesPlayed:0,wins:0,totalScore:0,bestScore:0,averageRank:null,
  });
});

test("account links are private and an established player ownership cannot be replaced",()=>{
  const engine=new GameEngine(new QuestionBank([]),()=>1,()=>0);
  const room=engine.createRoom({id:"p1",name:"أحمد",userId:"11111111-1111-4111-8111-111111111111"});
  const publicState=engine.publicState(room.code,"p1");
  assert.equal(JSON.stringify(publicState).includes("11111111-1111-4111-8111-111111111111"),false);
  assert.equal(Object.hasOwn(publicState.players.p1!,"userId"),false);
  assert.throws(()=>engine.bindUser(room.code,"p1","22222222-2222-4222-8222-222222222222"),(error:unknown)=>error instanceof GameError&&error.code==="PLAYER_ACCOUNT_MISMATCH");
  assert.equal(engine.getRoom(room.code).players.p1!.userId,"11111111-1111-4111-8111-111111111111");
});

test("one authenticated account cannot occupy multiple slots while guests remain unrestricted",()=>{
  const engine=new GameEngine(new QuestionBank([]),()=>1,()=>0);
  const userId="11111111-1111-4111-8111-111111111111";
  const room=engine.createRoom({id:"p1",name:"أحمد",userId});
  assert.throws(()=>engine.joinRoom(room.code,{id:"p2",name:"محمود",userId}),(error:unknown)=>error instanceof GameError&&error.code==="ACCOUNT_ALREADY_IN_ROOM");
  assert.doesNotThrow(()=>engine.joinRoom(room.code,{id:"guest-1",name:"ضيف أول"}));
  assert.doesNotThrow(()=>engine.joinRoom(room.code,{id:"guest-2",name:"ضيف ثاني"}));
  assert.throws(()=>engine.bindUser(room.code,"guest-1",userId),(error:unknown)=>error instanceof GameError&&error.code==="ACCOUNT_ALREADY_IN_ROOM");
  assert.equal(engine.getRoom(room.code).players["guest-1"]!.userId,undefined);
});
