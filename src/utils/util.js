export const buildInfo = {
    githash: GITHASH,
    date: BUILDDATE
};


export function isArrayLike(object) {
    if ((Array.isArray(object)) || (object && object.length && (typeof object.length == "number"))) {
        return true;
    }
    return false;
};

export function js_beautify(x) {
    return x;
};
