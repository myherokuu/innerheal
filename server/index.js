const path=require('path');
const fs=require('fs');
const express=require('express');
const webpush=require('web-push');
const cron=require('node-cron');

const PORT=process.env.PORT||3000;
const TZ='Asia/Kuala_Lumpur';
const SEND_MAIL='mailto:innerflow@example.com';
const DB_FILE=path.join(__dirname,'db.json');
const VAPID_FILE=path.join(__dirname,'vapid.json');

const vp=fs.existsSync(VAPID_FILE)?JSON.parse(fs.readFileSync(VAPID_FILE,'utf8'))
 : (console.warn('Tidak jumpa vapid.json. Jalankan "npm run genkeys" dahulu.'),{publicKey:'',privateKey:''});
webpush.setVapidDetails(SEND_MAIL,vp.publicKey,vp.privateKey);

let DB={subs:[],state:{},sent:{}};
function load(){try{if(fs.existsSync(DB_FILE))DB=Object.assign({subs:[],state:{},sent:{}},JSON.parse(fs.readFileSync(DB_FILE,'utf8')));}catch(e){}}
function save(){try{fs.writeFileSync(DB_FILE,JSON.stringify(DB,null,2));}catch(e){}}
load();

function tgl(){return new Date().toLocaleDateString('en-CA',{timeZone:TZ});}
function masa(){return new Date().toLocaleTimeString('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit'});}

const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'100kb'}));

app.get('/api/vapidPublicKey',(req,res)=>res.json({key:vp.publicKey}));
app.post('/api/subscribe',(req,res)=>{
  const s=req.body&&req.body.subscription;
  if(!s||!s.endpoint)return res.status(400).json({ok:false});
  const i=DB.subs.findIndex(x=>x.endpoint===s.endpoint);
  if(i>=0)DB.subs[i]={endpoint:s.endpoint,keys:s.keys||{}};
  else DB.subs.push({endpoint:s.endpoint,keys:s.keys||{}});
  save();res.json({ok:true});
});
app.post('/api/unsubscribe',(req,res)=>{
  const end=req.body&&req.body.endpoint;
  DB.subs=DB.subs.filter(x=>x.endpoint!==end);save();res.json({ok:true});
});
app.post('/api/state',(req,res)=>{
  const a=req.body&&req.body.action,d=req.body&&req.body.date;
  if(!a)return res.status(400).json({ok:false});
  const k=(typeof d==='string'&&d)?d:tgl();
  DB.state[k]=DB.state[k]||{};
  DB.state[k][a]=true;
  save();res.json({ok:true});
});

const PUSH={
  bangun:{title:'🐣 Bangun Pagi!',body:'Tekan "Bangun" dalam Pet untuk mula hari dengan tenaga ✨'},
  makan:{title:'🍚 Jangan Lupa Makan',body:'Pet masih belum diberi makan hari ini. Jaga baik-baik ya ❤️'},
  minum:{title:'🥤 Masa Minum!',body:'Pet belum minum air hari ini. Segarkan dia sekarang 💧'},
  senam:{title:'🏃 Ada Senaman Tertinggal',body:'Pet belum bersenam hari ini. Senaman ringan untuk +💪!'},
  checklist:{title:'🎈 Update Checklist!',body:'Sebelum 7 petang, update checklist tabiat anda yang belum selesai 🌱'},
  tidur:{title:'😴 Sudah Lewat & Belum Tidur',body:'Dah lebih 11 malam. Tidurkan pet dan rehat juga ya 🌙'}
};

async function hantarOne(s,push){
  try{
    await webpush.sendNotification({endpoint:s.endpoint,keys:s.keys||{}},JSON.stringify({title:push.title,body:push.body,icon:'icon-192.png',badge:'icon-192.png',data:{url:'index.html'}}));
    return true;
  }catch(e){
    if(e.statusCode===404||e.statusCode===410){
      DB.subs=DB.subs.filter(x=>x.endpoint!==s.endpoint);save();
    }
    return false;
  }
}
function hantarSemua(push){
  return Promise.all(DB.subs.map(s=>hantarOne(s,push).then(ok=>ok?'ok':'fail')));
}
function bail(a){return DB.state[tgl()]&&DB.state[tgl()][a];}
async function ingatPeringat(nama,a){
  if(bail(a)){console.log(`[${masa()}] ${nama} dibatalkan (tindakan sudah dibuat).`);return;}
  DB.sent[tgl()]=DB.sent[tgl()]||{};
  if(DB.sent[tgl()][nama])return;
  const h=await hantarSemua(PUSH[nama]);
  if(DB.subs.length)DB.sent[tgl()][nama]=true;save();
  console.log(`[${masa()}] Perhatian ${nama} dihantar ke ${DB.subs.length} peranti:`,h.join(','));
}

cron.schedule('0 8 * * *',()=>ingatPeringat('bangun','bangun'),{timezone:TZ});
cron.schedule('0 12 * * *',()=>ingatPeringat('makan','makan'),{timezone:TZ});
cron.schedule('0 14 * * *',()=>ingatPeringat('minum','minum'),{timezone:TZ});
cron.schedule('0 17 * * *',()=>ingatPeringat('senam','senam'),{timezone:TZ});
cron.schedule('30 18 * * *',()=>ingatPeringat('checklist','checklist'),{timezone:TZ});
cron.schedule('0 23 * * *',()=>ingatPeringat('tidur','tidur'),{timezone:TZ});

app.get('/api/ping',(req,res)=>res.json({ok:true,tgt:tgl(),masa:masa(),bil:DB.subs.length}));
app.post('/api/test',async(req,res)=>{
  const r=await hantarSemua(PUSH[req.body&&req.body.jenis?req.body.jenis:'checklist']);
  res.json({ok:true,hasil:r});
});
app.use('/',express.static(path.join(__dirname,'..')));

app.listen(PORT,()=>console.log(`Inner Flow push server → http://localhost:${PORT} (TZ ${TZ})`));