import {readdir,readFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const manifest=JSON.parse(await readFile('module.json','utf8'));
if(manifest.id!=='ajudamestre'||manifest.version!==JSON.parse(await readFile('package.json','utf8')).version)throw Error('Manifesto inconsistente.');
for(const file of [...manifest.esmodules,...manifest.styles,manifest.license,manifest.readme,'templates/panel.hbs','templates/config.hbs'])await access(file);
let count=0;
async function check(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=join(dir,entry.name);if(entry.isDirectory()){await check(file);continue;}if(/\.(?:m?js|cjs)$/.test(entry.name)){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);count++;}}}
for(const dir of ['scripts','companion','tools','tests','desktop','studio'])await check(dir);
console.log(`Manifesto e referências válidos; ${count} arquivos JavaScript com sintaxe válida.`);
