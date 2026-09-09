import { z } from "zod";

const environmentSchema=z.object({
  NODE_ENV:z.enum(["development","test","production"]).default("development"),
  PORT:z.coerce.number().int().min(1).max(65535).default(3000),
  HOST:z.string().min(1).default("0.0.0.0"),
  ALLOWED_ORIGINS:z.string().optional(),
  SESSION_SECRET:z.string().min(32).optional(),
  DATABASE_URL:z.string().url().optional().or(z.literal("")),
  REDIS_URL:z.string().url().optional().or(z.literal("")),
  METRICS_TOKEN:z.string().min(24).optional(),
}).superRefine((env,context)=>{
  if(env.NODE_ENV!=="production")return;
  if(!env.SESSION_SECRET)context.addIssue({code:"custom",path:["SESSION_SECRET"],message:"SESSION_SECRET is required in production"});
  if(!env.DATABASE_URL)context.addIssue({code:"custom",path:["DATABASE_URL"],message:"DATABASE_URL is required in production"});
  if(!env.REDIS_URL)context.addIssue({code:"custom",path:["REDIS_URL"],message:"REDIS_URL is required in production"});
  if(!env.METRICS_TOKEN)context.addIssue({code:"custom",path:["METRICS_TOKEN"],message:"METRICS_TOKEN is required in production"});
  if(!env.ALLOWED_ORIGINS)context.addIssue({code:"custom",path:["ALLOWED_ORIGINS"],message:"ALLOWED_ORIGINS is required in production"});
});

export interface ServerConfig {
  environment:"development"|"test"|"production";port:number;host:string;
  allowedOrigins?:string;sessionSecret?:string;databaseUrl?:string;redisUrl?:string;metricsToken?:string;
}

export function loadConfig(env:NodeJS.ProcessEnv=process.env):ServerConfig {
  const result=environmentSchema.safeParse(env);
  if(!result.success)throw new Error(`Invalid server configuration: ${result.error.issues.map(issue=>`${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  return {environment:result.data.NODE_ENV,port:result.data.PORT,host:result.data.HOST,allowedOrigins:result.data.ALLOWED_ORIGINS,sessionSecret:result.data.SESSION_SECRET,databaseUrl:result.data.DATABASE_URL||undefined,redisUrl:result.data.REDIS_URL||undefined,metricsToken:result.data.METRICS_TOKEN};
}
