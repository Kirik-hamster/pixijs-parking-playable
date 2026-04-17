import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { COLORS, SETTINGS, LAYOUT_PRESETS } from '../constants';
import { Car } from '../components/Car';
import { ParkingSlot } from '../components/ParkingSlot';

export class GameScene extends PIXI.Container {
    constructor(app, resources) {
        super();
        this.app = app;
        this.resources = resources;

        this.graphics = { red: new PIXI.Graphics(), yellow: new PIXI.Graphics() };
        this.paths = { red: [], yellow: [] };
        this.isReady = { red: false, yellow: false };
        this.isRacing = false;
        this.hasInteracted = false;
        this.isFinalShown = false;
        this.inactivityId = null;
        this.resizeHandler = () => this.layout();
        this.raceSpeeds = { red: SETTINGS.carSpeed, yellow: SETTINGS.carSpeed };

        this.setup();
    }

    setup() {
        this.eventMode = 'static';
        this.hitArea = this.app.screen;

        this.parkingArea = new PIXI.Graphics();
        this.decorCars = [
            new PIXI.Sprite(this.resources.carGreen),
            new PIXI.Sprite(this.resources.carBlue)
        ];
        this.decorCars.forEach((car) => {
            car.anchor.set(0.5);
            car.eventMode = 'none';
        });
        this.pYellow = new ParkingSlot(COLORS.yellow);
        this.pRed = new ParkingSlot(COLORS.red);

        this.carRed = new Car(this.resources.carRed, 'red');
        this.carYellow = new Car(this.resources.carYellow, 'yellow');
        this.hand = this.createHandHint();
        this.failLabel = new PIXI.Sprite(this.resources.fail);
        this.failLabel.anchor.set(0.5);
        this.failLabel.alpha = 0;

        this.finalOverlay = this.createFinalOverlay();

        this.addChild(
            this.parkingArea,
            this.pYellow,
            this.pRed,
            this.decorCars[0],
            this.decorCars[1],
            this.graphics.red,
            this.graphics.yellow,
            this.carRed,
            this.carYellow,
            this.hand,
            this.failLabel,
            this.finalOverlay
        );

        this.layout();
        this.setupEvents();
        this.resetInactivityTimer();
        window.addEventListener('resize', this.resizeHandler);
    }

    setupEvents() {
        this.carRed.on('pointerdown', (e) => this.startDrawing(e, this.carRed));
        this.carYellow.on('pointerdown', (e) => this.startDrawing(e, this.carYellow));
        this.on('pointermove', (e) => this.handleMove(e));
        this.on('pointerup', () => this.stopDrawing());
        this.on('pointerupoutside', () => this.stopDrawing());
        this.on('pointertap', () => this.resetInactivityTimer());
    }

    startDrawing(e, car) {
        if (this.isRacing || this.isFinalShown || this.isReady[car.colorName]) return;

        this.registerInteraction();
        this.draggingCar = car;
        this.paths[car.colorName] = [{ x: car.x, y: car.y }];
    }

    handleMove(e) {
        if (!this.draggingCar) return;
        this.registerInteraction();

        const pos = this.toLocal(e.global);
        const path = this.paths[this.draggingCar.colorName];
        if (Math.hypot(pos.x - path[path.length-1].x, pos.y - path[path.length-1].y) > 5) {
            path.push({ x: pos.x, y: pos.y });
            this.drawPath(this.draggingCar.colorName);
        }
    }

    drawPath(color) {
        const g = this.graphics[color];
        g.clear();
        g.moveTo(this.paths[color][0].x, this.paths[color][0].y);
        for (let p of this.paths[color]) g.lineTo(p.x, p.y);
        g.stroke({ color: COLORS[color], width: 12, cap: 'round', join: 'round' });
    }

