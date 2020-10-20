function $builtinmodule() {
    const mod = {
        __name__: new Sk.builtin.str("p5"),
        p5: Sk.ffi.toPy(window.p5),
        __doc__: new Sk.builtin.str("A skulpt implementation of the p5 library"),
    };
    return mod;
}
