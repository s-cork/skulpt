/**
 * Base namespace for Skulpt. This is the only symbol that Skulpt adds to the
 * global namespace. Other user accessible symbols are noted and described
 * below.
 */

/**
 *
 * Set various customizable parts of Skulpt.
 *
 * output: Replacable output redirection (called from print, etc.).
 * read: Replacable function to load modules with (called via import, etc.)
 * sysargv: Setable to emulate arguments to the script. Should be an array of JS
 * strings.
 * syspath: Setable to emulate PYTHONPATH environment variable (for finding
 * modules). Should be an array of JS strings.
 * nonreadopen: Boolean - set to true to allow non-read file operations
 * fileopen: Optional function to call any time a file is opened
 * filewrite: Optional function to call when writing to a file
 *
 * Any variables that aren't set will be left alone.
 */

 Sk.bool_check = function (variable, name) {
    if (variable === undefined || variable === null || typeof variable !== "boolean") {
        throw new Error("must specify " + name + " and it must be a boolean");
    }
};

/**
 * Please use python3 flag to control new behavior that is different
 * between Python 2/3, rather than adding new flags.
 */

Sk.python2 = {
    print_function: false,
    division: false,
    absolute_import: null,
    unicode_literals: false,
    // skulpt specific
    python3: false,
    class_repr: false,
    inherit_from_object: false,
    super_args: false,
    octal_number_literal: false,
    bankers_rounding: false,
    python_version: false,
    dunder_round: false,
    exceptions: false,
    no_long_type: false,
    ceil_floor_int: false,
    silent_octal_literal: true,
};

Sk.python3 = {
    print_function: true,
    division: true,
    absolute_import: null,
    unicode_literals: true,
    // skulpt specific
    python3: true,
    class_repr: true,
    inherit_from_object: true,
    super_args: true,
    octal_number_literal: true,
    bankers_rounding: true,
    python_version: true,
    dunder_round: true,
    exceptions: true,
    no_long_type: true,
    ceil_floor_int: true,
    silent_octal_literal: false,
};

