from rest_framework import serializers

from .models import Application, Job

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
