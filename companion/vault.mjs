import {mkdir,readFile,writeFile,rename,chmod,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
export class Vault {
  constructor(dir=join(homedir(),'.ajudamestre')){this.dir=dir;this.path=join(dir,'credentials.json');}
  async initialize() {
    await mkdir(this.dir,{recursive:true,mode:0o700});
    if(process.platform==='win32') {
      const user=execFileSync('whoami',[],{encoding:'utf8',windowsHide:true}).trim();
      execFileSync('icacls',[this.dir,'/inheritance:r','/grant:r',`${user}:(OI)(CI)F`],{stdio:'ignore',windowsHide:true});
    }else await chmod(this.dir,0o700);
    this.lockPath=join(this.dir,'running.lock');
    try {this.lock=await open(this.lockPath,'wx',0o600);await this.lock.writeFile(String(process.pid));}
    catch(error){if(error.code==='EEXIST')throw Error(`Outro conector pode estar ativo. Se ele foi encerrado à força, remova ${this.lockPath}.`);throw error;}
    try {await this.read();}catch(error){if(error.code!=='ENOENT')throw error;await this.write({hostId:`urn:uuid:${randomUUID()}`,pairingKey:randomBytes(32).toString('base64url'),profiles:[],activeId:null});}
  }
  async read(){return JSON.parse(await readFile(this.path,'utf8'));}
  async write(data){const tmp=`${this.path}.${randomUUID()}.tmp`;await writeFile(tmp,JSON.stringify(data),{mode:0o600});await rename(tmp,this.path);}
  async close(){if(this.lock){await this.lock.close();await unlink(this.lockPath).catch(()=>{});this.lock=null;}}
}
