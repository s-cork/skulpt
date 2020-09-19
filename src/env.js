import { pyDict, pyStr } from "./internal";

function chooseOptionBool(x, y) {
    return typeof x === "boolean" ? x : y;
}
function chooseOptionFunction(x, y) {
    return typeof x === "function" ? x : y;
}
function chooseOptionArray(x, y) {
    return Array.isArray(x) ? x : y;
}
function chooseOptionString(x, y) {
    return typeof x === "string" ? x : y;
}

export function configure(options) {
    Object.keys(options).forEach(([key, val]) => {
        options[key.toLowerCase().replace("sys", "")] = val;
    });
    sysDebugging = chooseOptionBool(options.debugging, sysDebugging);
    sysNonReadOpen = chooseOptionBool(options.nonreadopen, sysNonReadOpen);
    sysKillableFor = chooseOptionBool(options.killablefor, sysKillableFor);
    sysKillableWhile = chooseOptionBool(options.killablewhile, sysKillableWhile);
    sysInputTakesPrompt = chooseOptionBool(options.inputtakesprompt, sysInputTakesPrompt);
    sysRetainGlobals = chooseOptionBool(options.retainglobals, sysRetainGlobals);
    sysInputPrompt = chooseOptionFunction(options.inputfun, sysInputPrompt);
    sysUncaughtException = chooseOptionFunction(options.uncaughtexception, sysUncaughtException);
    sysStdOut = chooseOptionFunction(options.output, sysStdOut);
    sysFileOpen = chooseOptionFunction(options.fileopen, sysFileOpen);
    sysFileWrite = chooseOptionFunction(options.filewrite, sysFileWrite);
    sysInputPrompt = chooseOptionFunction(options.inputfun, sysInputPrompt);
    sysRead = chooseOptionFunction(options.read, sysRead);
    sysArgv = chooseOptionArray(options.argv, sysArgv);
    sysPath = chooseOptionArray(options.path, sysPath);
    sysCanvas = chooseOptionString(option.canvas, sysCanvas);
    sysTurtle = chooseOptionString(option.turtle, sysTurtle);
}

export const sysModules = new pyDict();
export const sysCopyright = new pyStr("Copyright 2009-2010 Scott Graham.\nAll Rights Reserved.\n");
export const sysInBrowser = window.document !== undefined && window.navigator !== undefined;
export const sysPlatform = sysInBrowser ? "[" + navigator.userAgent + "] on " + navigator.platform : null;
export const sysBuildInfo = { githash: GITHASH, date: BUILDDATE };

export let sysDebugging = false;
export let sysKillableFor = false;
export let sysInputTakesPrompt = false;
export let sysRetainGlobals = false;
export let sysPython3 = true;
export let sysYieldLimit = Infinity;
export let sysExecLimit = Infinity;
export let sysNonReadOpen = false;
export let sysExternalLibraries = {};
export let sysBuiltinFiles = {};
export let sysPath = [];
export let sysArgv = [];
export let sysCanvas = "canvas";
export let sysTurtle = "turtle";
export const sysGlobals = {};

export function sysTimeOutMsg() {
    return "Program exceeded run time limit.";
}
export function sysDebugOut() {}
export function sysFileOpen() {}
export function sysFileWrite() {}
export function sysStdOut() {}
export function sysInputPrompt(args) {
    return window.prompt(args);
}
export function sysUncaughtException(e) {
    throw e;
}
export function sysSetTimeout(func, delay) {
    setTimeout(func, delay);
}
export function sysOnBeforeImport() {}
export function sysOnAfterImport() {}
export function sysRead(x) {
    if (sysBuiltinFiles === undefined) {
        throw "skulpt-stdlib.js has not been loaded";
    } else if (sysBuiltinFiles.files[x] === undefined) {
        throw "File not found: '" + x + "'";
    }
    return sysBuiltinFiles.files[x];
}

// export const sys = {
//     modules: sysModules,
//     globals: sysGlobals,
//     path: sysPath,
//     argv: sysArgv,
//     builtinFiles: sysBuiltinFiles,
//     flags: {retainGlobals: sysRetainGlobals, }
// };


class Sys {
    get path () {
        return sysPath;
    }
    get modules () {
        return sysModules;
    }
    get globals () {
        return sysGlobals;
    }
    get argv () {
        return sysArgv;
    }
}

export const sys = new Sys;

// /**
//  * Base namespace for Skulpt. This is the only symbol that Skulpt adds to the
//  * global namespace. Other user accessible symbols are noted and described
//  * below.
//  */

