const env = {
    //-- standard input file object; used by input()
    stdin() {},
    // -- standard output file object; used by print()
    stdout() {},
    // -- standard error object; used for error messages
    stderr() {},
    // -- print an object to the screen, and save it in builtins._
    displayhook() {},
    // -- print an exception and its traceback to sys.stderr
    excepthook() {},
    // -- return thread-safe information about the current exception
    exc_info() {},

    __breakpointhook__() {},
    breakpointhook() {},

    __interactivehook__() {},
    __unraisablehook__() {},

    meta_path: [],
    path: [],
    path_hooks: [],
    path_importer_cache: [""],

    /**
     * @member {Sk.env}
     * cached modules imported from the import mechanism
     */
    modules: null,
    /**
     * @member {Sk.env}
     * Hard execution timeout, throws an error. Set to null to disable
     */
    execLimit: Number.POSITIVE_INFINITY,
    /**
     * @member {Sk.env}
     * Soft execution timeout, returns a Suspension. Set to null to disable
     */
    yieldLimit: Number.POSITIVE_INFINITY,

    killableWhile,
    killableFor,

    python3,
    version,
    builtin_module_names,
    flags:
        "sys.flags(debug=0, inspect=0, interactive=0, optimize=0, dont_write_bytecode=0, no_user_site=0, no_site=0, ignore_environment=0, verbose=0, bytes_warning=0, quiet=0, hash_randomization=1, isolated=0, dev_mode=False, utf8_mode=0)",
    platform,
    platlibdir: "lib",
    implementation,
    version_info,
    copyright,

    argv: [""],

    maxsize: Number.MAX_SAFE_INTEGER,
    intern() {},

    _getframe() {},
    _git: {},

    // __doc__: `This module provides access to some objects used or maintained by the
    // interpreter and to functions that interact strongly with the interpreter.

    // Dynamic objects:

    // argv -- command line arguments; argv[0] is the script pathname if known
    // path -- module search path; path[0] is the script directory, else ''
    // modules -- dictionary of loaded modules

    // displayhook -- called to show results in an interactive session
    // excepthook -- called to handle any uncaught exception other than SystemExit
    //   To customize printing in an interactive session or to install a custom
    //   top-level exception handler, assign other functions to replace these.

    //   By assigning other file objects (or objects that behave like files)
    //   to these, it is possible to redirect all of the interpreter's I/O.

    // last_type -- type of last uncaught exception
    // last_value -- value of last uncaught exception
    // last_traceback -- traceback of last uncaught exception
    //   These three are only available in an interactive session after a
    //   traceback has been printed.

    // Static objects:

    // builtin_module_names -- tuple of module names built into this interpreter
    // copyright -- copyright notice pertaining to this interpreter
    // exec_prefix -- prefix used to find the machine-specific Python library
    // executable -- absolute path of the executable binary of the Python interpreter
    // float_info -- a named tuple with information about the float implementation.
    // float_repr_style -- string indicating the style of repr() output for floats
    // hash_info -- a named tuple with information about the hash algorithm.
    // hexversion -- version information encoded as a single integer
    // implementation -- Python implementation information.
    // int_info -- a named tuple with information about the int implementation.
    // maxsize -- the largest supported length of containers.
    // maxunicode -- the value of the largest Unicode code point
    // platform -- platform identifier
    // prefix -- prefix used to find the Python library
    // thread_info -- a named tuple with information about the thread implementation.
    // version -- the version of this interpreter as a string
    // version_info -- version information as a named tuple
    // __stdin__ -- the original stdin; don't touch!
    // __stdout__ -- the original stdout; don't touch!
    // __stderr__ -- the original stderr; don't touch!
    // __displayhook__ -- the original displayhook; don't touch!
    // __excepthook__ -- the original excepthook; don't touch!

    // Functions:

    // displayhook() -- print an object to the screen, and save it in builtins._
    // excepthook() -- print an exception and its traceback to sys.stderr
    // exc_info() -- return thread-safe information about the current exception
    // exit() -- exit the interpreter by raising SystemExit
    // getdlopenflags() -- returns flags to be used for dlopen() calls
    // getprofile() -- get the global profiling function
    // getrefcount() -- return the reference count for an object (plus one :-)
    // getrecursionlimit() -- return the max recursion depth for the interpreter
    // getsizeof() -- return the size of an object in bytes
    // gettrace() -- get the global debug tracing function
    // setdlopenflags() -- set the flags to be used for dlopen() calls
    // setprofile() -- set the global profiling function
    // setrecursionlimit() -- set the max recursion depth for the interpreter
    // settrace() -- set the global debug tracing function
    // `,
    // __excepthook__: '<built-in function excepthook>',
    // __interactivehook__: '<function enablerlcompleter.<locals>.register_readline at 0x100b89550>',
    // __unraisablehook__: '<built-in function unraisablehook>',
    // _getframe: '<built-in function _getframe>',
    // _git: '('CPython', '', '')',
    // _home: 'None',
    // _xoptions: '{}',
    // abiflags: '',
    // addaudithook: '<built-in function addaudithook>',
    // api_version: '1013',
    // argv: '['/opt/homebrew/bin/ipython']',
    // audit: '<built-in function audit>',
    // base_exec_prefix: '/opt/homebrew/opt/python@3.9/Frameworks/Python.framework/Versions/3.9',
    // base_prefix: '/opt/homebrew/opt/python@3.9/Frameworks/Python.framework/Versions/3.9',
    // breakpointhook: '<built-in function breakpointhook>',
    // builtin_module_names: ['_abc', '_ast', '_codecs', '_collections', '_functools', '_imp', '_io', '_locale', '_operator', '_peg_parser', '_signal', '_sre', '_stat', '_string', '_symtable', '_thread', '_tracemalloc', '_warnings', '_weakref', 'atexit', 'builtins', 'errno', 'faulthandler', 'gc', 'itertools', 'marshal', 'posix', 'pwd', 'sys', 'time', 'xxsubtype'],
    // byteorder: 'little',
    // call_tracing: '<built-in function call_tracing>',
    // copyright: '',
    // displayhook: '<IPython.terminal.prompts.RichPromptDisplayHook object at 0x102503e20>',
    // dont_write_bytecode: 'False',
    // exc_info: '<built-in function exc_info>',
    // excepthook: '<bound method InteractiveShell.excepthook of <IPython.terminal.interactiveshell.TerminalInteractiveShell object at 0x1025326d0>>',
    // exec_prefix: '/opt/homebrew/opt/python@3.9/Frameworks/Python.framework/Versions/3.9',
    // executable: '/opt/homebrew/opt/python@3.9/bin/python3.9',
    // exit: '<built-in function exit>',
    // flags: 'sys.flags(debug=0, inspect=0, interactive=0, optimize=0, dont_write_bytecode=0, no_user_site=0, no_site=0, ignore_environment=0, verbose=0, bytes_warning=0, quiet=0, hash_randomization=1, isolated=0, dev_mode=False, utf8_mode=0)',
    // float_info: 'sys.float_info(max=1.7976931348623157e+308, max_exp=1024, max_10_exp=308, min=2.2250738585072014e-308, min_exp=-1021, min_10_exp=-307, dig=15, mant_dig=53, epsilon=2.220446049250313e-16, radix=2, rounds=1)',
    // float_repr_style: 'short',
    // get_asyncgen_hooks: '<built-in function get_asyncgen_hooks>',
    // get_coroutine_origin_tracking_depth: '<built-in function get_coroutine_origin_tracking_depth>',
    // getallocatedblocks: '<built-in function getallocatedblocks>',
    // getdefaultencoding: '<built-in function getdefaultencoding>',
    // getdlopenflags: '<built-in function getdlopenflags>',
    // getfilesystemencodeerrors: '<built-in function getfilesystemencodeerrors>',
    // getfilesystemencoding: '<built-in function getfilesystemencoding>',
    // getprofile: '<built-in function getprofile>',
    // getrecursionlimit: '<built-in function getrecursionlimit>',
    // getrefcount: '<built-in function getrefcount>',
    // getsizeof: '<built-in function getsizeof>',
    // getswitchinterval: '<built-in function getswitchinterval>',
    // gettrace: '<built-in function gettrace>',
    // hash_info: 'sys.hash_info(width=64, modulus=2305843009213693951, inf=314159, nan=0, imag=1000003, algorithm='siphash24', hash_bits=64, seed_bits=128, cutoff=0)',
    // hexversion: '50922224',
    // implementation: 'namespace(name='cpython', cache_tag='cpython-39', version=sys.version_info(major=3, minor=9, micro=2, releaselevel='final', serial=0), hexversion=50922224, _multiarch='darwin')',
    // int_info: 'sys.int_info(bits_per_digit=30, sizeof_digit=4)',
    // intern: '<built-in function intern>',
    // is_finalizing: '<built-in function is_finalizing>',
    // last_traceback: '<traceback object at 0x102882b80>',
    // last_type: '<class 'SyntaxError'>',
    // last_value: 'invalid syntax (<ipython-input-14-6c8094716ec6>, line 2)',
    // maxsize: '9223372036854775807',
    // maxunicode: '1114111',
    // path: '['/opt/homebrew/bin', '/opt/homebrew/Cellar/python@3.9/3.9.2_2/Frameworks/Python.framework/Versions/3.9/lib/python39.zip', '/opt/homebrew/Cellar/python@3.9/3.9.2_2/Frameworks/Python.framework/Versions/3.9/lib/python3.9', '/opt/homebrew/Cellar/python@3.9/3.9.2_2/Frameworks/Python.framework/Versions/3.9/lib/python3.9/lib-dynload', '', '/Users/scork/Library/Python/3.9/lib/python/site-packages', '/opt/homebrew/lib/python3.9/site-packages', '/opt/homebrew/lib/python3.9/site-packages/IPython/extensions', '/Users/scork/.ipython']',
    // path_hooks: '[<class 'zipimport.zipimporter'>, <function FileFinder.path_hook.<locals>.path_hook_for_FileFinder at 0x1005dcf70>]',
    // platform: 'darwin',
    // platlibdir: 'lib',
    // prefix: '/opt/homebrew/opt/python@3.9/Frameworks/Python.framework/Versions/3.9',
    // ps1: 'In : ',
    // ps2: '...: ',
    // ps3: 'Out: ',
    // pycache_prefix: 'None',
    // set_asyncgen_hooks: '<built-in function set_asyncgen_hooks>',
    // set_coroutine_origin_tracking_depth: '<built-in function set_coroutine_origin_tracking_depth>',
    // setdlopenflags: '<built-in function setdlopenflags>',
    // setprofile: '<built-in function setprofile>',
    // setrecursionlimit: '<built-in function setrecursionlimit>',
    // setswitchinterval: '<built-in function setswitchinterval>',
    // settrace: '<built-in function settrace>',
    // stderr: '<_io.TextIOWrapper name='<stderr>' mode='w' encoding='utf-8'>',
    // stdin: '<_io.TextIOWrapper name='<stdin>' mode='r' encoding='utf-8'>',
    // stdout: '<_io.TextIOWrapper name='<stdout>' mode='w' encoding='utf-8'>',
    // thread_info: 'sys.thread_info(name='pthread', lock='mutex+cond', version=None)',
    // unraisablehook: '<built-in function unraisablehook>',
    // version: '3.9.2 (default, Mar 15 2021, 10:13:36)',
    // version_info: 'sys.version_info(major=3, minor=9, micro=2, releaselevel='final', serial=0)',
    // warnoptions: '[]',
};

export default env;
export { configure } from "../env";
