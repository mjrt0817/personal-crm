import type {SalesOrder} from './orders';
export const demoOrders:SalesOrder[]=[{
 id:'99999999-9999-4999-8999-999999999999',user_id:'demo',estimate_id:'demo-estimate',company_id:'demo-company',project_id:null,order_no:'ORD-DEMO0001',status:'signing',
 snapshot:{estimate:{title:'コーポレートサイト制作・公開支援',estimate_no:'EST-DEMO0001',subtotal:100000,tax_amount:10000,total_amount:110000,terms:'制作範囲：トップページ、サービス紹介、お問い合わせ画面。\nサーバー・ドメイン等の実費は別途。'},issuer:{tradeName:'アカンパニー・パートナーズ',personName:'種村 龍太',name:'アカンパニー・パートナーズ',email:'example@example.com'},customer:{name:'株式会社サンプル',postalCode:'950-0000',address:'新潟県新潟市（サンプル住所）'},items:[{description:'Webサイト制作',quantity:1,unit:'式',unit_price:80000,tax_rate:10,line_subtotal:80000,tax_amount:8000},{description:'初期設定・公開支援',quantity:1,unit:'式',unit_price:20000,tax_rate:10,line_subtotal:20000,tax_amount:2000}]},
 delivery_date:'2027-01-15',delivery_place:'注文者指定のWebサーバー',payment_terms:'着手時55,000円、納品後55,000円。銀行振込。振込手数料は注文者負担。',inspection_terms:'納品後7日以内に動作・内容を確認し、不具合があれば受注者に通知する。',signed_path:null,signed_at:null,signed_sha256:null,signature_reference:null,created_at:'2026-11-04T01:00:00Z'
}];
