// Isolated child-process API used to prove database relay/session revocation across Node processes.
process.env.NODE_ENV='test';
process.env.DELIVERY_WORKER_ENABLED='false';
for(const key of ['SMTP_HOST','SMTP_USER','SMTP_PASS','EMAIL_FROM','SMS_PROVIDER','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM','CHAT_PROVIDER_URL','CHAT_PROVIDER_API_KEY','CHAT_PROVIDER_MODEL'])process.env[key]='';
const mongoose=require('mongoose');
const {createServer}=require('http');
const app=require('../../dist/app').default;
const {attachLiveNotifications}=require('../../dist/services/liveNotifications');
let server,wss;
(async()=>{
  if(process.env.MONGODB_URI!=='mongodb://127.0.0.1:27017/civictrack_isolated_test')throw Error('Unexpected test database');
  await mongoose.connect(process.env.MONGODB_URI);
  server=createServer(app);wss=attachLiveNotifications(server,{pollIntervalMs:100});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  process.send({port:server.address().port});
})().catch(()=>{process.send?.({error:'Isolated relay startup failed'});process.exit(1);});
process.on('message',async message=>{
  if(message!=='stop')return;
  wss?.clients.forEach(socket=>socket.terminate());
  if(wss)await new Promise(resolve=>wss.close(resolve));
  if(server)await new Promise(resolve=>server.close(resolve));
  await mongoose.disconnect();process.exit(0);
});
