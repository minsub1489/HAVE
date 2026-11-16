// Editable JSON -> SVG/PNG, plus a local, offline gallery.
// npm dependency: playwright (or DIAGRAM_NODE_MODULES).
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const root = __dirname;
const dep = process.env.DIAGRAM_NODE_MODULES
  ? createRequire(path.join(process.env.DIAGRAM_NODE_MODULES, '__diagram__.cjs')) : require;
const { chromium } = dep('playwright');
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const wrap = (value, max=48) => String(value).split('\n').flatMap(line => {
  const parts=[]; let current='', width=0;
  for(const ch of line) { const n=ch.charCodeAt(0)>255?1.7:1;
    if(width+n>max && current){
      const space=current.lastIndexOf(' ');
      if(space>current.length*0.35){parts.push(current.slice(0,space));current=current.slice(space+1);width=[...current].reduce((sum,c)=>sum+(c.charCodeAt(0)>255?1.7:1),0);}
      else {parts.push(current);current='';width=0;}
    } current+=ch;width+=n;
  } parts.push(current);return parts;
});
function sequenceSVG(data) {
  const W=1400, margin=110, xs=data.participants.map((_,i)=>margin+i*(W-2*margin)/(data.participants.length-1));
  const yStart=105; let y=yStart; const shapes=[], groups=[], spans=[];
  const text=(x,ty,lines,anchor='middle',size=19,color='#17243a')=>lines.map((line,i)=>`<text x="${x}" y="${ty+i*25}" text-anchor="${anchor}" font-size="${size}" fill="${color}">${esc(line)}</text>`).join('');
  for(const event of data.events) {
    if(event.type==='block') {const group={y,label:event.label,level:groups.length};groups.push(group);spans.push(group);y+=40;continue;}
    if(event.type==='else') {shapes.push(`<path d="M 26 ${y} H ${W-26}" stroke="#94a3b8" stroke-dasharray="6 4"/>`+text(48,y+27,[event.label],'start',18));y+=55;continue;}
    if(event.type==='end'){const group=groups.pop();if(!group)throw Error('Unbalanced block');group.bottom=y;y+=22;continue;}
    if(event.type==='note') {const lines=wrap(event.text,105), h=lines.length*25+24;
      shapes.push(`<rect x="${event.x||100}" y="${y}" width="${event.width||1200}" height="${h}" rx="4" fill="#f4f0ff" stroke="#c4b5fd"/>`+text((event.x||100)+18,y+27,lines,'start',18));y+=h+20;continue;}
    const i=data.participants.findIndex(p=>p.id===event.from),j=data.participants.findIndex(p=>p.id===event.to);
    if(i<0||j<0)throw Error('Unknown sequence participant');
    const a=xs[i],b=xs[j], self=i===j;
    const max=self?52:Math.max(32,Math.abs(b-a)/10+6);
    const lines=wrap(event.text,max), labelY=y+16, arrowY=labelY+lines.length*25-7;
    if(self) {
      shapes.push(text(Math.min(a+25,W-450),labelY,lines,'start',18));
      shapes.push(`<path d="M ${a} ${arrowY} h 45 v 18 h -45" fill="none" stroke="#27364c" marker-end="url(#arrow)"/>`);
    }else {
      shapes.push(text((a+b)/2,labelY,lines,'middle',18));
      shapes.push(`<path d="M ${a} ${arrowY} H ${b}" fill="none" stroke="#27364c" ${event.reply?'stroke-dasharray="6 4"':''} marker-end="url(#arrow)"/>`);
    } y=arrowY+(self?31:21);
  }
  if(groups.length)throw Error('Unclosed block');const H=y+45;
  const frames=spans.map(g=>`<rect x="${20+g.level*10}" y="${g.y}" width="${W-40-g.level*20}" height="${g.bottom-g.y}" fill="none" stroke="#64748b"/>`+text(36+g.level*10,g.y+27,[g.label],'start',18));
  const heads=data.participants.map((p,i)=>{
    const lines=wrap(p.label,22);return `<path d="M ${xs[i]} 82 V ${H-15}" stroke="#94a3b8" stroke-dasharray="7 5"/>`+
      `<rect x="${xs[i]-102}" y="12" width="204" height="70" rx="3" fill="${p.planned?'#fff5e9':'#eef2ff'}" stroke="#64748b" ${p.planned?'stroke-dasharray="5 4"':''}/>`+text(xs[i],40,lines,'middle',18);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(data.title)}"><title>${esc(data.title)}</title><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#27364c"/></marker></defs><rect width="100%" height="100%" fill="#ffffff"/><g font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif">${heads.join('')}${frames.join('')}${shapes.join('')}</g></svg>`;
}
function sequenceMermaid(data) {
  const lines=['sequenceDiagram','    autonumber'];
  for(const p of data.participants)lines.push(`    participant ${p.id} as ${p.label.replaceAll('\n',' ')}`);
  for(const e of data.events){
    if(e.type==='block')lines.push('    '+e.label);
    else if(e.type==='else')lines.push('    else '+e.label);
    else if(e.type==='end')lines.push('    end');
    else if(e.type==='note')lines.push(`    Note over ${data.participants[0].id},${data.participants.at(-1).id}: ${e.text.replaceAll('\n','<br/>')}`);
    else lines.push(`    ${e.from}${e.reply?'-->>':'->>'}${e.to}: ${e.text.replaceAll('\n','<br/>')}`);
  }return lines.join('\n')+'\n';
}
function sceneSVG(scene) {
  const text=(x,y,lines,anchor='middle',size=19)=>lines.map((line,i)=>`<text x="${x}" y="${y+i*26}" text-anchor="${anchor}" font-size="${size}" fill="#17243a">${esc(line)}</text>`).join('');
  const shapes=[];
  for(const f of scene.frames||[])shapes.push(`<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${f.fill||'#ffffff'}" stroke="#cbd5e1" ${f.dashed?'stroke-dasharray="7 5"':''}/>`+text(f.x+f.w/2,f.y+29,[f.title], 'middle',20));
  for(const e of scene.edges||[]) {
    shapes.push(`<path d="M ${e.points.map(p=>p.join(' ')).join(' L ')}" fill="none" stroke="#64748b" stroke-width="1.5" ${e.dashed?'stroke-dasharray="7 5"':''} ${e.arrow===false?'':`marker-end="url(#${e.openArrow?'openarrow':'arrow'})"`}/>`);
    if(e.label){const lines=e.label.split('\n'),width=Math.max(...lines.map(l=>[...l].reduce((n,c)=>n+(c.charCodeAt(0)>255?17:9),0)))+14;
      const x=e.lx,y=e.ly,anchor=e.anchor||'middle';
      shapes.push(`<rect x="${anchor==='start'?x-5:x-width/2}" y="${y-19}" width="${width}" height="${lines.length*24}" fill="white" fill-opacity="0.95"/>`+text(x,y,lines,anchor,17));
    }
  }
  for(const n of scene.nodes||[]) {
    const fill=n.fill||(n.planned?'#fff5e9':n.type==='note'?'#f4f0ff':'#eef2ff');
    const stroke=n.planned?'stroke-dasharray="6 4"':'';
    if(n.type==='point') {shapes.push(`<circle cx="${n.x}" cy="${n.y}" r="${n.final?12:7}" fill="${n.final?'white':'#17243a'}" stroke="#17243a"/>`+(n.final?`<circle cx="${n.x}" cy="${n.y}" r="7" fill="#17243a"/>`:''));continue;}
    if(n.type==='actor') {shapes.push(`<circle cx="${n.x}" cy="${n.y-28}" r="12" fill="white" stroke="#64748b"/><path d="M ${n.x} ${n.y-16} v 38 m -26 -25 h 52 m -26 25 l -24 27 m 24 -27 l 24 27" fill="none" stroke="#64748b" stroke-width="2"/>`+text(n.x,n.y+68,n.label.split('\n')));continue;}
    if(n.type==='ellipse')shapes.push(`<ellipse cx="${n.x+n.w/2}" cy="${n.y+n.h/2}" rx="${n.w/2}" ry="${n.h/2}" fill="${fill}" stroke="#64748b" ${stroke}/>`);
    else if(n.type==='diamond')shapes.push(`<polygon points="${n.x+n.w/2},${n.y} ${n.x+n.w},${n.y+n.h/2} ${n.x+n.w/2},${n.y+n.h} ${n.x},${n.y+n.h/2}" fill="${fill}" stroke="#64748b"/>`);
    else shapes.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.type==='class'?0:6}" fill="${fill}" stroke="#64748b" ${stroke}/>`);
    if(n.type==='class') {
      shapes.push(text(n.x+n.w/2,n.y+31,[n.title],'middle',20));
      shapes.push(`<path d="M ${n.x} ${n.y+48} h ${n.w}" stroke="#64748b"/>`);
      shapes.push(text(n.x+14,n.y+77,n.attributes,'start',18));
      if(n.operations?.length) {const sep=n.y+65+n.attributes.length*26;shapes.push(`<path d="M ${n.x} ${sep} h ${n.w}" stroke="#64748b"/>`+text(n.x+14,sep+28,n.operations,'start',18));}
    }else {const lines=(n.label||'').split('\n');shapes.push(text(n.x+n.w/2,n.y+n.h/2-(lines.length-1)*13+7,lines,'middle',n.font||19));}
  }
  for(const t of scene.labels||[])shapes.push(text(t.x,t.y,t.text.split('\n'),t.anchor||'middle',t.font||17));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-label="${esc(scene.title)}"><title>${esc(scene.title)}</title><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/></marker><marker id="openarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#64748b"/></marker></defs><rect width="100%" height="100%" fill="white"/><g font-family="Malgun Gothic, Noto Sans CJK KR, sans-serif">${shapes.join('')}</g></svg>`;
}
async function main(){
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
  fs.mkdirSync(path.join(root,'images'),{recursive:true});
  const rendered=[];
  for(const item of catalog){
    const input=path.join(root,'sources',item.id+'.json');
    let svg;
    if(item.kind==='sequence') {
      const data=JSON.parse(fs.readFileSync(input,'utf8'));svg=sequenceSVG(data);
      fs.writeFileSync(path.join(root,'sources',item.id+'.mmd'),sequenceMermaid(data));
    }else if(item.kind==='scene')svg=sceneSVG(JSON.parse(fs.readFileSync(input,'utf8')));
    else throw Error('Unknown diagram kind: '+item.kind);
    fs.writeFileSync(path.join(root,'images',item.id+'.svg'),svg);rendered.push(item.id);
  }
  const browser=await chromium.launch(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE,headless:true}:{channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:2});
    for(const id of rendered) {
      const svg=fs.readFileSync(path.join(root,'images',id+'.svg'),'utf8');
      await page.setContent(`<html lang="ko"><head><meta charset="utf-8"><style>body{margin:0;background:white;}svg{display:block;width:1400px;height:auto;font-family:'Malgun Gothic',sans-serif}</style></head><body>${svg}</body></html>`);
      await page.evaluate(()=>document.fonts.ready);
      await page.locator('svg').screenshot({path:path.join(root,'images',id+'.png')});
    }
  }finally{await browser.close();}
  const cards=catalog.map(item=>`<section id="${esc(item.id)}"><div class="heading"><h2>${esc(item.title)}</h2><span>${esc(item.scope)}</span></div><p>${esc(item.summary)}</p><a href="images/${item.id}.svg"><img src="images/${item.id}.svg" alt="${esc(item.title)}"></a><p class="links"><a href="images/${item.id}.png">PNG</a> · <a href="images/${item.id}.svg">SVG</a> · <a href="sources/${item.id}${item.kind==='dot'?'.dot':'.json'}">수정 원본</a>${item.kind==='sequence'?` · <a href="sources/${item.id}.mmd">Mermaid</a>`:''}</p></section>`).join('\n');
  const nav=catalog.map(item=>`<a href="#${item.id}">${esc(item.title)}</a>`).join('');
  fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HAVE 요구 모델링</title><style>body{font-family:'Malgun Gothic',sans-serif;margin:0;color:#17243a;background:#f6f8fc}main{max-width:1450px;padding:36px;margin:auto}h1{margin:0 0 14px}p{line-height:1.75}nav{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0}a{color:#4d3eac}nav a{padding:8px 12px;background:white;border-radius:4px}section{background:white;margin:28px 0;padding:26px;border:1px solid #dfe5ee;border-radius:8px}.heading{display:flex;justify-content:space-between;gap:18px;align-items:center;flex-wrap:wrap}.heading span{background:#f0edff;padding:7px 10px;font-size:14px}h2{margin:0}img{display:block;width:100%;height:auto;max-height:1100px;object-fit:contain}.links{font-size:14px;margin-bottom:0}@media(max-width:600px){main{padding:16px}section{padding:16px}img{max-height:none}}</style></head><body><main><h1>HAVE 요구 모델링</h1><p>2026-10-14 · 고정 세 과제 / 버전당 한 승인 / 승인과 후속 버전·철회 분리<br>개념 모델, 현재 구현, 운영 계획을 그림마다 표시했습니다. <a href="README.md">모델 해설·명세·추적성</a></p><nav>${nav}</nav>${cards}</main></body></html>`);
  console.log(`Rendered ${rendered.length} diagrams (SVG + PNG).`);
}
module.exports = { sceneSVG, sequenceSVG, sequenceMermaid };
if (require.main === module) main().catch(error=>{console.error(error);process.exitCode=1});
