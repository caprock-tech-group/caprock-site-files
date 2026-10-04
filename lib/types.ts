export type Store={id:string;handle:string;name:string;bio:string;avatar:string;theme:string;instagram:string;published:number;user_id?:string;stripe_account?:string;demo?:number};
export type Lesson={id:string;title:string;body:string;video?:string};
export type Product={id:string;store_id:string;title:string;description:string;type:'download'|'course'|'booking';price:number;cover:string;file_id?:string;content?:string;duration:number;meeting_url?:string;published:number;position:number;created?:string;lessons?:{id:string;title:string}[];sales?:number};
export type Order={id:string;token:string;product_id:string;buyer_name:string;email:string;amount:number;status:string;demo:number;created:string;slot_id:string;consent:number};
export const money=(c:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:c%100?2:0}).format(c/100);
export const typeLabel={download:'Digital download',course:'Online course',booking:'1:1 session'};
