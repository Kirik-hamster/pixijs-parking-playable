import * as PIXI from 'pixi.js';
import { COLORS } from '../constants';

export class ParkingSlot extends PIXI.Container {
    constructor(color) {
        super();

        this.sign = new PIXI.Text({
            text: 'P',
            style: {
                fontFamily: 'Arial',
                fontSize: 85,
                fontWeight: '900',
                fill: color
            }
        });
        this.sign.anchor.set(0.5);
        this.sign.position.set(0, 0);

        this.addChild(this.sign);
    }
}