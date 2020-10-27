function $builtinmodule () {
    const GLOBAL = typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};

    return {
        __name__: new Sk.builtin.str("document"),
        document: Sk.ffi.toPy(GLOBAL.document),
        jQuery: Sk.ffi.toPy(GLOBAL.jQuery),
    };
}
