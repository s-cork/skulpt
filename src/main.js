/* jshint ignore:start */

// This file list is only used for testing.
// It should be kept in sync with ../skulpt.py.
// Order is important!

require("./util.js");

// Global support functions
Sk.global["strftime"] = require("strftime");
Sk.global["strptime"] = require("../support/time-helpers/strptime.js");
require("../support/JSBI.js");
require("setimmediate");

// Skulpt
require("assert");
require("./env.js");
require("./type.js");
require("./generic.js");
require("./check.js");
require("./abstract.js");
require("./types/object.js");
require("./slotdefs.js");
require("./types/descr.js");
// can only setUpMethods / setUpGetsets / setUpSlots from now.
require("./types/function.js");
require("./types/builtin_func_or_method.js");
// can only do setUpSlots with tp$new from now since __new__ is a sk_method
require("./builtin.js");
require("./fromcodepoint.js");
require("./types/errors.js");
require("./types/method.js");
require("./misceval.js");
require("./simple_iterators.js");
require("./list.js");
require("./formatting.js");
require("./str.js");
require("./bytes.js");
require("./tuple.js");
require("./dict.js");
require("./types/mappingproxy.js");
require("./types/property_class_static.js");
require("./int.js");
require("./types/bool.js");
require("./float.js");
require("./complex.js");
require("./types/slice.js");
require("./set.js");
require("./print.js");
require("./types/module.js");
require("./structseq.js");
require("./generator.js");
require("./file.js");
require("./ffi.js");
require("./types/range.js");
require("./iteratorobjects.js");
require("./token.js");
require("./tokenize.js");
require("../gen/parse_tables.js");
require("./parser.js");
require("../gen/astnodes.js");
require("./ast.js");
require("./symtable.js");
require("./compile.js");
require("./import.js");
require("./timsort.js");
require("./super.js");
require("./builtindict.js");
require("./constants.js");
require("./internalpython.js");

/* jshint ignore:end */
