import {
    pyType,
    pyObject,
    pyNone,
    pyFalse,
    pyTrue,
    pyNotImplemented,
    pyStr,
    pyExc,
    pyTuple,
    pyList,
    pySet,
    pyFrozenSet,
    pyBytes,
    pyInt,
    pyFloat,
    pySlice,
    pyComplex,
    pyDict,
    pyBool,
    pyLong,
    pyFunc,
    pyGenerator,
    pyMethod,
    pyClassMethod,
    pyStaticMethod,
    pySuper,
    pyProperty,
    pyFile,
    pyMap,
    pyZip,
    pyFilter,
    pyReversed,
    pyEnumerate,
    pyRange,
    pyBuiltinFuncOrMethod,
    builtinFuncs,
    setUpModuleMethods,
} from "./internal";
// Note: the hacky names on int, long, float have to correspond with the
// uniquization that the compiler does for words that are reserved in
// Javascript. This is a bit hokey.

export const builtins = {
    "round"     : null,
    "len"       : null,
    "min"       : null,
    "max"       : null,
    "sum"       : null,
    "abs"       : null,
    "fabs"      : null,
    "ord"       : null,
    "chr"       : null,
    "hex"       : null,
    "oct"       : null,
    "bin"       : null,
    "dir"       : null,
    "repr"      : null,
    "open"      : null,
    "isinstance": null,
    "hash"      : null,
    "getattr"   : null,
    "hasattr"   : null,
    "id"        : null,
    
    "reduce"    : new pyFunc(builtinFuncs.reduce),
    "sorted"    : null,
    "any"       : null,
    "all"       : null,
    
    // iterator objects if py2 mode we replace these with sk_methods
    "enumerate" : pyEnumerate,
    "filter"    : pyFilter,
    "map"       : pyMap,
    "range"     : pyRange,
    "reversed"  : pyReversed,
    "zip"       : pyZip,

    "BaseException"      : pyExc.BaseException, 
    "AttributeError"     : pyExc.AttributeError,
    "ValueError"         : pyExc.ValueError,
    "Exception"          : pyExc.Exception,
    "ZeroDivisionError"  : pyExc.ZeroDivisionError,
    "AssertionError"     : pyExc.AssertionError,
    "ImportError"        : pyExc.ImportError,
    "IndentationError"   : pyExc.IndentationError,
    "IndexError"         : pyExc.IndexError,
    "LookupError"        : pyExc.LookupError,
    "KeyError"           : pyExc.KeyError,
    "TypeError"          : pyExc.TypeError,
    "UnicodeDecodeError" : pyExc.UnicodeDecodeError,
    "UnicodeEncodeError" : pyExc.UnicodeEncodeError,
    "NameError"          : pyExc.NameError,
    "IOError"            : pyExc.IOError,
    "NotImplementedError": pyExc.NotImplementedError,
    "SystemExit"         : pyExc.SystemExit,
    "OverflowError"      : pyExc.OverflowError,
    "OperationError"     : pyExc.OperationError,
    "NegativePowerError" : pyExc.NegativePowerError,
    "RuntimeError"       : pyExc.RuntimeError,
    "RecursionError"     : pyExc.RecursionError,
    "StopIteration"      : pyExc.StopIteration,
    "SyntaxError"        : pyExc.SyntaxError,
    "SystemError"        : pyExc.SystemError,

    "float_$rw$": pyFloat,
    "int_$rw$"  : pyInt,
    "bool"      : pyBool,
    "complex"   : pyComplex,
    "dict"      : pyDict,
    "file"      : pyFile,
    "frozenset" : pyFrozenSet,
    "function"  : pyFunc,
    "generator" : pyGenerator,
    "list"      : pyList,
    "long_$rw$" : pyLong,
    "method"    : pyMethod,
    "object"    : pyObject,
    "slice"     : pySlice,
    "str"       : pyStr,
    "set"       : pySet,
    "tuple"     : pyTuple,
    "type"      : pyType,

    "input"     : null,
    "raw_input" : new pyFunc(builtinFuncs.raw_input),
    "setattr"   : null,
    /*'read': builtinFuncs.read,*/
    "jseval"    : builtinFuncs.jseval,
    "jsmillis"  : builtinFuncs.jsmillis,
    "quit"      : new pyFunc(builtinFuncs.quit),
    "exit"      : new pyFunc(builtinFuncs.quit),
    "print"     : null,
    "divmod"    : null,
    "format"    : null,
    "globals"   : null,
    "issubclass": null,
    "iter"      : null,

    // Functions below are not implemented
    // "bytearray" : builtinFuncs.bytearray,
    // "callable"  : builtinFuncs.callable,
    // "delattr"   : builtinFuncs.delattr,
    // "eval_$rw$" : builtinFuncs.eval_,
    "execfile"  : builtinFuncs.execfile,
    
    "help"      : builtinFuncs.help,
    // "locals"    : builtinFuncs.locals,
    "memoryview": builtinFuncs.memoryview,
    // "next"      : builtinFuncs.next_,
    // "pow"       : builtinFuncs.pow,
    "reload"    : builtinFuncs.reload,
    "super_$rw$"     : pySuper,
    "unichr"    : builtinFuncs.unichr,
    "vars"      : builtinFuncs.vars,
    "apply_$rw$": builtinFuncs.apply_,
    "buffer"    : builtinFuncs.buffer,
    "coerce"    : builtinFuncs.coerce,
    "intern"    : builtinFuncs.intern,


    "property"     : pyProperty,
    "classmethod"  : pyClassMethod,
    "staticmethod" : pyStaticMethod,
};


