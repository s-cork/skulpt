function $builtinmodule() {
    const {
        builtin: {
            str: pyStr,
            TypeError,
            ValueError,
            sorted,
            none: { none$: pyNone },
            bool: { true$: pyTrue, false$: pyFalse },
        },
        ffi: { remapToPy: toPy, remapToJs: toJs },
        abstr: { typeName },
        misceval: { objectRepr, callsimArray: pyCall },
    } = Sk;

    const json = {
        __name__: new pyStr("json"),
        __all__: toPy(["dump", "dumps", "load", "loads", "JSONDecoder", "JSONDecodeError", "JSONEncoder"]),
    };

    /********* ENCODING *********/
    const default_encode_options = {
        skipkeys: false,
        ensure_ascii: true,
        check_circular: true,
        allow_nan: true,
        sort_keys: false,
        indent: null,
        separators: null,
        item_separator: ", ",
        key_separator: ": ",
    };

    class JSONEncoder {
        constructor(_default = null, options = {}) {
            Object.assign(this, { ...default_encode_options, ...options });
            if (this.separators !== null) {
                /**@todo make sure this raises a good python error */
                [this.item_separator, this.key_separator] = this.separators;
            } else if (this.indent !== null) {
                this.item_separator = ", ";
            }
            if (_default !== null) {
                this.default = _default;
            }
            this.encoder = this.make_encoder();
        }
        default(o) {
            throw new TypeError(`Object of type ${typeName(o)} is not JSON serializable`);
        }
        encode(o) {
            return new pyStr(this.encoder(o));
        }
        make_encoder() {
            let markers, _encoder;
            if (this.check_circular) {
                markers = new Set();
            } else {
                markers = null;
            }
            /** @todo */
            if (this.ensure_ascii) {
                _encoder = JSON.stringify;
            } else {
                _encoder = JSON.stringify;
            }
            const floatstr = (o, allow_nan = this.allow_nan) => {
                const v = o.valueOf();
                let text;
                if (!Number.isFinite(v)) {
                    text = v.toString();
                } else {
                    return objectRepr(o);
                }
                if (!allow_nan) {
                    throw new ValueError("Out of range float values are not JSON compliant: " + objectRepr(o));
                }
                return text;
            };
            return _make_iterencode(
                markers,
                this.default,
                _encoder,
                this.indent,
                floatstr,
                this.key_separator,
                this.item_separator,
                this.sort_keys,
                this.skipkeys
            );
        }
    }

    const items_str = new pyStr("items");

    function _make_iterencode(
        markers,
        _default,
        _encoder,
        _indent,
        _floatstr,
        _key_separator,
        _item_separator,
        _sort_keys,
        _skipkeys
    ) {
        if (_indent !== null && typeof _indent !== "string") {
            _indent = " ".repeat(_indent);
        }

        let /** @type {() => {}} */ _check_markers, /**@type {() => {}} */ _remove_from_markers;
        if (markers !== null) {
            _check_markers = (o) => {
                if (markers.has(o)) {
                    throw new ValueError("Circular reference detected");
                }
                markers.add(o);
            };
            _remove_from_markers = (o) => markers.delete(o);
        } else {
            _check_markers = (o) => {};
            _remove_from_markers = (o) => {};
        }

        let /** @type {() => {}} */ _initialize_buffer, /** @type {() => {}} */ _finalize_buffer;
        if (_indent !== null) {
            _initialize_buffer = (buf, _current_indent_level) => {
                _current_indent_level += 1;
                const newline_indent = "\n" + _indent.repeat(_current_indent_level);
                const separator = _item_separator + newline_indent;
                buf += newline_indent;
                return [buf, _current_indent_level, separator];
            };
            _finalize_buffer = (buf, ending, _current_indent_level) => {
                _current_indent_level -= 1;
                buf += "\n" + _indent.repeat(_current_indent_level) + ending;
                return buf;
            };
        } else {
            _initialize_buffer = (buf, _current_indent_level) => [buf, _current_indent_level, _item_separator];
            _finalize_buffer = (buf, ending, _current_indent_level) => buf + ending;
        }

        const _unhandled = (o, _current_indent_level) => {
            _check_markers(o);
            const ret = _iterencode(_default(o), _current_indent_level);
            _remove_from_markers(o);
            return ret;
        };

        const _iterencode_list = (arr, _current_indent_level) => {
            if (!arr.length) {
                return "[]";
            }
            _check_markers(arr);
            let buf, separator;
            [buf, _current_indent_level, separator] = _initialize_buffer("[", _current_indent_level);
            let first = true;
            for (let val of arr) {
                if (first) {
                    first = false;
                } else {
                    buf += separator;
                }
                buf += _iterencode(val, _current_indent_level);
            }
            _remove_from_markers(arr);
            return _finalize_buffer(buf, "]", _current_indent_level);
        };

        const _iterencode_dict = (dict, _current_indent_level) => {
            if (!dict.sq$length()) {
                return "{}";
            }
            _check_markers(dict);
            let buf, separator;
            [buf, _current_indent_level, separator] = _initialize_buffer("{", _current_indent_level);
            let first = true;
            if (_sort_keys) {
                const pyItems = pyCall(dict.tp$getattr(items_str));
                const sortedItems = sorted(pyItems);
                dict = pyCall(pyDict, [sortedItems]);
            }
            for (let [key, val] of dict.$items()) {
                const k = key.valueOf();
                const type = typeof k;
                if (type === "string") {
                    key = k;
                } else if (type === "number") {
                    key = _floatstr(key);
                } else if (type === "boolean" || k === null) {
                    key = String(k);
                } else if (JSBI.__isBigInt(k)) {
                    key = k.toString();
                } else if (_skipkeys) {
                    continue;
                } else {
                    throw new TypeError("keys must be str, int, float, bool or None, not " + typeName(key));
                }
                if (first) {
                    first = false;
                } else {
                    buf += separator;
                }
                buf += _encoder(key);
                buf += _key_separator;
                buf += _iterencode(val, _current_indent_level);
            }
            _remove_from_markers(dict);
            return _finalize_buffer(buf, "}", _current_indent_level);
        };

        const _iterencode = (o, _current_indent_level) => {
            return String(
                toJs(o, {
                    stringHook: (val) => _encoder(val),
                    numberHook: (val, obj) => _floatstr(obj),
                    bigintHook: (val) => val.toString(),
                    dictHook: (dict) => _iterencode_dict(dict, _current_indent_level),
                    arrayHook: (arr) => _iterencode_list(arr, _current_indent_level),
                    setHook: (o) => _unhandled(o, _current_indent_level),
                    funcHook: (val, obj) => _unhandled(obj, _current_indent_level),
                    objecthook: (val, obj) => _unhandled(obj, _current_indent_level),
                    unhandledHook: (obj) => _unhandled(obj, _current_indent_level),
                })
            );
        };

        return _iterencode;
    }

    const defaultEncoder = new JSONEncoder();

    const NUMBER_RE = /(-?(?:0|[1-9]\d*))(\.\d+)?([eE][-+]?\d+)?/;

    function make_scanner(context) {
        const {
            parse_object,
            parse_array,
            parse_string,
            parse_float,
            parse_int,
            parse_constant,
            object_hook,
            object_pairs_hook,
            strict,
            memo,
        } = context;
        /**
         * @param {string} string
         * @param {number} idx
         */
        const scan_once = (string, idx) => {
            const nextchar = string[idx];
            if (nextchar === undefined) {
                memo.clear();
                return;
            }

            if (nextchar === '"') {
                return parse_string(string, idx + 1, strict);
            } else if (nextchar === "{") {
                return parse_object([string, idx + 1], strict, _scan_once, object_hook, object_pairs_hook, memo);
            } else if (nextchar === "[") {
                return parse_array(string, idx + 1, _scan_once);
            } else if (nextchar === "n" && string.substr(idx, 4) === "null") {
                return [pyNone, idx + 4];
            } else if (nextchar === "t" && string.substr(idx, 4) === "true") {
                return [pyTrue, idx + 4];
            } else if (nextchar === "f" && string.substr(idx, 5) === "false") {
                return [pyFalse, idx + 4];
            }
            const m = string.substring(idx).match(NUMBER_RE);

            if (m !== null) {
                let res;
                const [match, integer, frac, exp] = m;
                if (frac || exp) {
                    res = parse_float(integer + (frac || "") + (exp || ""));
                } else {
                    res = parse_int(integer);
                }
                return [res, idx + match.length];
            } else if (nextchar === "N" && string.substr(idx, 3) === "NaN") {
                return [parse_constant("NaN"), idx + 3];
            } else if (nextchar == "I" && string.substr(idx, 8) === "Infinity") {
                return [parse_constant("Infinity"), idx + 8];
            } else if (nextchar == "-" && string.substr(idx, 9) === "-Infinity") {
                return [parse_constant("-Infinity"), idx + 9];
            } else {
                memo.clear();
                return;
            }
        };
        return scan_once;
    }

    const STRING_CHUNK = /.*?[^\\]"/m;

    function scan_string(s, end) {
        // get the end of the string
        const chunk = s.substr(end - 1).match(STRING_CHUNK);
        if (chunk === null) {
            throw new JSONDecodeError("Unterminated string starting at", s, end - 1);
        }
        try {
            // just let javascript deal with the string
            const string = JSON.stringify(chunk[0]);
            return [string, end + chunk[0].length - 1];
        } catch (e) {
            /** @todo */
            throw e;
        }
    }

    /*
    def JSONArray(s_and_end, scan_once, _w=WHITESPACE.match, _ws=WHITESPACE_STR):
    s, end = s_and_end
    values = []
    nextchar = s[end:end + 1]
    if nextchar in _ws:
        end = _w(s, end + 1).end()
        nextchar = s[end:end + 1]
    # Look-ahead for trivial empty array
    if nextchar == ']':
        return values, end + 1
    _append = values.append
    while True:
        try:
            value, end = scan_once(s, end)
        except StopIteration as err:
            raise JSONDecodeError("Expecting value", s, err.value) from None
        _append(value)
        nextchar = s[end:end + 1]
        if nextchar in _ws:
            end = _w(s, end + 1).end()
            nextchar = s[end:end + 1]
        end += 1
        if nextchar == ']':
            break
        elif nextchar != ',':
            raise JSONDecodeError("Expecting ',' delimiter", s, end - 1)
        try:
            if s[end] in _ws:
                end += 1
                if s[end] in _ws:
                    end = _w(s, end + 1).end()
        except IndexError:
            pass

    return values, end
    */
    const WHITESPACE = /[ \t\n\r]*/;
    function JSONArray(s, end, scan_once) {
        const values = [];
        let nextchar = s[end];
        const adjust_white_space = () => {
            if (nextchar === " " || nextchar === "\t" || nextchar === "\n" || nextchar === "\r") {
                const m = s.substr(end).match(WHITESPACE);
                end = end + m[0].length;
                nextchar = s[end];
            }
        }
        adjust_white_space();
        if (nextchar === "]") {
            return [values, end + 1];
        }
        while (true) {
            let value;
            try {
                [value, end] = scan_once(s, end);
            } catch (e) {
                throw e;
            }
            values.push(value);
            adjust_white_space();
            end += 1;
            if (nextchar === "]") {
                break;
            } else if (nextchar !== ",") {
                throw new JSONDecodeError("Expecting ',' deliminator", s, end - 1);
            }
            adjust_white_space();
        }
        return [values, end];
    }

    /*
    
    def JSONObject(s_and_end, strict, scan_once, object_hook, object_pairs_hook,
               memo=None, _w=WHITESPACE.match, _ws=WHITESPACE_STR):
    s, end = s_and_end
    pairs = []
    pairs_append = pairs.append
    # Backwards compatibility
    if memo is None:
        memo = {}
    memo_get = memo.setdefault
    # Use a slice to prevent IndexError from being raised, the following
    # check will raise a more specific ValueError if the string is empty
    nextchar = s[end:end + 1]
    # Normally we expect nextchar == '"'
    if nextchar != '"':
        if nextchar in _ws:
            end = _w(s, end).end()
            nextchar = s[end:end + 1]
        # Trivial empty object
        if nextchar == '}':
            if object_pairs_hook is not None:
                result = object_pairs_hook(pairs)
                return result, end + 1
            pairs = {}
            if object_hook is not None:
                pairs = object_hook(pairs)
            return pairs, end + 1
        elif nextchar != '"':
            raise JSONDecodeError(
                "Expecting property name enclosed in double quotes", s, end)
    end += 1
    while True:
        key, end = scanstring(s, end, strict)
        key = memo_get(key, key)
        # To skip some function call overhead we optimize the fast paths where
        # the JSON key separator is ": " or just ":".
        if s[end:end + 1] != ':':
            end = _w(s, end).end()
            if s[end:end + 1] != ':':
                raise JSONDecodeError("Expecting ':' delimiter", s, end)
        end += 1

        try:
            if s[end] in _ws:
                end += 1
                if s[end] in _ws:
                    end = _w(s, end + 1).end()
        except IndexError:
            pass

        try:
            value, end = scan_once(s, end)
        except StopIteration as err:
            raise JSONDecodeError("Expecting value", s, err.value) from None
        pairs_append((key, value))
        try:
            nextchar = s[end]
            if nextchar in _ws:
                end = _w(s, end + 1).end()
                nextchar = s[end]
        except IndexError:
            nextchar = ''
        end += 1

        if nextchar == '}':
            break
        elif nextchar != ',':
            raise JSONDecodeError("Expecting ',' delimiter", s, end - 1)
        end = _w(s, end).end()
        nextchar = s[end:end + 1]
        end += 1
        if nextchar != '"':
            raise JSONDecodeError(
                "Expecting property name enclosed in double quotes", s, end - 1)
    if object_pairs_hook is not None:
        result = object_pairs_hook(pairs)
        return result, end
    pairs = dict(pairs)
    if object_hook is not None:
        pairs = object_hook(pairs)
    return pairs, end
*/

    function JSONObject(s, end, strict, scan_once, object_hook, object_pairs_hook, memo) {
        const pairs = [];
        let nextchar = s[end]; 

    }

    class JSONDecoder {
        constructor() {

        }
        decode () {

        }
        white() {

        }
        constant() {

        }
        number () {

        }
        array() {

        }
        object() {

        }


    }

    json.dumps = new Sk.builtin.func((o) => {
        return defaultEncoder.encode(o);
    });

    return json;
}
