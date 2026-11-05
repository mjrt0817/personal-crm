import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { orderSession } from '@/lib/orders';
import { exchangeMfToken,mfConfig,sealTokens } from '@/lib/moneyforward';
export async function GET(request:Request){
 const {db,userId}=await orderSession();const c=mfConfig(),u=new URL(request.url),jar=await cookies();const expected=jar.get('mf_oauth')?.value;jar.delete({name:'mf_oauth',path:'/api/mf'});
 const dest=new URL('/settings',c.uri);
 if(!u.searchParams.get('state')||expected!==`${userId}:${u.searchParams.get('state')}`||!u.searchParams.get('code')){dest.searchParams.set('mf','error');return NextResponse.redirect(dest);}
 try{const tokens=await exchangeMfToken({grant_type:'authorization_code',code:u.searchParams.get('code')!,redirect_uri:c.uri});const {error}=await db.from('mf_connections').upsert({user_id:userId,token_encrypted:sealTokens(tokens),connected_at:new Date().toISOString(),refresh_lock:null});if(error)throw error;dest.searchParams.set('mf','connected');}catch{dest.searchParams.set('mf','error');}return NextResponse.redirect(dest);
}
