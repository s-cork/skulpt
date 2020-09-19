// export * from "./utils";
export * from "./utils/asserts/assert-dev";

export * from "../support/polyfills/JSBI";
require("../support/polyfills/fromcodepoint.js");

export * from "./types/type";

export * from "./generic";
export * from "./checks/typeChecks";
export * from "./checks/argChecks";

export * from "./abstract/buildNative";
export * from "./abstract/buildClass";
export * from "./abstract/keywordArray";
export * from "./abstract/objectMethods";
export * from "./abstract/numberMethods";
export * from "./abstract/objectRichCompare";
export function sequenceContains() {};
// export * from "./abstract";
export * from "./types/object";
export * from "./slotsdefs/dunderSlots";
export * from "./slotsdefs/slotHelpers";
export * from "./slotsdefs/dunderToSkulpt";
export * from "./slotsdefs/py2Slots";
export * from "./types/descr";



export * from "./types/function";
export * from "./types/builtin_func_or_method";

export * from "./print";
export * from "./builtinFuncs";

export * from "./types/errors";
export * from "./types/method";

export * from "./misceval/suspensions";
export * from "./misceval/async";
export * from "./misceval/callMethods";
export * from "./misceval/indexMethods";
export * from "./misceval/iterMethods";
export * from "./misceval/loadname";


export * from "./types/iters/enumerate";
export * from "./types/iters/filter";
export * from "./types/iters/reversed";
export * from "./types/iters/map";
export * from "./types/iters/zip";
export * from "./types/iters/callable_iter";
export * from "./types/iters/seq_iter";
export * from "./types/iters/iterator";

// export * from "./support/formatting";

export function format () {};
export function mkNumber__format__() {};
export function formatString() {};

export * from "./types/str";
export * from "./utils/constants";
export * from "./types/bytes";
export * from "./types/list";
export * from "./types/tuple";
export * from "./types/dict";
export * from "./types/mappingproxy";
export * from "./types/property_class_static";

// export * from "./builtin/print";

export * from "./types/int";
export * from "./types/bool";
export * from "./types/float";
export * from "./types/complex";

export * from "./types/set";

export * from "./types/slice";
export * from "./types/range";
export * from "./types/module";
export * from "./types/super";
export * from "./types/generator";
export * from "./types/file";
export * from "./types/structseq"; // should probably just live in time

export * from "./ffi";
export * from "./env";
export * from "./utils/timSort";

// export * from "./ast/tokens";
// export * from "./ast/tokenize";
// export * from "./ast/parser";
// export * from "./ast/symtable";

// export * from "./compile";
// export * from "./import";

export * from "./builtindict";

import {pyObject, pyNoneType, pyNotImplementedType} from "./types/object";
import {pyType} from "./types/type";
import {pyMethodDescr, pyGetSetDescr, pyWrapperDescr, pyClassMethodDescr, pyMethodWrapper} from "./types/descr";
import {setUpSlots, setUpMethods, setUpGetSets} from "./abstract/buildNative";
// initialize these classes now that they exist do OneTime initialization only takes care of builtinsdict these are in builtins
[pyMethodDescr, pyGetSetDescr, pyWrapperDescr, pyMethodWrapper, pyClassMethodDescr, pyObject, pyType, pyNoneType, pyNotImplementedType].forEach((cls) => {
    setUpSlots(cls);
    setUpMethods(cls);
    setUpGetSets(cls);
});



/* jshint ignore:start */

// This file list is only used for testing.
// It should be kept in sync with ../skulpt.py.
// Order is important!

// require("./utils/util.js");

// // Global support functions
// Sk.global["strftime"] = require("strftime");
// Sk.global["strptime"] = require("../support/time-helpers/strptime.js");
// require("../support/polyfills/JSBI.js");
// require("setimmediate");

// // Skulpt
// require("assert");
// require("./env.js");
// require("./types/type.js");
// require("./generic.js");
// require("./checks/typeChecks.js");
// require("./abstract.js");
// require("./types/object.js");
// require("./slotdefs.js");
// require("./types/descr.js");
// // can only setUpMethods / setUpGetsets / setUpSlots from now.
// require("./types/function.js");
// require("./types/builtin_func_or_method.js");
// // can only do setUpSlots with tp$new from now since __new__ is a sk_method
// require("./builtinFuncs.js");
// require("../support/polyfills/fromcodepoint.js");
// require("./types/errors.js");
// require("./types/method.js");
// require("./misceval/suspensions.js");
// require("./types/iters/callable_iter.js");
// require("./types/list.js");
// require("./formatting.js");
// require("./str.js");
// require("./types/bytes.js");
// require("./types/tuple.js");
// require("./dict.js");
// require("./types/mappingproxy.js");
// require("./types/property_class_static.js");
// require("./types/int.js");
// require("./types/bool.js");
// require("./types/float.js");
// require("./types/complex.js");
// require("./types/slice.js");
// require("./types/set.js");
// require("./print.js");
// require("./types/module.js");
// require("./types/structseq.js");
// require("./types/generator.js");
// require("./types/file.js");
// require("./ffi.js");
// require("./types/range.js");
// require("./types/iters/reversed.js");
// require("./token.js");
// require("./tokenize.js");
// require("../gen/parse_tables.js");
// require("./parser.js");
// require("../gen/astnodes.js");
// require("./ast.js");
// require("./symtable.js");
// require("./compile.js");
// require("./import.js");
// require("./utils/timsort.js");
// require("./types/super.js");
// require("./builtindict.js");
// require("./utils/constants.js");
// require("./internalpython.js");

// /* jshint ignore:end */
