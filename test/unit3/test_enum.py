import unittest
import enum
from collections import OrderedDict
from enum import Enum, IntEnum, StrEnum, Flag, IntFlag, EnumMeta, EnumType, auto, unique


class TestEnumBasics(unittest.TestCase):
    def test_public_symbols(self):
        self.assertIs(EnumMeta, EnumType)
        self.assertIs(enum.Enum, Enum)
        self.assertIs(enum.IntEnum, IntEnum)
        self.assertIs(enum.StrEnum, StrEnum)
        self.assertIs(enum.auto, auto)
        self.assertIs(enum.unique, unique)

    def test_member_name_and_value(self):
        class Color(Enum):
            RED = 1
            BLUE = 2

        self.assertEqual(Color.RED.name, "RED")
        self.assertEqual(Color.RED.value, 1)
        self.assertEqual(Color.BLUE.name, "BLUE")
        self.assertEqual(Color.BLUE.value, 2)

    def test_iteration_and_length(self):
        class Color(Enum):
            RED = 1
            BLUE = 2
            GREEN = 3

        self.assertEqual([m.name for m in Color], ["RED", "BLUE", "GREEN"])
        self.assertEqual(len(Color), 3)

    def test_lookup_by_name_and_value(self):
        class Color(Enum):
            RED = 1
            BLUE = 2

        self.assertIs(Color["RED"], Color.RED)
        self.assertIs(Color(2), Color.BLUE)
        with self.assertRaises(ValueError):
            Color(99)

    def test_dunder_members(self):
        class Color(Enum):
            RED = 1
            BLUE = 2

        members = Color.__members__
        self.assertEqual(list(members.keys()), ["RED", "BLUE"])
        self.assertIs(members["RED"], Color.RED)

    def test_aliases(self):
        class Shape(Enum):
            SQUARE = 1
            BOX = 1
            CIRCLE = 2

        self.assertIs(Shape.SQUARE, Shape.BOX)
        self.assertEqual([m.name for m in Shape], ["SQUARE", "CIRCLE"])
        self.assertEqual(list(Shape.__members__.keys()), ["SQUARE", "BOX", "CIRCLE"])

    def test_auto_assigns_incrementing_values(self):
        class Number(Enum):
            ONE = auto()
            TWO = auto()
            THREE = auto()

        self.assertEqual(Number.ONE.value, 1)
        self.assertEqual(Number.TWO.value, 2)
        self.assertEqual(Number.THREE.value, 3)

    def test_auto_after_explicit_value(self):
        class Number(Enum):
            ONE = 5
            TWO = auto()
            THREE = auto()

        self.assertEqual(Number.ONE.value, 5)
        self.assertEqual(Number.TWO.value, 6)
        self.assertEqual(Number.THREE.value, 7)

    def test_generate_next_value_override(self):
        class Number(Enum):
            @staticmethod
            def _generate_next_value_(name, start, count, last_values):
                return count * 10

            ONE = auto()
            TWO = auto()
            THREE = auto()

        self.assertEqual(Number.ONE.value, 0)
        self.assertEqual(Number.TWO.value, 10)
        self.assertEqual(Number.THREE.value, 20)

    def test_unique(self):
        @unique
        class Number(Enum):
            ONE = 1
            TWO = 2

        self.assertIs(Number.ONE, Number(1))

        with self.assertRaises(ValueError):
            @unique
            class Bad(Enum):
                ONE = 1
                UNO = 1

    def test_int_enum(self):
        class HTTP(IntEnum):
            OK = 200
            NOT_FOUND = 404

        self.assertTrue(isinstance(HTTP.OK, int))
        self.assertEqual(HTTP.OK + 1, 201)
        self.assertIs(HTTP(404), HTTP.NOT_FOUND)

    def test_str_enum(self):
        class Color(StrEnum):
            RED = "red"
            BLUE = "blue"

        self.assertTrue(isinstance(Color.RED, str))
        self.assertEqual(Color.RED.value, "red")
        self.assertEqual(str(Color.RED), "red")
        self.assertEqual(format(Color.RED, ""), "red")
        self.assertIs(Color("red"), Color.RED)

    def test_str_enum_auto_lowercases(self):
        class Build(StrEnum):
            DEBUG = auto()
            RELEASE = auto()

        self.assertEqual(Build.DEBUG.value, "debug")
        self.assertEqual(Build.RELEASE.value, "release")

    def test_str_enum_requires_str_values(self):
        with self.assertRaisesRegex(TypeError, "not a string"):
            class Bad(StrEnum):
                A = 1

    def test_repr_str(self):
        class Color(Enum):
            RED = 1

        self.assertEqual(str(Color.RED), "Color.RED")
        self.assertEqual(repr(Color.RED), "<Color.RED: 1>")

    def test_member_reassignment_is_blocked(self):
        class Color(Enum):
            RED = 1

        with self.assertRaisesRegex(AttributeError, "cannot reassign member"):
            Color.RED = 2

    def test_member_deletion_is_blocked(self):
        class Color(Enum):
            RED = 1

        with self.assertRaisesRegex(AttributeError, "cannot delete member"):
            del Color.RED

    def test_missing_hook(self):
        class Color(Enum):
            RED = 1
            BLUE = 2

            @classmethod
            def _missing_(cls, value):
                if value == "red":
                    return cls.RED
                return None

        self.assertIs(Color("red"), Color.RED)
        with self.assertRaises(ValueError):
            Color("unknown")

    def test_missing_hook_invalid_return(self):
        class Color(Enum):
            RED = 1

            @classmethod
            def _missing_(cls, value):
                return "bad"

        with self.assertRaisesRegex(TypeError, "returned"):
            Color(2)


