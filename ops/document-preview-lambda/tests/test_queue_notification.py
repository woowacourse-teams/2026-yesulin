import unittest
from copy import deepcopy

from queue_notification import merge


PREFIX = "team-a/dev/private/pdf-extractions/originals/"
OTHER_PREFIX = "team/a-dev/private/pdf-extractions/originals/"
LEGACY_ID = "review-documents-team-a-dev-private-pdf-extractions-originals"


def queue_rule(prefix, queue, notification_id=LEGACY_ID):
    return {"Id": notification_id, "QueueArn": queue, "Events": ["s3:ObjectCreated:*"],
            "Filter": {"Key": {"FilterRules": [{"Name": "prefix", "Value": prefix}]}}}


class QueueNotifications(unittest.TestCase):
    def test_legacy_collision_keeps_both_queues_and_migrates_its_own_rule(self):
        old = queue_rule(OTHER_PREFIX, "old")
        config = {"QueueConfigurations": [old], "EventBridgeConfiguration": {}}
        merge(config, "one", PREFIX)
        current = config["QueueConfigurations"][-1]
        self.assertEqual([old, current], config["QueueConfigurations"])
        self.assertNotEqual(LEGACY_ID, current["Id"])

        merge(config, "two", OTHER_PREFIX)
        migrated = config["QueueConfigurations"][-1]
        self.assertEqual([current, migrated], config["QueueConfigurations"])
        self.assertEqual("two", migrated["QueueArn"])
        self.assertNotIn(migrated["Id"], (LEGACY_ID, current["Id"]))
        expected = deepcopy(config)
        self.assertEqual(expected, merge(config, "two", OTHER_PREFIX))
        self.assertEqual({}, config["EventBridgeConfiguration"])

    def test_legacy_id_with_another_event_or_filter_is_preserved(self):
        for changed in ("event", "suffix"):
            with self.subTest(changed=changed):
                other = queue_rule(PREFIX, "existing")
                if changed == "event":
                    other["Events"] = ["s3:ObjectRemoved:*"]
                if changed == "suffix":
                    other["Filter"]["Key"]["FilterRules"].append({"Name": "suffix", "Value": ".docx"})
                config = merge({"QueueConfigurations": [other]}, "new", PREFIX)
                preserved, added = config["QueueConfigurations"]
                self.assertEqual(other, preserved)
                self.assertEqual("new", added["QueueArn"])

    def test_reserved_id_collision_stops_without_modifying_any_configuration(self):
        rule = merge({}, "one", PREFIX)["QueueConfigurations"][0]
        for group, arn_key in (("QueueConfigurations", "QueueArn"), ("TopicConfigurations", "TopicArn"),
                               ("LambdaFunctionConfigurations", "LambdaFunctionArn")):
            with self.subTest(group=group):
                foreign = queue_rule(OTHER_PREFIX, "foreign", rule["Id"])
                foreign[arn_key] = foreign.pop("QueueArn")
                config = {group: [foreign], "ResponseMetadata": {}}
                expected = deepcopy(config)
                with self.assertRaises(ValueError):
                    merge(config, "one", PREFIX)
                self.assertEqual(expected, config)
