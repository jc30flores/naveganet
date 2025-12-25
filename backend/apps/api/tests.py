from django.urls import reverse
from django.utils import timezone
from django.test import override_settings
from rest_framework.test import APITestCase

from . import models

sqlite_db = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}


@override_settings(DATABASES=sqlite_db)
class TestReportesDashboard(APITestCase):
    def setUp(self):
        now = timezone.now()
        categoria = models.Categorias.objects.create(nombre="General")
        producto = models.Productos.objects.create(
            codigo="P1",
            nombre="Prod1",
            categoria=categoria,
            precio=100,
            costo=60,
            stock=5,
            stock_minimo=1,
            condicion="new",
            status="active",
            created_at=now,
            updated_at=now,
        )
        cliente = models.Clientes.objects.create(tipo_cliente="natural", nombre="Cliente")
        venta = models.Ventas.objects.create(
            fecha=now,
            cliente=cliente,
            total=100,
            estado="pagado",
            created_at=now,
            updated_at=now,
        )
        models.DetalleVenta.objects.create(
            venta=venta,
            producto=producto,
            cantidad=1,
            precio_unitario=100,
            subtotal=100,
            fecha_venta=now,
            created_at=now,
            updated_at=now,
        )

    def test_dashboard_returns_sales_data(self):
        url = reverse("reportes-dashboard")
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["stats"]["total_productos"], 1)
        self.assertEqual(int(data["stats"]["ventas_hoy"]), 100)
        self.assertEqual(len(data["recent_sales"]), 1)
        self.assertEqual(len(data["top_products"]), 1)

