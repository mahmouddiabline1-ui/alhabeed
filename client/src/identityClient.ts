import { serverUrl } from "./serverUrl";

export const CHARACTER_IDS = Array.from({length:12},(_,index)=>`character-${index+1}`) as CharacterId[];
export type CharacterId = `character-${1|2|3|4|5|6|7|8|9|10|11|12}`;
export interface Profile { userId:string; displayName:string; selectedCharacterId:CharacterId; locale:string; createdAt:number; updatedAt:number }

const API=serverUrl.replace(/\/$/u,"");
const TOKEN_KEY="alhabeed:access-token";
const DEVICE_KEY="alhabeed:device-id";
let restorePromise:Promise<Profile|null>|null=null;

const token=()=>sessionStorage.getItem(TOKEN_KEY);
const saveToken=(value:string)=>sessionStorage.setItem(TOKEN_KEY,value);
const clearToken=()=>sessionStorage.removeItem(TOKEN_KEY);
const deviceId=()=>{
  const saved=localStorage.getItem(DEVICE_KEY);
  if(saved)return saved;
  const value=crypto.randomUUID();localStorage.setItem(DEVICE_KEY,value);return value;
};
async function json(response:Response){
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.message||body.error||"تعذّر الاتصال بالحساب");
  return body.data;
}
async function refreshToken(){
  const data=await json(await fetch(`${API}/api/auth/refresh`,{method:"POST",credentials:"include"})) as {accessToken:string};
  saveToken(data.accessToken);return data.accessToken;
}
async function authorized(path:string,init:RequestInit={},retry=true):Promise<any>{
  const access=token();
  if(!access)throw new Error("NO_ACCESS_TOKEN");
  const response=await fetch(`${API}${path}`,{...init,credentials:"include",headers:{...init.headers,authorization:`Bearer ${access}`}});
  if(response.status===401&&retry){await refreshToken();return authorized(path,init,false);}
  return json(response);
}
export function restoreProfile(){
  if(restorePromise)return restorePromise;
  restorePromise=(async()=>{
    try { if(token())return await authorized("/api/me") as Profile; } catch { clearToken(); }
    try { await refreshToken(); return await authorized("/api/me",{},false) as Profile; }
    catch { clearToken(); return null; }
  })().finally(()=>{restorePromise=null;});
  return restorePromise;
}
export async function createProfile(displayName:string,selectedCharacterId:CharacterId){
  const data=await json(await fetch(`${API}/api/auth/anonymous`,{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({displayName,selectedCharacterId,deviceId:deviceId()})})) as {profile:Profile;accessToken:string};
  saveToken(data.accessToken);return data.profile;
}
export async function updateProfile(displayName:string,selectedCharacterId:CharacterId){
  return authorized("/api/me",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({displayName,selectedCharacterId})}) as Promise<Profile>;
}
export async function logoutAll(){
  try { await authorized("/api/auth/logout-all",{method:"POST"},false); } finally { clearToken(); }
}
