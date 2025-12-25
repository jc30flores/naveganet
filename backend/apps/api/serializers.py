from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
import re
from . import models


def _norm(s):
    return re.sub(r"\s+", " ", (s or "").strip()).upper()


def _digits(s):
    return re.sub(r"\D+", "", s or "")

class ClientesSerializer(serializers.ModelSerializer):
    dui = serializers.CharField(required=False, allow_blank=True)
    nit = serializers.CharField(required=False, allow_blank=True)
    nrc = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    telefono = serializers.CharField(required=False, allow_blank=True)
    giro = serializers.CharField(required=False, allow_blank=True)
    direccion_fiscal = serializers.CharField(required=False, allow_blank=True)
    email_facturacion = serializers.EmailField(required=False, allow_blank=True)
    telefono_facturacion = serializers.CharField(required=False, allow_blank=True)
    contacto = serializers.CharField(required=False, allow_blank=True)
    contribuyente_iva = serializers.BooleanField(required=False, default=False)
    nombre_comercial = serializers.CharField(required=False, allow_blank=True)
    fecha_ultima_compra = serializers.DateTimeField(
        read_only=True, source="ultima_compra"
    )

    class Meta:
        model = models.Clientes
        fields = (
            "id",
            "tipo_cliente",
            "nombre",
            "razon_social",
            "nombre_comercial",
            "giro",
            "dui",
            "nit",
            "nrc",
            "email",
            "telefono",
            "direccion",
            "direccion_fiscal",
            "departamento",
            "municipio",
            "email_facturacion",
            "telefono_facturacion",
            "contacto",
            "contribuyente_iva",
            "observaciones",
            "fecha_ultima_compra",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "fecha_ultima_compra")

    def validate(self, attrs):
        attrs["tipo_cliente"] = (attrs.get("tipo_cliente") or "natural").lower()

        attrs["nombre"] = _norm(attrs.get("nombre"))
        if attrs.get("tipo_cliente") == "juridica" and not attrs.get("razon_social"):
            attrs["razon_social"] = attrs["nombre"]

        if attrs.get("nit"):
            attrs["nit"] = _digits(attrs["nit"])
        if attrs.get("nrc"):
            attrs["nrc"] = _digits(attrs["nrc"])

        if attrs.get("contribuyente_iva"):
            for f in ("nit", "nrc", "giro", "direccion_fiscal"):
                if not attrs.get(f):
                    raise serializers.ValidationError({f: "requerido si Contribuyente IVA"})
            if not (
                attrs.get("email_facturacion") or attrs.get("telefono_facturacion")
            ):
                raise serializers.ValidationError(
                    {"email_facturacion": "email o teléfono de facturación requerido"}
                )

        if attrs.get("nit"):
            qs = models.Clientes.objects.filter(nit=attrs["nit"])
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({"nit": "NIT ya existe."})
        if attrs.get("nrc"):
            qs = models.Clientes.objects.filter(nrc=attrs["nrc"])
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({"nrc": "NRC ya existe."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("created_at", None)
        validated_data.pop("updated_at", None)
        return super().create(validated_data)

class CategoriaSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = models.Categorias
        fields = ("id", "nombre", "product_count")

    def validate_nombre(self, value):
        value = (value or "").strip()
        if len(value) < 2:
            raise serializers.ValidationError("Debe tener al menos 2 caracteres")
        qs = models.Categorias.objects.filter(nombre__iexact=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("Nombre ya existe")
        return value

class ProductosSerializer(serializers.ModelSerializer):
    codigo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    precio = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    tipo = serializers.ChoiceField(choices=models.ItemType.choices, default=models.ItemType.PRODUCTO)
    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=models.Categorias.objects.all(),
        source="categoria",
    )
    categoria_nombre = serializers.CharField(source="categoria.nombre", read_only=True)

    class Meta:
        model = models.Productos
        fields = (
            "id",
            "codigo",
            "nombre",
            "categoria_id",
            "categoria_nombre",
            "tipo",
            "precio",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        for key, value in list(attrs.items()):
            if isinstance(value, str):
                stripped = value.strip()
                attrs[key] = stripped or None

        if "nombre" in attrs and attrs["nombre"]:
            attrs["nombre"] = attrs["nombre"].upper()

        # Validar tipo
        if "tipo" in attrs:
            tipo = attrs["tipo"].lower()
            if tipo not in ["producto", "servicio"]:
                raise serializers.ValidationError({"tipo": "Debe ser 'producto' o 'servicio'"})
            attrs["tipo"] = tipo

        return attrs

    def validate_codigo(self, value):
        if value in ("", None):
            return None
        if not isinstance(value, str):
            raise serializers.ValidationError("Formato inválido")
        normalized = value.strip().upper()
        return normalized or None

    def create(self, validated_data):
        now = timezone.now()
        validated_data.setdefault("created_at", now)
        validated_data.setdefault("updated_at", now)
        validated_data.setdefault("status", "active")
        validated_data.setdefault("tipo", models.ItemType.PRODUCTO)

        code = (validated_data.get("codigo") or "").upper().strip()
        if not code:
            # Generar código automático basado en tipo
            tipo = validated_data.get("tipo", models.ItemType.PRODUCTO)
            pref = "P" if tipo == models.ItemType.PRODUCTO else "S"
            items = models.Productos.objects.filter(
                codigo__startswith=f"{pref}-"
            ).values_list("codigo", flat=True)
            nums = sorted(
                int(re.search(r"\d+$", c).group())
                for c in items if re.search(r"\d+$", c)
            )
            n = 1
            for k in nums:
                if k != n:
                    break
                n += 1
            code = f"{pref}-{str(n).zfill(5)}"
        validated_data["codigo"] = code
        return super().create(validated_data)

class VentasSerializer(serializers.ModelSerializer):
    total = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    iva_monto = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    iva_porcentaje = serializers.DecimalField(max_digits=5, decimal_places=2, coerce_to_string=False)
    class Meta:
        model = models.Ventas
        fields = '__all__'


class VentaListSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.SerializerMethodField()

    class Meta:
        model = models.Ventas
        fields = ("id", "fecha", "total", "cliente_id", "cliente_nombre")

    def get_cliente_nombre(self, obj):
        return obj.cliente.nombre if obj.cliente_id else "Cliente General"

class DetalleVentaSerializer(serializers.ModelSerializer):
    cantidad = serializers.DecimalField(max_digits=12, decimal_places=3, coerce_to_string=False)
    precio_unitario = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    class Meta:
        model = models.DetalleVenta
        fields = '__all__'


class VentaItemSerializer(serializers.ModelSerializer):
    codigo = serializers.CharField(source='producto.codigo', read_only=True)
    nombre = serializers.CharField(source='producto.nombre', read_only=True)
    cantidad = serializers.DecimalField(max_digits=12, decimal_places=3, coerce_to_string=False)
    precio = serializers.DecimalField(source='precio_unitario', max_digits=12, decimal_places=2, coerce_to_string=False)
    sub_total = serializers.SerializerMethodField()

    class Meta:
        model = models.DetalleVenta
        fields = ('producto_id', 'codigo', 'nombre', 'cantidad', 'precio', 'sub_total')

    def get_sub_total(self, obj):
        return obj.cantidad * obj.precio_unitario


class VentaDetalleSerializer(serializers.ModelSerializer):
    cliente = serializers.SerializerMethodField()
    metodo = serializers.CharField(source='metodo_pago', allow_null=True)
    notas = serializers.SerializerMethodField()
    tipo = serializers.SerializerMethodField()

    class Meta:
        model = models.Ventas
        fields = ('id', 'fecha', 'cliente', 'total', 'metodo', 'estado', 'tipo', 'notas')

    def get_cliente(self, obj):
        if obj.cliente_id and obj.cliente:
            return {'id': obj.cliente_id, 'nombre': obj.cliente.nombre}
        return None

    def get_notas(self, obj):
        return getattr(obj, 'notas', None)

    def get_tipo(self, obj):
        return 'credito' if models.CreditosHistorialCompras.objects.filter(venta=obj).exists() else 'directa'

class CreditosSerializer(serializers.ModelSerializer):
    total_deuda = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    pagado = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    saldo = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    class Meta:
        model = models.Creditos
        fields = '__all__'


class CreditoPagoSerializer(serializers.ModelSerializer):
    monto = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = models.PagosCredito
        fields = ("id", "fecha", "monto")


class CreditoItemSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    codigo = serializers.CharField()
    nombre = serializers.CharField()
    cantidad = serializers.DecimalField(max_digits=12, decimal_places=3, coerce_to_string=False)
    precio = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    sub_total = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)


class CreditoDetalleSerializer(serializers.ModelSerializer):
    cliente = serializers.SerializerMethodField()
    total = serializers.DecimalField(source='total_deuda', max_digits=14, decimal_places=2, coerce_to_string=False)
    fecha = serializers.DateTimeField(source='fecha_ultima_compra')
    pagado = serializers.SerializerMethodField()
    saldo = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    pagos = CreditoPagoSerializer(many=True, read_only=True)

    class Meta:
        model = models.Creditos
        fields = ('id', 'cliente', 'total', 'pagado', 'saldo', 'fecha', 'estado', 'observaciones', 'items', 'pagos')

    def get_cliente(self, obj):
        return {'id': obj.cliente_id, 'nombre': obj.cliente.nombre}

    def get_pagado(self, obj):
        return float(sum((p.monto for p in obj.pagos.all()), Decimal('0')))

    def get_saldo(self, obj):
        pagado = sum((p.monto for p in obj.pagos.all()), Decimal('0'))
        return float(obj.total_deuda - pagado)

    def get_items(self, obj):
        detalles = []
        for h in obj.historial.all():
            venta = h.venta
            for d in venta.detalles.all():
                detalles.append({
                    'producto_id': d.producto_id,
                    'codigo': d.producto_codigo_snapshot or getattr(d.producto, 'codigo', ''),
                    'nombre': d.producto_nombre_snapshot or getattr(d.producto, 'nombre', ''),
                    'cantidad': d.cantidad,
                    'precio': d.precio_unitario,
                    'sub_total': d.subtotal,
                })
        return detalles

class CreditosHistorialComprasSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CreditosHistorialCompras
        fields = '__all__'

class PagosCreditoSerializer(serializers.ModelSerializer):
    monto = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = models.PagosCredito
        fields = '__all__'

    def create(self, validated_data):
        with transaction.atomic():
            pago = super().create(validated_data)
            credito = pago.credito
            credito.pagado += pago.monto
            credito.saldo -= pago.monto
            credito.updated_at = timezone.now()
            credito.save(update_fields=["pagado", "saldo", "updated_at"])
        return pago

class DevolucionesSerializer(serializers.ModelSerializer):
    cantidad = serializers.DecimalField(max_digits=12, decimal_places=3, coerce_to_string=False)
    precio_unitario = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    total = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    class Meta:
        model = models.Devoluciones
        fields = '__all__'


class DeudorSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField()
    cliente_nombre = serializers.CharField()
    total = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    pagado = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    saldo = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)


class CreditoResumenSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    fecha = serializers.DateTimeField()
    total = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    pagado = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    saldo = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    observaciones = serializers.CharField(allow_null=True, required=False)


class DeudorDetalleSerializer(serializers.Serializer):
    cliente = serializers.DictField()
    total = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    pagado = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    saldo = serializers.DecimalField(max_digits=14, decimal_places=2, coerce_to_string=False)
    creditos = CreditoResumenSerializer(many=True)
    pagos = CreditoPagoSerializer(many=True)
    items = CreditoItemSerializer(many=True)


class UsuarioSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True, required=False, allow_blank=False)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=False)
    is_active = serializers.BooleanField(write_only=True, required=False, default=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = models.Usuario
        fields = ('id', 'username', 'email', 'role', 'is_active', 'password')
        read_only_fields = ('id',)

    def validate_username(self, value):
        if value and len(value.strip()) < 3:
            raise serializers.ValidationError("El nombre de usuario debe tener al menos 3 caracteres")
        return value.strip() if value else value

    def validate_email(self, value):
        if value:
            return value.strip().lower()
        return value

    def validate_password(self, value):
        if value is None or value == '':
            return value  # Permitir None o cadena vacía, se validará en validate()
        if len(value) < 8:
            raise serializers.ValidationError("La contraseña debe tener al menos 8 caracteres")
        return value

    def validate(self, attrs):
        # Para creación, username, email y password son requeridos
        if not self.instance:
            username = attrs.get('username')
            email = attrs.get('email')
            password = attrs.get('password')
            
            if not username or (isinstance(username, str) and not username.strip()):
                raise serializers.ValidationError({"username": "El nombre de usuario es requerido"})
            if not email or (isinstance(email, str) and not email.strip()):
                raise serializers.ValidationError({"email": "El email es requerido"})
            if not password or (isinstance(password, str) and not password.strip()):
                raise serializers.ValidationError({"password": "La contraseña es requerida"})
        return attrs

    def create(self, validated_data):
        from django.contrib.auth.models import User
        
        username = validated_data.pop('username', None)
        email = validated_data.pop('email', None)
        password = validated_data.pop('password', None)
        is_active = validated_data.pop('is_active', True)
        role = validated_data.pop('role', 'vendedor')
        
        # Validar que los campos requeridos estén presentes
        if not username:
            raise serializers.ValidationError({"username": "El nombre de usuario es requerido"})
        if not email:
            raise serializers.ValidationError({"email": "El email es requerido"})
        if not password:
            raise serializers.ValidationError({"password": "La contraseña es requerida"})
        
        # Verificar si el usuario ya existe
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "Este nombre de usuario ya existe"})
        
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "Este email ya está registrado"})
        
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    is_active=is_active
                )
                usuario = models.Usuario.objects.create(user=user, role=role)
            
            return usuario
        except Exception as e:
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating usuario: {str(e)}", exc_info=True)
            traceback.print_exc()
            # Si es un error de integridad, devolver un mensaje más específico
            error_msg = str(e)
            if "username" in error_msg.lower() or "unique" in error_msg.lower():
                raise serializers.ValidationError({"username": "Este nombre de usuario ya existe"})
            if "email" in error_msg.lower() or "unique" in error_msg.lower():
                raise serializers.ValidationError({"email": "Este email ya está registrado"})
            raise serializers.ValidationError({"detail": f"Error al crear usuario: {error_msg}"})

    def update(self, instance, validated_data):
        from django.contrib.auth.models import User
        
        user = instance.user
        password = validated_data.pop('password', None)
        
        if 'username' in validated_data:
            username = validated_data.pop('username')
            if User.objects.filter(username=username).exclude(id=user.id).exists():
                raise serializers.ValidationError({"username": "Este nombre de usuario ya existe"})
            user.username = username
        
        if 'email' in validated_data:
            email = validated_data.pop('email')
            if User.objects.filter(email=email).exclude(id=user.id).exists():
                raise serializers.ValidationError({"email": "Este email ya está registrado"})
            user.email = email
        
        if 'is_active' in validated_data:
            user.is_active = validated_data.pop('is_active')
        
        if password:
            user.set_password(password)
        
        user.save()
        
        if 'role' in validated_data:
            instance.role = validated_data.pop('role')
        
        instance.save()
        
        return instance

    def to_representation(self, instance):
        # Recargar el objeto con select_related para asegurar que user esté cargado
        try:
            if hasattr(instance, 'user'):
                # Si ya está cargado, usarlo
                user = instance.user
            else:
                # Si no está cargado, recargar desde la BD
                instance = models.Usuario.objects.select_related('user').get(id=instance.id)
                user = instance.user
        except Exception:
            # Si hay algún error, devolver valores por defecto
            return {
                'id': instance.id,
                'username': '',
                'email': '',
                'role': getattr(instance, 'role', 'vendedor'),
                'is_active': False,
            }
        
        return {
            'id': instance.id,
            'username': user.username,
            'email': user.email or '',
            'role': instance.role,
            'is_active': user.is_active,
        }