Sk.configure = function (options) {
    "use strict";
    Sk.output = options["output"] || Sk.output;
    Sk.asserts.assert(typeof Sk.output === "function");

    Sk.debugout = options["debugout"] || Sk.debugout;
    Sk.asserts.assert(typeof Sk.debugout === "function");

    Sk.uncaughtException = options["uncaughtException"] || Sk.uncaughtException;
    Sk.asserts.assert(typeof Sk.uncaughtException === "function");

    Sk.read = options["read"] || Sk.read;
    Sk.asserts.assert(typeof Sk.read === "function");

    Sk.nonreadopen = options["nonreadopen"] || false;
    Sk.asserts.assert(typeof Sk.nonreadopen === "boolean");

    Sk.fileopen = options["fileopen"] || undefined;
    Sk.asserts.assert(typeof Sk.fileopen === "function" || typeof Sk.fileopen === "undefined");

    Sk.filewrite = options["filewrite"] || undefined;
    Sk.asserts.assert(typeof Sk.filewrite === "function" || typeof Sk.filewrite === "undefined");

    Sk.timeoutMsg = options["timeoutMsg"] || Sk.timeoutMsg;
    Sk.asserts.assert(typeof Sk.timeoutMsg === "function");
    Sk.exportSymbol("Sk.timeoutMsg", Sk.timeoutMsg);

    Sk.sysargv = options["sysargv"] || Sk.sysargv;
    Sk.asserts.assert(Sk.isArrayLike(Sk.sysargv));

    Sk.__future__ = options["__future__"] || Sk.python3;

    Sk.bool_check(Sk.__future__.print_function, "Sk.__future__.print_function");
    Sk.bool_check(Sk.__future__.division, "Sk.__future__.division");
    Sk.bool_check(Sk.__future__.unicode_literals, "Sk.__future__.unicode_literals");
    Sk.bool_check(Sk.__future__.class_repr, "Sk.__future__.class_repr");
    Sk.bool_check(Sk.__future__.inherit_from_object, "Sk.__future__.inherit_from_object");
    Sk.bool_check(Sk.__future__.super_args, "Sk.__future__.super_args");
    Sk.bool_check(Sk.__future__.octal_number_literal, "Sk.__future__.octal_number_literal");
    Sk.bool_check(Sk.__future__.bankers_rounding, "Sk.__future__.bankers_rounding");
    Sk.bool_check(Sk.__future__.python_version, "Sk.__future__.python_version");
    Sk.bool_check(Sk.__future__.dunder_round, "Sk.__future__.dunder_round");
    Sk.bool_check(Sk.__future__.exceptions, "Sk.__future__.exceptions");
    Sk.bool_check(Sk.__future__.no_long_type, "Sk.__future__.no_long_type");
    Sk.bool_check(Sk.__future__.ceil_floor_int, "Sk.__future__.ceil_floor_int");
    Sk.bool_check(Sk.__future__.silent_octal_literal, "Sk.__future__.silent_octal_literal");

    // in __future__ add checks for absolute_import

    Sk.imageProxy = options["imageProxy"] || "http://localhost:8080/320x";
    Sk.asserts.assert(typeof Sk.imageProxy === "string" || typeof Sk.imageProxy === "function");

    Sk.inputfun = options["inputfun"] || Sk.inputfun;
    Sk.asserts.assert(typeof Sk.inputfun === "function");

    Sk.inputfunTakesPrompt = options["inputfunTakesPrompt"] || false;
    Sk.asserts.assert(typeof Sk.inputfunTakesPrompt === "boolean");

    Sk.retainGlobals = options["retainglobals"] || options["retainGlobals"] || false;
    Sk.asserts.assert(typeof Sk.retainGlobals === "boolean");

    Sk.debugging = options["debugging"] || false;
    Sk.asserts.assert(typeof Sk.debugging === "boolean");

    Sk.killableWhile = options["killableWhile"] || false;
    Sk.asserts.assert(typeof Sk.killableWhile === "boolean");

    Sk.killableFor = options["killableFor"] || false;
    Sk.asserts.assert(typeof Sk.killableFor === "boolean");

    Sk.signals = typeof options["signals"] !== undefined ? options["signals"] : null;
    if (Sk.signals === true) {
        Sk.signals = {
            listeners: [],
            addEventListener(handler) {
                Sk.signals.listeners.push(handler);
            },
            removeEventListener(handler) {
                var index = Sk.signals.listeners.indexOf(handler);
                if (index >= 0) {
                    Sk.signals.listeners.splice(index, 1); // Remove items
                }
            },
            signal(signal, data) {
                for (var i = 0; i < Sk.signals.listeners.length; i++) {
                    Sk.signals.listeners[i].call(null, signal, data);
                }
            },
        };
    } else {
        Sk.signals = null;
    }
    Sk.asserts.assert(typeof Sk.signals === "object");

    Sk.breakpoints =
        options["breakpoints"] ||
        function () {
            return true;
        };
    Sk.asserts.assert(typeof Sk.breakpoints === "function");

    Sk.setTimeout = options["setTimeout"];
    if (Sk.setTimeout === undefined) {
        if (typeof setTimeout === "function") {
            Sk.setTimeout = function (func, delay) {
                setTimeout(func, delay);
            };
        } else {
            Sk.setTimeout = function (func, delay) {
                func();
            };
        }
    }
    Sk.asserts.assert(typeof Sk.setTimeout === "function");

    if ("execLimit" in options) {
        Sk.execLimit = options["execLimit"];
    }

    if ("yieldLimit" in options) {
        Sk.yieldLimit = options["yieldLimit"];
    }

    if (options["syspath"]) {
        Sk.syspath = options["syspath"];
        Sk.asserts.assert(Sk.isArrayLike(Sk.syspath));
        // assume that if we're changing syspath we want to force reimports.
        // not sure how valid this is, perhaps a separate api for that.
        Sk.realsyspath = undefined;
        Sk.sysmodules = new Sk.builtin.dict([]);
    }

    Sk.misceval.softspace_ = false;

    Sk.switch_version(Sk.__future__.python3);

    Sk.builtin.str.$next = Sk.__future__.python3 ? new Sk.builtin.str("__next__") : new Sk.builtin.str("next");

    Sk.setupOperators(Sk.__future__.python3);
    Sk.setupDunderMethods(Sk.__future__.python3);
    Sk.setupObjects(Sk.__future__.python3);
    Sk.token.setupTokens(Sk.__future__.python3);
};

Sk.exportSymbol("Sk.configure", Sk.configure);

/*
 * Replaceable handler for uncaught exceptions
 */
Sk.uncaughtException = function (err) {
    throw err;
};

/*
 * Replaceable handler for uncaught exceptions
 */
Sk.uncaughtException = function (err) {
    throw err;
};
Sk.exportSymbol("Sk.uncaughtException", Sk.uncaughtException);

