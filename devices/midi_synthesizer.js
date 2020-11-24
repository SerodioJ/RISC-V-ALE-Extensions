/*jshint esversion: 9 */
import {Device} from "./utils.js";

class MIDI_Synthesizer extends Device{
  setup(){
    this.load();
  }

  async load(){
    var module = await import("./dependencies/webaudio-tinysynth.js");
    this.synth = new module.Player();
    var syscall =`
      sendMessage({a0, a1, a2});
    `;
    this.registerSyscall(2048, "Midi Synthesizer", syscall, this.onmessage.bind(this));
  }

  onmessage(reg){
    console.log(reg);
    this.synth.play(reg.a0, reg.a1 >> 24, ((reg.a1 >> 16)&0xFF)/256, 0, (reg.a1 & 0xFFFF)/1000, reg.a2);
  }
}

const synth = new MIDI_Synthesizer();
export default synth;