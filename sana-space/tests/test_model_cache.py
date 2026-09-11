import importlib
import logging
import sys
import types
import unittest


class FakeModel:
    def eval(self):
        return self

    def to(self, device):
        self.device = device
        return self


class ModelCacheTests(unittest.TestCase):
    def test_model_and_tokenizer_load_only_once(self):
        calls = {"model": 0, "tokenizer": 0}

        class FakeAutoModel:
            @classmethod
            def from_pretrained(cls, *args, **kwargs):
                calls["model"] += 1
                return FakeModel()

        class FakeAutoTokenizer:
            @classmethod
            def from_pretrained(cls, *args, **kwargs):
                calls["tokenizer"] += 1
                return object()

        fake_torch = types.SimpleNamespace(bfloat16="bfloat16", inference_mode=lambda: None)
        fake_transformers = types.SimpleNamespace(
            AutoModelForCausalLM=FakeAutoModel,
            AutoTokenizer=FakeAutoTokenizer,
        )
        original_torch = sys.modules.get("torch")
        original_transformers = sys.modules.get("transformers")
        sys.modules["torch"] = fake_torch
        sys.modules["transformers"] = fake_transformers
        sys.modules.pop("model_service", None)
        try:
            service = importlib.import_module("model_service")
            service.get_model()
            service.get_model()
            service.get_model()
            self.assertEqual(calls, {"model": 1, "tokenizer": 1})
        finally:
            sys.modules.pop("model_service", None)
            if original_torch is not None:
                sys.modules["torch"] = original_torch
            else:
                sys.modules.pop("torch", None)
            if original_transformers is not None:
                sys.modules["transformers"] = original_transformers
            else:
                sys.modules.pop("transformers", None)


if __name__ == "__main__":
    unittest.main()
