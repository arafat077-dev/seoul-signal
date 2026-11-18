/* Seoul Signal / cartography. Free of network, map tokens and graphics libraries.
   Requires seoul-geometry.js first. Geographic provenance: map-sources.txt. */
(function (global) {
  'use strict';
  const G = global.SeoulGeometry, NS = 'http://www.w3.org/2000/svg';
  if (!G || !G.districts) throw new Error('Load seoul-geometry.js before map.js');
  const toPairs = a => Array.from({length:a.length/2},(_,i)=>[a[i*2],a[i*2+1]]);
  const districts = Object.keys(G.districts).sort().map((name,i)=>{
    const q=G.districts[name]; const p=toPairs(q.p), c=q.c;
    return {i,name,ko:q.k,code:q.code,p,c};
  });
  const byName=Object.fromEntries(districts.map(d=>[d.name,d])), river=toPairs(G.river);
  const clamp = (v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n1 = v=>Math.round(v*10)/10, pp=p=>n1(p[0])+','+n1(p[1]), rad=Math.PI/180;
  const seg = (a,b)=>'M'+pp(a)+'L'+pp(b);
  const line=pts=>pts.length?'M'+pts.map(pp).join('L'):'';
  const closed=pts=>line(pts)+'Z';
  const polyContains = (q,poly)=>{
    let yes=false;
    for(let i=0,n=poly.length,j=n-1;i<n;j=i++) {
      const a=poly[i], b=poly[j];
      if((a[1]>q[1])!==(b[1]>q[1]) && q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0]) yes=!yes;
    }
    return yes;
  };
  const riverPieces=Object.fromEntries(districts.map(d=>[d.name,[]]));
  // Densify and assign each clipped river piece to its physical district surface;
  // this avoids bridging locations with different encoded heights.
  let prior=null, prevPt=null;
  for(let k=1;k<river.length;k++){
    const a=river[k-1],b=river[k],N=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3.5));
    for(let j=(k===1?0:1);j<=N;j++){
      const q=[a[0]+(b[0]-a[0])*j/N,a[1]+(b[1]-a[1])*j/N];
      const d=districts.find(t=>polyContains(q,t.p)),key=d?.name||null;
      if(key){
        if(key!==prior||!riverPieces[key].length) riverPieces[key].push(prevPt?[prevPt,q]:[q]);
        else riverPieces[key].at(-1).push(q);
      }
      prior=key;prevPt=q;
    }
  }
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const mix=(a,b,q)=>{const x=rgb(a),y=rgb(b);return 'rgb('+x.map((z,i)=>Math.round(z*(1-q)+y[i]*q)).join(',')+')'};
  const cv=(vals,key)=>{if(!vals)return null;let v=typeof vals.get==='function'?vals.get(key):vals[key];if(v && typeof v==='object') v=v.value??v.v;if(v===null||v===undefined||v==='')return null;v=Number(v);return Number.isFinite(v)?v:null};
  const signMode=(m)=>{
    if(typeof m==='object'&&m!==null)return m.signed!==false;
    return !/^(sales|market size|market|total|transactions|amount|sales volume|size|volume|sales_krw|level)$/i.test(String(m??'change'));
  };
  const valueLabel=(v,opt,d)=>{
    if(v===null)return 'No matched value';
    if(typeof opt.formatValue==='function'){
      try{const f=opt.formatValue(v,d?.name);if(f!==null && f!==undefined && String(f)!=='')return String(f);}catch(_){}
    }
    if(/pct|percent|growth|rate/i.test(typeof opt.mode==='string'?opt.mode:''))return (v>0?'+':'')+new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(v)+'%';
    const m=Math.abs(v), u=m>=1e12?[1e12,'T']:m>=1e9?[1e9,'B']:m>=1e6?[1e6,'M']:m>=1e3?[1e3,'K']:[1,''];
    return (v<0?'−':signMode(opt.mode)&&v>0?'+':'')+'₩'+new Intl.NumberFormat('en',{maximumFractionDigits:2}).format(m/u[0])+u[1];
  };
  const diffuse=Object.freeze({yaw:-18,pitch:39,zoom:1});
  let instances=0;
  const css=`
.ss-map-shell {position:relative;width:100%;height:100%;min-height:170px;isolation:isolate;overflow:hidden;color:#e2f1f5;font:500 14px/1.3 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;user-select:none;-webkit-user-select:none;}
.ss-map-stage {position:absolute;inset:0;display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab;outline-offset:-4px;border-radius:inherit}
.ss-map-stage:focus-visible {outline:2px solid #a5e5cf}
.ss-map-stage.ss-map-dragging,.ss-map-stage.ss-map-dragging * {cursor:grabbing!important}
.ss-map-stage g[data-ss-district] {cursor:pointer}
.ss-map-stage g[data-ss-district]:hover .ss-map-edge {stroke:#f5fff6;stroke-width:1.45}
.ss-map-key {position:absolute;z-index:3;left:14px;right:14px;bottom:7px;display:flex;align-items:center;justify-content:center;gap:6px 12px;flex-wrap:wrap;color:#a7bdc9;pointer-events:none;letter-spacing:.01em;font-size:12px;text-shadow:0 1px 3px #0a101a;}
.ss-map-key span {display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.ss-map-chip {display:inline-block;width:8px;height:8px;border-radius:2px;box-shadow:inset 0 0 0 1px #c7e9e640;}
.ss-map-key .ss-map-sign {color:#c6d6dc}
.ss-map-tooltip {position:absolute;z-index:5;pointer-events:none;max-width:200px;padding:9px 12px;border:1px solid #455a70;border-radius:7px;background:rgba(12,20,34,.97);box-shadow:0 5px 22px #050b1859;color:#e9f1f4;font-size:13px;line-height:1.35;}
.ss-map-tooltip[hidden] {display:none!important}
.ss-map-tooltip strong,.ss-map-tooltip span {display:block}
.ss-map-tooltip span {margin-top:2px;color:#a5d7c9;font-variant-numeric:tabular-nums}
.ss-map-sr {position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
@media (max-width:640px){.ss-map-key{left:6px;right:6px;gap:3px 8px;font-size:12px}}
`;
  function scene(opt,cam,width,height,prefix) {
    const W=clamp(width||630,180,2200),H=clamp(height||410,140,1500),small=W<480;
    const yaw=cam.yaw*rad,pitch=cam.pitch*rad,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const raw=Object.fromEntries(districts.map(d=>[d.name,cv(opt.values,d.name)]));
    const absmax=Math.max(1e-12,...Object.values(raw).filter(v=>v!==null).map(Math.abs));
    const ze=(name)=>raw[name]===null?13:15+Math.sqrt(Math.abs(raw[name])/absmax)*126;
    const xyz=(p,z)=>[p[0]*cy-p[1]*sy,(p[0]*sy+p[1]*cy)*sp-z*cp];
    let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity;
    for(const d of districts)for(const p of d.p){const p0=xyz(p,0),p1=xyz(p,ze(d.name));l=Math.min(l,p0[0]);r=Math.max(r,p0[0]);t=Math.min(t,p1[1]);b=Math.max(b,p0[1]);}
    const signed=signMode(opt.mode),kl=opt.legend!==false?1:0;
    const top=small?16:24,bot=(small?17:21)+(kl?(small?35:24):0);
    const k=Math.min((W-(small?24:37))/(r-l),(H-top-bot)/(b-t))*cam.zoom;
    const ox=W*.5-(l+r)*k/2,oy=top+(H-top-bot)/2-(t+b)*k/2;
    const p3=(p,z=0)=>{const[a,c]=xyz(p,z);return [a*k+ox,c*k+oy]};
    const dst=districts.slice().sort((a,b)=>(a.c[0]*sy+a.c[1]*cy)-(b.c[0]*sy+b.c[1]*cy));
    const cl={};
    let defs=`<defs><radialGradient id="${prefix}-floor" cx="52%" cy="48%" r="52%"><stop offset="0" stop-color="#21565a" stop-opacity=".32"/><stop offset=".75" stop-color="#152a3d" stop-opacity=".14"/><stop offset="1" stop-color="#111a2a" stop-opacity="0"/></radialGradient><radialGradient id="${prefix}-glow"><stop offset="0" stop-color="#468790" stop-opacity=".22"/><stop offset="1" stop-color="#18243b" stop-opacity="0"/></radialGradient><linearGradient id="${prefix}-gridmask" x1="0" x2="0" y1="0" y2="1"><stop stop-color="white" stop-opacity="0"/><stop offset=".21" stop-color="white" stop-opacity=".54"/><stop offset=".71" stop-color="white"/><stop offset=".99" stop-color="white" stop-opacity="0"/></linearGradient><mask id="${prefix}-fade"><ellipse cx="${W*.50}" cy="${H*.60}" rx="${W*.57}" ry="${H*.50}" fill="url(#${prefix}-gridmask)"/></mask><pattern id="${prefix}-empty" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(33)"><path d="M0 0v5" stroke="#d1d5df" stroke-opacity=".34" stroke-width="1"/></pattern></defs>`;
    // Light is fixed above the west face; data sign is encoded by hue rather
    // than height. Structural thickness remains on unreported/zero districts.
    let moreDefs='';
    for(const d of districts){
      const v=raw[d.name],inten=v===null?0:Math.sqrt(Math.abs(v)/absmax),sel=d.name===opt.selected;
      const pal=sel?['#eb714c','#ffc39d','#ba5439','#5a2d37','#ffd0a7']:
               v===null?['#303844','#56616c','#303641','#19202f','#85929c']:
               v<0?['#2d3a60','#686a95','#526386','#1c2944','#93a9c4']:
               v===0?['#364a52','#587177','#31474c','#1e3544','#95b5bb']:
               ['#2b535c','#79bfa4','#426f78','#192e40','#9ad8c6'];
      const a=sel?'#ffae81':mix(pal[0],pal[1],.18+.59*inten),b=sel?'#ed7b57':mix(pal[0],pal[1],.01+.46*inten);
      moreDefs+=`<linearGradient id="${prefix}-c${d.i}" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
      cl[d.name]={pal,a,b,sel,inten};
    }
    defs=defs.replace('</defs>',moreDefs+'</defs>');
    let svg=defs+`<ellipse cx="${n1(W*.52)}" cy="${n1(H*.53)}" rx="${n1(W*.54)}" ry="${n1(H*.48)}" fill="url(#${prefix}-glow)" pointer-events="none"/>`;
    let grid='',big='';
    for(let q=-1120;q<=1120;q+=65){const e=((q+1120)/65)%4===0;const segment=seg(p3([q,-1250],-18),p3([q,1250],-18))+seg(p3([-1250,q],-18),p3([1250,q],-18));if(e)big+=segment;else grid+=segment;}
    svg+=`<g mask="url(#${prefix}-fade)" pointer-events="none"><path d="${grid}" fill="none" stroke="#536d86" stroke-opacity=".22" stroke-width=".55"/><path d="${big}" fill="none" stroke="#65859b" stroke-opacity=".26" stroke-width=".75"/></g>`;
    const riverGround=line(river.map(q=>p3(q,-8)));
    svg+=`<path d="${riverGround}" fill="none" stroke="#5594a7" stroke-width="${n1(Math.max(1.25,k*3))}" stroke-opacity=".34" stroke-linecap="round" pointer-events="none"/>`;
    // A low translated silhouette gives the elevated blocks a contact shadow.
    let shadow='';for(const d of dst)shadow+=closed(d.p.map(q=>p3([q[0]+8,q[1]+13],-13)));
    svg+=`<path d="${shadow}" fill="#080f20" opacity=".64" pointer-events="none"/>`;
    const riverLabels=[];
    for(const d of dst){
      const v=raw[d.name],z=ze(d.name),p=d.p,cs=cl[d.name],sel=cs.sel,cen=d.c;
      // Tiny architectural joints keep districts visually separated at low
      // zoom. Geography is still selected by the actual source polygon.
      const sx=1-.010,pts=p.map(q=>[cen[0]+(q[0]-cen[0])*sx, cen[1]+(q[1]-cen[1])*sx]);
      const high=pts.map(q=>p3(q,z)),low=pts.map(q=>p3(q,0));
      const wall=Array.from({length:5},()=>''), band=[];
      for(let i=0;i<p.length;i++){
        const j=(i+1)%p.length,dx=pts[j][0]-pts[i][0],dy=pts[j][1]-pts[i][1],len=Math.hypot(dx,dy)||1,nx=dy/len,ny=-dx/len;
        const facing=nx*sy+ny*cy;
        if(facing<-.08)continue;
        const shade=clamp(Math.round((.52+ .42*(-nx*.89-ny*.40))*4),0,4);
        wall[shade]+='M'+pp(low[i])+'L'+pp(low[j])+' '+pp(high[j])+' '+pp(high[i])+'Z';
        if((sel||z>78)&&facing>.28)for(const g of [.27,.50,.73])band.push(seg(p3(pts[i],z*g),p3(pts[j],z*g)));
      }
      const role=opt.selected===d.name?'true':'false';
      svg+=`<g data-ss-district="${esc(d.name)}" role="button" tabindex="-1" aria-pressed="${role}" aria-label="${esc(d.name+': '+valueLabel(v,opt,d))}">`;
      for(let j=0;j<5;j++)if(wall[j])svg+=`<path d="${wall[j]}" fill="${mix(cs.pal[3],cs.pal[2],.14+j*.18)}" stroke="${mix(cs.pal[3],cs.pal[2],.14+j*.18)}" stroke-width=".43" stroke-linejoin="round"/>`;
      if(band.length)svg+=`<path d="${band.join('')}" fill="none" stroke="${sel?'#ffb995':cs.pal[4]}" stroke-opacity="${sel?.25:.14}" stroke-width=".64"/>`;
      const upper=closed(high);
      svg+=`<path class="ss-map-top" d="${upper}" fill="url(#${prefix}-c${d.i})"/>`;
      if(v===null)svg+=`<path d="${upper}" fill="url(#${prefix}-empty)"/>`;
      const curves=riverPieces[d.name].filter(v=>v.length>=2);
      if(curves.length){
        const s=curves.map(l=>line(l.map(q=>p3(q,z+.65)))).join('');
        // Cut the generalized river to the contracted map face in screen space.
        svg+=`<defs><clipPath id="${prefix}-cut${d.i}"><path d="${upper}"/></clipPath></defs><g clip-path="url(#${prefix}-cut${d.i})" pointer-events="none"><path d="${s}" fill="none" stroke="#162e42" stroke-width="${n1(Math.max(2.1,k*7.5))}" stroke-linejoin="round" stroke-linecap="round" opacity=".91"/><path d="${s}" fill="none" stroke="${sel?'#d8bdae':'#84cddd'}" stroke-width="${n1(Math.max(.8,k*2.4))}" stroke-opacity=".79" stroke-linejoin="round" stroke-linecap="round"/></g>`;
      }
      svg+=`<path class="ss-map-edge" d="${upper}" fill="none" stroke="${cs.pal[4]}" stroke-opacity="${sel?.96:.77}" stroke-width="${sel?1.35:.84}" stroke-linejoin="round"/></g>`;
    }
    // Selected marker belongs to the true interior label point of its polygon.
    const chosen=byName[opt.selected], chosenValue=chosen?raw[chosen.name]:null;
    let plaque=null;
    if(chosen){
      const a=p3(chosen.c,ze(chosen.name)+2), isOn=a[0]>=4&&a[0]<=W-4&&a[1]>=6&&a[1]<=H-8;
      if(isOn){
        const txt=chosen.name, sub=chosenValue===null?'No matched value':valueLabel(chosenValue,opt,chosen);
        const side=a[0]<W*.69?1:-1, fs=small?12:15, ds=small?10.7:12, ww=Math.max(txt.length*fs*.60,sub.length*ds*.62)+26;
        const rx=clamp(side>0?a[0]+(small?16:31):a[0]-ww-(small?16:32),7,W-ww-7);
        const ry=clamp(a[1]-(small?51:65),5,H-66);
        const endpoint=[side>0?rx+4:rx+ww-4,ry+28],stem=Math.min(a[1]-8,ry+35);
        plaque={a,rx,ry,ww,fs,ds,txt,sub,endpoint,stem};
      }
    }
    // Two quiet geographic references, chosen for broad spatial separation.
    const usedBoxes=[];
    const touches=(a,b)=>a[0]<b[0]+b[2]&&a[0]+a[2]>b[0]&&a[1]<b[1]+b[3]&&a[1]+a[3]>b[1];
    if(plaque)usedBoxes.push([plaque.rx-8,plaque.ry-5,plaque.ww+16,48]);
    const refNames=small?['Gangseo-gu']:['Gangseo-gu','Nowon-gu','Gangnam-gu'];
    for(const name of refNames){
      const d=byName[name];if(!d||d===chosen)continue;
      const q=p3(d.c,ze(d.name)+1);
      let tx=q[0],ty=q[1]+1;const ww=name.length*(small?5.6:6.0)+11;
      const rect=[tx-ww/2,ty-8,ww,16];
      if(rect[0]<5||rect[0]+ww>W-5||rect[1]<10||rect[1]+16>H-bot-1||usedBoxes.some(x=>touches(x,rect)))continue;
      usedBoxes.push(rect);
      svg+=`<text x="${n1(tx)}" y="${n1(ty)}" text-anchor="middle" dominant-baseline="central" font-size="${small?10:11}" font-weight="550" letter-spacing=".1" fill="#d1e2e3" stroke="#233748" stroke-opacity=".86" paint-order="stroke" stroke-width="2.4" pointer-events="none">${esc(name)}</text>`;
    }
    if(plaque){
      const {a,rx,ry,ww,fs,ds,txt,sub,endpoint,stem}=plaque;
      svg+=`<g pointer-events="none"><ellipse cx="${n1(a[0])}" cy="${n1(a[1])}" rx="${small?6.9:8.2}" ry="${small?4:5.2}" fill="#442f35" fill-opacity=".55" stroke="#ffe0ad" stroke-width=".9"/><circle cx="${n1(a[0])}" cy="${n1(a[1])}" r="2.25" fill="#fff1d1"/><path d="M${pp([a[0],a[1]-2])}L${pp([a[0],stem])} ${pp(endpoint)}" fill="none" stroke="#ffae88" stroke-width="1.1"/><rect x="${n1(rx)}" y="${n1(ry)}" rx="5" width="${n1(ww)}" height="${small?35:42}" fill="#192532" fill-opacity=".96" stroke="#a37260" stroke-width=".8"/><rect x="${n1(rx+7)}" y="${n1(ry+(small?9:12))}" width="4" height="4" rx=".7" fill="#ff976b"/><text x="${n1(rx+16)}" y="${n1(ry+(small?14:18))}" fill="#f4f4ef" font-size="${fs}" font-weight="650">${esc(txt)}</text><text x="${n1(rx+16)}" y="${n1(ry+(small?28:34))}" fill="#ffc09e" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="${ds}" font-weight="550">${esc(sub)}</text></g>`;
    }
    if(opt.compass!==false){
      const ax=W-(small?21:25),ay=small?18:24;
      const vx=sy,vy=-cy*sp,norm=Math.hypot(vx,vy),lx=vx/norm,ly=vy/norm;
      const a=[ax+lx*12,ay+ly*12],b=[ax-lx*7+ly*3,ay-ly*7-lx*3],c=[ax-lx*7-ly*3,ay-ly*7+lx*3];
      svg+=`<g pointer-events="none"><path d="${closed([a,b,[ax,ay],c])}" fill="#acbecb" fill-opacity=".82"/><text x="${n1(ax+9)}" y="${n1(ay-5)}" fill="#a6bdc5" font-size="10" font-family="ui-monospace,monospace">N</text></g>`;
    }
    return svg;
  }
  function keyHTML(opt){
    const sign=signMode(opt.mode),none=districts.some(d=>cv(opt.values,d.name)===null);
    const vals=sign?[['#619e91','Gain'],['#656e99','Decline']]:[['#619e91','Recorded']];
    vals.push(['#ff9268','Selected']);
    if(none)vals.push(['repeating-linear-gradient(125deg,#626977 0,#626977 1px,#26303e 1px,#26303e 4px)','No data']);
    return vals.map(([color,label])=>'<span class="ss-map-sign"><i class="ss-map-chip" style="background:'+color+'"></i>'+label+'</span>').join('')+'<span>Height: '+(sign?'size of change':'amount')+' (√ scale)</span>';
  }
  function mount(host,opt) {
    if(!host||!host.ownerDocument)throw new TypeError('SeoulMap.mount needs a DOM element.');
    let o=Object.assign({selected:'Seongdong-gu',mode:'change',values:{}},opt||{});
    const doc=host.ownerDocument,win=doc.defaultView||global, prefix='ssm'+(++instances);
    const box=doc.createElement('div');box.className='ss-map-shell';
    const style=doc.createElement('style');style.textContent=css;box.appendChild(style);
    const svg=doc.createElementNS(NS,'svg');svg.setAttribute('class','ss-map-stage');svg.setAttribute('role','group');svg.setAttribute('tabindex','0');
    svg.setAttribute('aria-label','Interactive 3D map of the 25 Seoul districts');
    svg.setAttribute('aria-describedby',prefix+'-directions');svg.setAttribute('font-family','system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif');
    box.append(svg);
    const sr=doc.createElement('div');sr.id=prefix+'-directions';sr.className='ss-map-sr';sr.textContent='Choose a district with the left and right arrow keys, then press Enter. Shift and arrows rotate the map; plus and minus zoom. Home resets the camera. Orange marks the selected district. Height shows absolute magnitude on a square-root scale.';box.append(sr);
    const live=doc.createElement('div');live.setAttribute('aria-live','polite');live.className='ss-map-sr';box.append(live);
    const key=doc.createElement('div');key.className='ss-map-key';box.append(key);
    const tip=doc.createElement('div');tip.className='ss-map-tooltip';tip.hidden=true;const tn=doc.createElement('strong'),tv=doc.createElement('span');tip.append(tn,tv);box.append(tip);
    host.append(box);
    let cam=Object.assign({},diffuse),frame=0,destroyed=false,drag=null,skipClick=false,ro=null,kidx=Math.max(0,districts.findIndex(d=>d.name===o.selected)),width=0,height=0;
    const measure=()=>{const b=box.getBoundingClientRect();width=b.width||host.clientWidth||630;height=b.height||host.clientHeight||380;};
    const hideTip=()=>{tip.hidden=true;};
    const render=()=>{
      frame=0;if(destroyed)return;measure();svg.setAttribute('viewBox','0 0 '+n1(width)+' '+n1(height));
      svg.innerHTML=scene(o,cam,width,height,prefix);key.innerHTML=keyHTML(o);key.style.display=o.legend===false?'none':'';
    };
    const rerender=()=>{if(!frame&&!destroyed)frame=win.requestAnimationFrame(render);};
    const mapsel=(name,notify=true)=>{if(!byName[name])return;o.selected=name;kidx=districts.findIndex(d=>d.name===name);hideTip();rerender();const d=byName[name];live.textContent=name+', '+valueLabel(cv(o.values,name),o,d)+'.';if(notify&&typeof o.onSelect==='function')o.onSelect(name);};
    const showTip=(target,clientX,clientY)=>{
      const it=target?.closest?.('[data-ss-district]');if(!it){hideTip();return}
      const name=it.getAttribute('data-ss-district');const d=byName[name];if(!d){hideTip();return}
      tn.textContent=d.name+' · '+d.ko;tv.textContent=valueLabel(cv(o.values,d.name),o,d);
      const br=box.getBoundingClientRect();tip.hidden=false;const tw=tip.offsetWidth||130,th=tip.offsetHeight||44;
      tip.style.left=clamp(clientX-br.left+13,4,Math.max(4,br.width-tw-4))+'px';
      const yy=clientY-br.top;tip.style.top=clamp(yy+th+17>br.height?yy-th-10:yy+13,4,Math.max(4,br.height-th-3))+'px';
    };
    const rotate=v=>{if(!Number.isFinite(+v))return;cam.yaw=(cam.yaw+(+v))%360;hideTip();rerender();};
    const zoom=v=>{if(!Number.isFinite(+v)||!+v)return;const s=Math.abs(v)>=1?Math.sign(v)*.16:+v;cam.zoom=clamp(cam.zoom*(1+s),.75,2.15);hideTip();rerender()};
    const reset=()=>{cam=Object.assign({},diffuse);hideTip();rerender()};
    const onDown=e=>{if(e.button!==undefined&&e.button!==0||!e.isPrimary&&e.isPrimary!==undefined)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:cam.yaw,pitch:cam.pitch,moved:false};skipClick=false;};
    const onMove=e=>{
      if(drag && drag.id===e.pointerId){
        const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(!drag.moved&&(Math.abs(dx)+Math.abs(dy)>7)){
          if(e.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)*1.25){drag=null;return}
          drag.moved=true;skipClick=true;hideTip();svg.classList.add('ss-map-dragging');try{svg.setPointerCapture(e.pointerId)}catch(_){}
        }
        if(drag.moved){cam.yaw=drag.yaw+dx*.30;cam.pitch=clamp(drag.pitch-dy*.13,24,66);rerender();return}
      }
      if(e.pointerType!=='touch')showTip(e.target,e.clientX,e.clientY);
    };
    const onUp=e=>{if(drag&&drag.id===e.pointerId){skipClick=drag.moved;try{if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId)}catch(_){}drag=null;svg.classList.remove('ss-map-dragging');}};
    const onClick=e=>{if(skipClick){skipClick=false;return;}const ng=e.target?.closest?.('[data-ss-district]')?.getAttribute('data-ss-district');if(ng)mapsel(ng);};
    const onKey=e=>{
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        e.preventDefault();const direction=e.key==='ArrowLeft'?-1:1;if(e.shiftKey)rotate(direction*12);
        else{kidx=(kidx+direction+districts.length)%districts.length;const d=districts[kidx];live.textContent='Focused '+d.name+': '+valueLabel(cv(o.values,d.name),o,d)+'. Press Enter to select.';const group=svg.querySelector('[data-ss-district="'+d.name+'"]');const bb=box.getBoundingClientRect();showTip(group,bb.left+12,bb.top+12)}
      }else if(e.key==='Enter'||e.key===' '){e.preventDefault();mapsel(districts[kidx].name);}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.16);}else if(e.key==='-'){e.preventDefault();zoom(-.16);}else if(e.key==='Home'){e.preventDefault();reset();}else if(e.key==='Escape')hideTip();
    };
    svg.addEventListener('pointerdown',onDown);svg.addEventListener('pointermove',onMove);svg.addEventListener('pointerup',onUp);svg.addEventListener('pointercancel',onUp);svg.addEventListener('pointerleave',()=>{if(!drag)hideTip()});svg.addEventListener('click',onClick);svg.addEventListener('keydown',onKey);svg.addEventListener('blur',hideTip);
    if(typeof win.ResizeObserver==='function'){ro=new win.ResizeObserver(rerender);ro.observe(host)}else win.addEventListener('resize',rerender);
    render();
    return {update(v={}){if(destroyed)return;o=Object.assign({},o,v);kidx=Math.max(0,districts.findIndex(d=>d.name===o.selected));hideTip();rerender();},rotate,zoom,reset,destroy(){destroyed=true;if(frame)win.cancelAnimationFrame(frame);ro?.disconnect();win.removeEventListener('resize',rerender);box.remove();}};
  }
  global.SeoulMap=Object.freeze({mount,
    svg(opt={},width=640,height=390){const o=Object.assign({values:{},selected:'Seongdong-gu',mode:'change',legend:false},opt),id='ss-static';return '<svg xmlns="'+NS+'" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" font-family="system-ui,sans-serif" aria-label="Seoul district signal map">'+scene(o,{...diffuse,...(opt.camera||{})},width,height,id)+'</svg>';},
    districtNames:districts.map(d=>d.name),attribution:G.attribution});
})(window);
