from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

class Clientes(models.Model):
    id = models.BigAutoField(primary_key=True)
    tipo_cliente = models.CharField(max_length=20, default='natural')
    nombre = models.TextField(null=True, blank=True)
    razon_social = models.TextField(null=True, blank=True)
    nombre_comercial = models.TextField(null=True, blank=True)
    giro = models.TextField(null=True, blank=True)
    dui = models.TextField(null=True, blank=True)
    nit = models.TextField(null=True, blank=True, unique=True)
    nrc = models.TextField(null=True, blank=True, unique=True)
    email = models.TextField(null=True, blank=True)
    telefono = models.TextField(null=True, blank=True)
    direccion = models.TextField(null=True, blank=True)
    direccion_fiscal = models.TextField(null=True, blank=True)
    departamento = models.TextField(null=True, blank=True)
    municipio = models.TextField(null=True, blank=True)
    telefono_facturacion = models.TextField(null=True, blank=True)
    email_facturacion = models.TextField(null=True, blank=True)
    contacto = models.TextField(null=True, blank=True)
    contribuyente_iva = models.BooleanField(default=False, db_index=True)
    fecha_ultima_compra = models.DateTimeField(null=True, blank=True)
    observaciones = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "clientes"
        indexes = [
            models.Index(fields=["nombre"], name="clientes_nombre_idx"),
            models.Index(fields=["nit"], name="clientes_nit_idx"),
            models.Index(fields=["telefono"], name="clientes_telefono_idx"),
        ]
        #managed = False

    def __str__(self):
        return self.razon_social or self.nombre or f"Cliente {self.id}"


class Categorias(models.Model):
    id = models.BigAutoField(primary_key=True)
    nombre = models.TextField(unique=True)

    class Meta:
        db_table = "categorias"
        #managed = False

    def __str__(self):
        return self.nombre


class ItemType(models.TextChoices):
    PRODUCTO = "producto", "Producto"
    SERVICIO = "servicio", "Servicio"


class Productos(models.Model):
    id = models.BigAutoField(primary_key=True)
    codigo = models.CharField(max_length=50, unique=True, null=True, blank=True)
    nombre = models.TextField()
    categoria = models.ForeignKey(
        'Categorias',
        on_delete=models.PROTECT,
        db_column='categoria_id',
        related_name='productos',
    )
    tipo = models.CharField(
        max_length=20,
        choices=ItemType.choices,
        default=ItemType.PRODUCTO,
        db_index=True,
    )
    precio = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=10, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "productos"
        #managed = False

    def __str__(self):
        return f"{self.codigo} - {self.nombre}" if self.codigo else self.nombre


class Ventas(models.Model):
    id = models.BigAutoField(primary_key=True)
    fecha = models.DateTimeField()
    cliente = models.ForeignKey('Clientes', on_delete=models.SET_NULL, null=True, db_column='cliente_id')
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    estado = models.CharField(max_length=20, default='pendiente')
    metodo_pago = models.CharField(max_length=20, null=True, blank=True)
    documento_tipo = models.CharField(max_length=30, default='ticket')
    documento_serie = models.TextField(null=True, blank=True)
    documento_numero = models.TextField(null=True, blank=True)
    iva_monto = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    iva_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=13)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "ventas"
        indexes = [
            models.Index(fields=["fecha"], name="ventas_fecha_idx"),
            models.Index(fields=["created_at", "estado", "cliente"], name="ventas_cre_cli_idx"),
            models.Index(fields=["documento_numero"], name="ventas_numero_idx"),
            models.Index(fields=["cliente"], name="ventas_cliente_idx"),
        ]
        #managed = False

    def __str__(self):
        return f"Venta {self.id} - {self.fecha:%Y-%m-%d}"