/*
 *      Replaceable message for message timeouts
 */
Sk.timeoutMsg = function () {
    return "Program exceeded run time limit.";
};
Sk.exportSymbol("Sk.timeoutMsg", Sk.timeoutMsg);

/*
 *  Hard execution timeout, throws an error. Set to null to disable
 */
Sk.execLimit = Number.POSITIVE_INFINITY;

/*
 *  Soft execution timeout, returns a Suspension. Set to null to disable
 */
Sk.yieldLimit = Number.POSITIVE_INFINITY;

/*
 * Replacable output redirection (called from print, etc).
 */
Sk.output = function (x) {};

/*
 * Replaceable function to load modules with (called via import, etc.)
 * todo; this should be an async api
 */
Sk.read = function (x) {
    if (Sk.builtinFiles === undefined) {
        throw "skulpt-stdlib.js has not been loaded";
    } else if (Sk.builtinFiles.files[x] === undefined) {
        throw "File not found: '" + x + "'";
    }
    return Sk.builtinFiles.files[x];
};

/*
 * Setable to emulate arguments to the script. Should be array of JS strings.
 */
Sk.sysargv = [];

// lame function for sys module
Sk.getSysArgv = function () {
    return Sk.sysargv;
};
Sk.exportSymbol("Sk.getSysArgv", Sk.getSysArgv);

/**
 * Setable to emulate PYTHONPATH environment variable (for finding modules).
 * Should be an array of JS strings.
 */
Sk.syspath = [];

Sk.inBrowser = Sk.global["document"] !== undefined;

/**
 * Internal function used for debug output.
 * @param {...} args
 */
Sk.debugout = function (args) {};

(function () {
    // set up some sane defaults based on availability
    if (Sk.global["write"] !== undefined) {
        Sk.output = Sk.global["write"];
    } else if (Sk.global["console"] !== undefined && Sk.global["console"]["log"] !== undefined) {
        Sk.output = function (x) {
            Sk.global["console"]["log"](x);
        };
    } else if (Sk.global["print"] !== undefined) {
        Sk.output = Sk.global["print"];
    }
    if (Sk.global["console"] !== undefined && Sk.global["console"]["log"] !== undefined) {
        Sk.debugout = function (x) {
            Sk.global["console"]["log"](x);
        };
    } else if (Sk.global["print"] !== undefined) {
        Sk.debugout = Sk.global["print"];
    }
})();

Sk.inputfun = function (args) {
    return window.prompt(args);
};

/**
 * currently can't seem to remove these functions without a serious slow down of 2x
 */
Sk.setup_method_mappings = function () {
};
Sk.setupDictIterators = function (python3) {
};

Sk.switch_version = function (py3) {
    const methods_to_map = {
        float_: {
            method_names: ["__round__"],
            2: [false],
            3: [true],
        },
        int_: {
            method_names: ["__round__"],
            2: [false],
            3: [true],
        },
        list: {
            method_names: ["clear", "copy", "sort"],
            2: [false, false, true],
            3: [true, true, true],
        },
        dict: {
            method_names: ["has_key", "keys", "items", "values"],
            2: [true, true, true, true],
            3: [false, true, true, true],
        },
    };

    for (let klass_name in methods_to_map) {
        const klass = Sk.builtin[klass_name];
        const method_names = methods_to_map[klass_name].method_names;
        const in_py3 = methods_to_map[klass_name][3];

        // if we're not changing to py2 and we have no py3$methods then don't continue since these methods exist by default
        if (py3 && klass.py3$methods === undefined) {
            return;
        } else if (klass.py3$methods === undefined) {
            // Set up py3$methods if we haven't done so already
            klass.py3$methods = {};
            for (let i = 0; i < method_names.length; i++) {
                const method_name = method_names[i];
                if (!in_py3[i]) {
                    continue;
                }
                klass.py3$methods[method_name] = klass.prototype[method_name].d$def;
            }
        }
        let in_version, new_methods;
        if (py3) {
            in_version = in_py3;
            new_methods = klass.py3$methods;
        } else {
            in_version = methods_to_map[klass_name][2];
            new_methods = klass.py2$methods;
        }
        for (let i = 0; i < method_names.length; i++) {
            const method_name = method_names[i];
            delete klass.prototype[method_name];
            if (in_version[i]) {
                klass.prototype[method_name] = new Sk.builtin.method_descriptor(klass, new_methods[method_name]);
            }
        }
    }
};

