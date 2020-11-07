class MMIO_Mirror{
  constructor(bus_ch){
    this.bus_ch = bus_ch;
    var buffer = new ArrayBuffer(0x10000);
    this.memory = [];
    this.memory[1] = new Uint8Array(buffer);
    this.memory[2] = new Uint16Array(buffer);
    this.memory[4] = new Uint32Array(buffer);
  }

  load(addr, size){
    addr &= 0xFFFF;
    return this.memory[size][(addr/size) | 0];
  }

  store(addr, size, value, local=false){
    addr &= 0xFFFF;
    this.memory[size][(addr/size) | 0] = value;
    this.bus_ch.postMessage({write:true, addr, size, value})
  }
}

class BusHelper{
  constructor(){
    this.bus_ch = new BroadcastChannel('bus_channel');
    this.syscalls = {}
    this.addressList = {}
    this.mmio = new MMIO_Mirror(this.bus_ch);
    this.bus_ch.onmessage = function(ev) {
      if(ev.data.syscall){
        if(this.syscalls[ev.data.syscall]){
          this.syscalls[ev.data.syscall](ev.data.data);
        }
      }else if(ev.data.write){
        for (let i = 0; i < ev.data.size; i++) {
          const wp = this.addressList[ev.data.addr + i]; 
          if(wp){
            wp.f((ev.data.value>>(i<<3)) & ((1 << wp.size) - 1));
          }
        }
        this.mmio.store(ev.data.addr, ev.data.size, ev.data.value, local=true);
      }
    }.bind(this);
  }

  registerSyscallCallback(number, f){
    this.syscalls[number] = f;
  }

  watchAddress(addr, f, size=4){
    this.addressList[addr] = {f, size};
  }

}

export const bus_helper = new BusHelper();

import {navegation} from "../../assets/js/interface_elements.js";
export class Device{
  constructor(){
    this.syscalls = [];
  }
  
  addTab(name, icon, id, content){
    if(!this.navegation){
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