// /**
//  *
//  * Set various customizable parts of Skulpt.
//  *
//  * output: Replacable output redirection (called from print, etc.).
//  * read: Replacable function to load modules with (called via import, etc.)
//  * sysargv: Setable to emulate arguments to the script. Should be an array of JS
//  * strings.
//  * syspath: Setable to emulate PYTHONPATH environment variable (for finding
//  * modules). Should be an array of JS strings.
//  * nonreadopen: Boolean - set to true to allow non-read file operations
//  * fileopen: Optional function to call any time a file is opened
//  * filewrite: Optional function to call when writing to a file
//  *
//  * Any variables that aren't set will be left alone.
//  */

// function bool_check(variable, name) {
//     if (typeof variable !== "boolean") {
//         throw new Error("must specify " + name + " and it must be a boolean");
//     }
// }

// Sk.configure = function (options) {
//     "use strict";
//     Sk.output = options["output"] || Sk.output;
//     Sk.asserts.assert(typeof Sk.output === "function");

//     Sk.debugout = options["debugout"] || Sk.debugout;
//     Sk.asserts.assert(typeof Sk.debugout === "function");

//     Sk.uncaughtException = options["uncaughtException"] || Sk.uncaughtException;
//     Sk.asserts.assert(typeof Sk.uncaughtException === "function");

//     Sk.read = options["read"] || Sk.read;
//     Sk.asserts.assert(typeof Sk.read === "function");

//     Sk.nonreadopen = options["nonreadopen"] || false;
//     Sk.asserts.assert(typeof Sk.nonreadopen === "boolean");

//     Sk.fileopen = options["fileopen"] || undefined;
//     Sk.asserts.assert(typeof Sk.fileopen === "function" || typeof Sk.fileopen === "undefined");

//     Sk.filewrite = options["filewrite"] || undefined;
//     Sk.asserts.assert(typeof Sk.filewrite === "function" || typeof Sk.filewrite === "undefined");

//     Sk.timeoutMsg = options["timeoutMsg"] || Sk.timeoutMsg;
//     Sk.asserts.assert(typeof Sk.timeoutMsg === "function");
//     Sk.exportSymbol("Sk.timeoutMsg", Sk.timeoutMsg);

//     Sk.sysargv = options["sysargv"] || Sk.sysargv;
//     Sk.asserts.assert(Sk.isArrayLike(Sk.sysargv));

//     Sk.__future__ = options["__future__"] || Sk.python3;

//     bool_check(Sk.__future__.print_function, "Sk.__future__.print_function");
//     bool_check(Sk.__future__.division, "Sk.__future__.division");
//     bool_check(Sk.__future__.unicode_literals, "Sk.__future__.unicode_literals");
//     bool_check(Sk.__future__.class_repr, "Sk.__future__.class_repr");
//     bool_check(Sk.__future__.inherit_from_object, "Sk.__future__.inherit_from_object");
//     bool_check(Sk.__future__.super_args, "Sk.__future__.super_args");
//     bool_check(Sk.__future__.octal_number_literal, "Sk.__future__.octal_number_literal");
//     bool_check(Sk.__future__.bankers_rounding, "Sk.__future__.bankers_rounding");
//     bool_check(Sk.__future__.python_version, "Sk.__future__.python_version");
//     bool_check(Sk.__future__.dunder_round, "Sk.__future__.dunder_round");
//     bool_check(Sk.__future__.exceptions, "Sk.__future__.exceptions");
//     bool_check(Sk.__future__.no_long_type, "Sk.__future__.no_long_type");
//     bool_check(Sk.__future__.ceil_floor_int, "Sk.__future__.ceil_floor_int");
//     bool_check(Sk.__future__.silent_octal_literal, "Sk.__future__.silent_octal_literal");

//     // in __future__ add checks for absolute_import

//     Sk.imageProxy = options["imageProxy"] || "http://localhost:8080/320x";
//     Sk.asserts.assert(typeof Sk.imageProxy === "string" || typeof Sk.imageProxy === "function");

//     Sk.inputfun = options["inputfun"] || Sk.inputfun;
//     Sk.asserts.assert(typeof Sk.inputfun === "function");

//     Sk.inputfunTakesPrompt = options["inputfunTakesPrompt"] || false;
//     Sk.asserts.assert(typeof Sk.inputfunTakesPrompt === "boolean");

//     Sk.retainGlobals = options["retainglobals"] || false;
//     Sk.asserts.assert(typeof Sk.retainGlobals === "boolean");

