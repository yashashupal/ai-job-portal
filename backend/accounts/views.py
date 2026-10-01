from django.contrib.auth import authenticate
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .resumes import ResumeTextError, extract_resume_text
from .serializers import LoginSerializer, RegisterSerializer, ResumeUploadSerializer, UserSerializer


def auth_payload(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(auth_payload(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower().strip()
        found = User.objects.filter(email__iexact=email).first()
        user = authenticate(username=found.username, password=serializer.validated_data["password"]) if found else None
        if not user:
            return Response({"detail": "Email or password is incorrect."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(auth_payload(user))


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ResumeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = ResumeUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resume = serializer.validated_data["resume"]
        data = resume.read()
        try:
            text = extract_resume_text(data, resume.name)
        except ResumeTextError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        user.resume_name = resume.name[:200]
        user.resume_type = resume.content_type or "application/octet-stream"
        user.resume_data = data
        user.resume_text = text
        user.resume_embedding = []
        user.resume_embedding_model = ""
        user.resume_uploaded_at = timezone.now()
        user.save(update_fields=(
            "resume_name", "resume_type", "resume_data", "resume_text", "resume_embedding",
            "resume_embedding_model", "resume_uploaded_at",
        ))
        return Response(UserSerializer(user).data)

    def get(self, request):
        user = request.user
        if not user.resume_data:
            return Response({"detail": "No resume has been uploaded."}, status=status.HTTP_404_NOT_FOUND)
        response = HttpResponse(bytes(user.resume_data), content_type=user.resume_type or "application/octet-stream")
        response["Content-Disposition"] = f'attachment; filename="{user.resume_name}"'
        response["X-Content-Type-Options"] = "nosniff"
        return response

    def delete(self, request):
        user = request.user
        user.resume_name = ""
        user.resume_type = ""
        user.resume_data = None
        user.resume_text = ""
        user.resume_embedding = []
        user.resume_embedding_model = ""
        user.resume_uploaded_at = None
        user.save(update_fields=(
            "resume_name", "resume_type", "resume_data", "resume_text", "resume_embedding",
            "resume_embedding_model", "resume_uploaded_at",
        ))
        return Response(status=status.HTTP_204_NO_CONTENT)
