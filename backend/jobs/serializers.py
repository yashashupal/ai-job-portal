from rest_framework import serializers

from urllib.parse import urlparse

from .models import Application, ExternalJobTracking, Job

MAX_RESUME_BYTES = 5 * 1024 * 1024
ALLOWED_RESUME_EXT = (".pdf", ".doc", ".docx")


class JobSerializer(serializers.ModelSerializer):
    applications_count = serializers.IntegerField(read_only=True, default=0)
    has_applied = serializers.SerializerMethodField()
    work_mode_label = serializers.CharField(source="get_work_mode_display", read_only=True)
    job_type_label = serializers.CharField(source="get_job_type_display", read_only=True)

    class Meta:
        model = Job
        fields = (
            "id", "title", "company_name", "location", "work_mode", "work_mode_label",
            "job_type", "job_type_label", "description", "skills",
            "salary_min", "salary_max", "salary_currency", "is_active", "created_at",
            "applications_count", "has_applied",
        )
        read_only_fields = ("id", "created_at")
        extra_kwargs = {"company_name": {"required": False}}

    def get_has_applied(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.applications.filter(applicant=request.user).exists()

    def validate_skills(self, value):
        if not isinstance(value, list) or not all(isinstance(s, str) for s in value):
            raise serializers.ValidationError("Skills must be a list of text values.")
        cleaned = []
        for skill in value:
            skill = skill.strip()
            if skill and skill.lower() not in [c.lower() for c in cleaned]:
                cleaned.append(skill[:40])
        return cleaned[:15]

    def validate(self, attrs):
        low, high = attrs.get("salary_min"), attrs.get("salary_max")
        if low is not None and high is not None and low > high:
            raise serializers.ValidationError({"salary_max": "Maximum salary must be at least the minimum."})
        return attrs


class JobBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ("id", "title", "company_name", "location", "work_mode", "job_type")


class ApplyInputSerializer(serializers.Serializer):
    cover_letter = serializers.CharField(required=False, allow_blank=True, max_length=4000)
    resume = serializers.FileField()

    def validate_resume(self, f):
        name = f.name.lower()
        if not name.endswith(ALLOWED_RESUME_EXT):
            raise serializers.ValidationError("Upload a PDF, DOC or DOCX file.")
        if f.size > MAX_RESUME_BYTES:
            raise serializers.ValidationError("Resume must be 5 MB or smaller.")
        head = f.read(8)
        f.seek(0)
        ok = (
            (name.endswith(".pdf") and head.startswith(b"%PDF"))
            or (name.endswith(".docx") and head.startswith(b"PK"))
            or (name.endswith(".doc") and head.startswith(b"\xd0\xcf\x11\xe0"))
        )
        if not ok:
            raise serializers.ValidationError("This file does not look like a valid PDF, DOC or DOCX.")
        return f


class MyApplicationSerializer(serializers.ModelSerializer):
    job = JobBriefSerializer(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Application
        fields = ("id", "job", "status", "status_label", "cover_letter", "created_at")


class JobApplicationSerializer(serializers.ModelSerializer):
    applicant_name = serializers.CharField(source="applicant.full_name", read_only=True)
    applicant_email = serializers.EmailField(source="applicant.email", read_only=True)
    applicant_headline = serializers.CharField(source="applicant.headline", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Application
        fields = (
            "id", "applicant_name", "applicant_email", "applicant_headline",
            "cover_letter", "resume_name", "status", "status_label", "created_at",
        )



class ApplicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ("id", "status")


class ExternalJobTrackingSerializer(serializers.ModelSerializer):
    job = serializers.JSONField(source="job_payload")

    class Meta:
        model = ExternalJobTracking
        fields = ("id", "external_id", "job", "status", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_external_id(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("External job id is required.")
        return value

    def validate_job(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Job details must be an object.")
        title = str(value.get("title", "")).strip()
        if not title:
            raise serializers.ValidationError("A job title is required.")
        allowed = (
            "title", "company", "company_domain", "location", "remote", "work_arrangement", "seniority",
            "salary_min", "salary_max", "salary_currency", "date_posted", "technologies", "apply_url", "source", "snippet",
        )
        cleaned = {key: value.get(key) for key in allowed if key in value}
        cleaned["title"] = title[:200]
        for key in ("company", "location", "company_domain", "source"):
            cleaned[key] = str(cleaned.get(key) or "")[:200]
        cleaned["snippet"] = str(cleaned.get("snippet") or "")[:4000]
        technologies = cleaned.get("technologies")
        cleaned["technologies"] = [str(item)[:80] for item in technologies[:20] if isinstance(item, str)] if isinstance(technologies, list) else []
        apply_url = str(cleaned.get("apply_url") or "")
        parsed_url = urlparse(apply_url)
        if apply_url and (parsed_url.scheme not in ("http", "https") or not parsed_url.netloc):
            raise serializers.ValidationError({"apply_url": "Only HTTP(S) application links are allowed."})
        cleaned["apply_url"] = apply_url[:1000]
        return cleaned
