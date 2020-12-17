/*jshint esversion: 9 */
import {Device} from "./utils.js";

class GPT extends Device{
  setup(){
    this.bus.watchAddress(this.base_addr, function (value) {
      this.bus.mmio.store(this.base_addr + 4, 4, Math.round(performance.now()));
    }.bind(this), 4);
  }
}

const gpt = new GPT();
export default gpt;