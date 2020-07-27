export function isArrayLike (object) {
    if (object instanceof Array || (object && object.length && typeof object.length == "number")) {
        return true;
    }
    return false;
};
