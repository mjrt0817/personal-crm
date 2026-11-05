import 'server-only';
import { createCipheriv,createDecipheriv,randomBytes } from 'node:crypto';
import { orderSession } from './orders';
export type MfTokens={access_token:string;refresh_token:string;expires_at:number};
function key(){const s=process.env.MF_TOKEN_ENCRYPTION_KEY; if(!s)throw new Error('MF_TOKEN_ENCRYPTION_KEYを設定してください。');const b=Buffer.from(s,'base64');if(b.length!==32)throw new Error('MF_TOKEN_ENCRYPTION_KEYは32バイトのBase64値を設定してください。');return b;}
export function sealTokens(t:MfTokens){const iv=randomBytes(12);const c=createCipheriv('aes-256-gcm',key(),iv);const b=Buffer.concat([c.update(JSON.stringify(t)),c.final()]);return [iv,c.getAuthTag(),b].map(x=>x.toString('base64url')).join('.');}
function openTokens(s:string):MfTokens{const [iv,tag,b]=s.split('.').map(x=>Buffer.from(x,'base64url'));const c=createDecipheriv('aes-256-gcm',key(),iv);c.setAuthTag(tag);return JSON.parse(Buffer.concat([c.update(b),c.final()]).toString());}
export function mfConfig(){const id=process.env.MF_OAUTH_CLIENT_ID, secret=process.env.MF_OAUTH_CLIENT_SECRET, uri=process.env.MF_OAUTH_REDIRECT_URI;if(!id||!secret||!uri)throw new Error('MF連携の環境変数を設定してください。');key();const u=new URL(uri);if(u.protocol!=='https:'&&u.hostname!=='localhost')throw new Error('MFのコールバックURLはHTTPSにしてください。');return {id,secret,uri};}
export async function exchangeMfToken(params:Record<string,string>):Promise<MfTokens>{
 const c=mfConfig();const r=await fetch('https://api.biz.moneyforward.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:`Basic ${Buffer.from(`${c.id}:${c.secret}`).toString('base64')}`},body:new URLSearchParams(params),cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error(`MFの認証に失敗しました（${r.status}）。再接続してください。`);const t=await r.json();if(!t.access_token||!t.refresh_token)throw new Error('MFの認証情報を取得できませんでした。');return {access_token:t.access_token,refresh_token:t.refresh_token,expires_at:Date.now()+Number(t.expires_in)*1000};
}
export async function mfConnectionStatus(){if(process.env.NEXT_PUBLIC_DEMO_MODE==='true')return false;const {db}=await orderSession();const {data,error}=await db.from('mf_connections').select('connected_at').maybeSingle();if(error){if(['42P01','PGRST205'].includes(error.code))return false;throw new Error(error.message);}return Boolean(data);}
async function accessToken(){
 const {db,userId}=await orderSession();const {data,error}=await db.from('mf_connections').select('token_encrypted').eq('user_id',userId).single();if(error||!data)throw new Error('設定画面からMFへ接続してください。');let t=openTokens(data.token_encrypted);if(t.expires_at>Date.now()+60000)return t.access_token;
 const {data:lock,error:le}=await db.from('mf_connections').update({refresh_lock:new Date().toISOString()}).eq('user_id',userId).eq('token_encrypted',data.token_encrypted).or(`refresh_lock.is.null,refresh_lock.lt.${new Date(Date.now()-60000).toISOString()}`).select('user_id').maybeSingle();if(le||!lock)throw new Error('MF認証を更新中です。少し待って操作してください。');
 try{t=await exchangeMfToken({grant_type:'refresh_token',refresh_token:t.refresh_token});const {error:save}=await db.from('mf_connections').update({token_encrypted:sealTokens(t),refresh_lock:null}).eq('user_id',userId);if(save)throw new Error('MF認証情報を保存できませんでした。再接続してください。');return t.access_token;}catch(e){await db.from('mf_connections').update({refresh_lock:null}).eq('user_id',userId);throw e;}
}
export class MfHttpError extends Error{constructor(public status:number){super(`MF APIでエラーが発生しました（${status}）。`);}}
export async function mfRequest(path:string,method='GET',body?:unknown,token?:string){
 if(!path.startsWith('/')||path.includes('://')||path.includes('..'))throw new Error('MF APIのパスが不正です。');
 const r=await fetch(`https://invoice.moneyforward.com/api/v3${path}`,{method,headers:{Authorization:`Bearer ${token??await accessToken()}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new MfHttpError(r.status);return r.json();
}
export async function mfAccess(){return accessToken();}
export type MfDepartment={id:string;partnerId:string;name:string};
export async function mfDepartments():Promise<MfDepartment[]>{
 const token=await accessToken();const out:MfDepartment[]=[];
 for(let page=1;page<=10;page++){const result=await mfRequest(`/partners?page=${page}&per_page=100`,'GET',undefined,token);for(const p of result.data??[]){for(const d of p.departments??[])out.push({id:d.id,partnerId:p.id,name:`${p.name}${d.person_dept?' / '+d.person_dept:''}${d.person_name?' / '+d.person_name:''}`});}if(!result.pagination||page>=result.pagination.total_pages)break;}return out;
}
