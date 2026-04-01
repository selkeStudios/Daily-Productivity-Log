
# Unit tests for the formatTime utility function in popup.js
# Using pytest framework

import pytest


def formatTime(ms):
    """
    Python version of the formatTime function from popup.js
    Converts milliseconds into readable 'Xh Xm Xs' format
    """
    return ""


# Basic conversion tests 

def test_zero():
    "0 milliseconds should return 0m 0s"
    assert formatTime(0) == "0m 0s"

def test_seconds():
    "30 seconds should show minutes and seconds"
    assert formatTime(30000) == "0m 30s"

def test_minutes():
    "5 min 30 sec should format correctly"
    assert formatTime(330000) == "5m 30s"

def test_hours():
    "1 hour 30 min should include hours"
    assert formatTime(5400000) == "1h 30m 0s"

def test_large():
    "10 hours should handle large values"
    assert formatTime(36000000) == "10h 0m 0s"


# Error handling tests 

def test_bad_input():
    "String input should raise TypeError"
    with pytest.raises(TypeError):
        formatTime("hello")

def test_negative():
    "Negative input should raise ValueError"
    with pytest.raises(ValueError):
        formatTime(-1000)