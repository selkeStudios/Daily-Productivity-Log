# test_popup.py
# Unit tests for popup utility functions
# Tests the formatTime function used in the popup UI

import unittest


def formatTime(ms):
    return ""


class TestFormatTime(unittest.TestCase):

    def test_zero_milliseconds(self):
        self.assertEqual(formatTime(0), "0m 0s")

    def test_seconds_only(self):
        self.assertEqual(formatTime(30000), "0m 30s")

    def test_minutes_and_seconds(self):
        self.assertEqual(formatTime(330000), "5m 30s")

    def test_hours_minutes_seconds(self):
        self.assertEqual(formatTime(5400000), "1h 30m 0s")

    def test_large_value(self):
        self.assertEqual(formatTime(36000000), "10h 0m 0s")

    def test_non_number_raises_error(self):
        with self.assertRaises(TypeError):
            formatTime("not a number")

    def test_negative_raises_error(self):
        with self.assertRaises(ValueError):
            formatTime(-1000)


if __name__ == "__main__":
    unittest.main()
