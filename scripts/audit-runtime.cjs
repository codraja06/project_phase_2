// Baseline probes against the dedicated test service only. No external providers or user records used.
const fs = require('fs'), path = require('path');
const mongoose = require('../backend/node_modules/mongoose');
const { User } = require('../backend/dist/models/User');
const { Complaint } = require('../backend/dist/models/Complaint');
const { Notification } = require('../backend/dist/models/Notification');
const { RevokedToken } = require('../backend/dist/models/RevokedToken');
const API = 'http://127.0.0.1:5052/api';
const destination = path.resolve(__dirname, '../docs/audit-2026-10-25');
const results = { phase: process.env.AUDIT_PHASE || 'baseline', checks: [] };
let user;
async function request(route, method = 'GET', token, body) {
  const response = await fetch(API + route, { method, headers: { ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(body ? {'Content-Type':'application/json'} : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}
(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/civictrack_phase2_e2e');
    user = await User.create({name:'Isolated audit citizen', email:`audit-${Date.now()}@example.test`,password:'AuditOnly2026!',role:'citizen'});
    const login = await request('/auth/login','POST',null,{email:user.email,password:'AuditOnly2026!'});
    const token = login.body.data.token;
    const forged = await request('/complaints','POST',token,{title:'Isolated audit evidence', description:'Manual citizen observation for audit.',category:'pothole',imageUrl:'https://example.test/audit.jpg',latitude:13,longitude:80,
      aiDetected:true, aiClass:'pothole', aiConfidence:.99, boundingBoxes:[{category:'pothole',confidence:.99,bbox:{x1:1,y1:1,x2:50,y2:50},model:'fabricated-client-model'}]});
    const record = forged.body.data ? await Complaint.findById(forged.body.data._id) : null;
    results.checks.push({name:'Untrusted AI evidence without signed analysis',requestStatus:forged.status,passed:forged.status===400 || (!!record && !record.aiDetected && record.boundingBoxes.length===0 && record.aiConfidence===0),observed:record?.aiDetected ? 'Client supplied AI flag, confidence and boxes were persisted' : 'Untrusted fields rejected or discarded'});
    const logout = await request('/auth/logout','POST',token);
    const replay = await request('/auth/me','GET',token);
    results.checks.push({name:'Logout token replay',logoutStatus:logout.status,replayStatus:replay.status,passed:replay.status===401,observed:replay.status===200?'Old token remains authorized after logout':'Old token rejected'});
    const modelResponse = await request('/ai/models','GET',token);
    if (modelResponse.status === 200) results.models = modelResponse.body.data;
    const health = await fetch('http://127.0.0.1:8052/health').then(r=>r.json());
    results.models = { available:health.modelConfigured, models:health.models };
  } finally {
    if (user) { await Notification.deleteMany({recipient:user._id}); await Complaint.deleteMany({createdBy:user._id}); await RevokedToken.deleteMany({userId:user._id}); await User.deleteOne({_id:user._id}); }
    await mongoose.disconnect();
    fs.mkdirSync(destination,{recursive:true}); fs.writeFileSync(path.join(destination,`${results.phase}-runtime.json`),JSON.stringify(results,null,2));
  }
  console.log(JSON.stringify(results,null,2));
})().catch(() => { console.error('Isolated audit probe failed; no private response logged'); process.exitCode=1; });
