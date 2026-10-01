from django.conf import settings
from django.db import models


class Job(models.Model):
    class WorkMode(models.TextChoices):
        ONSITE = "onsite", "On-site"
        HYBRID = "hybrid", "Hybrid"
        REMOTE = "remote", "Remote"

    class JobType(models.TextChoices):
        FULL_TIME = "full_time", "Full-time"
        PART_TIME = "part_time", "Part-time"
        CONTRACT = "contract", "Contract"
        INTERNSHIP = "internship", "Internship"

    hirer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=160)
    company_name = models.CharField(max_length=160)
    location = models.CharField(max_length=160)
    work_mode = models.CharField(max_length=10, choices=WorkMode.choices, default=WorkMode.ONSITE)
    job_type = models.CharField(max_length=12, choices=JobType.choices, default=JobType.FULL_TIME)
    description = models.TextField()
    skills = models.JSONField(default=list, blank=True)
    salary_min = models.PositiveIntegerField(null=True, blank=True)
    salary_max = models.PositiveIntegerField(null=True, blank=True)
    salary_currency = models.CharField(max_length=3, default="INR")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} @ {self.company_name}"


class Application(models.Model):
    class Status(models.TextChoices):
        APPLIED = "applied", "Applied"
        SHORTLISTED = "shortlisted", "Shortlisted"
        REJECTED = "rejected", "Rejected"
        HIRED = "hired", "Hired"

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    cover_letter = models.TextField(blank=True)
    resume_name = models.CharField(max_length=200)
    resume_type = models.CharField(max_length=100)
    resume_data = models.BinaryField(editable=False)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.APPLIED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["job", "applicant"], name="one_application_per_job")]

    def __str__(self):
        return f"{self.applicant} -> {self.job}"


class ExternalJobTracking(models.Model):
    class Status(models.TextChoices):
        SAVED = "saved", "Saved"
        APPLIED = "applied", "Applied"
        ARCHIVED = "archived", "Archived"

    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tracked_external_jobs")
    external_id = models.CharField(max_length=128)
    job_payload = models.JSONField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.SAVED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [models.UniqueConstraint(fields=["applicant", "external_id"], name="one_tracked_external_job_per_user")]

    def __str__(self):
        return f"{self.applicant} -> {self.external_id} ({self.status})"


class ExternalJobEmbedding(models.Model):
    cache_key = models.CharField(max_length=64, unique=True)
    embedding = models.JSONField()
    model_name = models.CharField(max_length=80)
    updated_at = models.DateTimeField(auto_now=True)
