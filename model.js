/* Shared validation/model for the browser and the small Node check. No network or storage access. */
(function(root){
const format='cw-athlete-local-v1',today=()=>new Date(Date.now()+8*3600000).toISOString().slice(0,10),id=()=>crypto.randomUUID();
const fail=message=>{throw Error(message)},text=(v,max)=>typeof v==='string'&&v.length<=max,date=v=>{if(!text(v,10)||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;};
const ratings=[['sleepQuality','睡眠质量'],['fatigueScore','主观疲劳'],['sorenessScore','肌肉酸痛'],['moodScore','精神状态'],['readinessScore','训练意愿']];
function empty(){return {format,revision:0,name:'',projects:[{id:'100m',name:'100米',unit:'s',direction:'lower'},{id:'long-jump',name:'跳远',unit:'m',direction:'higher'}],results:[],training:[],wellness:[]};}
function unique(rows){return new Set(rows.map(x=>x?.id)).size===rows.length;}
function validate(db){
 if(!db||db.format!==format||!Number.isSafeInteger(db.revision)||db.revision<0||!text(db.name,40))fail('备份格式或版本不支持，原数据保持不变。');
 for(const [key,max]of [['projects',1000],['results',10000],['training',10000],['wellness',10000]])if(!Array.isArray(db[key])||db[key].length>max||!unique(db[key])||db[key].some(r=>!r||!text(r.id,100)||! /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(r.id)))fail('备份中的记录格式或数量不合法。');
 for(const p of db.projects)if(!text(p.name,60)||!p.name.trim()||!text(p.unit,20)||!p.unit.trim()||!['lower','higher','unknown'].includes(p.direction))fail('项目名称、单位或评价方向不合法。');
 const projectIds=new Set(db.projects.map(p=>p.id));
 for(const r of db.results)if(!date(r.date)||r.date>today()||!projectIds.has(r.projectId)||!Number.isFinite(r.value)||r.value<=0||!['training','competition'].includes(r.kind)||!text(r.note,1000)||!text(r.source,120)||!['','manual','electronic'].includes(r.timing)||r.wind!==null&&!Number.isFinite(r.wind))fail('成绩的日期、项目、数值或说明不合法。');
 for(const r of db.training)if(!date(r.date)||!text(r.name,100)||!r.name.trim()||!text(r.content,10000)||!r.content.trim()||!['','completed','partial','not_completed'].includes(r.status)||!text(r.comment,500))fail('训练记录格式不合法。');
 for(const r of db.wellness)if(!date(r.date)||r.date>today()||!text(r.note,200)||!['','无不适','有不适'].includes(r.feeling)||r.sleep!==null&&(!Number.isFinite(r.sleep)||r.sleep<0||r.sleep>16||!Number.isInteger(r.sleep*2))||ratings.some(([k])=>r[k]!==null&&(!Number.isInteger(r[k])||r[k]<1||r[k]>10)))fail('身体记录的日期、睡眠或评分不合法。');
 if(new Set(db.wellness.map(r=>r.date)).size!==db.wellness.length)fail('同一天身体记录重复，请核对备份。');
 return db;
}
function number(value,unit){const raw=String(value).trim();let n;if(raw.includes(':')){if(!['s','秒'].includes(unit)||!/^\d+:[0-5]\d(?:\.\d+)?$/.test(raw))fail('计时成绩可填秒数或分:秒，例如 12.34、1:58.50。');const [m,s]=raw.split(':').map(Number);n=m*60+s;}else n=/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)?Number(raw):NaN;if(!Number.isFinite(n)||n<=0)fail('成绩请输入大于0的有限数值。');return n;}
function project(db,id){return db.projects.find(p=>p.id===id);}
function display(r){return Number(r.value).toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:8});}
function rows(db,filters={}){return db.results.filter(r=>(!filters.project||r.projectId===filters.project)&&(!filters.kind||r.kind===filters.kind)&&(!filters.query||(project(db,r.projectId).name+' '+r.note+' '+r.source).toLowerCase().includes(filters.query.trim().toLowerCase()))).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));}
root.CWLocalModel={format,today,id,ratings,empty,validate,number,project,display,rows};
if(typeof module!=='undefined')module.exports=root.CWLocalModel;
})(globalThis);
