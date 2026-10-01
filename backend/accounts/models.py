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

    @property
    def full_name(self):
        return self.get_full_name() or self.email
