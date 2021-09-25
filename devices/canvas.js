/*jshint esversion: 9 */
import {Device} from "./utils.js";

class Canvas extends Device{
  setup(){
    this.addTab("Canvas", "fa-paint-brush", "canvas_device", `
      <canvas id="canvas_device_canvas" style="width: 100%;height: 100%;"></canvas>
    `);

    this.canvas = document.getElementById("canvas_device_canvas");
    this.ctx = this.canvas.getContext('2d');
    this.imageData = this.ctx.createImageData(512, 512);
    this.width = 512;
    this.scalex = 1;
    this.scaley = 1;

    setInterval(_=>{
      this.canvas.width  = this.canvas.offsetWidth/this.scalex;
      this.canvas.height = this.canvas.offsetHeight/this.scaley;
      this.ctx.putImageData(this.imageData, 0, 0);
    }, 100);
    var syscall =`
      sendMessage({a0, a1, a2});
    `;
    this.registerSyscall(2200, "Canvas setPixel", syscall, function (reg) {
      const idx = (reg.a1*this.width + reg.a0)*4
      this.imageData.data[idx + 0] = (reg.a2>>24)&0xFF ;  // R value
      this.imageData.data[idx + 1] = (reg.a2>>16)&0xFF;    // G value
      this.imageData.data[idx + 2] = (reg.a2>>8)&0xFF;  // B value
      this.imageData.data[idx + 3] = reg.a2&0xFF;  // A value
    }.bind(this));
    this.registerSyscall(2201, "Canvas setCanvasSize", syscall, function (reg) {
      this.width = reg.a0;
      this.imageData = this.ctx.createImageData(reg.a0, reg.a1);
    }.bind(this));
    this.registerSyscall(2202, "Canvas setScaling", syscall, function (reg) {
      this.scalex = reg.a0;
      this.scaley = reg.a1;
    }.bind(this));
  }
}

const canvas = new Canvas();
export default canvas;