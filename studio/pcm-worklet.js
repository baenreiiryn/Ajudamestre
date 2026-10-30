class PCMMonitor extends AudioWorkletProcessor {
 constructor(){super();this.left=new Float32Array(96000);this.right=new Float32Array(96000);this.read=0;this.write=0;this.available=0;this.port.onmessage=event=>{const [left,right]=event.data;for(let i=0;i<left.length;i++){if(this.available>=this.left.length){this.read=(this.read+1)%this.left.length;this.available--;}this.left[this.write]=left[i];this.right[this.write]=right[i];this.write=(this.write+1)%this.left.length;this.available++;}};}
 process(inputs,outputs){const [left,right]=outputs[0];for(let i=0;i<left.length;i++){if(this.available){left[i]=this.left[this.read];right[i]=this.right[this.read];this.read=(this.read+1)%this.left.length;this.available--;}else{left[i]=right[i]=0;}}return true;}
}
registerProcessor('pcm-monitor',PCMMonitor);
