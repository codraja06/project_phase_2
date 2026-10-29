// Reports only safe readiness. --probe invokes the actual configured provider with a civic intent query.
const {env} = require('../dist/config/env');
const {civicGuidance} = require('../dist/services/civicAssistantService');
(async()=>{
  const configured = !!(env.CHAT_PROVIDER_URL && env.CHAT_PROVIDER_MODEL);
  if(!configured) {console.log(JSON.stringify({configured:false,required:['CHAT_PROVIDER_URL','CHAT_PROVIDER_MODEL','CHAT_PROVIDER_API_KEY (if required by provider)'],liveProviderVerified:false}));process.exitCode=2;return;}
  if(!process.argv.includes('--probe')) {console.log(JSON.stringify({configured:true,liveProviderVerified:false,nextStep:'Run with --probe after configuring the provider privately.'}));return;}
  const result = await civicGuidance('How do I report a pothole safely?');
  console.log(JSON.stringify({configured:true,liveProviderVerified:result.available,source:result.source}));
  if(!result.available)process.exitCode=2;
})().catch(()=>{console.error('Provider readiness could not be verified; no credentials logged.');process.exitCode=1;});
