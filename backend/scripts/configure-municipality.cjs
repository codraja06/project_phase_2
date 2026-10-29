// Server-operator command. Preview by default; --apply requires the operator's explicit action.
const mongoose = require('mongoose');
const {env} = require('../dist/config/env');
const {configureProvisionalMunicipality} = require('../dist/services/municipalSetupService');
const apply = process.argv.includes('--apply');
const idArgument = process.argv.find(arg=>arg.startsWith('--administrator-id='));
(async()=>{
  try {
    await mongoose.connect(env.MONGODB_URI);
    const result = await configureProvisionalMunicipality({apply,administratorId:idArgument?.split('=')[1]});
    console.log(JSON.stringify(result,null,2));
  } catch(error) { console.error(error.message==='Select an existing authority account by ID. No account or email is invented.' ? error.message : 'Municipal setup could not complete. No credentials or private records logged.'); process.exitCode=1; }
  finally {await mongoose.disconnect();}
})();