class TestEnumFunctionalApi(unittest.TestCase):
    def test_functional_string_names(self):
        Color = Enum("Color", "RED BLUE")
        self.assertEqual([m.value for m in Color], [1, 2])
        self.assertIs(Color(1), Color.RED)

    def test_functional_dict_names(self):
        Color = Enum("Color", {"RED": 3, "BLUE": 5})
        self.assertEqual(Color.RED.value, 3)
        self.assertEqual(Color.BLUE.value, 5)

    def test_functional_sequence_of_names(self):
        Color = Enum("Color", ["RED", "BLUE"])
        self.assertEqual(Color.RED.value, 1)
        self.assertEqual(Color.BLUE.value, 2)

    def test_functional_sequence_of_pairs(self):
        Color = Enum("Color", [("RED", 10), ("BLUE", 20)])
        self.assertEqual(Color.RED.value, 10)
        self.assertEqual(Color.BLUE.value, 20)

    def test_functional_with_type(self):
        HTTP = Enum("HTTP", [("OK", 200), ("NOT_FOUND", 404)], type=int)
        self.assertTrue(isinstance(HTTP.OK, int))
        self.assertEqual(HTTP.OK + 1, 201)

    def test_functional_unsupported_options_raise(self):
        with self.assertRaisesRegex(NotImplementedError, "qualname"):
            Enum("Color", "RED BLUE", qualname="Q")
        with self.assertRaisesRegex(NotImplementedError, "start"):
            Enum("Color", "RED BLUE", start=3)


