import {readFile,readdir,mkdir,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
// ZIP with stored entries, UTF-8 paths and CRC32. No packaging dependencies.
const crc32=b=>{let c=0xffffffff;for(const byte of b){c^=byte;for(let i=0;i<8;i++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return(c^0xffffffff)>>>0;};
async function files(paths){const out=[];for(const p of paths){if((await stat(p)).isDirectory()){for(const child of await readdir(p))out.push(...await files([join(p,child)]));}else out.push(p);}return out;}
export async function archive(paths,target){
 const locals=[],central=[];let offset=0;
 for(const path of await files(paths)){
  const data=await readFile(path),name=Buffer.from(path.replaceAll('\\','/')),crc=crc32(data);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(0x21,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);locals.push(h,name,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(0x21,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=h.length+name.length+data.length;
 }
 const size=central.reduce((n,b)=>n+b.length,0),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(central.length/2,8);end.writeUInt16LE(central.length/2,10);end.writeUInt32LE(size,12);end.writeUInt32LE(offset,16);
 await writeFile(target,Buffer.concat([...locals,...central,end]));console.log(`Criado ${target}`);
}
await mkdir('dist',{recursive:true});
await archive(['module.json','scripts','styles','templates','LICENSE','README.md'],'dist/ajudamestre.zip');
await archive(['companion','studio','scripts','package.json','package-lock.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md'],'dist/ajudamestre-conector.zip');
await writeFile('dist/module.json',await readFile('module.json'));
