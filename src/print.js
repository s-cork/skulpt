import {
    pyExc,
    pyStr,
    pyCall,
    keywordArrayToNamedArgs,
    checkNone,
    checkString,
    typeName,
    objectLookupSpecial,
    pyCallOrSuspend,
    chainOrSuspend,
    // importModule,
} from "./internal";

export function print(args, kwargs) {
    /** @todo flush is allowed but has no effect */
    let [sep, end, file] = keywordArrayToNamedArgs("print", ["sep", "end", "file", "flush"], [], kwargs);

    // check for sep; string or None
    if (sep === undefined || checkNone(sep)) {
        sep = " ";
    } else if (checkString(sep)) {
        sep = sep.toString();
    } else {
        throw new pyExc.TypeError("sep must be None or a string, not " + typeName(sep));
    }

    // check for end; string or None
    if (end === undefined || checkNone(end)) {
        end = "\n";
    } else if (checkString(end)) {
        end = end.toString();
    } else {
        throw new pyExc.TypeError("end must be None or a string, not " + typeName(end));
    }

    // check for file and get the file_write function if it exists
    let file_write;
    if (file !== undefined && !checkNone(file)) {
        file_write = objectLookupSpecial(file, pyStr.$write);
        if (file_write === undefined) {
            throw new pyExc.AttributeError("'" + typeName(file) + "' object has no attribute 'write'");
        }
    }

    // loop through outputs and create output string
    const output = new pyStr(args.map((x) => x.toString()).join(sep) + end);

    if (file_write !== undefined) {
        // currently not tested, though it seems that we need to see how we should access the write function in a correct manner
        pyCall(file_write, [output]);
    } else {
        return chainOrSuspend(importModule("sys", false, true), (sys) => {
            file_write = objectLookupSpecial(sys.$d.stdout, pyStr.$write);
            return file_write && pyCallOrSuspend(file_write, [output]);
        });
    }
};
