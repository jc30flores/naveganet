from django.contrib import admin
from . import models

@admin.register(models.Clientes)
class ClientesAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'razon_social', 'nit', 'tipo_cliente')
    search_fields = ('nombre', 'razon_social', 'nit')
    list_filter = ('tipo_cliente',)

@admin.register(models.Categorias)
class CategoriasAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre')
    search_fields = ('nombre',)

@admin.register(models.Productos)
class ProductosAdmin(admin.ModelAdmin):
    list_display = ('id', 'codigo', 'nombre', 'categoria', 'tipo', 'precio', 'status')
    search_fields = ('codigo', 'nombre')
    list_filter = ('categoria', 'tipo', 'status')

@admin.register(models.Ventas)
class VentasAdmin(admin.ModelAdmin):
    list_display = ('id', 'fecha', 'cliente', 'total', 'estado')
    search_fields = ('id', 'cliente__nombre', 'cliente__razon_social')
    list_filter = ('estado', 'metodo_pago', 'documento_tipo')

@admin.register(models.DetalleVenta)
class DetalleVentaAdmin(admin.ModelAdmin):
    list_display = ('id', 'venta', 'producto', 'cantidad', 'precio_unitario', 'subtotal')
    search_fields = ('venta__id', 'producto__nombre', 'producto__codigo')
    list_filter = ('venta__fecha',)

@admin.register(models.Creditos)
class CreditosAdmin(admin.ModelAdmin):
    list_display = ('id', 'cliente', 'total_deuda', 'saldo', 'estado')
    search_fields = ('cliente__nombre', 'cliente__razon_social')
    list_filter = ('estado',)

@admin.register(models.CreditosHistorialCompras)
class CreditosHistorialComprasAdmin(admin.ModelAdmin):
    list_display = ('id', 'credito', 'venta', 'monto', 'estado')
    search_fields = ('credito__id', 'venta__id')
    list_filter = ('estado',)

@admin.register(models.PagosCredito)
class PagosCreditoAdmin(admin.ModelAdmin):
    list_display = ('id', 'credito', 'fecha', 'monto', 'metodo_pago')
    search_fields = ('credito__id',)
    list_filter = ('metodo_pago',)

@admin.register(models.Devoluciones)
class DevolucionesAdmin(admin.ModelAdmin):
    list_display = ('id', 'fecha', 'producto', 'venta', 'cantidad', 'total')
    search_fields = ('producto__nombre', 'venta__id')
    list_filter = ('fecha',)


@admin.register(models.Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "role")
    list_filter = ("role",)
