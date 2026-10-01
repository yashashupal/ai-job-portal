from django.core.management.base import BaseCommand

from accounts.models import User
from jobs.models import Job

JOBS = [
    ("Senior Django Developer", "Indore", "hybrid", "full_time", 1200000, 1800000, ["Python", "Django", "PostgreSQL", "REST"],
     "Own our backend APIs, review code, and mentor two junior developers. You will work closely with the React team."),
    ("React Frontend Engineer", "Remote", "remote", "full_time", 900000, 1500000, ["React", "JavaScript", "CSS"],
     "Build clean, accessible interfaces for our hiring product. Experience with Vite and React Router is a plus."),
    ("Generative AI Intern", "Bhopal", "onsite", "internship", 180000, 240000, ["Python", "LLM", "RAG"],
     "Help us prototype retrieval-augmented features. You will pair with an engineer every day."),
    ("WordPress Developer", "Indore", "onsite", "contract", 400000, 700000, ["WordPress", "PHP", "MySQL"],
     "Six-month contract to build and maintain client sites."),
]


class Command(BaseCommand):
    help = "Create a demo hirer (demo-hirer@example.com / DemoPass123) with a few jobs."

    def handle(self, *args, **opts):
        hirer, created = User.objects.get_or_create(
            email="demo-hirer@example.com",
            defaults={"username": "demo-hirer@example.com", "role": "hirer", "company_name": "Northwind Labs", "first_name": "Demo"},
        )
        if created:
            hirer.set_password("DemoPass123")
            hirer.save()
        if not hirer.jobs.exists():
            for title, loc, mode, jtype, lo, hi, skills, desc in JOBS:
                Job.objects.create(hirer=hirer, title=title, company_name="Northwind Labs", location=loc, work_mode=mode,
                                   job_type=jtype, salary_min=lo, salary_max=hi, skills=skills, description=desc)
        self.stdout.write(self.style.SUCCESS("Demo data ready. Hirer login: demo-hirer@example.com / DemoPass123"))
