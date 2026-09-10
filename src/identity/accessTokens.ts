import { createHmac, timingSafeEqual } from "node:crypto";
import { GameError } from "../core/errors.js";

export interface AccessClaims { v:1; type:"access"; sub:string; exp:number }

export class AccessTokenService {
  private readonly secret:Buffer;
  constructor(secret:string,private readonly now:()=>number=Date.now,private readonly lifetimeMs=15*60_000) {
    if(Buffer.byteLength(secret)<32)throw new Error("SESSION_SECRET must contain at least 32 bytes");
    this.secret=Buffer.from(secret);
  }
  issue(userId:string):string {
    const body=Buffer.from(JSON.stringify({v:1,type:"access",sub:userId,exp:this.now()+this.lifetimeMs} satisfies AccessClaims)).toString("base64url");
    return `${body}.${this.sign(body)}`;
  }
  verify(token:string):AccessClaims {
    const [body,signature,extra]=token.split(".");
    if(!body||!signature||extra)throw new GameError("INVALID_ACCESS_TOKEN","Invalid access token");
    const actual=Buffer.from(signature); const expected=Buffer.from(this.sign(body));
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new GameError("INVALID_ACCESS_TOKEN","Invalid access token");
    try {
      const claims=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as AccessClaims;
      if(claims.v!==1||claims.type!=="access"||!claims.sub||claims.exp<=this.now())throw new Error();
      return claims;
    } catch { throw new GameError("INVALID_ACCESS_TOKEN","Expired or invalid access token"); }
  }
  private sign(body:string):string { return createHmac("sha256",this.secret).update(body).digest("base64url"); }
}
