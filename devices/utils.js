class MMIO{
  constructor(sharedBuffer){
    this.memory = [];
    this.memory[1] = new Uint8Array(sharedBuffer);
    this.memory[2] = new Uint16Array(sharedBuffer);
    this.memory[4] = new Uint32Array(sharedBuffer);
    this.size = sharedBuffer.byteLength;
  }

  load(addr, size){
    addr &= 0xFFFF;
    return Atomics.load(this.memory[size], (addr/size) | 0);
  }

  store(addr, size, value){
    addr &= 0xFFFF;
    Atomics.store(this.memory[size], (addr/size) | 0, value);
  }
}

class BusHelper{
  constructor(){
    this.mmio = new MMIO
    this.bus_ch = new BroadcastChannel('bus_channel');
    this.syscalls = {}
    this.bus_ch.onmessage = function(ev) {
      if(ev.data.syscall){
        if(this.syscalls[ev.data.syscall]){
          this.syscalls[ev.data.syscall](ev.data.data);
        }
      }
    }
  }

  registerSyscallCallback(number, f){
    this.syscalls[number] = f;
  }

  watchAddress(addr, f){
    
  }

}

export const bus_helper = new BusHelper();

export class Device{
  constructor(){
    this.syscalls = [];
  }
  
  addTab(name, icon, id, content){
    if(!this.navegation){
      import {navegation} from "../../assets/js/interface_elements.js";
      this.navegation = navegation;
    }
    this.navegation.addTab(name, icon, id, content);
  }

  setupSimControl(){
    if(!this.sim_ctrl_ch){
      this.sim_ctrl_ch = new BroadcastChannel("simulator_control");
      this.sim_ctrl_ch.onmessage = function(ev) {
        if(ev.data.dst == "interface" && ev.data.type == "status"){
          if(this.runningCallback && ev.data.status.running) this.runningCallback();
          if(this.stoppingCallback && !ev.data.status.running) this.stoppingCallback();
          if(this.startingCallback && ev.data.status.starting) this.startingCallback();
          if(ev.data.status.starting) this.installSyscalls();
        }
      }.bind(this);
    }
  }

  installSyscalls(){
    for (const s in this.syscalls) {
      this.sim_ctrl_ch.postMessage(this.syscalls[s]);
    }
  }

  registerSyscall(number, desc, code, callback, persistent=true){
    this.setupSimControl();
    if(callback != undefined){
      bus_helper.registerSyscallCallback(number, callback);
    }
    this.sim_ctrl_ch.postMessage({dst: "simulator", cmd: "load_syscall", syscall: {number, code}, desc});
    if(persistent){
      this.syscalls.push({dst: "simulator", cmd: "load_syscall", syscall: {number, code}});
    }
  }

  set onRun(f){
    this.setupSimControl();
    this.runningCallback = f;
  }

  set onStop(f){
    this.setupSimControl();
    this.stoppingCallback = f;
  }

  set onStart(f){
    this.setupSimControl();
    this.startingCallback = f;
  }

  get bus(){
    return bus_helper;
  }
}