//     Sk.debugging = options["debugging"] || false;
//     Sk.asserts.assert(typeof Sk.debugging === "boolean");

//     Sk.killableWhile = options["killableWhile"] || false;
//     Sk.asserts.assert(typeof Sk.killableWhile === "boolean");

//     Sk.killableFor = options["killableFor"] || false;
//     Sk.asserts.assert(typeof Sk.killableFor === "boolean");

//     Sk.signals = typeof options["signals"] !== undefined ? options["signals"] : null;
//     if (Sk.signals === true) {
//         Sk.signals = {
//             listeners: [],
//             addEventListener: function (handler) {
//                 Sk.signals.listeners.push(handler);
//             },
//             removeEventListener: function (handler) {
//                 var index = Sk.signals.listeners.indexOf(handler);
//                 if (index >= 0) {
//                     Sk.signals.listeners.splice(index, 1); // Remove items
//                 }
//             },
//             signal: function (signal, data) {
//                 for (var i = 0; i < Sk.signals.listeners.length; i++) {
//                     Sk.signals.listeners[i].call(null, signal, data);
//                 }
//             },
//         };
//     } else {
//         Sk.signals = null;
//     }
//     Sk.asserts.assert(typeof Sk.signals === "object");

//     Sk.breakpoints =
//         options["breakpoints"] ||
//         function () {
//             return true;
//         };
//     Sk.asserts.assert(typeof Sk.breakpoints === "function");

//     Sk.setTimeout = options["setTimeout"];
//     if (Sk.setTimeout === undefined) {
//         if (typeof setTimeout === "function") {
//             Sk.setTimeout = function (func, delay) {
//                 setTimeout(func, delay);
//             };
//         } else {
//             Sk.setTimeout = function (func, delay) {
//                 func();
//             };
//         }
//     }
//     Sk.asserts.assert(typeof Sk.setTimeout === "function");

//     if ("execLimit" in options) {
//         Sk.execLimit = options["execLimit"];
//     }

//     if ("yieldLimit" in options) {
//         Sk.yieldLimit = options["yieldLimit"];
//     }

//     if (options["syspath"]) {
//         Sk.syspath = options["syspath"];
//         Sk.asserts.assert(Sk.isArrayLike(Sk.syspath));
//         // assume that if we're changing syspath we want to force reimports.
//         // not sure how valid this is, perhaps a separate api for that.
//         Sk.realsyspath = undefined;
//         Sk.sysmodules = new Sk.builtin.dict([]);
//     }

//     Sk.misceval.softspace_ = false;

//     Sk.switch_version(Sk.__future__.python3);

//     Sk.builtin.str.$next = Sk.__future__.python3 ? new Sk.builtin.str("__next__") : new Sk.builtin.str("next");

//     Sk.setupOperators(Sk.__future__.python3);
//     Sk.setupDunderMethods(Sk.__future__.python3);
//     Sk.setupObjects(Sk.__future__.python3);
// };

// Sk.exportSymbol("Sk.configure", Sk.configure);

// /*
//  * Replaceable handler for uncaught exceptions
//  */
// Sk.uncaughtException = function (err) {
//     throw err;
// };

// /*
//  * Replaceable handler for uncaught exceptions
//  */
// Sk.uncaughtException = function (err) {
//     throw err;
// };
// Sk.exportSymbol("Sk.uncaughtException", Sk.uncaughtException);

// /*
//  *      Replaceable message for message timeouts
//  */
// Sk.timeoutMsg = function () {
//     return "Program exceeded run time limit.";
// };
// Sk.exportSymbol("Sk.timeoutMsg", Sk.timeoutMsg);

// /*
//  *  Hard execution timeout, throws an error. Set to null to disable
//  */
// Sk.execLimit = Number.POSITIVE_INFINITY;

// /*
//  *  Soft execution timeout, returns a Suspension. Set to null to disable
//  */
// Sk.yieldLimit = Number.POSITIVE_INFINITY;

// /*
//  * Replacable output redirection (called from print, etc).
//  */
// Sk.output = function (x) {};

// /*
//  * Replacable function to load modules with (called via import, etc.)
//  * todo; this should be an async api
//  */
// Sk.read = function (x) {
//     throw "Sk.read has not been implemented";
// };

// /*
//  * Setable to emulate arguments to the script. Should be array of JS strings.
//  */
// Sk.sysargv = [];

// // lame function for sys module
// Sk.getSysArgv = function () {
//     return Sk.sysargv;
// };
// Sk.exportSymbol("Sk.getSysArgv", Sk.getSysArgv);

