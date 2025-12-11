// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
// gl.TEXTURE0..31 are constants 0x84C0..0x84DF = 33984..34015
// https://github.com/niivue/niivue/blob/main/docs/development-notes/webgl.md
// persistent textures
export const TEXTURE_CONSTANTS = {
    TEXTURE0_BACK_VOL: 33984,
    TEXTURE1_COLORMAPS: 33985,
    TEXTURE2_OVERLAY_VOL: 33986,
    TEXTURE3_FONT: 33987,
    TEXTURE5_MATCAP: 33989,
    TEXTURE6_GRADIENT: 33990,
    TEXTURE7_DRAW: 33991,
    TEXTURE8_PAQD: 33992,
    // subsequent textures only used transiently
    _TEXTURE8_GRADIENT_TEMP: 33992,
    TEXTURE9_ORIENT: 33993,
    TEXTURE11_GC_BACK: 33995,
    TEXTURE12_GC_STRENGTH0: 33996,
    TEXTURE13_GC_STRENGTH1: 33997,
    TEXTURE14_GC_LABEL0: 33998,
    TEXTURE15_GC_LABEL1: 33999
} as const
