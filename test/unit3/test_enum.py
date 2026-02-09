import unittest
import enum
from enum import Enum, IntEnum, StrEnum, EnumMeta, EnumType, auto, unique


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


class TestEnumUnsupportedClassSyntax(unittest.TestCase):
    def test_class_kwargs_are_guarded(self):
        with self.assertRaisesRegex(NotImplementedError, "class keyword arguments"):
            class Bad(Enum, boundary=1):
                A = 1


if __name__ == "__main__":
    unittest.main()
