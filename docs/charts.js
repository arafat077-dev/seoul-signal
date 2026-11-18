(function(g){'use strict';
const S=g.SS,U=g.SU,{esc:e,icon:I}=U;
const palette=['#8ddcc3','#c3b3f3'];let seq=0;
function chart(host,lines,metric){
 const W=940,H=265,left=64,right=15,top=15,btm=30,cw=W-left-right,ch=H-top-btm;
 const vals=lines.flatMap(l=>l.series.map(p=>p[metric])).filter(p=>p!=null);
 const max=Math.max(...vals,1),un=Math.pow(10,Math.floor(Math.log10(max/3))),scaled=max/3/un,interval=(scaled<=1?1:scaled<=2?2:scaled<=2.5?2.5:scaled<=5?5:10)*un, ymax=Math.max(interval,Math.ceil(max/interval)*interval);
 const X=i=>left+i*cw/(S.qs.length-1),Y=v=>top+ch*(1-v/ymax);
 const tickValue=v=>metric==='t'?S.compact(v).replace(/\.0K/,'K'):metric==='a'?v>=1000?'₩'+S.L(v/1000,v%1000?1:0)+'K':S.exact(v):v===0?'₩0':S.won(v,v>=1e12?1:v<1e9?0:1).replace(/\.0([TBMK])/,'$1');
 let svg='';const id='chart-fill-'+(++seq);
 svg+=`<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#5eae9d" stop-opacity=".23"/><stop offset="100%" stop-color="#5eae9d" stop-opacity=".01"/></linearGradient></defs>`;
 for(let v=0;v<=ymax+interval*.005;v+=interval)svg+=`<path d="M${left} ${Y(v)}H${W-right}" stroke="#2a3546" stroke-width="1"/><text x="${left-11}" y="${Y(v)+4}" font-size="11" text-anchor="end" fill="#9bacbf">${tickValue(v)}</text>`;
 S.qs.forEach((q,i)=>{if(q%10===1||i===21) svg+=`<text x="${X(i)}" y="${H-7}" font-size="11" text-anchor="middle" fill="#9bacbf">${i===21?'Q2':Math.floor(q/10)}</text>`;});
 for(const [k,line] of lines.entries()){
  const chunks=[];let chunk=[];line.series.forEach((p,i)=>{if(p[metric]==null){if(chunk.length)chunks.push(chunk);chunk=[]}else chunk.push([X(i),Y(p[metric]),p])});if(chunk.length)chunks.push(chunk);
  for(const a of chunks){const d=a.map((z,i)=>(i?'L':'M')+z[0].toFixed(2)+' '+z[1].toFixed(2)).join(' ');if(k===0&&a.length>1)svg+=`<path d="${d} L${a.at(-1)[0]},${top+ch} L${a[0][0]},${top+ch} Z" fill="url(#${id})"/>`;svg+=`<path d="${d}" fill="none" stroke="${palette[k]}" stroke-width="2.8" stroke-linejoin="round" ${k?'stroke-dasharray="7 4"':''}/>`;for(const [x,y,p] of a)svg+=`<circle cx="${x}" cy="${y}" r="${p.n<p.expected?3.5:2.1}" fill="${p.n<p.expected?'#111823':palette[k]}" stroke="${palette[k]}" stroke-width="1.4"><title>${e(line.name+' · '+S.qname(p.q)+' · '+S.mf(p[metric],metric)+' · '+p.n+'/'+p.expected+' records')}</title></circle>`}
 }
 svg+=`<line id="cxhair" x1="${X(21)}" x2="${X(21)}" y1="${top}" y2="${top+ch}" stroke="#d0d8e7" stroke-dasharray="3 4" opacity=".5"/>`;
 host.innerHTML=`<div class="chartscroll"><svg class="chartsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(S.meanings[metric])} by quarter. Use the quarter selector below for exact numbers.">${svg}</svg></div><div class="chart-detail"><label for="chartq">Quarter</label><select id="chartq" class="quarterselect" aria-label="Inspect a chart quarter">${S.qs.map((q,i)=>'<option value="'+i+'"'+(i===21?' selected':'')+'>'+S.qname(q)+'</option>').join('')}</select><span class="chart-read" aria-live="polite"></span></div>`;
 const read=host.querySelector('.chart-read'),el=host.querySelector('.chartsvg'),qi=host.querySelector('#chartq'),ln=host.querySelector('#cxhair');
 function select(i){qi.value=i;ln.setAttribute('x1',X(i));ln.setAttribute('x2',X(i));read.innerHTML=lines.map(l=>{const p=l.series[i];return `<span><b>${e(l.name)}</b> · ${p.n?S.mf(p[metric],metric):'No record'}${p.n<p.expected?' <small>('+p.n+'/'+p.expected+' recorded)</small>':''}</span>`}).join(' &nbsp; ');}
 function move(ev){const r=el.getBoundingClientRect();const i=Math.max(0,Math.min(21,Math.round(((ev.clientX-r.left)/r.width*W-left)/cw*21)));select(i)}
 el.addEventListener('pointermove',move);el.addEventListener('click',move);qi.addEventListener('change',()=>select(Number(qi.value)));select(21);
}
g.SeoulChart=chart;
})(globalThis);
