/* jshint ignore:start */


// This file list is only used for testing.
// It should be kept in sync with ../skulpt.py.
// Order is important!

import Sk from "./util.js";

// Global support functions
Sk.global["strftime"] = require("strftime");
Sk.global["strptime"] = require("../support/time-helpers/strptime.js");
require("setimmediate");

// Skulpt
import "assert";
import "./env.js";
import "./type.js";
import "./abstract.js";
import "./object.js";
import "./function.js";
import "./builtin.js";
require("./fromcodepoint.js");
import "./errors.js";
import "./method.js";
import "./misceval.js";
import "./seqtype.js";
import "./list.js";
import "./str.js";
import "./formatting.js";
import "./tuple.js";
import "./dict.js";
import "./numtype.js";
import "./biginteger.js";
import "./int.js";
import "./bool.js";
import "./float.js";
import "./number.js";
import "./long.js";
import "./complex.js";
import "./slice.js";
import "./set.js";
import "./frozenset.js";
import "./print.js";
import "./module.js";
import "./structseq.js";
import "./generator.js";
import "./file.js";
import "./ffi.js";
import "./iterator.js";
import "./range.js";
import "./enumerate.js";
import "./filter.js";
import "./zip.js";
import "./map.js";
import "./token.js";
import "./tokenize.js";
import "../gen/parse_tables.js";
import "./parser.js";
import "../gen/astnodes.js";
import "./ast.js";
import "./symtable.js";
import "./compile.js";
import "./import.js";
import "./timsort.js";
import "./sorted.js";
import "./typeobject.js";
import "./builtindict.js";
import "./constants.js";
// require("./internalpython.js");

/* jshint ignore:end */

export {Sk};