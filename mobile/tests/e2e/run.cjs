const {spawnSync}=require('child_process');
const path=require('path');
const fs=require('fs');
// Keep concurrent or repeated runs from overwriting the same Windows screenshot files.
const artifact=process.env.E2E_ARTIFACT_DIR || path.resolve(__dirname, '../artifacts/ui-restoration', String(Date.now()));
fs.mkdirSync(artifact,{recursive:true});
console.log(`Artifacts: ${artifact}`);
for(const script of ['auth','dashboard','routes','flows','otp-notifications']) {
  const result=spawnSync(process.execPath,[path.join(__dirname,`${script}.cjs`)],{stdio:'inherit',env:{...process.env,E2E_ARTIFACT_DIR:artifact}});
  if(result.status !== 0) process.exit(result.status || 1);
}
