import { randomUUID } from "node:crypto";
import { io, type Socket } from "socket.io-client";

const serverUrl=process.env.SERVER_URL??"http://127.0.0.1:3001";
type State=any;
type Peer={socket:Socket;room:State|null;error?:Error};

const peer=():Peer=>{const value:Peer={socket:io(serverUrl,{transports:["websocket"]}),room:null};value.socket.on("room:state",state=>{value.room=state;});value.socket.on("game:error",error=>{value.error=new Error(`${error.code}: ${error.message}`);});return value;};
const waitFor=async(value:Peer,predicate:(room:State)=>boolean,timeoutMs=5000):Promise<State>=>{
  const started=Date.now();
  while(Date.now()-started<timeoutMs){if(value.error)throw value.error;if(value.room&&predicate(value.room))return value.room;await new Promise(resolve=>setTimeout(resolve,20));}
  throw new Error("Timed out waiting for room state");
};
const request=<T>(value:Peer,event:string,payload:object)=>new Promise<T>((resolve,reject)=>{
  const onError=(error:{code:string;message:string})=>{clearTimeout(timeout);reject(new Error(`${event}: ${error.code}: ${error.message}`));};
  const timeout=setTimeout(()=>{value.socket.off("game:error",onError);reject(new Error(`${event} acknowledgement timed out`));},5000);
  value.socket.once("game:error",onError);
  value.socket.emit(event,payload,(result:T)=>{clearTimeout(timeout);value.socket.off("game:error",onError);resolve(result);});
});
const command=async(peer:Peer,event:string,payload:object):Promise<State>=>{
  if(!peer.room)throw new Error("Peer has no room state");
  const state=await request<State>(peer,event,{...payload,commandId:randomUUID(),expectedVersion:peer.room.version});
  peer.room=state;return state;
};

const peers=[peer(),peer(),peer()];
try {
  await Promise.all(peers.map(value=>new Promise<void>((resolve,reject)=>{value.socket.once("connect",resolve);value.socket.once("connect_error",reject);}))); 
  const packageIds=["egypt","history","football","screen","food","science","music","technology","nature","world","egypt_landmarks","world_landmarks"];
  const created=await request<any>(peers[0]!,"room:create",{name:"Smoke Host",settings:{modes:["habbedha"],packageIds,totalRounds:3,answerSeconds:15,voteSeconds:10,revealSeconds:5}});
  peers[0]!.room=created.room;const code=created.room.code;
  for(let index=1;index<3;index++){const joined=await request<any>(peers[index]!,"room:join",{name:`Smoke ${index+1}`,code});peers[index]!.room=joined.room;}
  await Promise.all(peers.map(value=>waitFor(value,room=>Object.keys(room.players).length===3)));
  const started=await command(peers[0]!,"game:start",{code});
  if(!/^[0-9a-f-]{36}$/iu.test(started.round.questionId))throw new Error("Round did not use a PostgreSQL question UUID");
  let latest=started;
  for(let index=0;index<3;index++){
    await waitFor(peers[index]!,room=>room.version>=latest.version);
    latest=await command(peers[index]!,"round:answer",{code,text:`إجابة اختبار ${index+1}`});
  }
  if(latest.phase!=="voting")throw new Error("Answering did not advance to voting");
  if(latest.round.correctAnswer!==undefined||latest.round.options.some((option:any)=>Object.hasOwn(option,"authorId")||Object.hasOwn(option,"isCorrect")))throw new Error("Private answer data leaked before reveal");
  for(let index=0;index<3;index++){
    await waitFor(peers[index]!,room=>room.version>=latest.version);
    latest=await command(peers[index]!,"round:vote",{code,optionId:peers[index]!.room.round.options[0].id});
  }
  if(latest.phase!=="reveal"||!latest.round.correctAnswer)throw new Error("Voting did not reach reveal");
  process.stdout.write(JSON.stringify({ok:true,code,questionId:started.round.questionId,finalVersion:latest.version,privateBeforeReveal:true,revealedAfterVote:true})+"\n");
} finally {peers.forEach(value=>value.socket.disconnect());}
