const fs=require('fs');
const path=require('path');
const webpush=require('web-push');
const keys=webpush.generateVAPIDKeys();
const file=path.join(__dirname,'vapid.json');
fs.writeFileSync(file,JSON.stringify({publicKey:keys.publicKey,privateKey:keys.privateKey},null,2));
console.log('VAPID keys disimpan ke',file);
console.log('Public key:',keys.publicKey);