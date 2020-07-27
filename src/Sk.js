var Sk = {};

Sk.build = {
    githash: GITHASH,
    date: BUILDDATE,
};
/**
 * Global object no matter where we're running
 */
Sk.global = global;
global.Sk = Sk;

Sk.builtin = {};
Sk.abstr = {};
Sk.misceval = {};
Sk.ffi = {};

Sk.exportSymbol = () => {};
Sk.js_beautify = (x) => x;