    stopDrawing() {
        if (!this.draggingCar) return;
        const car = this.draggingCar;
        const target = car.colorName === 'red' ? this.pRed : this.pYellow;
        const last = this.paths[car.colorName][this.paths[car.colorName].length - 1];

        if (last && Math.hypot(last.x - target.x, last.y - target.y) < SETTINGS.parkingDist) {
            this.isReady[car.colorName] = true;
            car.eventMode = 'none';
            if (this.isReady.red && this.isReady.yellow) this.startRace();
        } else {
            this.paths[car.colorName] = [];
            this.graphics[car.colorName].clear();
        }
        this.draggingCar = null;
    }

    startRace() {
        this.isRacing = true;
        const intersection = this.findPathIntersection(this.paths.red, this.paths.yellow);
        this.raceSpeeds = { red: SETTINGS.carSpeed, yellow: SETTINGS.carSpeed };

        if (intersection) {
            const redDistance = this.getDistanceToIntersection(this.paths.red, intersection.red.segIdx, intersection.red.t);
            const yellowDistance = this.getDistanceToIntersection(this.paths.yellow, intersection.yellow.segIdx, intersection.yellow.t);
            const meetTime = Math.max(0.001, redDistance / SETTINGS.carSpeed);

            this.raceSpeeds.red = SETTINGS.carSpeed;
            this.raceSpeeds.yellow = yellowDistance / meetTime;

            this.carRed.preparePath(this.cutPathAtIntersection(this.paths.red, intersection.red.segIdx, intersection.red.t, intersection.point));
            this.carYellow.preparePath(this.cutPathAtIntersection(this.paths.yellow, intersection.yellow.segIdx, intersection.yellow.t, intersection.point));
        } else {
            this.carRed.preparePath(this.paths.red);
            this.carYellow.preparePath(this.paths.yellow);
        }

        this.app.ticker.add(this.update, this);
    }

    update(ticker) {
        const dt = ticker.deltaMS / 1000;
        this.carRed.updatePosition(dt, this.raceSpeeds.red);
        this.carYellow.updatePosition(dt, this.raceSpeeds.yellow);

        if (Math.hypot(this.carRed.x - this.carYellow.x, this.carRed.y - this.carYellow.y) < SETTINGS.collisionDist) {
            this.app.ticker.remove(this.update, this);
            this.showFailSequence();
        }
    }

    layout() {
        const { width, height } = this.app.screen;
        const isMobileScreen = this.isMobileScreen(width, height);
        const layout = this.getLayoutPreset(isMobileScreen);
        const board = this.getBoardMetrics(width, height, isMobileScreen);
        const topY = board.y + board.size * layout.topY;
        const bottomY = board.y + board.size * layout.bottomY;
        const interactiveCarWidth = board.size * layout.interactiveCarWidth;
        const decorCarWidth = board.size * layout.decorCarWidth;
        const slots = this.getLayoutSlots(board);

        this.hitArea = new PIXI.Rectangle(0, 0, width, height);
        this.drawParkingArea(board, slots, layout, isMobileScreen);

        this.pYellow.position.set(slots.yellowSlot.centerX, topY);
        this.pRed.position.set(slots.redSlot.centerX, topY);

        this.decorCars[0].width = decorCarWidth;
        this.decorCars[0].scale.y = this.decorCars[0].scale.x;
        this.decorCars[1].width = decorCarWidth;
        this.decorCars[1].scale.y = this.decorCars[1].scale.x;
        this.decorCars[0].position.set(slots.leftCar.centerX, topY + layout.decorCarYOffset);
        this.decorCars[1].position.set(slots.rightCar.centerX, topY + layout.decorCarYOffset);
        this.decorCars[0].rotation = Math.PI;
        this.decorCars[1].rotation = Math.PI;

        this.carRed.redraw(interactiveCarWidth);
        this.carYellow.redraw(interactiveCarWidth);
        if (!this.isRacing) {
            if (!this.isReady.red) {
                this.carRed.position.set(slots.bottomRed.centerX, bottomY);
                this.carRed.rotation = 0;
            }
            if (!this.isReady.yellow) {
                this.carYellow.position.set(slots.bottomYellow.centerX, bottomY);
                this.carYellow.rotation = 0;
            }
        }

        this.hand.width = interactiveCarWidth * layout.handWidthFactor;
        this.hand.scale.y = this.hand.scale.x;
        this.refreshHandHint(interactiveCarWidth);
        this.failLabel.position.set(board.x + board.size * 0.5, board.y + board.size * layout.failY);
        this.failLabel.width = Math.min(width * layout.failWidthFactor, layout.failMaxWidth);
        this.failLabel.scale.y = this.failLabel.scale.x;
        this.failLabel.baseScale = this.failLabel.scale.x; 
        this.layoutFinalOverlay(width, height, layout);
    }

