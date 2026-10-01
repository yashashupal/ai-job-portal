from django.conf import settings
from django.core.management.base import BaseCommand

from jobs import jobspipe


class Command(BaseCommand):
    help = "Check the JobsPipe key and print the response shape (costs 1 credit)."

    def add_arguments(self, parser):
        parser.add_argument("--domain", default="", help="Also run a stack scan, e.g. notion.so")

    def handle(self, *args, **opts):
        if not settings.JOBSPIPE_API_KEY:
            self.stdout.write(self.style.WARNING("JOBSPIPE_API_KEY is empty. Using sandbox sample data."))
        raw = jobspipe._post("jobs/search", {"status": "active", "limit": 1}, allow_sandbox=True)
        self.stdout.write(f"jobs/search top-level keys: {list(raw.keys()) if isinstance(raw, dict) else type(raw)}")
        rows = jobspipe._first_list(raw)
        self.stdout.write(f"rows found: {len(rows)}")
        if rows:
            self.stdout.write(f"first row fields: {sorted(rows[0].keys())}")
            self.stdout.write(f"normalized: {jobspipe.normalize_job(rows[0])}")
        if opts["domain"]:
            domain = jobspipe.valid_domain(opts["domain"])
            raw = jobspipe._post("stack/scan", {"domain": domain})
            self.stdout.write(f"stack/scan top-level keys: {list(raw.keys()) if isinstance(raw, dict) else type(raw)}")
            self.stdout.write(f"parsed: {jobspipe.scan_stack(domain)}")
        self.stdout.write(self.style.SUCCESS("OK"))
