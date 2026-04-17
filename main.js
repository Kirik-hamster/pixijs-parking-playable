import * as PIXI from 'pixi.js';
import { ASSETS_MANIFEST, COLORS } from './src/constants';
import { GameScene } from './src/scene/GameScene';

class App {
    constructor() {
        this.app = new PIXI.Application();
        this.init();
    }

    async init() {
        await this.app.init({
            resizeTo: window,
            backgroundColor: COLORS.bg,
            antialias: true
        });
        document.getElementById('app').appendChild(this.app.canvas);

        for (const asset of ASSETS_MANIFEST) {
            PIXI.Assets.add(asset);
        }

        const resources = await PIXI.Assets.load(ASSETS_MANIFEST.map((asset) => asset.alias));
        this.scene = new GameScene(this.app, resources);
        this.app.stage.addChild(this.scene);
    }
}

new App();