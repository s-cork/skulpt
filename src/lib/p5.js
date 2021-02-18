function $builtinmodule() {
    const mod = {
        __name__: new Sk.builtin.str("p5"),
        p5: Sk.ffi.toPy(window.p5),
        __doc__: new Sk.builtin.str("A skulpt implementation of the p5 library"),
    };

    // override _start to a plain function and call this in run when we need it
    let _start;
    Object.defineProperty(window.p5.prototype, "_start", {
        get() {
            return () => {};
        }, 
        set(val) {
            _start = val;
        },
        configurable: true,
    });

    function sketch(p) {
        for (let i in window.p5.prototype) {
            const asStr = new Sk.builtin.str(i);
            const mangled = asStr.$mangled;
            // it would be crazy to override builtins like print
            if (!(mangled in Sk.builtins)) {
                mod[mangled] = p.tp$getattr(asStr);
            }
        }
    };

    // create an instance of p5 and assign all the attributes to mod
    const p = Sk.misceval.callsimArray(mod.p5, [new Sk.builtin.func(sketch), Sk.ffi.toPy(Sk.canvas)]);

    const wrapFunc = (func) => () => {
        try {
            Sk.misceval.callsimArray(func);
        } catch (e) {
            Sk.uncaughtException && Sk.uncaughtException(e);
        }
        // note we can't suspend because promises are just ignored in these methods
    };

    mod.run = new Sk.builtin.func(function run() {
        const main = Sk.sysmodules.quick$lookup(new Sk.builtin.str("__main__")).$d;
        delete window.p5.prototype._start;
        const pInstance = p.valueOf();
        pInstance._start = _start;

        ["preload", "setup", "draw"].forEach((methodName) => {
            const method = main[methodName];
            if (method !== undefined) {
                pInstance[methodName] = wrapFunc(method);
            }
        });

        // p5 wants to change the global namespace of things like frameCount, key. So let it
        const _setProperty = pInstance._setProperty;
        pInstance._setProperty = function (prop, val) {
            _setProperty.call(this, prop, val);
            const asStr = new Sk.builtin.str(prop);
            const mangled = asStr.$mangled;
            mod[mangled] = main[mangled] = p.tp$getattr(asStr);
        };

        pInstance._start();
        return Sk.builtin.none.none$;
    });

    return mod;
}
