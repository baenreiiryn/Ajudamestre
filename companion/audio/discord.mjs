import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
export class DiscordOutput extends EventEmitter {
 constructor(mixer){super();this.mixer=mixer;this.state={status:'disconnected',guildId:null,channelId:null,error:null};this.client=null;this.connection=null;this.stream=null;this.writeFrame=null;this.connecting=false;}
 snapshot(){return {...this.state};}
 update(values){Object.assign(this.state,values);this.emit('change');}
 async connect({token,guildId,channelId}){
  if(this.connecting)throw Error('Conexão Discord em andamento.');if(!token)throw Error('Configure o token do bot no programa do PC.');if(!/^\d{16,22}$/.test(guildId)||!/^\d{16,22}$/.test(channelId))throw Error('Informe IDs válidos de servidor e canal de voz.');
  this.connecting=true;await this.disconnect();this.update({status:'connecting',guildId,channelId,error:null});
  try {
   const {Client,GatewayIntentBits,PermissionFlagsBits,ChannelType}=await import('discord.js');
   const voice=await import('@discordjs/voice');
   this.client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildVoiceStates]});this.client.on('error',()=>this.update({error:'Erro de conexão ao Discord.'}));
   await this.client.login(token);if(!this.client.isReady())await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Discord não ficou pronto em 20 segundos.')),20000);this.client.once('clientReady',()=>{clearTimeout(timer);resolve();});});
   this.update({botId:this.client.user.id});
   const guild=await this.client.guilds.fetch(guildId),channel=await guild.channels.fetch(channelId);
   if(!channel||channel.type!==ChannelType.GuildVoice)throw Error('Escolha um canal de voz comum do servidor (não Stage/DM).');
   const me=await guild.members.fetchMe();const perms=channel.permissionsFor(me);
   if(![PermissionFlagsBits.ViewChannel,PermissionFlagsBits.Connect,PermissionFlagsBits.Speak].every(p=>perms?.has(p)))throw Error('O bot precisa de Ver canal, Conectar e Falar.');
   this.connection=voice.joinVoiceChannel({guildId,channelId,adapterCreator:guild.voiceAdapterCreator,selfDeaf:true,selfMute:false});
   this.connection.on('error',()=>this.update({error:'Falha na conexão de voz. Confira permissões e DAVE.'}));
   await voice.entersState(this.connection,voice.VoiceConnectionStatus.Ready,20000);
   this.stream=new PassThrough({highWaterMark:3840*25});
   // A short preroll absorbs Windows timer jitter before the first Opus packet.
   this.stream.write(Buffer.alloc(3840*8));
   this.player=voice.createAudioPlayer({behaviors:{noSubscriber:voice.NoSubscriberBehavior.Play}});
   this.player.on('error',()=>this.update({error:'Erro ao codificar ou transmitir áudio. Confira Opus/DAVE.'}));
   this.player.play(voice.createAudioResource(this.stream,{inputType:voice.StreamType.Raw}));this.connection.subscribe(this.player);
   this.writeFrame=frame=>{if(this.stream&&!this.stream.destroyed&&this.stream.writableLength<3840*25)this.stream.write(frame);};this.mixer.on('frame',this.writeFrame);
   this.connection.on(voice.VoiceConnectionStatus.Disconnected,()=>{this.mixer.stopBus('sfx');void this.disconnect().then(()=>this.update({error:'Conexão de voz perdida. Reconecte pelo painel; pads antigos não serão repetidos.'}));});
   this.update({status:'ready',guildId,channelId,error:null,botId:this.client.user.id});return this.snapshot();
  }catch(error){await this.disconnect();this.update({status:'error',error:error.message.replaceAll(token,'[oculto]')});throw Error(this.state.error);}
  finally{this.connecting=false;}
 }
 async disconnect(){if(this.writeFrame)this.mixer.off('frame',this.writeFrame);this.writeFrame=null;this.player?.stop(true);this.player=null;this.stream?.destroy();this.stream=null;this.connection?.destroy();this.connection=null;this.client?.destroy();this.client=null;this.update({status:'disconnected'});}
}