Sk.exportSymbol("Sk.__future__", Sk.__future__);
Sk.exportSymbol("Sk.inputfun", Sk.inputfun);


export function configure(options) {

}

export const env = {
    __breakpointhook__: builtin_function_or_method,
    __displayhook__: builtin_function_or_method,
    __excepthook__: builtin_function_or_method,
    __interactivehook__: function,
    __stderr__: TextIOWrapper,
    __stdin__: TextIOWrapper,
    __stdout__: TextIOWrapper,
    __unraisablehook__: builtin_function_or_method,
    _base_executable: str,
    _clear_type_cache: builtin_function_or_method,
    _current_frames: builtin_function_or_method,
    _debugmallocstats: builtin_function_or_method,
    _framework: str,
    _getframe: builtin_function_or_method,
    _git: tuple,
    _home: NoneType,
    _xoptions: dict,
    abiflags: str,
    addaudithook: builtin_function_or_method,
    api_version: int,
    argv: list,
    audit: builtin_function_or_method,
    base_exec_prefix: str,
    base_prefix: str,
    breakpointhook: builtin_function_or_method,
    builtin_module_names: tuple,
    byteorder: str,
    call_tracing: builtin_function_or_method,
    copyright: str,
    displayhook: RichPromptDisplayHook,
    dont_write_bytecode: bool,
    exc_info: builtin_function_or_method,
    excepthook: method,
    exec_prefix: str,
    executable: str,
    exit: builtin_function_or_method,
    flags: flags,
    float_info: float_info,
    float_repr_style: str,
    get_asyncgen_hooks: builtin_function_or_method,
    get_coroutine_origin_tracking_depth: builtin_function_or_method,
    getallocatedblocks: builtin_function_or_method,
    getdefaultencoding: builtin_function_or_method,
    getdlopenflags: builtin_function_or_method,
    getfilesystemencodeerrors: builtin_function_or_method,
    getfilesystemencoding: builtin_function_or_method,
    getprofile: builtin_function_or_method,
    getrecursionlimit: builtin_function_or_method,
    getrefcount: builtin_function_or_method,
    getsizeof: builtin_function_or_method,
    getswitchinterval: builtin_function_or_method,
    gettrace: builtin_function_or_method,
    hash_info: hash_info,
    hexversion: int,
    implementation: SimpleNamespace,
    int_info: int_info,
    intern: builtin_function_or_method,
    is_finalizing: builtin_function_or_method,
    last_traceback: traceback,
    last_type: type,
    last_value: SyntaxError,
    maxsize: int,
    maxunicode: int,
    meta_path: list,
    modules: dict,
    path: list,
    path_hooks: list,
    path_importer_cache: dict,
    platform: str,
    platlibdir: str,
    prefix: str,
    ps1: str,
    ps2: str,
    ps3: str,
    pycache_prefix: NoneType,
    set_asyncgen_hooks: builtin_function_or_method,
    set_coroutine_origin_tracking_depth: builtin_function_or_method,
    setdlopenflags: builtin_function_or_method,
    setprofile: builtin_function_or_method,
    setrecursionlimit: builtin_function_or_method,
    setswitchinterval: builtin_function_or_method,
    settrace: builtin_function_or_method,
    stderr: TextIOWrapper,
    stdin: TextIOWrapper,
    stdout: TextIOWrapper,
    thread_info: thread_info,
    unraisablehook: builtin_function_or_method,
    version: str,
    version_info: version_info,
    warnoptions: list,
}