    getBoardMetrics(width, height, isMobileScreen) {
        const size = isMobileScreen ? width : Math.min(width, height);
        return {
            size,
            x: isMobileScreen ? 0 : (width - size) / 2,
            y: (height - size) / 2
        };
    }

    drawParkingArea(board, slots, layout, isMobileScreen) {
        this.parkingArea.clear();
        const postY = 0;
        const postBottomY = board.y + board.size * layout.postBottomY;
        const postXs = slots.posts;

        for (const x of postXs) {
            const lineWidth = board.size * 0.024;
            const radius = Math.max(2, Math.round(board.size * 0.01));

            this.parkingArea
                .roundRect(x - lineWidth / 2, postY, lineWidth, postBottomY - postY, radius)
                .fill(COLORS.white);

            if (isMobileScreen) {
                
                // Mobile reference: small rounded rectangle at the end (no circle).
                const capW = lineWidth * 2;
                const capH = lineWidth * 0.9;
                // Slight overlap removes anti-aliasing "gap" between shapes.
                const overlap = Math.max(1, capH * 0.35);
                
                this.parkingArea
                    .roundRect(x - capW / 2, postBottomY - overlap, capW, capH + overlap, capH / 2)
                    .fill(COLORS.white);
            } else {
                // Десктоп: длинный горизонтальный наконечник
                const capW = lineWidth * 2;   // было 1.6, теперь в 6.25 раз больше (примерно ×5 от исходного 1.6)
                const capH = lineWidth * 0.9;
                const overlap = Math.max(1, capH * 0.35);
                this.parkingArea
                    .roundRect(x - capW / 2, postBottomY - overlap, capW, capH + overlap, capH / 2)
                    .fill(COLORS.white);
            }
        }
    }

    getLayoutSlots(board) {
        return {
            posts: [
                board.x + board.size * 0.00,
                board.x + board.size * 0.25,
                board.x + board.size * 0.5,
                board.x + board.size * 0.75,
                board.x + board.size * 1.00
            ],
            leftCar: { centerX: board.x + board.size * 0.125 },
            yellowSlot: { centerX: board.x + board.size * 0.375 },
            redSlot: { centerX: board.x + board.size * 0.625 },
            rightCar: { centerX: board.x + board.size * 0.875 },
            bottomRed: { centerX: board.x + board.size * 0.30 },
            bottomYellow: { centerX: board.x + board.size * 0.70 }
        };
    }

    createHandHint() {
        const hand = new PIXI.Container();
        const icon = new PIXI.Sprite(this.resources.hand);
        icon.anchor.set(0.5);
        hand.addChild(icon);
        hand.alpha = 0.9;
        hand.icon = icon;
        icon.rotation = 0.25;

        return hand;
    }

    refreshHandHint(interactiveCarWidth) {
        if (this.hasInteracted || this.isRacing || this.isFinalShown) return;
        if (!this.hand?.visible) return;

        const hand = this.hand;
        if (hand.tl) {
            hand.tl.kill();
            hand.tl = null;
        }

        // Start from the red car center, end on the red parking "P"
        const startX = this.carRed.x;
        const startY = this.carRed.y;
        const endX = this.pRed.x;
        const endY = this.pRed.y;

        hand.position.set(startX, startY);
        hand.icon.position.set(0, 0);
        hand.icon.scale.set(1);

        hand.tl = gsap.timeline({ repeat: -1, repeatDelay: 0.25 });
        hand.tl.to(hand, { x: endX, y: endY, duration: 1.1, ease: 'power1.inOut' });
        hand.tl.to(hand.icon.scale, { x: 0.92, y: 0.92, duration: 0.08, yoyo: true, repeat: 1 }, '<');
        hand.tl.set(hand, { x: startX, y: startY });
    }

