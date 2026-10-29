// Authentication/read-only checks only. Never sends a message or logs provider values.
const fs = require('fs'), path = require('path');
const dotenv = require('../backend/node_modules/dotenv');
const nodemailer = require('../backend/node_modules/nodemailer');
const axios = require('../backend/node_modules/axios').default;
const config = dotenv.parse(fs.readFileSync(path.resolve(__dirname,'../backend/.env'),'utf8'));
const result = { checkedFor:'2026-10-25 Asia/Calcutta', messagesSent:0, smtp:{}, twilio:{} };
async function smtp() {
  if(![config.SMTP_HOST,config.SMTP_USER,config.SMTP_PASS,config.EMAIL_FROM].every(Boolean)) return {status:'not_configured'};
  const port=Number(config.SMTP_PORT||587);
  const transport=nodemailer.createTransport({host:config.SMTP_HOST,port,secure:port===465,requireTLS:port!==465,auth:{user:config.SMTP_USER,pass:config.SMTP_PASS},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,logger:false,debug:false});
  try { await transport.verify(); return {status:'authentication_passed',delivery:'Not tested; no email sent'}; }
  catch(error) { return {status:'authentication_or_connection_failed',category:['EAUTH','ETIMEDOUT','ESOCKET','ECONNECTION','EDNS'].includes(error.code)?error.code:'provider_error'}; }
  finally {transport.close();}
}
async function twilio() {
  if(config.SMS_PROVIDER!=='twilio'||![config.TWILIO_ACCOUNT_SID,config.TWILIO_AUTH_TOKEN,config.TWILIO_FROM].every(Boolean))return {status:'not_configured'};
  try {
    const response=await axios.get(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.TWILIO_ACCOUNT_SID)}/IncomingPhoneNumbers.json`,{auth:{username:config.TWILIO_ACCOUNT_SID,password:config.TWILIO_AUTH_TOKEN},timeout:15000,maxRedirects:0});
    const numbers=Array.isArray(response.data.incoming_phone_numbers)?response.data.incoming_phone_numbers:[];
    const sender=numbers.find(number=>number.phone_number===config.TWILIO_FROM);
    return {status:'authentication_passed',senderUsesInternationalFormat:/^\+[1-9]\d{7,14}$/.test(config.TWILIO_FROM),configuredSenderFoundOnInspectedPage:!!sender,configuredSenderSmsCapable:!!sender?.capabilities?.sms,additionalPages:!!response.data.next_page_uri,delivery:'Not tested; no SMS sent'};
  } catch(error) {return {status:'authentication_or_connection_failed',httpStatus:error.response?.status||null};}
}
(async()=>{
  [result.smtp,result.twilio]=await Promise.all([smtp(),twilio()]);
  fs.writeFileSync(path.resolve(__dirname,'../docs/audit-2026-10-25/provider-readiness.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
})().catch(()=>{console.error('Provider readiness check failed; no credentials logged');process.exitCode=1;});
