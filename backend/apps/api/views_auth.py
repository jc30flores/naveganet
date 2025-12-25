from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
import logging

from .models import Usuario

logger = logging.getLogger(__name__)

@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    try:
        import json
        # Obtener datos del body
        if hasattr(request, 'data'):
            data = request.data or {}
        else:
            try:
                body = request.body.decode('utf-8')
                data = json.loads(body) if body else {}
            except:
                data = {}
        
        username = data.get("username") or data.get("email")
        password = data.get("password")
        
        logger.info(f"Login attempt for username: {username}")
        
        if not username or not password:
            return JsonResponse({"detail": "Missing credentials"}, status=400)
        
        user = authenticate(request, username=username, password=password)
        if user is None:
            logger.warning(f"Authentication failed for username: {username}")
            return JsonResponse({"detail": "Invalid credentials"}, status=400)
        
        login(request, user)
        logger.info(f"User {user.username} logged in successfully")
        
        perfil = Usuario.objects.filter(user=user).first()
        role = getattr(perfil, "role", "vendedor") if perfil else "vendedor"
        is_vendedor = role in {"vendedor", "gerente"}
        
        response_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
            "role": role,
            "is_vendedor": is_vendedor,
            "can_edit_prices": not is_vendedor,
        }
        
        return JsonResponse(response_data)
    except Exception as e:
        import traceback
        error_detail = str(e)
        logger.error(f"Login error: {error_detail}")
        logger.error(traceback.format_exc())
        traceback.print_exc()
        return JsonResponse({"detail": f"Server error: {error_detail}"}, status=500)

@api_view(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"detail": "ok"})

@api_view(["GET"])
def me_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Unauthorized"}, status=401)
    perfil = Usuario.objects.filter(user=request.user).first()
    role = getattr(perfil, "role", "vendedor")
    is_vendedor = role in {"vendedor", "gerente"}
    return JsonResponse({
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
        "role": role,
        "is_vendedor": is_vendedor,
        "can_edit_prices": not is_vendedor,
    })
