export const COLORS = {
    bg: 0x545454,
    red: 0xd1191f,
    yellow: 0xffc841,
    blue: 0x3d77ff,
    green: 0x2bb673,
    white: 0xffffff,
    black: 0x000000,
    overlay: 0x0f0f0f
};

export const SETTINGS = {
    carSpeed: 100,
    collisionDist: 60,
    parkingDist: 90,
    inactivityTime: 20000,
    failDelay: 900
};

export const LAYOUT_PRESETS = {
    mobile: {
        topY: 0.17,
        bottomY: 1,
        interactiveCarWidth: 0.25,
        decorCarWidth: 0.25,
        decorCarYOffset: 2,
        handWidthFactor: 0.95,
        failY: 0.42,
        failWidthFactor: 2.5,
        failMaxWidth: 320,
        postY: 0.0,
        postBottomY: 0.34,
        finalLogoY: 0.23,
        finalLogoWidthFactor: 0.7,
        finalLogoMaxWidth: 375,
        finalButtonY: 0.67,
        finalButtonWidthFactor: 0.84,
        finalButtonMaxWidth: 390
    },
    desktop: {
        topY: 0.17,
        bottomY: 0.69,
        interactiveCarWidth: 0.25,
        decorCarWidth: 0.25,
        decorCarYOffset: 2,
        handWidthFactor: 0.95,
        failY: 0.42,
        failWidthFactor: 3,
        failMaxWidth: 450,
        postY: 0.01,
        postBottomY: 0.27,
        finalLogoY: 0.22,
        finalLogoWidthFactor: 0.5,
        finalLogoMaxWidth: 375,
        finalButtonY: 0.64,
        finalButtonWidthFactor: 0.51,
        finalButtonMaxWidth: 390
    }
};

export const ASSETS_MANIFEST = [
    { alias: 'carRed', src: '/assets/red.png' },
    { alias: 'carYellow', src: '/assets/yellow.png' },
    { alias: 'carGreen', src: '/assets/green.png' },
    { alias: 'carBlue', src: '/assets/blue.png' },
    { alias: 'hand', src: '/assets/hand.png' },
    { alias: 'logo', src: '/assets/gamelogo.png' },
    { alias: 'fail', src: '/assets/fail3.png' },
    { alias: 'button', src: '/assets/Button.png' }
];