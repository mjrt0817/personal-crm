import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { orderSession } from '@/lib/orders';
import { mfConfig } from '@/lib/moneyforward';
export async function GET(){const {userId}=await orderSession();const c=mfConfig(),state=randomBytes(32).toString('hex');const jar=await cookies();jar.set('mf_oauth',`${userId}:${state}`,{httpOnly:true,secure:new URL(c.uri).protocol==='https:',sameSite:'lax',maxAge:600,path:'/api/mf'});const u=new URL('https://api.biz.moneyforward.com/authorize');u.search=new URLSearchParams({client_id:c.id,redirect_uri:c.uri,response_type:'code',scope:'mfc/invoice/data.read mfc/invoice/data.write',state}).toString();return NextResponse.redirect(u);}
