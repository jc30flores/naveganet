from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, views_auth, views_csrf

router = DefaultRouter()
router.register(r'clientes', views.ClientesViewSet, basename='clientes')
router.register(r'categorias', views.CategoriasViewSet)
router.register(r'productos', views.ProductosViewSet, basename='productos')
router.register(r'ventas', views.VentasViewSet)
router.register(r'detalle-venta', views.DetalleVentaViewSet)
router.register(r'creditos', views.CreditosViewSet)
router.register(r'creditos-historial', views.CreditosHistorialComprasViewSet)
router.register(r'pagos-credito', views.PagosCreditoViewSet)
router.register(r'devoluciones', views.DevolucionesViewSet)
router.register(r'usuarios', views.UsuariosViewSet, basename='usuarios')

urlpatterns = [
    path('health/', views.health, name='health'),
    path('pos/checkout', views.pos_checkout, name='pos-checkout'),
    path('pos/validate-code', views.ValidateOverrideCodeView.as_view(), name='pos-validate-code'),
    path('ventas-historial/', views.ventas_historial, name='ventas-historial'),
    path('historial-ventas/', views.historial_ventas, name='historial-ventas'),
    path('ventas/search/', views.ventas_search, name='ventas-search'),
    path('ventas-export/', views.ventas_export, name='ventas-export'),
    path('reportes/dashboard/', views.reportes_dashboard, name='reportes-dashboard'),
    path('reportes/export-inventario/', views.ReporteExportInventarioView.as_view(), name='reportes-export-inventario'),
    path('ventas-total/', views.ventas_total, name='ventas-total'),
    path('ventas/<int:pk>/items/', views.VentaItemsAPIView.as_view(), name='ventas-items'),
    path('creditos/<int:pk>/', views.CreditosViewSet.as_view({'get': 'retrieve'}), name='creditos-detail'),
    path('deudores/', views.DeudoresListAPIView.as_view(), name='deudores-list'),
    path('deudores/<int:pk>/', views.DeudorDetailAPIView.as_view({'get': 'retrieve'}), name='deudores-detail'),
    path('productos/stock0', views.delete_products_zero_stock, name='productos-stock0'),
    path('devoluciones/search-lines', views.devoluciones_search_lines, name='devoluciones-search-lines'),
    path('auth/csrf/', views_csrf.csrf_view, name='auth-csrf'),
    path('auth/login', views_auth.login_view, name='auth-login'),
    path('auth/logout', views_auth.logout_view, name='auth-logout'),
    path('auth/me', views_auth.me_view, name='auth-me'),
    path('', include(router.urls)),
]