class DetalleVenta(models.Model):
    id = models.BigAutoField(primary_key=True)
    venta = models.ForeignKey('Ventas', on_delete=models.CASCADE, db_column='venta_id', related_name='detalles')
    producto = models.ForeignKey(
        'Productos', on_delete=models.SET_NULL, null=True, db_column='producto_id'
    )
    cantidad = models.DecimalField(max_digits=12, decimal_places=3)
    devuelto = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    fecha_venta = models.DateTimeField()
    producto_codigo_snapshot = models.TextField(null=True, blank=True)
    producto_nombre_snapshot = models.TextField(null=True, blank=True)
    producto_costo_snapshot = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    producto_condicion_snapshot = models.TextField(null=True, blank=True)
    producto_categoria_id_snapshot = models.BigIntegerField(null=True, blank=True)
    producto_categoria_nombre_snapshot = models.TextField(null=True, blank=True)
    override = models.BooleanField(default=False)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "detalle_venta"
        indexes = [
            models.Index(fields=["venta", "producto", "producto_codigo_snapshot"], name="detalleventa_lookup_idx"),
            models.Index(fields=["venta"], name="detalleventa_venta_idx"),
            models.Index(fields=["producto"], name="detalleventa_producto_idx"),
        ]
        #managed = False

    def __str__(self):
        return f"Detalle {self.id} de Venta {self.venta_id}"


class Creditos(models.Model):
    id = models.BigAutoField(primary_key=True)
    cliente = models.ForeignKey('Clientes', on_delete=models.PROTECT, db_column='cliente_id')
    total_deuda = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    pagado = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    saldo = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    fecha_ultima_compra = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=20, default='pendiente')
    observaciones = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "creditos"
        #managed = False

    def __str__(self):
        return f"Crédito {self.id}"


class CreditosHistorialCompras(models.Model):
    id = models.BigAutoField(primary_key=True)
    credito = models.ForeignKey('Creditos', on_delete=models.CASCADE, db_column='credito_id', related_name='historial')
    venta = models.ForeignKey('Ventas', on_delete=models.CASCADE, db_column='venta_id')
    fecha = models.DateTimeField()
    monto = models.DecimalField(max_digits=14, decimal_places=2)
    pagado = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    saldo = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    estado = models.CharField(max_length=20)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "creditos_historial_compras"
        #managed = False

    def __str__(self):
        return f"Historial {self.id} del Crédito {self.credito_id}"


class PagosCredito(models.Model):
    id = models.BigAutoField(primary_key=True)
    credito = models.ForeignKey('Creditos', on_delete=models.CASCADE, db_column='credito_id', related_name='pagos')
    fecha = models.DateTimeField()
    monto = models.DecimalField(max_digits=14, decimal_places=2)
    concepto = models.TextField(null=True, blank=True)
    metodo_pago = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "pagos_credito"
        #managed = False

    def __str__(self):
        return f"Pago {self.id} del Crédito {self.credito_id}"


class Devoluciones(models.Model):
    id = models.BigAutoField(primary_key=True)
    fecha = models.DateTimeField()
    producto = models.ForeignKey(
        'Productos', on_delete=models.SET_NULL, null=True, db_column='producto_id'
    )
    venta = models.ForeignKey('Ventas', on_delete=models.SET_NULL, null=True, db_column='venta_id')
    detalle_venta = models.ForeignKey('DetalleVenta', on_delete=models.SET_NULL, null=True, db_column='detalle_venta_id')
    cantidad = models.DecimalField(max_digits=12, decimal_places=3)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=14, decimal_places=2)
    motivo = models.TextField(null=True, blank=True)
    ingreso_afectado = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    producto_codigo_snapshot = models.TextField(null=True, blank=True)
    producto_nombre_snapshot = models.TextField(null=True, blank=True)
    producto_costo_snapshot = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    producto_condicion_snapshot = models.TextField(null=True, blank=True)
    producto_categoria_id_snapshot = models.BigIntegerField(null=True, blank=True)
    producto_categoria_nombre_snapshot = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "devoluciones"
        #managed = False

    def __str__(self):
        return f"Devolución {self.id}"


class Usuario(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(
        max_length=16,
        choices=[
            ("admin", "Administrador"),
            ("gerente", "Gerente"),
            ("vendedor", "Vendedor"),
        ],
        default="vendedor",
        db_index=True,
    )

    class Meta:
        db_table = "usuarios"

    def __str__(self):
        return self.user.username
