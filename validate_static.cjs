const fs=require('fs');const path=require('path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const files=['src/App.tsx','src/components/Office.tsx','src/data/demo.ts','src/main.tsx','src/lib/types.ts','src/lib/policy.ts','src/lib/telemetry.ts','tests/policy.test.ts','vite.config.ts'];
let errors=[];
for(const f of files){const content=fs.readFileSync(path.join(__dirname,f),'utf8');const out=ts.transpileModule(content,{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});const found=out.diagnostics||[];for(const d of found)if(d.category===ts.DiagnosticCategory.Error)errors.push(f+': '+ts.flattenDiagnosticMessageText(d.messageText,'\n'));}
for(const m of ['idle','active','alert']){const target=path.join(__dirname,'public','office-'+m+'.svg');if(!fs.existsSync(target))errors.push('asset missing: '+target)}
console.log(JSON.stringify({syntaxChecked:files.length,assets:['idle','active','alert'],errors},null,2));
process.exit(errors.length>0?1:0)