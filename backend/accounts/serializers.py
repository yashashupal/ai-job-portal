from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    has_resume = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name", "full_name", "role", "company_name", "headline",
            "resume_name", "resume_uploaded_at", "has_resume",
        )
        read_only_fields = ("id", "email", "role", "resume_name", "resume_uploaded_at", "has_resume")

    def get_has_resume(self, obj):
        return bool(obj.resume_data)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "password", "first_name", "last_name", "role", "company_name", "headline")

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs.get("role") == User.Role.HIRER and not attrs.get("company_name", "").strip():
            raise serializers.ValidationError({"company_name": "Company name is required for hirers."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(username=validated_data["email"], **validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class ResumeUploadSerializer(serializers.Serializer):
    resume = serializers.FileField()

    def validate_resume(self, file):
        suffix = file.name.lower().rsplit(".", 1)[-1] if "." in file.name else ""
        if suffix not in ("pdf", "docx"):
            raise serializers.ValidationError("Upload a PDF or DOCX resume.")
        if file.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Resume must be 5 MB or smaller.")
        header = file.read(8)
        file.seek(0)
        valid = header.startswith(b"%PDF") if suffix == "pdf" else header.startswith(b"PK")
        if not valid:
            raise serializers.ValidationError("The file content does not match its extension.")
        return file
