import * as PIXI from 'pixi.js';

export class Car extends PIXI.Container {
    constructor(texture, colorName) {
        super();

        this.colorName = colorName;
        this.eventMode = 'static';
        this.cursor = 'pointer';

        this.path = [];
        this.totalLength = 0;
        this.segments = [];
        this.progress = 0;
        this.isFinished = false;

        this.sprite = new PIXI.Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.addChild(this.sprite);
    }

    redraw(width) {
        this.sprite.width = width;
        this.sprite.scale.y = this.sprite.scale.x;
    }

    preparePath(path) {
        this.path = path;
        this.totalLength = 0;
        this.segments = [];
        this.progress = 0;
        this.isFinished = false;

        for (let i = 1; i < path.length; i++) {
            const p1 = path[i - 1];
            const p2 = path[i];
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (!len) continue;
            this.segments.push({ p1, p2, len });
            this.totalLength += len;
        }
    }

    updatePosition(dt, speed) {
        if (this.isFinished || this.segments.length === 0) return;

        this.progress += speed * dt;
        if (this.progress >= this.totalLength) {
            this.progress = this.totalLength;
            this.isFinished = true;
        }

        let remaining = this.progress;
        for (const seg of this.segments) {
            if (remaining <= seg.len) {
                const t = remaining / seg.len;
                this.x = seg.p1.x + (seg.p2.x - seg.p1.x) * t;
                this.y = seg.p1.y + (seg.p2.y - seg.p1.y) * t;
                this.rotation = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x) + Math.PI / 2;
                break;
            }
            remaining -= seg.len;
        }
    }
}