/*jshint esversion: 9 */
import {Device} from "./utils.js";

export default class Uoli_robot extends Device{
  constructor(){
    super();
    this.addTab("Uóli", "fa-robot", "uoli", `
      <iframe style="width:100%;height:100%" id="uoliWindow" src="./extensions/devices/dependencies/uoli-unity/index.html" frameborder="0"></iframe>
    `);
    document.getElementById("uoliWindow").onload = (function(){
      this.unityModule = document.getElementById("uoliWindow").contentWindow.unityInstance;
      document.getElementById("uoliWindow").contentWindow.setUoliCallbacks(this.uoliStatus.bind(this), this.uoliSensorStatus.bind(this), function(){
        this.unityModule.SendMessage("walle", "keyboardInputToogle", 0);
      }.bind(this));
      // this.setup();
    }).bind(this);
    this.bus.mmio.store(0xFFFF0004, 4, 1);
    this.bus.mmio.store(0xFFFF0020, 4, 1);
    this.motorLastSentTorque = [undefined, undefined];
    this.servoLastSentRot = [undefined, undefined, undefined];
  }

  mmioHandler(){
    if(this.unityModule == undefined){
      return;
    }
    // Position
    if(this.simulator.mmio.load(0xFFFF0004, 4) == 0){
      this.unityModule.SendMessage("walle", "getStatus");
    }
    // Motor Torque
    var motorsTorque = this.simulator.mmio.load(0xFFFF0018, 4);
    if((motorsTorque >> 16) != this.motorLastSentTorque[0]){
      this.unityModule.SendMessage("walle", "SetMotor1Torque", motorsTorque >> 16);
      this.motorLastSentTorque[0] = motorsTorque >> 16;
    }
    if((motorsTorque & 0xFFFF) != this.motorLastSentTorque[1]){
      var m2 = (motorsTorque&0xFFFF);
      m2 = (m2 & 0x8000) ? (m2 | 0xFFFF0000) : m2;
      this.unityModule.SendMessage("walle", "SetMotor2Torque", m2);
      this.motorLastSentTorque[1] = m2;
    }
    // Head Angles
    var headAngles = this.simulator.mmio.load(0xFFFF001C, 4);
    if((headAngles&0xFF) != this.servoLastSentRot[0]){
      this.unityModule.SendMessage("walle", "setNeckRotationTop", headAngles&0xFF);
      this.servoLastSentRot[0] = headAngles&0xFF;
    }
    if(((headAngles>>8) & 0xFF) != this.servoLastSentRot[1]){
      this.unityModule.SendMessage("walle", "setNeckRotationMid", (headAngles>>8)&0xFF);
      this.servoLastSentRot[1] = (headAngles>>8) & 0xFF;
    }
    if(((headAngles>>16) & 0xFF) != this.servoLastSentRot[2]){
      this.unityModule.SendMessage("walle", "setNeckRotationBase", (headAngles>>16)&0xFF);
      this.servoLastSentRot[2] = (headAngles>>16) & 0xFF;
    }
    // Ultrasonic sensor
    if(this.simulator.mmio.load(0xFFFF0020, 4) == 0){
      this.unityModule.SendMessage("walle", "getUltrasonic");
    }
  }


  uoliStatus(rot, pos){
    this.simulator.mmio.store(0xFFFF0008, 4, pos.x >>> 0);
    this.simulator.mmio.store(0xFFFF000C, 4, pos.y >>> 0);
    this.simulator.mmio.store(0xFFFF0010, 4, pos.z >>> 0);
    if(rot.x < 0) rot.x += 360;
    if(rot.y < 0) rot.y += 360;
    if(rot.z < 0) rot.z += 360;
    this.simulator.mmio.store(0xFFFF0014, 4, (rot.x << 20) | (rot.y << 10) | (rot.z));
    this.simulator.mmio.store(0xFFFF0004, 4, 1);
  }

  uoliSensorStatus(dist){
    if(dist == -1){
      this.simulator.mmio.store(0xFFFF0024, 4, 0xFFFFFFFF);
    }else{
      this.simulator.mmio.store(0xFFFF0024, 4, Math.round(dist * 100));
    }
    this.simulator.mmio.store(0xFFFF0020, 4, 1);
  }


  onRun(){
    this.setup();
  }

  setup(){
    if(this.unityModule == undefined){
      return;
    }
    this.unityModule.SendMessage("walle", "keyboardInputToogle", 0);
    this.simulator.mmio.store(0xFFFF0004, 4, 1);
    this.simulator.mmio.store(0xFFFF0020, 4, 1);
    this.motorLastSentTorque = [undefined, undefined];
    this.servoLastSentRot = [undefined, undefined, undefined];
  }

}