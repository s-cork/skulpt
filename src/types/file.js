import {
    asserts,
    pyStr,
    pyNone,
    pyList,
    pyExc,
    pyFunc,
    pyCall,
    Suspension,
    setUpInheritance,
    remapToJs,
    remapToPy,
} from "../internal";
/**
 * @constructor
 * @param {pyStr} name
 * @param {pyStr} mode
 * @param {Object} buffering
 */
export var pyFile = function (name, mode, buffering) {
    var i;
    var elem;

    if (!(this instanceof pyFile)) {
        return new pyFile(name, mode, buffering);
    }

    this.mode = mode;
    this.name = remapToJs(name);
    this.closed = false;

    if (this.name === "/dev/stdout") {
        this.data$ = pyNone;
        this.fileno = 1;
    } else if (this.name === "/dev/stdin") {
        this.fileno = 0;
    } else if (this.name === "/dev/stderr") {
        this.fileno = 2;
    } else {
        if (Sk.inBrowser) {  // todo:  Maybe provide a replaceable function for non-import files
            this.fileno = 10;
            elem = document.getElementById(name.v);
            if (elem == null) {
                if (mode.v == "w" || mode.v == "a") {
                    this.data$ = "";
                } else {
                    throw new pyExc.IOError("[Errno 2] No such file or directory: '" + name.v + "'");
                }
            } else {
                if (elem.nodeName.toLowerCase() == "textarea") {
                    this.data$ = elem.value;
                } else {
                    this.data$ = elem.textContent;
                }
            }
        } else {
            this.fileno = 11;
            this.data$ = Sk.read(name.v);
        }

        this.lineList = this.data$.split("\n");
        this.lineList = this.lineList.slice(0, -1);

        for (i in this.lineList) {
            this.lineList[i] = this.lineList[i] + "\n";
        }
        this.currentLine = 0;
    }
    this.pos$ = 0;


    if (Sk.fileopen && this.fileno >= 10) {
        Sk.fileopen(this);
    }

    return this;
};

setUpInheritance("file", pyFile);

pyFile.prototype["$r"] = function () {
    return new pyStr("<" +
        (this.closed ? "closed" : "open") +
        "file '" +
        this.name +
        "', mode '" +
        remapToJs(this.mode) +
        "'>");
};

pyFile.prototype["__enter__"] = new pyFunc(function __enter__(self) {
    return self;
});

pyFile.prototype["__exit__"] = new pyFunc(function __exit__(self) {
    return pyCall(pyFile.prototype["close"], [self]);
});

pyFile.prototype.tp$iter = function () {
    var allLines = this.lineList;
    var currentLine = this.currentLine;

    var ret =
    {
        tp$iter    : function () {
            return ret;
        },
        $obj       : this,
        $index     : currentLine,
        $lines     : allLines,
        tp$iternext: function () {
            if (ret.$index >= ret.$lines.length) {
                return undefined;
            }
            return new pyStr(ret.$lines[ret.$index++]);
        }
    };
    return ret;
};

pyFile.prototype["close"] = new pyFunc(function close(self) {
    self.closed = true;
    return pyNone;
});

pyFile.prototype["flush"] = new pyFunc(function flush(self) {
});

pyFile.prototype["fileno"] = new pyFunc(function fileno(self) {
    return this.fileno;
}); // > 0, not 1/2/3

pyFile.prototype["isatty"] = new pyFunc(function isatty(self) {
    return false;
});

pyFile.prototype["read"] = new pyFunc(function read(self, size) {
    var ret;
    var len = self.data$.length;
    var l_size;
    if (self.closed) {
        throw new pyExc.ValueError("I/O operation on closed file");
    }

    if (size === undefined) {
        l_size = len;
    } else {
        l_size = remapToJs(size);
    }

    ret = new pyStr(self.data$.substr(self.pos$, l_size));
    if(size === undefined){
        self.pos$ = len;
    }else{
        self.pos$ += remapToJs(size);
    }
    if (self.pos$ >= len) {
        self.pos$ = len;
    }

    return ret;
});

pyFile.$readline = function (self, size, prompt) {
    if (self.fileno === 0) {
        var x, susp;

        var lprompt = remapToJs(prompt);

        lprompt = lprompt ? lprompt : "";

        x = Sk.inputfun(lprompt);

        if (x instanceof Promise) {
            susp = new Suspension();

            susp.resume = function() {
                if (susp.data.error) {
                    throw susp.data.error;
                }

                return new pyStr(susp.data.result);
            };

            susp.data = {
                type: "Sk.promise",
                promise: x
            };

            return susp;
        } else {
            return new pyStr(x);
        }
    } else {
        var line = "";
        if (self.currentLine < self.lineList.length) {
            line = self.lineList[self.currentLine];
            self.currentLine++;
        }
        return new pyStr(line);
    }
};

pyFile.prototype["readline"] = new pyFunc(function readline(self, size) {
    return pyFile.$readline(self, size, undefined);
});

pyFile.prototype["readlines"] = new pyFunc(function readlines(self, sizehint) {
    if (self.fileno === 0) {
        return new pyExc.NotImplementedError("readlines ins't implemented because the web doesn't support Ctrl+D");
    }

    var i;
    var arr = [];
    for (i = self.currentLine; i < self.lineList.length; i++) {
        arr.push(new pyStr(self.lineList[i]));
    }
    return new pyList(arr);
});

pyFile.prototype["seek"] = new pyFunc(function seek(self, offset, whence) {
    var l_offset =  remapToJs(offset);

    if (whence === undefined) {
        whence = 0;
    }
    if (whence === 0) {
        self.pos$ = l_offset;
    } else if (whence == 1) {
        self.pos$ = self.data$.length + l_offset;
    } else if (whence == 2) {
        self.pos$ = self.data$.length + l_offset;
    }

    return pyNone;
});

pyFile.prototype["tell"] = new pyFunc(function tell(self) {
    return remapToPy(self.pos$);
});

pyFile.prototype["truncate"] = new pyFunc(function truncate(self, size) {
    asserts.fail();
});

pyFile.prototype["write"] = new pyFunc(function write(self, str) {
    var mode = remapToJs(self.mode);
    if (mode === "w" || mode === "wb" || mode === "a" || mode === "ab") {
        if (Sk.filewrite) {
            if (self.closed) {
                throw new pyExc.ValueError("I/O operation on closed file");
            }

            if (self.fileno === 1) {
                Sk.output(remapToJs(str));
            } else {
                Sk.filewrite(self, str);
            }
        } else {
            if (self.fileno === 1) {
                Sk.output(remapToJs(str));
            } else {
                asserts.fail();
            }
        }
    } else {
        throw new pyExc.IOError("File not open for writing");
    }
    return pyNone;
});


