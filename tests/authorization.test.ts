import test from "node:test";
import assert from "node:assert/strict";
import { authorize, ModerationQueue } from "../src/security/authorization.js";
import { GameError } from "../src/core/errors.js";

test("publishing requires the publisher permission, MFA, and recent authentication",()=>{
  assert.throws(()=>authorize({userId:"u",roles:["editor"],authenticatedAt:1000,mfa:true},"pack:publish",1000),(error:unknown)=>error instanceof GameError&&error.code==="FORBIDDEN");
  assert.throws(()=>authorize({userId:"u",roles:["publisher"],authenticatedAt:1000,mfa:false},"pack:publish",1000),(error:unknown)=>error instanceof GameError&&error.code==="MFA_REQUIRED");
  assert.throws(()=>authorize({userId:"u",roles:["publisher"],authenticatedAt:1000,mfa:true},"pack:publish",602_000),(error:unknown)=>error instanceof GameError&&error.code==="REAUTH_REQUIRED");
  assert.doesNotThrow(()=>authorize({userId:"u",roles:["publisher"],authenticatedAt:1000,mfa:true},"pack:publish",2000));
});

test("support can resolve reports but cannot refund purchases",()=>{
  const principal={userId:"support",roles:["support"] as const,authenticatedAt:1000,mfa:true};
  const queue=new ModerationQueue();
  queue.create({id:"r1",reporterId:"u",targetType:"question",targetId:"q",reason:"المعلومة غير صحيحة",status:"open",createdAt:1000});
  assert.equal(queue.resolve("r1","resolved",{...principal,roles:[...principal.roles]},1100).status,"resolved");
  assert.throws(()=>authorize({...principal,roles:[...principal.roles]},"purchase:refund",1100));
});
