import unittest

from safety import assess_safety


class SafetyTests(unittest.TestCase):
    def test_imminent_intent(self):
        self.assertEqual(assess_safety("I am going to kill myself tonight").level, "imminent")

    def test_possible_current_risk(self):
        self.assertEqual(assess_safety("I want to die").level, "concern")

    def test_historical_context_is_not_immediate(self):
        self.assertEqual(assess_safety("Years ago I used to self-harm; I am safe now").level, "normal")

    def test_ordinary_distress(self):
        self.assertEqual(assess_safety("My dissertation feels overwhelming").level, "normal")


if __name__ == "__main__":
    unittest.main()
