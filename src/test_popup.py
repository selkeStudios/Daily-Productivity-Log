
# Unit tests for popup utility functions
# Tests the formatTime function used in the popup UI

import unittest


def formatTime(ms):

    """
    Python version of the formatTime function from popup.js
    Converts milliseconds into readable 'Xh Xm Xs' format
    """
    
    if not isinstance(ms, (int, float)):
        raise TypeError("Input must be a number")
    if ms < 0:
        raise ValueError("Input must be non-negative")
 
    seconds = int((ms / 1000) % 60)
    minutes = int((ms / (1000 * 60)) % 60)
    hours = int(ms / (1000 * 60 * 60))
 
    if hours > 0:
        return f"{hours}h {minutes}m {seconds}s"
    else:
        return f"{minutes}m {seconds}s"

"Test cases for the formatTime utility function"
class TestFormatTime(unittest.TestCase):

    def test_zero_milliseconds(self):
        "0ms should return 0m 0s"
        self.assertEqual(formatTime(0), "0m 0s")

    def test_seconds_only(self):
        "30 seconds should return 0m 30s"
        self.assertEqual(formatTime(30000), "0m 30s")

    def test_minutes_and_seconds(self):
        "5 minutes 30 seconds should return 5m 30s"
        self.assertEqual(formatTime(330000), "5m 30s")

    def test_hours_minutes_seconds(self):
        "1 hour 30 minutes should return 1h 30m 0s"
        self.assertEqual(formatTime(5400000), "1h 30m 0s")

    def test_large_value(self):
        "10 hours should return 10h 0m 0s"
        self.assertEqual(formatTime(36000000), "10h 0m 0s")

    def test_non_number_raises_error(self):
        "Non-number input should raise TypeError"
        with self.assertRaises(TypeError):
            formatTime("not a number")

    def test_negative_raises_error(self):
        "Negative input should raise ValueError"
        with self.assertRaises(ValueError):
            formatTime(-1000)


if __name__ == "__main__":
    unittest.main()
