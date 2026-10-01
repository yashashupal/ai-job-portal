from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        APPLICANT = "applicant", "Applicant"
        HIRER = "hirer", "Hirer"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.APPLICANT)
    company_name = models.CharField(max_length=160, blank=True)
    headline = models.CharField(max_length=160, blank=True)
    resume_name = models.CharField(max_length=200, blank=True)
    resume_type = models.CharField(max_length=100, blank=True)
    resume_data = models.BinaryField(null=True, blank=True, editable=False)
    resume_text = models.TextField(blank=True, editable=False)
    resume_embedding = models.JSONField(default=list, blank=True, editable=False)
    resume_embedding_model = models.CharField(max_length=80, blank=True, editable=False)
    resume_uploaded_at = models.DateTimeField(null=True, blank=True)

    @property
    def full_name(self):
        return self.get_full_name() or self.email