class TestIntFlag(unittest.TestCase):
    class Perm(IntFlag):
        R = 1 << 2
        W = 1 << 1
        X = 1 << 0

    class Open(IntFlag):
        RO = 0
        WO = 1
        RW = 2
        AC = 3
        CE = 1 << 4

    class Color(IntFlag):
        BLACK = 0
        RED = 1
        ROJO = 1
        GREEN = 2
        BLUE = 4
        PURPLE = RED | BLUE
        WHITE = RED | GREEN | BLUE
        BLANCO = RED | GREEN | BLUE

    def test_public_symbols(self):
        self.assertIs(enum.Flag, Flag)
        self.assertIs(enum.IntFlag, IntFlag)

    def test_type(self):
        Perm = self.Perm
        self.assertTrue(Perm._member_type_ is int)
        for f in Perm:
            self.assertTrue(isinstance(f, Perm))
            self.assertEqual(f, f.value)
        self.assertTrue(isinstance(Perm.W | Perm.X, Perm))
        self.assertEqual(Perm.W | Perm.X, 3)

    def test_auto_generates_powers_of_two(self):
        class Bits(IntFlag):
            A = auto()
            B = auto()
            C = auto()

        self.assertEqual(Bits.A.value, 1)
        self.assertEqual(Bits.B.value, 2)
        self.assertEqual(Bits.C.value, 4)

    def test_iter_matches_cpython_behavior(self):
        Color = self.Color
        Open = self.Open
        self.assertEqual(list(Color), [Color.RED, Color.GREEN, Color.BLUE])
        self.assertEqual(list(Open), [Open.WO, Open.RW, Open.CE])

    def test_format(self):
        Perm = self.Perm
        self.assertEqual(format(Perm.R, ""), "4")
        self.assertEqual(format(Perm.R | Perm.X, ""), "5")
        class NewPerm(IntFlag):
            R = 1 << 2
            W = 1 << 1
            X = 1 << 0
            def __str__(self):
                return self._name_
        self.assertEqual(format(NewPerm.R, ""), "R")
        self.assertEqual(format(NewPerm.R | Perm.X, ""), "R|X")

    def test_or(self):
        Perm = self.Perm
        for i in Perm:
            for j in Perm:
                self.assertEqual(i | j, i.value | j.value)
                self.assertEqual((i | j).value, i.value | j.value)
                self.assertIs(type(i | j), Perm)
            for j in range(8):
                self.assertEqual(i | j, i.value | j)
                self.assertEqual((i | j).value, i.value | j)
                self.assertIs(type(i | j), Perm)
                self.assertEqual(j | i, j | i.value)
                self.assertEqual((j | i).value, j | i.value)
                self.assertIs(type(j | i), Perm)
        for i in Perm:
            self.assertIs(i | i, i)
            self.assertIs(i | 0, i)
            self.assertIs(0 | i, i)

    def test_and(self):
        Perm = self.Perm
        RW = Perm.R | Perm.W
        RX = Perm.R | Perm.X
        WX = Perm.W | Perm.X
        RWX = Perm.R | Perm.W | Perm.X
        values = list(Perm) + [RW, RX, WX, RWX, Perm(0)]
        for i in values:
            for j in values:
                self.assertEqual(i & j, i.value & j.value)
                self.assertEqual((i & j).value, i.value & j.value)
                self.assertIs(type(i & j), Perm)
            for j in range(8):
                self.assertEqual(i & j, i.value & j)
                self.assertEqual((i & j).value, i.value & j)
                self.assertIs(type(i & j), Perm)
                # Skulpt currently routes reverse int & IntFlag through int ops.
                ji = j & i
                self.assertEqual(ji, j & i.value)
                if isinstance(ji, Perm):
                    self.assertEqual(ji.value, j & i.value)

    def test_xor(self):
        Perm = self.Perm
        for i in Perm:
            for j in Perm:
                self.assertEqual(i ^ j, i.value ^ j.value)
                self.assertEqual((i ^ j).value, i.value ^ j.value)
                self.assertIs(type(i ^ j), Perm)
            for j in range(8):
                self.assertEqual(i ^ j, i.value ^ j)
                self.assertEqual((i ^ j).value, i.value ^ j)
                self.assertIs(type(i ^ j), Perm)
                self.assertEqual(j ^ i, j ^ i.value)
                self.assertEqual((j ^ i).value, j ^ i.value)
                self.assertIs(type(j ^ i), Perm)
        for i in Perm:
            self.assertIs(i ^ 0, i)
            self.assertIs(0 ^ i, i)

    def test_invert(self):
        Perm = self.Perm
        RW = Perm.R | Perm.W
        RX = Perm.R | Perm.X
        WX = Perm.W | Perm.X
        RWX = Perm.R | Perm.W | Perm.X
        values = list(Perm) + [RW, RX, WX, RWX, Perm(0)]
        for i in values:
            self.assertEqual(~i, (~i).value)
            self.assertIs(type(~i), Perm)
            self.assertEqual(~~i, i)
        for i in Perm:
            self.assertIs(~~i, i)

    def test_programatic_function_string(self):
        Perm = IntFlag("Perm", "R W X")
        lst = list(Perm)
        self.assertEqual(len(lst), len(Perm))
        self.assertEqual(len(Perm), 3)
        self.assertEqual(lst, [Perm.R, Perm.W, Perm.X])
        for i, n in enumerate("R W X".split()):
            v = 1 << i
            e = Perm(v)
            self.assertEqual(e.value, v)
            self.assertEqual(type(e.value), int)
            self.assertEqual(e, v)
            self.assertEqual(e.name, n)
            self.assertIn(e, Perm)
            self.assertIs(type(e), Perm)

    def test_programatic_function_string_with_start(self):
        Perm = IntFlag("Perm", "R W X", start=8)
        lst = list(Perm)
        self.assertEqual(len(lst), len(Perm))
        self.assertEqual(len(Perm), 3)
        self.assertEqual(lst, [Perm.R, Perm.W, Perm.X])
        for i, n in enumerate("R W X".split()):
            v = 8 << i
            e = Perm(v)
            self.assertEqual(e.value, v)
            self.assertEqual(type(e.value), int)
            self.assertEqual(e, v)
            self.assertEqual(e.name, n)
            self.assertIn(e, Perm)
            self.assertIs(type(e), Perm)

    def test_programatic_function_string_list(self):
        Perm = IntFlag("Perm", ["R", "W", "X"])
        lst = list(Perm)
        self.assertEqual(len(lst), len(Perm))
        self.assertEqual(len(Perm), 3)
        self.assertEqual(lst, [Perm.R, Perm.W, Perm.X])
        for i, n in enumerate("R W X".split()):
            v = 1 << i
            e = Perm(v)
            self.assertEqual(e.value, v)
            self.assertEqual(type(e.value), int)
            self.assertEqual(e, v)
            self.assertEqual(e.name, n)
            self.assertIn(e, Perm)
            self.assertIs(type(e), Perm)

    def test_programatic_function_iterable(self):
        Perm = IntFlag("Perm", (("R", 2), ("W", 8), ("X", 32)))
        lst = list(Perm)
        self.assertEqual(len(lst), len(Perm))
        self.assertEqual(len(Perm), 3)
        self.assertEqual(lst, [Perm.R, Perm.W, Perm.X])
        for i, n in enumerate("R W X".split()):
            v = 1 << (2 * i + 1)
            e = Perm(v)
            self.assertEqual(e.value, v)
            self.assertEqual(type(e.value), int)
            self.assertEqual(e, v)
            self.assertEqual(e.name, n)
            self.assertIn(e, Perm)
            self.assertIs(type(e), Perm)

    def test_programatic_function_from_dict(self):
        Perm = IntFlag("Perm", OrderedDict((("R", 2), ("W", 8), ("X", 32))))
        lst = list(Perm)
        self.assertEqual(len(lst), len(Perm))
        self.assertEqual(len(Perm), 3)
        self.assertEqual(lst, [Perm.R, Perm.W, Perm.X])
        for i, n in enumerate("R W X".split()):
            v = 1 << (2 * i + 1)
            e = Perm(v)
            self.assertEqual(e.value, v)
            self.assertEqual(type(e.value), int)
            self.assertEqual(e, v)
            self.assertEqual(e.name, n)
            self.assertIn(e, Perm)
            self.assertIs(type(e), Perm)


class TestEnumUnsupportedClassSyntax(unittest.TestCase):
    def test_class_kwargs_are_guarded(self):
        with self.assertRaisesRegex(NotImplementedError, "class keyword arguments"):
            class Bad(Enum, boundary=1):
                A = 1

    def test_intflag_boundary_is_guarded(self):
        with self.assertRaisesRegex(NotImplementedError, "class keyword arguments"):
            class Bad(IntFlag, boundary=1):
                A = 1


if __name__ == "__main__":
    unittest.main()