    createLabel(text, fontSize, fill) {
        return new PIXI.Text({
            text,
            style: {
                fill,
                fontSize,
                fontWeight: '900',
                fontFamily: 'Arial',
                align: 'center',
                stroke: { color: 0x000000, width: 6 }
            }
        });
    }

    createFinalOverlay() {
        const overlay = new PIXI.Container();
        overlay.visible = false;
        overlay.eventMode = 'static';

        overlay.bg = new PIXI.Graphics();
        overlay.logo = new PIXI.Sprite(this.resources.logo);
        overlay.logo.anchor.set(0.5);

        overlay.button = new PIXI.Sprite(this.resources.button);
        overlay.button.anchor.set(0.5);
        overlay.button.eventMode = 'static';
        overlay.button.cursor = 'pointer';
        overlay.addChild(overlay.bg, overlay.logo, overlay.button);

        overlay.button.on('pointertap', () => {
            this.registerInteraction();
            window.location.assign('https://roasup.com');
        });

        return overlay;
    }

    layoutFinalOverlay(width, height, layout) {
        const overlay = this.finalOverlay;
        overlay.bg.clear();
        overlay.bg.rect(0, 0, width, height).fill(COLORS.overlay, 0.72);

        overlay.logo.position.set(width * 0.5, height * layout.finalLogoY);
        overlay.logo.width = Math.min(width * layout.finalLogoWidthFactor, layout.finalLogoMaxWidth);
        overlay.logo.scale.y = overlay.logo.scale.x;
        overlay.logoBaseScale = overlay.logo.scale.x;

        overlay.button.position.set(width * 0.5, height * layout.finalButtonY);
        overlay.button.width = Math.min(width * layout.finalButtonWidthFactor, layout.finalButtonMaxWidth);
        overlay.button.scale.y = overlay.button.scale.x;
        overlay.buttonBaseScale = overlay.button.scale.x;
    }

    isMobileScreen(width, height) {
        return Math.max(width, height) <= 950 || Math.min(width, height) <= 500;
    }

    getLayoutPreset(isMobileScreen) {
        return isMobileScreen ? LAYOUT_PRESETS.mobile : LAYOUT_PRESETS.desktop;
    }

    registerInteraction() {
        this.resetInactivityTimer();
        if (!this.hasInteracted) {
            this.hasInteracted = true;
            this.hideHandHint();
        }
    }

    hideHandHint() {
        gsap.killTweensOf(this.hand);
        gsap.killTweensOf(this.hand.icon);
        if (this.hand?.tl) {
            this.hand.tl.kill();
            this.hand.tl = null;
        }
        gsap.to(this.hand, {
            alpha: 0,
            duration: 0.35,
            onComplete: () => {
                this.hand.visible = false;
            }
        });
    }

    resetInactivityTimer() {
        clearTimeout(this.inactivityId);
        if (this.isFinalShown) return;
        this.inactivityId = setTimeout(() => this.showFinalScene(false), SETTINGS.inactivityTime);
    }

    getCollisionPoint() {
        const { width, height } = this.app.screen;
        const board = this.getBoardMetrics(width, height, this.isMobileScreen(width, height));
        return {
            x: board.x + board.size * 0.5,
            y: board.y + board.size * 0.56
        };
    }

    createRacePath(path, collisionPoint) {
        if (path.length < 2) return path;
        const keepCount = Math.max(2, Math.floor(path.length * 0.45));
        const racePath = path.slice(0, keepCount);
        racePath.push(collisionPoint);
        return racePath;
    }

    findPathIntersection(pathA, pathB) {
        if (pathA.length < 2 || pathB.length < 2) return null;

        for (let i = 1; i < pathA.length; i++) {
            const a1 = pathA[i - 1];
            const a2 = pathA[i];

            for (let j = 1; j < pathB.length; j++) {
                const b1 = pathB[j - 1];
                const b2 = pathB[j];
                const intersection = this.getSegmentIntersection(a1, a2, b1, b2);
                if (intersection) {
                    return {
                        point: { x: intersection.x, y: intersection.y },
                        red: { segIdx: i - 1, t: intersection.tA },
                        yellow: { segIdx: j - 1, t: intersection.tB }
                    };
                }
            }
        }

        return null;
    }