setUpModuleMethods("builtins", builtins, {
    // __build_class__: {
    //     $meth: builtinFuncs.__build_class__,
    //     $flags: {},
    //     $textsig: null,
    //     $doc: "__build_class__(func, name, *bases, metaclass=None, **kwds) -> class\n\nInternal helper function used by the class statement."
    // },

    // __import__: {
    //     $meth: builtinFuncs.__import__,
    //     $flags: { NamedArgs: ["name", "globals", "locals", "fromlist", "level"] },
    //     $textsig: null,
    //     $doc:
    //         "__import__(name, globals=None, locals=None, fromlist=(), level=0) -> module\n\nImport a module. Because this function is meant for use by the Python\ninterpreter and not for general use, it is better to use\nimportlib.import_module() to programmatically import a module.\n\nThe globals argument is only used to determine the context;\nthey are not modified.  The locals argument is unused.  The fromlist\nshould be a list of names to emulate ``from name import ...'', or an\nempty list to emulate ``import name''.\nWhen importing a module from a package, note that __import__('A.B', ...)\nreturns package A when fromlist is empty, but its submodule B when\nfromlist is not empty.  The level argument is used to determine whether to\nperform absolute or relative imports: 0 is absolute, while a positive number\nis the number of parent directories to search relative to the current module.",
    // },

    abs: {
        $meth: builtinFuncs.abs,
        $flags: { OneArg: true },
        $textsig: "($module, x, /)",
        $doc: "Return the absolute value of the argument.",
    },

    all: {
        $meth: builtinFuncs.all,
        $flags: { OneArg: true },
        $textsig: "($module, iterable, /)",
        $doc: "Return True if bool(x) is True for all values x in the iterable.\n\nIf the iterable is empty, return True.",
    },

    any: {
        $meth: builtinFuncs.any,
        $flags: { OneArg: true },
        $textsig: "($module, iterable, /)",
        $doc: "Return True if bool(x) is True for any x in the iterable.\n\nIf the iterable is empty, return False.",
    },

    ascii: {
        $meth: builtinFuncs.ascii,
        $flags: {OneArg: true},
        $textsig: "($module, obj, /)",
        $doc: "Return an ASCII-only representation of an object.\n\nAs repr(), return a string containing a printable representation of an\nobject, but escape the non-ASCII characters in the string returned by\nrepr() using \\\\x, \\\\u or \\\\U escapes. This generates a string similar\nto that returned by repr() in Python 2."
    },

    bin: {
        $meth: builtinFuncs.bin,
        $flags: { OneArg: true },
        $textsig: "($module, number, /)",
        $doc: "Return the binary representation of an integer.\n\n   >>> bin(2796202)\n   '0b1010101010101010101010'",
    },

    // breakpoint: {
    //     $meth: builtinFuncs.breakpoint,
    //     $flags: {},
    //     $textsig: null,
    //     $doc: "breakpoint(*args, **kws)\n\nCall sys.breakpointhook(*args, **kws).  sys.breakpointhook() must accept\nwhatever arguments are passed.\n\nBy default, this drops you into the pdb debugger."
    // },

    callable: {
        $meth: builtinFuncs.callable,
        $flags: { OneArg: true },
        $textsig: "($module, obj, /)",
        $doc:
            "Return whether the object is callable (i.e., some kind of function).\n\nNote that classes are callable, as are instances of classes with a\n__call__() method.",
    },

    chr: {
        $meth: builtinFuncs.chr,
        $flags: { OneArg: true },
        $textsig: "($module, i, /)",
        $doc: "Return a Unicode string of one character with ordinal i; 0 <= i <= 0x10ffff.",
    },

    // compile: {
    //     $meth: builtinFuncs.compile,
    //     $flags: {},
    //     $textsig: "($module, /, source, filename, mode, flags=0,\n        dont_inherit=False, optimize=-1)",
    //     $doc: "Compile source into a code object that can be executed by exec() or eval().\n\nThe source code may represent a Python module, statement or expression.\nThe filename will be used for run-time error messages.\nThe mode must be 'exec' to compile a module, 'single' to compile a\nsingle (interactive) statement, or 'eval' to compile an expression.\nThe flags argument, if present, controls which future statements influence\nthe compilation of the code.\nThe dont_inherit argument, if true, stops the compilation inheriting\nthe effects of any future statements in effect in the code calling\ncompile; if absent or false these statements do influence the compilation,\nin addition to any features explicitly specified."
    // },

    delattr: {
        $meth: builtinFuncs.delattr,
        $flags: { MinArgs: 2, MaxArgs: 2 },
        $textsig: "($module, obj, name, /)",
        $doc: "Deletes the named attribute from the given object.\n\ndelattr(x, 'y') is equivalent to ``del x.y''",
    },

    dir: {
        $meth: builtinFuncs.dir,
        $flags: { MinArgs: 0, MaxArgs: 1 },
        $textsig: null,
        $doc:
            "dir([object]) -> list of strings\n\nIf called without an argument, return the names in the current scope.\nElse, return an alphabetized list of names comprising (some of) the attributes\nof the given object, and of attributes reachable from it.\nIf the object supplies a method named __dir__, it will be used; otherwise\nthe default dir() logic is used and returns:\n  for a module object: the module's attributes.\n  for a class object:  its attributes, and recursively the attributes\n    of its bases.\n  for any other object: its attributes, its class's attributes, and\n    recursively the attributes of its class's base classes.",
    },

    divmod: {
        $meth: builtinFuncs.divmod,
        $flags: { MinArgs: 2, MaxArgs: 2 },
        $textsig: "($module, x, y, /)",
        $doc: "Return the tuple (x//y, x%y).  Invariant: div*y + mod == x.",
    },

    eval_$rw$: {
        $name: "eval",
        $meth: builtinFuncs.eval_,
        $flags: { MinArgs: 1, MaxArgs: 3 },
        $textsig: "($module, source, globals=None, locals=None, /)",
        $doc:
            "Evaluate the given source in the context of globals and locals.\n\nThe source may be a string representing a Python expression\nor a code object as returned by compile().\nThe globals must be a dictionary and locals can be any mapping,\ndefaulting to the current globals and locals.\nIf only globals is given, locals defaults to it.",
    },

    // exec: {
    //     $meth: builtinFuncs.exec,
    //     $flags: {MinArgs:2, MaxArgs: 3},
    //     $textsig: "($module, source, globals=None, locals=None, /)",
    //     $doc: "Execute the given source in the context of globals and locals.\n\nThe source may be a string representing one or more Python statements\nor a code object as returned by compile().\nThe globals must be a dictionary and locals can be any mapping,\ndefaulting to the current globals and locals.\nIf only globals is given, locals defaults to it."
    // },

    format: {
        $meth: builtinFuncs.format,
        $flags: { MinArgs: 1, MaxArgs: 2 },
        $textsig: "($module, value, format_spec='', /)",
        $doc:
            "Return value.__format__(format_spec)\n\nformat_spec defaults to the empty string.\nSee the Format Specification Mini-Language section of help('FORMATTING') for\ndetails.",
    },

    getattr: {
        $meth: builtinFuncs.getattr,
        $flags: { MinArgs: 2, MaxArgs: 3 },
        $textsig: null,
        $doc:
            "getattr(object, name[, default]) -> value\n\nGet a named attribute from an object; getattr(x, 'y') is equivalent to x.y.\nWhen a default argument is given, it is returned when the attribute doesn't\nexist; without it, an exception is raised in that case.",
    },

    globals: {
        $meth: builtinFuncs.globals,
        $flags: { NoArgs: true },
        $textsig: "($module, /)",
        $doc:
            "Return the dictionary containing the current scope's global variables.\n\nNOTE: Updates to this dictionary *will* affect name lookups in the current\nglobal scope and vice-versa.",
    },

    hasattr: {
        $meth: builtinFuncs.hasattr,
        $flags: { MinArgs: 2, MaxArgs: 2 },
        $textsig: "($module, obj, name, /)",
        $doc:
            "Return whether the object has an attribute with the given name.\n\nThis is done by calling getattr(obj, name) and catching AttributeError.",
    },

    hash: {
        $meth: builtinFuncs.hash,
        $flags: { OneArg: true },
        $textsig: "($module, obj, /)",
        $doc:
            "Return the hash value for the given object.\n\nTwo objects that compare equal must also have the same hash value, but the\nreverse is not necessarily true.",
    },

    hex: {
        $meth: builtinFuncs.hex,
        $flags: { OneArg: true },
        $textsig: "($module, number, /)",
        $doc: "Return the hexadecimal representation of an integer.\n\n   >>> hex(12648430)\n   '0xc0ffee'",
    },

    id: {
        $meth: builtinFuncs.id,
        $flags: { OneArg: true },
        $textsig: "($module, obj, /)",
        $doc:
            "Return the identity of an object.\n\nThis is guaranteed to be unique among simultaneously existing objects.\n(CPython uses the object's memory address.)",
    },

    input: {
        $meth: builtinFuncs.input,
        $flags: { MinArgs: 0, MaxArgs: 1 },
        $textsig: "($module, prompt=None, /)",
        $doc:
            "Read a string from standard input.  The trailing newline is stripped.\n\nThe prompt string, if given, is printed to standard output without a\ntrailing newline before reading input.\n\nIf the user hits EOF (*nix: Ctrl-D, Windows: Ctrl-Z+Return), raise EOFError.\nOn *nix systems, readline is used if available.",
    },

    isinstance: {
        $meth: builtinFuncs.isinstance,
        $flags: { MinArgs: 2, MaxArgs: 2 },
        $textsig: "($module, obj, class_or_tuple, /)",
        $doc:
            "Return whether an object is an instance of a class or of a subclass thereof.\n\nA tuple, as in ``isinstance(x, (A, B, ...))``, may be given as the target to\ncheck against. This is equivalent to ``isinstance(x, A) or isinstance(x, B)\nor ...`` etc.",
    },

    issubclass: {
        $meth: builtinFuncs.issubclass,
        $flags: { MinArgs: 2, MaxArgs: 2 },
        $textsig: "($module, cls, class_or_tuple, /)",
        $doc:
            "Return whether 'cls' is a derived from another class or is the same class.\n\nA tuple, as in ``issubclass(x, (A, B, ...))``, may be given as the target to\ncheck against. This is equivalent to ``issubclass(x, A) or issubclass(x, B)\nor ...`` etc.",
    },

    iter: {
        $meth: builtinFuncs.iter,
        $flags: { MinArgs: 1, MaxArgs: 2 },
        $textsig: "($module, iterable /)",
        $doc:
            "iter(iterable) -> iterator\niter(callable, sentinel) -> iterator\n\nGet an iterator from an object.  In the first form, the argument must\nsupply its own iterator, or be a sequence.\nIn the second form, the callable is called until it returns the sentinel.",
    },

    len: {
        $meth: builtinFuncs.len,
        $flags: { OneArg: true },
        $textsig: "($module, obj, /)",
        $doc: "Return the number of items in a container.",
    },

    locals: {
        $meth: builtinFuncs.locals,
        $flags: { NoArgs: true },
        $textsig: "($module, /)",
        $doc:
            "Return a dictionary containing the current scope's local variables.\n\nNOTE: Whether or not updates to this dictionary will affect name lookups in\nthe local scope and vice-versa is *implementation dependent* and not\ncovered by any backwards compatibility guarantees.",
    },

    max: {
        $meth: builtinFuncs.max,
        $flags: { FastCall: true },
        $textsig: null,
        $doc:
            "max(iterable, *[, default=obj, key=func]) -> value\nmax(arg1, arg2, *args, *[, key=func]) -> value\n\nWith a single iterable argument, return its biggest item. The\ndefault keyword-only argument specifies an object to return if\nthe provided iterable is empty.\nWith two or more arguments, return the largest argument.",
    },

    min: {
        $meth: builtinFuncs.min,
        $flags: { FastCall: true },
        $textsig: null,
        $doc:
            "min(iterable, *[, default=obj, key=func]) -> value\nmin(arg1, arg2, *args, *[, key=func]) -> value\n\nWith a single iterable argument, return its smallest item. The\ndefault keyword-only argument specifies an object to return if\nthe provided iterable is empty.\nWith two or more arguments, return the smallest argument.",
    },

    next: {
        $name: "next",
        $meth: builtinFuncs.next_,
        $flags: { MinArgs: 1, MaxArgs: 2 },
        $textsig: null,
        $doc:
            "next(iterator[, default])\n\nReturn the next item from the iterator. If default is given and the iterator\nis exhausted, it is returned instead of raising StopIteration.",
    },

    oct: {
        $meth: builtinFuncs.oct,
        $flags: { OneArg: true },
        $textsig: "($module, number, /)",
        $doc: "Return the octal representation of an integer.\n\n   >>> oct(342391)\n   '0o1234567'",
    },

    open: {
        $meth: builtinFuncs.open,
        $flags: {
            MinArgs: 1,
            MaxArgs: 3,
            //NamedArgs: ["file, mode, buffering, encoding, errors, newline, closefd, opener"],
            //Defaults: [new builtinFuncs.str("r"), new pyInt(-1), pyNone, pyNone, pyNone, pyTrue, pyNone]
        },
        $textsig: null,
        // $textsig: "($module, /, file, mode='r', buffering=-1, encoding=None,\n     errors=None, newline=None, closefd=True, opener=None)",
        // this is the python 2 documentation since we don't support the py3 version
        $doc:
            "open(name[, mode[, buffering]]) -> file object\n\nOpen a file using the file() type, returns a file object.  This is the\npreferred way to open a file.  See file.__doc__ for further information.",
    },

    ord: {
        $meth: builtinFuncs.ord,
        $flags: { OneArg: true },
        $textsig: "($module, c, /)",
        $doc: "Return the Unicode code point for a one-character string.",
    },

    pow: {
        $meth: builtinFuncs.pow,
        $flags: { MinArgs: 2, MaxArgs: 3 },
        $textsig: "($module, x, y, z=None, /)",
        $doc:
            "Equivalent to x**y (with two arguments) or x**y % z (with three arguments)\n\nSome types, such as ints, are able to use a more efficient algorithm when\ninvoked using the three argument form.",
    },

    print: {
        $meth: builtinFuncs.print,
        $flags: { FastCall: true },
        $textsig: null,
        $doc:
            "print(value, ..., sep=' ', end='\\n', file=sys.stdout, flush=False)\n\nPrints the values to a stream, or to sys.stdout by default.\nOptional keyword arguments:\nfile:  a file-like object (stream); defaults to the current sys.stdout.\nsep:   string inserted between values, default a space.\nend:   string appended after the last value, default a newline.\nflush: whether to forcibly flush the stream.",
    },

    repr: {
        $meth: builtinFuncs.repr,
        $flags: { OneArg: true },
        $textsig: "($module, obj, /)",
        $doc: "Return the canonical string representation of the object.\n\nFor many object types, including most builtins, eval(repr(obj)) == obj.",
    },

    round: {
        $meth: builtinFuncs.round,
        $flags: {
            NamedArgs: ["number", "ndigits"],
        },
        $textsig: "($module, /, number, ndigits=None)",
        $doc:
            "Round a number to a given precision in decimal digits.\n\nThe return value is an integer if ndigits is omitted or None.  Otherwise\nthe return value has the same type as the number.  ndigits may be negative.",
    },

    setattr: {
        $meth: builtinFuncs.setattr,
        $flags: { MinArgs: 3, MaxArgs: 3 },
        $textsig: "($module, obj, name, value, /)",
        $doc: "Sets the named attribute on the given object to the specified value.\n\nsetattr(x, 'y', v) is equivalent to ``x.y = v''",
    },

    sorted: {
        $meth: builtinFuncs.sorted,
        $flags: {
            NamedArgs: [null, "cmp", "key", "reverse"],
            Defaults: [pyNone, pyNone, pyFalse],
        }, // should be fast call leave for now
        $textsig: "($module, iterable, /, *, key=None, reverse=False)",
        $doc:
            "Return a new list containing all items from the iterable in ascending order.\n\nA custom key function can be supplied to customize the sort order, and the\nreverse flag can be set to request the result in descending order.",
    },

    sum: {
        $meth: builtinFuncs.sum,
        $flags: {
            NamedArgs: [null, "start"],
            Defaults: [new pyInt(0)],
        },
        $textsig: "($module, iterable, /, start=0)", //changed in python 3.8 start
        $doc:
            "Return the sum of a 'start' value (default: 0) plus an iterable of numbers\n\nWhen the iterable is empty, return the start value.\nThis function is intended specifically for use with numeric values and may\nreject non-numeric types.",
    },

    vars: {
        $meth: builtinFuncs.vars,
        $flags: { MinArgs: 0, MaxArgs: 1 },
        $textsig: null,
        $doc: "vars([object]) -> dictionary\n\nWithout arguments, equivalent to locals().\nWith an argument, equivalent to object.__dict__.",
    },
});


