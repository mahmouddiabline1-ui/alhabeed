import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { GameError } from "../core/errors.js";

interface GuestClaims { v:1; code:string; playerId:string; exp:number }

export class GuestTokenService {
  private readonly secret:Buffer;
  constructor(secret = process.env.SESSION_SECRET ?? randomBytes(32).toString("hex")) {
    if (Buffer.byteLength(secret) < 32) throw new Error("SESSION_SECRET must contain at least 32 bytes");
    this.secret=Buffer.from(secret);
  }
  issue(code:string,playerId:string,now=Date.now()):string {
    const claims:GuestClaims={v:1,code:code.toUpperCase(),playerId,exp:now+30*24*60*60*1000};
    const body=Buffer.from(JSON.stringify(claims)).toString("base64url");
    return `${body}.${this.sign(body)}`;
  }
  verify(token:string,code:string,now=Date.now()):GuestClaims {
    const [body,signature,extra]=token.split(".");
    if (!body || !signature || extra) throw new GameError("INVALID_SESSION","Invalid guest session");
    const expected=this.sign(body);
    const actual=Buffer.from(signature); const wanted=Buffer.from(expected);
    if (actual.length!==wanted.length || !timingSafeEqual(actual,wanted)) throw new GameError("INVALID_SESSION","Invalid guest session");
    try {
      const claims=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as GuestClaims;
      if (claims.v!==1 || claims.code!==code.toUpperCase() || !claims.playerId || claims.exp<=now) throw new Error();
      return claims;
    } catch { throw new GameError("INVALID_SESSION","Expired or invalid guest session"); }
  }
  private sign(body:string){return createHmac("sha256",this.secret).update(body).digest("base64url")}
}
