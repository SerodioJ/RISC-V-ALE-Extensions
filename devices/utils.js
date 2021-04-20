import { mmio, simulator_controller } from "../../modules/simulator.js";

class BusHelper{
  constructor(){
    this.bus_ch = new BroadcastChannel('bus_channel' + window.uniq_id);
    this.syscalls = {}
    this.addressList = {}
    this.mmio = mmio;
    this.bus_ch.onmessage = function(ev) {
      if(ev.data.syscall){
        if(this.syscalls[ev.data.syscall]){
          this.syscalls[ev.data.syscall](ev.data.data);
        }
      }else if(ev.data.write){
        for (let i = 0; i < ev.data.size; i++) {
          const wp = this.addressList[ev.data.addr + i]; 
          if(wp){
            const mask = [0, 0xFF, 0xFFFF, 0xFFFFFF, 0xFFFFFFFF][wp.size];
            wp.f((ev.data.value>>(i<<3)) & mask); // TODO: Check endianness 
          }
        }
        this.mmio.store(ev.data.addr, ev.data.size, ev.data.value, true);
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
    if(!this.sim_status_ch){
      this.sim_status_ch = new BroadcastChannel("simulator_status" + window.uniq_id);
      this.sim_status_ch.onmessage = function(ev) {
        if(ev.data.type == "status"){
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
      simulator_controller.load_syscall(this.syscalls[s].number, this.syscalls[s].code);
    }
  }

  registerSyscall(number, desc, code, callback, persistent=true){
    this.setupSimControl();
    if(callback != undefined){
      bus_helper.registerSyscallCallback(number, callback);
    }
    simulator_controller.load_syscall(number, code, desc);
    if(persistent){
      this.syscalls.push({number, code});
    }
  }

  simulator_log(log){
    this.setupSimControl();
    this.sim_status_ch.postMessage({type: "sim_log", log});
  }

  setBaseAddress(base_addr){
    this.base_addr = base_addr;
    this.setup();
  }

  setup(){}

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