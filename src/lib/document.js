function $builtinmodule () {
    return {
        __name__: new Sk.builtin.str("document"),
        document: Sk.ffi.toPy(window.document),
        jQuery: Sk.ffi.toPy(window.jQuery),
    };
}