export function setupObjects(py3) {
    if (py3) {
        builtins["filter"] = pyFilter;
        builtins["map"] = pyMap;
        builtins["zip"] = pyZip;
        builtins["range"] = pyRange;
        delete builtins["xrange"];
        delete builtins["StandardError"];
        delete builtins["unicode"];
        delete builtins["basestring"];
        delete builtins["long_$rw$"];
        pyInt.prototype.$r = function () {
            return new pyStr(this.v.toString());
        };
        delete pyInt.prototype.tp$str;
        delete pyBool.prototype.tp$str;
        delete pyStr.prototype.decode;
        builtins["bytes"] = pyBytes;
        builtins["ascii"] = new pyBuiltinFuncOrMethod(
            {
                $meth: builtinFuncs.ascii,
                $flags: { OneArg: true },
                $textsig: "($module, obj, /)",
                $doc:
                    "Return an ASCII-only representation of an object.\n\nAs repr(), return a string containing a printable representation of an\nobject, but escape the non-ASCII characters in the string returned by\nrepr() using \\\\x, \\\\u or \\\\U escapes. This generates a string similar\nto that returned by repr() in Python 2.",
            },
            undefined,
            "builtins"
        );
    } else {
        builtins["range"] = new pyBuiltinFuncOrMethod(
            {
                $meth: builtinFuncs.range,
                $name: "range",
                $flags: { MinArgs: 1, MaxArgs: 3 },
            },
            undefined,
            "builtins"
        );
        builtins["xrange"] = new pyBuiltinFuncOrMethod(
            {
                $meth: builtinFuncs.xrange,
                $name: "xrange",
                $flags: { MinArgs: 1, MaxArgs: 3 },
            },
            undefined,
            "builtins"
        );
        builtins["filter"] = new pyFunc(builtinFuncs.filter);
        builtins["map"] = new pyFunc(builtinFuncs.map);
        builtins["zip"] = new pyFunc(builtinFuncs.zip);
        builtins["StandardError"] = pyExc.Exception;
        builtins["unicode"] = pyStr;
        builtins["basestring"] = pyStr;
        builtins["long_$rw$"] = pyLong;
        pyInt.prototype.$r = function () {
            const v = this.v;
            if (typeof v === "number") {
                return new pyStr(v.toString());
            } else {
                return new pyStr(v.toString() + "L");
            }
        };
        pyInt.prototype.tp$str = function () {
            return new builtinFuncs.str(this.v.toString());
        };
        pyBool.prototype.tp$str = function () {
            return this.$r();
        };
        pyStr.prototype.decode = pyStr.$py2decode;
        delete builtins["bytes"];
        delete builtins["ascii"];
    }
};