// /**
//  * Setable to emulate PYTHONPATH environment variable (for finding modules).
//  * Should be an array of JS strings.
//  */
// Sk.syspath = [];

// Sk.inBrowser = Sk.global["document"] !== undefined;

// /**
//  * Internal function used for debug output.
//  * @param {...} args
//  */
// Sk.debugout = function (args) {};

// (function () {
//     // set up some sane defaults based on availability
//     if (Sk.global["write"] !== undefined) {
//         Sk.output = Sk.global["write"];
//     } else if (Sk.global["console"] !== undefined && Sk.global["console"]["log"] !== undefined) {
//         Sk.output = function (x) {
//             Sk.global["console"]["log"](x);
//         };
//     } else if (Sk.global["print"] !== undefined) {
//         Sk.output = Sk.global["print"];
//     }
//     if (Sk.global["console"] !== undefined && Sk.global["console"]["log"] !== undefined) {
//         Sk.debugout = function (x) {
//             Sk.global["console"]["log"](x);
//         };
//     } else if (Sk.global["print"] !== undefined) {
//         Sk.debugout = Sk.global["print"];
//     }
// })();

// Sk.inputfun = function (args) {
//     return window.prompt(args);
// };

// /**
//  * currently can't seem to remove these functions without a serious slow down of 2x
//  */
// Sk.setup_method_mappings = function () {};
// Sk.setupDictIterators = function (python3) {};

// Sk.switch_version = function (py3) {
//     const methods_to_map = {
//         float_: {
//             method_names: ["__round__"],
//             2: [false],
//             3: [true],
//         },
//         int_: {
//             method_names: ["__round__"],
//             2: [false],
//             3: [true],
//         },
//         list: {
//             method_names: ["clear", "copy", "sort"],
//             2: [false, false, true],
//             3: [true, true, true],
//         },
//         dict: {
//             method_names: ["has_key", "keys", "items", "values"],
//             2: [true, true, true, true],
//             3: [false, true, true, true],
//         },
//     };

//     for (let klass_name in methods_to_map) {
//         const klass = Sk.builtin[klass_name];
//         const method_names = methods_to_map[klass_name].method_names;
//         const in_py3 = methods_to_map[klass_name][3];

//         // if we're not changing to py2 and we have no py3$methods then don't continue since these methods exist by default
//         if (py3 && klass.py3$methods === undefined) {
//             return;
//         } else if (klass.py3$methods === undefined) {
//             // Set up py3$methods if we haven't done so already
//             klass.py3$methods = {};
//             for (let i = 0; i < method_names.length; i++) {
//                 const method_name = method_names[i];
//                 if (!in_py3[i]) {
//                     continue;
//                 }
//                 klass.py3$methods[method_name] = klass.prototype[method_name].d$def;
//             }
//         }
//         let in_version, new_methods;
//         if (py3) {
//             in_version = in_py3;
//             new_methods = klass.py3$methods;
//         } else {
//             in_version = methods_to_map[klass_name][2];
//             new_methods = klass.py2$methods;
//         }
//         for (let i = 0; i < method_names.length; i++) {
//             const method_name = method_names[i];
//             delete klass.prototype[method_name];
//             if (in_version[i]) {
//                 klass.prototype[method_name] = new Sk.builtin.method_descriptor(klass, new_methods[method_name]);
//             }
//         }
//     }
// };

// Sk.exportSymbol("Sk.__future__", Sk.__future__);
// Sk.exportSymbol("Sk.inputfun", Sk.inputfun);

// function setupDictIterators(python3) {
//     if (python3) {
//         Sk.builtin.dict.prototype["keys"] = new Sk.builtin.func(Sk.builtin.dict.prototype.py3$keys);
//         Sk.builtin.dict.prototype["values"] = new Sk.builtin.func(Sk.builtin.dict.prototype.py3$values);
//         Sk.builtin.dict.prototype["items"] = new Sk.builtin.func(Sk.builtin.dict.prototype.py3$items);
//     } else {
//         Sk.builtin.dict.prototype["keys"] = new Sk.builtin.func(Sk.builtin.dict.prototype.py2$keys);
//         Sk.builtin.dict.prototype["values"] = new Sk.builtin.func(Sk.builtin.dict.prototype.py2$values);
//         Sk.builtin.dict.prototype["items"] = new Sk.builtin.func(Sk.builtin.dict.prototype.py2$items);
//     }
// }
