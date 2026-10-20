// V3.2.1 — compara duas saídas de tests/regressao_v31.js (v3.2 × v3.2.1). Uso: node tests/comparar_regressao.js <v32.json> <v321.json> [detalhes.json]
// Todo valor existente na v3.2 deve ser idêntico, exceto os caminhos em PERM (textos/rótulos alterados de propósito). Campos novos são aditivos.
// compara v3.2 (a) com v3.2.1 (b): todo valor de (a) deve existir igual em (b), exceto caminhos permitidos (alterados de propósito)
const fs=require('fs');
const expand=(o)=>{ if(Array.isArray(o)) return o.map(expand); if(o&&typeof o==='object'){ const r={}; for(const k of Object.keys(o)) r[k]=(k==='full'&&typeof o[k]==='string')?JSON.parse(o[k]):expand(o[k]); return r;} return o; };
const a=expand(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))), b=expand(JSON.parse(fs.readFileSync(process.argv[3],'utf8')));
const PERM=[/\.fatorRComp\.(compensa|vantagemRotulo)$/, /\.pendencias\.\d+\.(texto|titulo|foco)$/, /\.ressalvas\.\d+$/, /\.memoria\.\d+\.(detalhe)$/];
let diffs=[], added=new Set(), n=0;
function walk(x,y,path){
  n++;
  if (x===null||typeof x!=='object'||y===null||typeof y!=='object'){ if (x!==y && !(typeof x==='number'&&typeof y==='number'&&x===y)) diffs.push([path,x,y]); return; }
  if (Array.isArray(x)!==Array.isArray(y)){ diffs.push([path,'(tipo)','(tipo)']); return; }
  if (Array.isArray(x)){ if (x.length!==y.length) diffs.push([path+'.length',x.length,y.length]); for(let i=0;i<Math.min(x.length,y.length);i++) walk(x[i],y[i],path+'.'+i); return; }
  for (const k of Object.keys(x)){ if(!(k in y)){ diffs.push([path+'.'+k,'(existia)','(removido)']); continue;} walk(x[k],y[k],path+'.'+k); }
  for (const k of Object.keys(y)) if(!(k in x)) added.add(path.replace(/\.\d+/g,'.#')+'.'+k);
}
walk(a,b,'$');
const perm=diffs.filter(d=>PERM.some(r=>r.test(d[0]))), real=diffs.filter(d=>!PERM.some(r=>r.test(d[0])));
console.log('nós comparados:',n,'| diferenças em campos alterados de propósito:',perm.length,'| diferenças INESPERADAS:',real.length);
real.slice(0,40).forEach(d=>console.log('  !!',d[0],JSON.stringify(d[1]).slice(0,100),'→',JSON.stringify(d[2]).slice(0,100)));
const ad=[...added]; console.log('campos novos (aditivos):',ad.length); ad.slice(0,40).forEach(x=>console.log('  +',x));
fs.writeFileSync(process.argv[4]||'/dev/null', JSON.stringify({perm:perm.slice(0,400),real},null,1));
