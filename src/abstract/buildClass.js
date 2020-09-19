import { pyStr, pyTuple, pyType, pyCall } from "../internal";
/**
 * @function
 * @description
 * Constructs a class object given a code object representing the body
 * of the class, the name of the class, and the list of bases.
 *
 * There are no "old-style" classes in Skulpt, so use the user-specified
 * metaclass (todo;) if there is one, the type of the 0th base class if
 * there's bases, or otherwise the 'type' type.
 *
 * The func code object is passed a (js) dict for its locals which it
 * stores everything into.
 *
 * The metaclass is then called as metaclass(name, bases, locals) and
 * should return a newly constructed class object.
 *
 */
export function buildClass(globals, func, name, bases, cell) {
    // todo; metaclass
    const meta = pyType;

    const l_cell = cell === undefined ? {} : cell;
    const locals = {};

    // init the dict for the class
    func(globals, locals, l_cell);
    // ToDo: check if func contains the __meta__ attribute
    // or if the bases contain __meta__
    // new Syntax would be different

    // file's __name__ is class's __module__
    if (globals["__name__"]) {
        // some js modules haven't set their module name and we shouldn't set a dictionary value to be undefined that should be equivalent to deleting a value;
        locals.__module__ = globals["__name__"];
    }
    const _name = new pyStr(name);
    const _bases = new pyTuple(bases);
    // build array for python dict
    const arr = [];
    Object.entries(locals).forEach(([key, val]) => {
        arr.push(new pyStr(key));
        arr.push(val);
    });
    const _locals = new pyDict(arr);

    const klass = pyCall(meta, [_name, _bases, _locals]);

    return klass;
}
