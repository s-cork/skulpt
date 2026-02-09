"""
Minimal enum support for Skulpt.

This module intentionally implements a focused subset of CPython's enum.
"""

__all__ = ["EnumMeta", "EnumType", "Enum", "IntEnum", "auto", "unique"]


def _unsupported(feature):
    raise NotImplementedError(feature + " is not supported in skulpt.enum")


class auto:
    def __repr__(self):
        return "auto()"


def _is_descriptor(obj):
    return (
        hasattr(obj, "__get__")
        or hasattr(obj, "__set__")
        or hasattr(obj, "__delete__")
    )


def _is_member_name(name):
    return not (name.startswith("_") and name.endswith("_"))


def _iter_member_items(classdict):
    for name, value in classdict.items():
        if name in ("__module__", "__qualname__", "__doc__", "__annotations__"):
            continue
        if not _is_member_name(name):
            continue
        if callable(value) or _is_descriptor(value):
            continue
        yield name, value


class EnumMeta(type):
    def __new__(mcls, clsname, bases, classdict, **kwargs):
        if kwargs:
            _unsupported("Enum class keyword arguments")
        cls = type.__new__(mcls, clsname, bases, dict(classdict))

        is_enum_subclass = any(isinstance(base, EnumMeta) for base in bases)
        if not is_enum_subclass:
            return cls
        if clsname in ("Enum", "IntEnum"):
            return cls

        member_type = object
        for base in bases:
            if isinstance(base, type) and issubclass(base, int):
                member_type = int
                break
            if base in (Enum, IntEnum):
                continue
            if isinstance(base, type):
                member_type = base
                break

        member_names = []
        member_map = {}
        value2member_map = {}
        next_auto = 1

        for name, raw_value in _iter_member_items(classdict):
            value = raw_value
            if isinstance(value, auto):
                value = next_auto
                next_auto += 1
            elif isinstance(value, int) and value >= next_auto:
                next_auto = value + 1

            try:
                member = value2member_map[value]
                is_alias = True
            except Exception:
                is_alias = False
                if member_type is object:
                    member = object.__new__(cls)
                else:
                    member = member_type.__new__(cls, value)
                member._name_ = name
                member._value_ = value
                if hasattr(member, "__dict__"):
                    member.__dict__["_name_"] = name
                    member.__dict__["_value_"] = value
                try:
                    value2member_map[value] = member
                except TypeError:
                    pass
                member_names.append(name)

            member_map[name] = member
            setattr(cls, name, member)

            if is_alias:
                continue

        cls._member_names_ = member_names
        cls._member_map_ = member_map
        cls._value2member_map_ = value2member_map
        return cls

    def __call__(cls, value, names=None, *args, **kwargs):
        if cls is Enum:
            if names is None:
                raise TypeError(
                    "Enum() missing required argument 'names' when creating a new enum"
                )
            return cls._create_(value, names, *args, **kwargs)
        if names is not None or args:
            raise TypeError("Cannot create enum members with multiple arguments")
        return cls._value_to_member(value)

    def _value_to_member(cls, value):
        try:
            return cls._value2member_map_[value]
        except Exception:
            for member in cls:
                if member.value == value:
                    return member
            missing = getattr(cls, "_missing_", None)
            if missing is not None:
                result = missing(value)
                if result is None:
                    raise ValueError("%r is not a valid %s" % (value, cls.__name__))
                if isinstance(result, cls):
                    return result
                raise TypeError(
                    "error in %s._missing_: returned %r instead of None or a valid member"
                    % (cls.__name__, result)
                )
            raise ValueError("%r is not a valid %s" % (value, cls.__name__))

    def __iter__(cls):
        for name in cls._member_names_:
            yield cls._member_map_[name]

    def __len__(cls):
        return len(cls._member_names_)

    def __getitem__(cls, name):
        return cls._member_map_[name]

    def __setattr__(cls, name, value):
        member_map = getattr(cls, "_member_map_", None)
        if member_map and name in member_map:
            raise AttributeError("cannot reassign member %r" % (name,))
        return type.__setattr__(cls, name, value)

    def __delattr__(cls, name):
        member_map = getattr(cls, "_member_map_", None)
        if member_map and name in member_map:
            raise AttributeError("cannot delete member %r" % (name,))
        return type.__delattr__(cls, name)

    @property
    def __members__(cls):
        return dict(cls._member_map_)

    def _create_(cls, name, names, *, module=None, qualname=None, type=None, start=1):
        if qualname is not None:
            _unsupported("Enum(..., qualname=...)")
        if start != 1:
            _unsupported("Enum(..., start=...)")

        if type is None:
            bases = (Enum,)
        else:
            bases = (type, Enum)

        if isinstance(names, str):
            items = [n for n in names.replace(",", " ").split() if n]
            mapping = [(n, i + 1) for i, n in enumerate(items)]
        elif isinstance(names, dict):
            mapping = list(names.items())
        else:
            pairs = list(names)
            if pairs and isinstance(pairs[0], str):
                mapping = [(n, i + 1) for i, n in enumerate(pairs)]
            else:
                mapping = pairs

        ns = {"__module__": module if module is not None else "__main__"}
        for item_name, item_value in mapping:
            ns[item_name] = item_value
        if qualname is not None:
            ns["__qualname__"] = qualname
        return EnumMeta(name, bases, ns)


EnumType = EnumMeta


class Enum(metaclass=EnumMeta):
    @classmethod
    def _missing_(cls, value):
        return None

    @property
    def name(self):
        return self._name_

    @property
    def value(self):
        return self._value_

    def __repr__(self):
        return "<%s.%s: %r>" % (
            self.__class__.__name__,
            self._name_,
            self._value_,
        )

    def __str__(self):
        return "%s.%s" % (self.__class__.__name__, self._name_)

    def __format__(self, spec):
        return format(str(self), spec)

    def __hash__(self):
        return hash(self._name_)

    def __reduce_ex__(self, proto):
        return self.__class__, (self._value_,)


class IntEnum(int, Enum):
    pass


def unique(enumeration):
    duplicates = []
    for name, member in enumeration.__members__.items():
        if member.name != name:
            duplicates.append((name, member.name))
    if duplicates:
        details = ", ".join(
            ["%s -> %s" % (alias, canonical) for alias, canonical in duplicates]
        )
        raise ValueError("duplicate values found in %r: %s" % (enumeration, details))
    return enumeration
