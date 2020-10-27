function $builtinmodule() {
    const GLOBAL = typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};
    const mod = {
        __name__: new Sk.builtin.str("p5"),
        p5: Sk.ffi.toPy(GLOBAL.p5),
        __doc__: new Sk.builtin.str("A skulpt implementation of the p5 library"),
    };
    return mod;
}
