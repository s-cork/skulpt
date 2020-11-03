function $builtinmodule() {
    const mod = {};
    Sk.abstr.setUpModuleMethods("window", mod, {
        __getattr__: {
            $meth(pyName) {
                const jsName = pyName.toString();
                const ret = window[jsName];
                if (ret !== undefined) {
                    return Sk.ffi.toPy(ret);
                }
                throw new Sk.builtin.AttributeError("window has no attribute " + jsName);
            },
            $flags: { OneArg: true },
        },
        __dir__: {
            $meth() {
                return new Sk.builtin.list(Object.keys(window).map((x) => new Sk.builtin.str(x)));
            },
            $flags: { NoArgs: true },
        },
    });
    return mod;
}
