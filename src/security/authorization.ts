import { GameError } from "../core/errors.js";

export type AdminRole="editor"|"reviewer"|"publisher"|"support"|"admin";
export type Permission="question:edit"|"question:review"|"pack:publish"|"report:resolve"|"purchase:refund"|"admin:manage";
export interface AdminPrincipal {userId:string;roles:AdminRole[];authenticatedAt:number;mfa:boolean}

const rolePermissions:Record<AdminRole,ReadonlySet<Permission>>={
  editor:new Set(["question:edit"]),
  reviewer:new Set(["question:review"]),
  publisher:new Set(["pack:publish"]),
  support:new Set(["report:resolve"]),
  admin:new Set(["question:edit","question:review","pack:publish","report:resolve","purchase:refund","admin:manage"]),
};
const sensitive=new Set<Permission>(["pack:publish","purchase:refund","admin:manage"]);

export function authorize(principal:AdminPrincipal,permission:Permission,now=Date.now()):void {
  if(!principal.roles.some(role=>rolePermissions[role].has(permission)))throw new GameError("FORBIDDEN","This account lacks the required permission");
  if(sensitive.has(permission)) {
    if(!principal.mfa)throw new GameError("MFA_REQUIRED","MFA is required for this action");
    if(now-principal.authenticatedAt>10*60_000)throw new GameError("REAUTH_REQUIRED","Recent authentication is required for this action");
  }
}

export type ReportTarget="player"|"question"|"image"|"chat";
export interface ModerationReport {id:string;reporterId:string;targetType:ReportTarget;targetId:string;reason:string;status:"open"|"reviewing"|"resolved"|"dismissed";createdAt:number}

export class ModerationQueue {
  private readonly reports=new Map<string,ModerationReport>();
  create(report:ModerationReport):void {
    if(report.reason.trim().length<5||report.reason.length>500)throw new GameError("INVALID_REPORT","Report reason must be 5-500 characters");
    if(this.reports.has(report.id))return;
    this.reports.set(report.id,{...report,reason:report.reason.trim()});
  }
  resolve(id:string,status:"resolved"|"dismissed",principal:AdminPrincipal,now=Date.now()):ModerationReport {
    authorize(principal,"report:resolve",now);
    const report=this.reports.get(id);if(!report)throw new GameError("REPORT_NOT_FOUND","Report not found");
    report.status=status;return structuredClone(report);
  }
}