    getSegmentIntersection(a1, a2, b1, b2) {
        const ax = a2.x - a1.x;
        const ay = a2.y - a1.y;
        const bx = b2.x - b1.x;
        const by = b2.y - b1.y;
        const denominator = ax * by - ay * bx;

        if (Math.abs(denominator) < 0.000001) return null;

        const dx = b1.x - a1.x;
        const dy = b1.y - a1.y;
        const tA = (dx * by - dy * bx) / denominator;
        const tB = (dx * ay - dy * ax) / denominator;

        if (tA < 0 || tA > 1 || tB < 0 || tB > 1) return null;

        return {
            x: a1.x + ax * tA,
            y: a1.y + ay * tA,
            tA,
            tB
        };
    }

    getDistanceToIntersection(path, segmentIndex, tOnSegment) {
        let distance = 0;
        for (let i = 1; i < path.length; i++) {
            const p1 = path[i - 1];
            const p2 = path[i];
            const segmentLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);

            if (i - 1 < segmentIndex) {
                distance += segmentLen;
            } else if (i - 1 === segmentIndex) {
                distance += segmentLen * tOnSegment;
                break;
            }
        }
        return distance;
    }

    cutPathAtIntersection(path, segmentIndex, tOnSegment, point) {
        const cut = path.slice(0, segmentIndex + 1);
        cut.push({ x: point.x, y: point.y });
        return cut;
    }

    showFailSequence() {
        if (this.isFinalShown) return;

        const baseScale = this.failLabel.baseScale || 1; // fallback на случай, если baseScale ещё не задан
        this.failLabel.visible = true;
        this.failLabel.scale.set(baseScale * 0.5); // старт с половинного размера от ЦЕЛЕВОГО

        gsap.to(this.failLabel, { alpha: 1, duration: 0.18 });
        gsap.to(this.failLabel.scale, {
            x: baseScale,    // анимируем к целевому масштабу, а не к 1
            y: baseScale,
            duration: 0.3,
            ease: 'back.out(1.8)'
        });
        gsap.to(this.failLabel, {
            alpha: 0,
            delay: SETTINGS.failDelay / 1000,
            duration: 0.25,
            onComplete: () => this.showFinalScene(true)
        });
    }

    showFinalScene(fromFail) {
        if (this.isFinalShown) return;

        this.isFinalShown = true;
        clearTimeout(this.inactivityId);
        this.draggingCar = null;
        this.finalOverlay.visible = true;
        this.finalOverlay.alpha = 0;
        this.finalOverlay.logo.alpha = 0;
        this.finalOverlay.button.alpha = 0;
        this.finalOverlay.logo.scale.set(this.finalOverlay.logoBaseScale * 0.7);
        this.finalOverlay.button.scale.set(this.finalOverlay.buttonBaseScale * 0.7);
        this.failLabel.visible = false;

        if (!fromFail) {
            this.hideHandHint();
        }

        gsap.to(this.finalOverlay, { alpha: 1, duration: 0.35 });
        gsap.to(this.finalOverlay.logo, { alpha: 1, duration: 0.3 });
        gsap.to(this.finalOverlay.logo.scale, {
            x: this.finalOverlay.logoBaseScale,
            y: this.finalOverlay.logoBaseScale,
            duration: 0.35,
            ease: 'back.out(1.7)'
        });
        gsap.to(this.finalOverlay.button, { alpha: 1, delay: 0.08, duration: 0.3 });
        gsap.to(this.finalOverlay.button.scale, {
            x: this.finalOverlay.buttonBaseScale,
            y: this.finalOverlay.buttonBaseScale,
            delay: 0.08,
            duration: 0.35,
            ease: 'back.out(1.7)'
        });
    }
}