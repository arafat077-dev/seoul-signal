/* All financial fields in KRW; integer source values are exactly representable in Number. */
(function(g){'use strict';
const ds=g.SEOUL_DATA, cats=['pc','ha','mo'], labels={all:'All electronics',pc:ds.cats[0],ha:ds.cats[1],mo:ds.cats[2]}, short={all:'All categories',pc:'Computers',ha:'Appliances',mo:'Mobile phones'};
const ns=ds.districts, qs=ds.quarters, periods=[20251,20252,20261,20262], ix=new Map();
const key=(q,d,c)=>q+'|'+d+'|'+c;
ds.rows.forEach(([q,d,c,s,t])=>ix.set(key(q,ns[d],cats[c]),{s,t}));
const pos=x=>x>0,rate=(a,b)=>b?100*(a-b)/b:null,add=(a,b)=>a+b, sum=(rs,f)=>rs.reduce((a,r)=>a+r[f],0);
const L=(n,dp=0)=>Number(n).toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp});
const won=(n,d=2,sign=false)=>{if(n==null||!Number.isFinite(n))return '—';const a=Math.abs(n),s=n<0?'−':sign&&n>0?'+':'';const [u,tag]=a>=1e12?[1e12,'T']:a>=1e9?[1e9,'B']:a>=1e6?[1e6,'M']:a>=1e4?[1e3,'K']:[1,''];return s+'₩'+L(a/u,u===1?0:d)+tag};
const integer=n=>n==null?'—':L(n),pct=(n,sign=true,d=2)=>n==null||!Number.isFinite(n)?'—':(n<0?'−':sign&&n>0?'+':'')+L(Math.abs(n),d)+'%';
const exact=n=>n==null?'—':(n<0?'−':'')+'₩'+L(Math.abs(n)),compact=n=>n==null?'—':Math.abs(n)>=1e6?L(n/1e6,2)+'M':Math.abs(n)>=1e3?L(n/1e3,1)+'K':L(n);
const qname=q=>Math.floor(q/10)+' Q'+q%10,exclude=(p,x)=>x==='yc'?p.d==='Yongsan-gu'&&p.c==='pc':x==='ya'?p.d==='Yongsan-gu':false;
const arr=(ds1,c)=>[(ds1==='all'?ns:[ds1]),(c==='all'?cats:[c])];
function series(d='all',c='all'){const [districts,categories]=arr(d,c);return qs.map(q=>{let s=0,t=0,n=0;for(const name of districts)for(const cat of categories){const r=ix.get(key(q,name,cat));if(r){s+=r.s;t+=r.t;n++}}return{q,s:n?s:null,t:n?t:null,a:n&&t?s/t:null,n,expected:districts.length*categories.length}})}
const allPairs=[];
for(const d of ns)for(const c of cats){const rs=periods.map(q=>ix.get(key(q,d,c)));if(!rs.every(Boolean))continue;const [a,b,e,f]=rs,old=a.s+b.s,now=e.s+f.s,t0=a.t+b.t,t=e.t+f.t,q1=e.s-a.s,q2=f.s-b.s,delta=now-old,dt=t-t0;allPairs.push({d,c,old,now,t0,t,q1,q2,dt,delta,percent:rate(now,old),tp:rate(t,t0),qual:q1>0&&q2>0&&dt>0,avg0:t0?old/t0:null,avg:t?now/t:null})}
function pairs(d='all',c='all',exc='none'){return allPairs.filter(p=>(d==='all'||p.d===d)&&(c==='all'||p.c===c)&&!exclude(p,exc))}
function summary(d='all',c='all',exc='none'){const r=pairs(d,c,exc),f={n:r.length,expected:(d==='all'?25:1)*(c==='all'?3:1),pos:r.filter(p=>p.delta>0).length,neg:r.filter(p=>p.delta<0).length,pass:r.filter(p=>p.qual).length};for(const k of ['old','now','t','t0','q1','q2','dt','delta'])f[k]=r.length?sum(r,k):null;f.percent=r.length?rate(f.now,f.old):null;f.tp=r.length?rate(f.t,f.t0):null;return f}
function rank(d='all',c='all',by='delta'){if(!['delta','percent','dt'].includes(by))by='delta';return pairs(d,c).filter(p=>p.qual).sort((a,b)=>b[by]-a[by]||b.delta-a.delta||a.d.localeCompare(b.d)||a.c.localeCompare(b.c))}
function volume(d='all',c='all'){const v=series(d,c);let n=v.reduce((a,b)=>a+b.n,0);return {s:n?v.reduce((a,r)=>a+(r.s||0),0):null,t:n?v.reduce((a,r)=>a+(r.t||0),0):null,n,expected:v.reduce((a,r)=>a+r.expected,0)}}
function biggest(c='all'){return ns.map(d=>({d,...volume(d,c)})).sort((a,b)=>b.s-a.s)}
function economics(cost,margin,forecast){if(cost==null||margin==null||!Number.isFinite(cost)||!Number.isFinite(margin)||cost<0||margin<=0||margin>100)return null;const ok=forecast!=null&&Number.isFinite(forecast)&&forecast>=0;return{breakEven:Math.ceil(cost/(margin/100)),contribution:ok?forecast*margin/100-cost:null,rate:margin/100}}
const meanings={s:'Estimated sales',t:'Transactions',a:'Sales per transaction'}, mf=(x,m)=>x==null?'—':m==='t'?compact(x):m==='a'?exact(Math.round(x)):won(x);
g.SS={ds,ns,qs,cats,labels,short,won,pct,L,exact,integer,compact,qname,series,pairs,summary,rank,volume,biggest,economics,mf,meanings,allPairs};
})(globalThis);