const sys = {
    __breakpointhook__: '<built-in function breakpointhook>',
__displayhook__: '<built-in function displayhook>',
__doc__: `This module provides access to some objects used or maintained by the
interpreter and to functions that interact strongly with the interpreter.

Dynamic objects:

argv -- command line arguments; argv[0] is the script pathname if known
path -- module search path; path[0] is the script directory, else ''
modules -- dictionary of loaded modules

displayhook -- called to show results in an interactive session
excepthook -- called to handle any uncaught exception other than SystemExit
  To customize printing in an interactive session or to install a custom
  top-level exception handler, assign other functions to replace these.

stdin -- standard input file object; used by input()
stdout -- standard output file object; used by print()
stderr -- standard error object; used for error messages
  By assigning other file objects (or objects that behave like files)
  to these, it is possible to redirect all of the interpreter's I/O.

last_type -- type of last uncaught exception
last_value -- value of last uncaught exception
last_traceback -- traceback of last uncaught exception
  These three are only available in an interactive session after a
  traceback has been printed.

Static objects:

builtin_module_names -- tuple of module names built into this interpreter
copyright -- copyright notice pertaining to this interpreter
exec_prefix -- prefix used to find the machine-specific Python library
executable -- absolute path of the executable binary of the Python interpreter
float_info -- a named tuple with information about the float implementation.
float_repr_style -- string indicating the style of repr() output for floats
hash_info -- a named tuple with information about the hash algorithm.
hexversion -- version information encoded as a single integer
implementation -- Python implementation information.
int_info -- a named tuple with information about the int implementation.
maxsize -- the largest supported length of containers.
maxunicode -- the value of the largest Unicode code point
platform -- platform identifier
prefix -- prefix used to find the Python library
thread_info -- a named tuple with information about the thread implementation.
version -- the version of this interpreter as a string
version_info -- version information as a named tuple
__stdin__ -- the original stdin; don't touch!
__stdout__ -- the original stdout; don't touch!
__stderr__ -- the original stderr; don't touch!
__displayhook__ -- the original displayhook; don't touch!
__excepthook__ -- the original excepthook; don't touch!

Functions:

displayhook() -- print an object to the screen, and save it in builtins._
excepthook() -- print an exception and its traceback to sys.stderr
exc_info() -- return thread-safe information about the current exception
exit() -- exit the interpreter by raising SystemExit
getdlopenflags() -- returns flags to be used for dlopen() calls
getprofile() -- get the global profiling function
getrefcount() -- return the reference count for an object (plus one :-)
getrecursionlimit() -- return the max recursion depth for the interpreter
getsizeof() -- return the size of an object in bytes
gettrace() -- get the global debug tracing function
setdlopenflags() -- set the flags to be used for dlopen() calls
setprofile() -- set the global profiling function
setrecursionlimit() -- set the max recursion depth for the interpreter
settrace() -- set the global debug tracing function
`,
__excepthook__: '<built-in function excepthook>',
__interactivehook__: '<function enablerlcompleter.<locals>.register_readline at 0x100b89550>',
__stderr__: '<_io.TextIOWrapper name='<stderr>' mode='w' encoding='utf-8'>',
__stdin__: '<_io.TextIOWrapper name='<stdin>' mode='r' encoding='utf-8'>',
__stdout__: '<_io.TextIOWrapper name='<stdout>' mode='w' encoding='utf-8'>',
__unraisablehook__: '<built-in function unraisablehook>',
_getframe: '<built-in function _getframe>',
_git: '('CPython', '', '')',
_home: 'None',
_xoptions: '{}',
abiflags: '',
addaudithook: '<built-in function addaudithook>',
api_version: '1013',
argv: '['/opt/homebrew/bin/ipython']',
audit: '<built-in function audit>',
base_exec_prefix: '/opt/homebrew/opt/python@3.9/Frameworks/Python.framework/Versions/3.9',
base_prefix: '/opt/homebrew/opt/python@3.9/Frameworks/Python.framework/Versions/3.9',
breakpointhook: '<built-in function breakpointhook>',
builtin_module_names: ['_abc', '_ast', '_codecs', '_collections', '_functools', '_imp', '_io', '_locale', '_operator', '_peg_parser', '_signal', '_sre', '_stat', '_string', '_symtable', '_thread', '_tracemalloc', '_warnings', '_weakref', 'atexit', 'builtins', 'errno', 'faulthandler', 'gc', 'itertools', 'marshal', 'posix', 'pwd', 'sys', 'time', 'xxsubtype'],
byteorder: 'little',
call_tracing: '<built-in function call_tracing>',
copyright: '',
displayhook: '<IPython.terminal.prompts.RichPromptDisplayHook object at 0x102503e20>',
dont_write_bytecode: 'False',
exc_info: '<built-in function exc_info>',
excepthook: '<bound method InteractiveShell.excepthook of <IPython.terminal.interactiveshell.TerminalInteractiveShell object at 0x1025326d0>>',
exec_prefix: '/opt/homebrew/opt/python@3.9/Frameworks/Python.framework/Versions/3.9',
executable: '/opt/homebrew/opt/python@3.9/bin/python3.9',
exit: '<built-in function exit>',
flags: 'sys.flags(debug=0, inspect=0, interactive=0, optimize=0, dont_write_bytecode=0, no_user_site=0, no_site=0, ignore_environment=0, verbose=0, bytes_warning=0, quiet=0, hash_randomization=1, isolated=0, dev_mode=False, utf8_mode=0)',
float_info: 'sys.float_info(max=1.7976931348623157e+308, max_exp=1024, max_10_exp=308, min=2.2250738585072014e-308, min_exp=-1021, min_10_exp=-307, dig=15, mant_dig=53, epsilon=2.220446049250313e-16, radix=2, rounds=1)',
float_repr_style: 'short',
get_asyncgen_hooks: '<built-in function get_asyncgen_hooks>',
get_coroutine_origin_tracking_depth: '<built-in function get_coroutine_origin_tracking_depth>',
getallocatedblocks: '<built-in function getallocatedblocks>',
getdefaultencoding: '<built-in function getdefaultencoding>',
getdlopenflags: '<built-in function getdlopenflags>',
getfilesystemencodeerrors: '<built-in function getfilesystemencodeerrors>',
getfilesystemencoding: '<built-in function getfilesystemencoding>',
getprofile: '<built-in function getprofile>',
getrecursionlimit: '<built-in function getrecursionlimit>',
getrefcount: '<built-in function getrefcount>',
getsizeof: '<built-in function getsizeof>',
getswitchinterval: '<built-in function getswitchinterval>',
gettrace: '<built-in function gettrace>',
hash_info: 'sys.hash_info(width=64, modulus=2305843009213693951, inf=314159, nan=0, imag=1000003, algorithm='siphash24', hash_bits=64, seed_bits=128, cutoff=0)',
hexversion: '50922224',
implementation: 'namespace(name='cpython', cache_tag='cpython-39', version=sys.version_info(major=3, minor=9, micro=2, releaselevel='final', serial=0), hexversion=50922224, _multiarch='darwin')',
int_info: 'sys.int_info(bits_per_digit=30, sizeof_digit=4)',
intern: '<built-in function intern>',
is_finalizing: '<built-in function is_finalizing>',
last_traceback: '<traceback object at 0x102882b80>',
last_type: '<class 'SyntaxError'>',
last_value: 'invalid syntax (<ipython-input-14-6c8094716ec6>, line 2)',
maxsize: '9223372036854775807',
maxunicode: '1114111',
path: '['/opt/homebrew/bin', '/opt/homebrew/Cellar/python@3.9/3.9.2_2/Frameworks/Python.framework/Versions/3.9/lib/python39.zip', '/opt/homebrew/Cellar/python@3.9/3.9.2_2/Frameworks/Python.framework/Versions/3.9/lib/python3.9', '/opt/homebrew/Cellar/python@3.9/3.9.2_2/Frameworks/Python.framework/Versions/3.9/lib/python3.9/lib-dynload', '', '/Users/scork/Library/Python/3.9/lib/python/site-packages', '/opt/homebrew/lib/python3.9/site-packages', '/opt/homebrew/lib/python3.9/site-packages/IPython/extensions', '/Users/scork/.ipython']',
path_hooks: '[<class 'zipimport.zipimporter'>, <function FileFinder.path_hook.<locals>.path_hook_for_FileFinder at 0x1005dcf70>]',
platform: 'darwin',
platlibdir: 'lib',
prefix: '/opt/homebrew/opt/python@3.9/Frameworks/Python.framework/Versions/3.9',
ps1: 'In : ',
ps2: '...: ',
ps3: 'Out: ',
pycache_prefix: 'None',
set_asyncgen_hooks: '<built-in function set_asyncgen_hooks>',
set_coroutine_origin_tracking_depth: '<built-in function set_coroutine_origin_tracking_depth>',
setdlopenflags: '<built-in function setdlopenflags>',
setprofile: '<built-in function setprofile>',
setrecursionlimit: '<built-in function setrecursionlimit>',
setswitchinterval: '<built-in function setswitchinterval>',
settrace: '<built-in function settrace>',
stderr: '<_io.TextIOWrapper name='<stderr>' mode='w' encoding='utf-8'>',
stdin: '<_io.TextIOWrapper name='<stdin>' mode='r' encoding='utf-8'>',
stdout: '<_io.TextIOWrapper name='<stdout>' mode='w' encoding='utf-8'>',
thread_info: 'sys.thread_info(name='pthread', lock='mutex+cond', version=None)',
unraisablehook: '<built-in function unraisablehook>',
version: '3.9.2 (default, Mar 15 2021, 10:13:36)',
version_info: 'sys.version_info(major=3, minor=9, micro=2, releaselevel='final', serial=0)',
warnoptions: '[]',
}