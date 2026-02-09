"""
Minimal enum support for Skulpt.

This module intentionally implements a focused subset of CPython's enum.
"""

__all__ = [
    "EnumMeta",
    "EnumType",
    "Enum",
    "IntEnum",
    "StrEnum",
    "Flag",
    "IntFlag",
    "auto",
    "unique",
]


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
        if clsname in ("Enum", "IntEnum", "StrEnum", "Flag", "IntFlag"):
            return cls

        member_type = object
        is_flag = False
        for base in bases:
            base_name = getattr(base, "__name__", "")
            if base_name in ("Flag", "IntFlag"):
                is_flag = True
            if base_name == "StrEnum":
                member_type = str
                break
            if isinstance(base, type) and issubclass(base, int):
                member_type = int
                break
            if base_name in ("Enum", "IntEnum", "StrEnum", "Flag", "IntFlag"):
                continue
            if isinstance(base, type):
                member_type = base
                break

        member_names = []
        member_map = {}
        value2member_map = {}
        last_values = []
        all_bits = 0

        for name, raw_value in _iter_member_items(classdict):
            value = raw_value
            if isinstance(value, auto):
                gen = getattr(cls, "_generate_next_value_")
                value = gen(name, 1, len(member_names), list(last_values))
            last_values.append(value)

            try:
                member = value2member_map[value]
                is_alias = True
            except Exception:
                is_alias = False
                if member_type is object:
                    member = object.__new__(cls)
                elif member_type is str and issubclass(cls, StrEnum):
                    member = cls.__new__(cls, value)
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
                if (
                    is_flag
                    and isinstance(value, int)
                    and value != 0
                    and (value & (value - 1)) == 0
                ):
                    member_names.append(name)
                elif not is_flag:
                    member_names.append(name)

            member_map[name] = member
            setattr(cls, name, member)
            if is_flag and isinstance(value, int):
                all_bits |= value

            if is_alias:
                continue

        cls._member_names_ = member_names
        cls._member_map_ = member_map
        cls._value2member_map_ = value2member_map
        cls._member_type_ = member_type
        if is_flag:
            cls._all_bits_ = all_bits
        return cls

    def __call__(cls, value, names=None, *args, **kwargs):
        if names is not None:
            return cls._create_(value, names, *args, **kwargs)
        if args:
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
                    if issubclass(cls, Flag) and isinstance(value, int):
                        return cls._create_pseudo_member_(value)
                    raise ValueError("%r is not a valid %s" % (value, cls.__name__))
                if isinstance(result, cls):
                    return result
                raise TypeError(
                    "error in %s._missing_: returned %r instead of None or a valid member"
                    % (cls.__name__, result)
                )
            if issubclass(cls, Flag) and isinstance(value, int):
                return cls._create_pseudo_member_(value)
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
        if start != 1 and cls not in (Flag, IntFlag):
            _unsupported("Enum(..., start=...)")

        if cls is Enum:
            if type is None:
                bases = (Enum,)
            else:
                bases = (type, Enum)
        elif type is None:
            bases = (cls,)
        else:
            bases = (type, cls)

        if isinstance(names, str):
            items = [n for n in names.replace(",", " ").split() if n]
            if cls in (Flag, IntFlag):
                mapping = [(n, start << i) for i, n in enumerate(items)]
            else:
                mapping = [(n, i + start) for i, n in enumerate(items)]
        elif isinstance(names, dict):
            mapping = list(names.items())
        else:
            pairs = list(names)
            if pairs and isinstance(pairs[0], str):
                if cls in (Flag, IntFlag):
                    mapping = [(n, start << i) for i, n in enumerate(pairs)]
                else:
                    mapping = [(n, i + start) for i, n in enumerate(pairs)]
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
    @staticmethod
    def _generate_next_value_(name, start, count, last_values):
        if last_values and isinstance(last_values[-1], int):
            return last_values[-1] + 1
        return start + count

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


class StrEnum(str, Enum):
    def __new__(cls, value):
        if not isinstance(value, str):
            raise TypeError("%r is not a string" % (value,))
        member = str.__new__(cls, value)
        member._value_ = value
        return member

    @staticmethod
    def _generate_next_value_(name, start, count, last_values):
        return name.lower()

    def __str__(self):
        return str.__str__(self)

    def __format__(self, spec):
        return str.__format__(self, spec)


class Flag(Enum):
    @staticmethod
    def _generate_next_value_(name, start, count, last_values):
        if last_values:
            last = last_values[-1]
            if isinstance(last, int) and last > 0:
                return last << 1
        return start

    @classmethod
    def _name_for_value_(cls, value):
        if value == 0:
            return None
        remaining = value
        parts = []
        for name in cls._member_names_:
            member = cls._member_map_[name]
            bit = member.value
            if bit != 0 and (remaining & bit) == bit:
                parts.append(name)
                remaining &= ~bit
        if remaining == 0 and parts:
            return "|".join(parts)
        return None

    @classmethod
    def _create_pseudo_member_(cls, value):
        try:
            return cls._value2member_map_[value]
        except Exception:
            member = object.__new__(cls)
            member._name_ = cls._name_for_value_(value)
            member._value_ = value
            cls._value2member_map_[value] = member
            return member

    def __or__(self, other):
        if isinstance(other, self.__class__):
            return self.__class__(self.value | other.value)
        return NotImplemented

    def __and__(self, other):
        if isinstance(other, self.__class__):
            return self.__class__(self.value & other.value)
        return NotImplemented

    def __xor__(self, other):
        if isinstance(other, self.__class__):
            return self.__class__(self.value ^ other.value)
        return NotImplemented

    def __invert__(self):
        return self.__class__(self.__class__._all_bits_ & ~self.value)

    def __str__(self):
        if self._name_ is None:
            return "%s(%r)" % (self.__class__.__name__, self._value_)
        return "%s.%s" % (self.__class__.__name__, self._name_)

    def __repr__(self):
        if self._name_ is None:
            return "<%s: %r>" % (self.__class__.__name__, self._value_)
        return "<%s.%s: %r>" % (
            self.__class__.__name__,
            self._name_,
            self._value_,
        )


class IntFlag(int, Flag):
    @classmethod
    def _create_pseudo_member_(cls, value):
        try:
            return cls._value2member_map_[value]
        except Exception:
            member = int.__new__(cls, value)
            member._name_ = cls._name_for_value_(value)
            member._value_ = value
            cls._value2member_map_[value] = member
            return member

    def __or__(self, other):
        if isinstance(other, int):
            return self.__class__(int(self) | int(other))
        return NotImplemented

    def __ror__(self, other):
        if isinstance(other, int):
            return self.__class__(int(other) | int(self))
        return NotImplemented

    def __and__(self, other):
        if isinstance(other, int):
            return self.__class__(int(self) & int(other))
        return NotImplemented

    def __rand__(self, other):
        if isinstance(other, int):
            return self.__class__(int(other) & int(self))
        return NotImplemented

    def __xor__(self, other):
        if isinstance(other, int):
            return self.__class__(int(self) ^ int(other))
        return NotImplemented

    def __rxor__(self, other):
        if isinstance(other, int):
            return self.__class__(int(other) ^ int(self))
        return NotImplemented

    def __invert__(self):
        return self.__class__(self.__class__._all_bits_ & ~int(self))

    def __str__(self):
        return int.__str__(self)

    def __format__(self, spec):
        if spec == "":
            return format(str(self), spec)
        return int.__format__(self, spec)


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
