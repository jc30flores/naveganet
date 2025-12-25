import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { api } from '@/lib/api';
import SalesTotalCard from '@/components/reports/SalesTotalCard';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

type SummaryStatKey =
  | 'totalProductos'
  | 'creditosPendientes'
  | 'valorInventario'
  | 'devolucionesMensuales';

type SummaryStat = {
  key: SummaryStatKey;
  title: string;
  value: string;
  change?: string;
  icon: typeof Package;
  changeType: ChangeType;
  iconClassName: string;
};

type ChangeType = 'positive' | 'negative' | 'neutral';

type FilterType = 'diario' | 'quincenal' | 'mensual' | 'todos';
type SectionType = 'new' | 'used' | 'all';

export default function Reportes() {
  const role = useAuth((s) => s.user?.role);
  const hasLimitedAccess = role === 'vendedor' || role === 'gerente';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = (searchParams.get('section') as SectionType) || 'all';
  const [activeFilter, setActiveFilter] = useState<FilterType>('diario');
  const [section, setSection] = useState<SectionType>(initialSection);

  const filterOptions: FilterType[] = useMemo(
    () => (hasLimitedAccess ? ['diario', 'quincenal', 'mensual'] : ['diario', 'quincenal', 'mensual', 'todos']),
    [hasLimitedAccess]
  );

  useEffect(() => {
    if (!filterOptions.includes(activeFilter)) {
      setActiveFilter(filterOptions[0] ?? 'diario');
    }
  }, [filterOptions, activeFilter]);

  const [salesData, setSalesData] = useState<Record<FilterType, any[]>>({
    diario: [],
    quincenal: [],
    mensual: [],
    todos: [],
  });
  const [summaryStats, setSummaryStats] = useState<SummaryStat[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    setSearchParams({ section }, { replace: true });
    api.getReportesDashboard(section)
      .then(data => {
        setSalesData(data.sales_chart);
        const statsData: SummaryStat[] = [
          {
            key: 'totalProductos',
            title: 'Total Productos',
            value: String(data.stats.total_productos),
            change: '',
            icon: Package,
            changeType: 'neutral',
            iconClassName: 'text-primary',
          },
          {
            key: 'creditosPendientes',
            title: 'Créditos Pendientes',
            value: Number(data.stats.creditos_pendientes).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
            change: '',
            icon: ShoppingBag,
            changeType: 'neutral',
            iconClassName: 'text-primary',
          },
          {
            key: 'valorInventario',
            title: 'Valor Inventario',
            value: Number(data.stats.valor_inventario).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
            change: '',
            icon: Package,
            changeType: 'neutral',
            iconClassName: 'text-primary',
          },
          {
            key: 'devolucionesMensuales',
            title: 'Devoluciones Mensuales',
            value: Number(data.stats.devoluciones_mensuales).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
            change: '',
            icon: RotateCcw,
            changeType: 'neutral',
            iconClassName: 'text-warning',
          },
        ];
        setSummaryStats(statsData);
        setRecentSales(data.recent_sales);
        setLowStockItems(data.low_stock_items);
        const colors = ['#00D9FF', '#0099CC', '#007399', '#004D66', '#002633'];
        setCategoryData(data.category_data.map((c: any, idx: number) => ({ ...c, color: colors[idx % colors.length] })));
        setTopProducts(data.top_products);
      })
      .catch(err => console.error(err));
  }, [section, setSearchParams]);

  const getFilterTitle = (filter: FilterType) => {
    const titles = {
      diario: 'Ventas Diarias (Esta Semana)',
      quincenal: 'Ventas Quincenales (Este Mes)', 
      mensual: 'Ventas Mensuales (Este Año)',
      todos: 'Ventas Anuales'
    };
    return titles[filter];
  };

  const sectionLabel = { all: 'Todos', new: 'Nuevos', used: 'Usados' }[section];
  const exceptionLabel = section === 'all' ? 'Nuevos' : sectionLabel;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Reportes – {sectionLabel}</h1>
        </div>
        
      </div>

      {/* Section Selector */}
      <div className="surface surface-pad">
        <Tabs value={section} onValueChange={(value) => setSection(value as SectionType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="new">Nuevos</TabsTrigger>
            <TabsTrigger value="used">Usados</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Grid */}
      <div
        className="grid gap-6 [grid-auto-flow:dense] items-stretch [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]"
      >
        {summaryStats
          .filter((stat) => (hasLimitedAccess ? stat.key !== 'valorInventario' : true))
          .map((stat) => {
            const IconComponent = stat.icon;
            return (
              <Card key={stat.key} className="border-border h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <IconComponent className={cn('h-3 w-3 md:h-4 md:w-4', stat.iconClassName)} />
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-lg md:text-2xl font-bold text-foreground">{stat.value}</div>
                  {stat.change && (
                    <p
                      className={cn(
                        'text-xs',
                        stat.changeType === 'positive'
                          ? 'text-success'
                          : stat.changeType === 'negative'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      )}
                    >
                      {stat.change} vs mes pasado
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}

        <div className="h-full w-full">
          <SalesTotalCard />
        </div>
      </div>

      {/* Top Products and Low Stock - Only for NEW and ALL sections */}
      {(section === 'new' || section === 'all') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {/* Top Products */}
          <Card className="border-border h-full">
            <CardHeader>
              <CardTitle className="text-base md:text-lg text-foreground">
                Productos Más Vendidos – {exceptionLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.nombre} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                      <div className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded bg-primary/10 text-primary font-medium text-xs md:text-sm">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-xs md:text-sm truncate">{product.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.ventas} uds.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary text-xs md:text-sm">
                        ${Number(product.ingresos).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card className="border-border h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg text-foreground">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-warning" />
                Productos con Stock Bajo – {exceptionLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {lowStockItems.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {item.stock} | Min: {item.min}
                      </p>
                    </div>
                    <div className="h-2 w-8 md:w-12 bg-muted rounded-full overflow-hidden ml-2">
                      <div
                        className="h-full bg-warning transition-all duration-300"
                        style={{ width: `${(item.stock / item.min) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Main Sales Chart */}
        <Card className="border-border lg:col-span-2 w-full">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg text-foreground">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Ventas – {sectionLabel}
              </CardTitle>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {filterOptions.map((filter) => (
                  <Button
                    key={filter}
                    variant={activeFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(filter)}
                    className={`text-xs px-2 py-1 h-7 min-w-[60px] ${activeFilter === filter 
                      ? "bg-primary text-primary-foreground" 
                      : "border-border hover:bg-muted"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData[activeFilter]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="periodo" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar 
                    dataKey="ventas" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Profit Chart - Only for NEW and ALL sections */}
        {(section === 'new' || section === 'all') && !hasLimitedAccess && (
          <Card className="border-border lg:col-span-2 w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg text-foreground">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-success" />
                Utilidad (Precio - Costo) – {exceptionLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData[activeFilter]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="periodo" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                     <Tooltip
                       content={({ active, payload, label }) => {
                         if (active && payload && payload.length) {
                           const data = payload[0].payload;
                           return (
                             <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                               <p className="text-foreground font-medium mb-2">{label}</p>
                               <div className="space-y-1 text-sm">
                                 <p className="text-muted-foreground">
                                   <span className="font-medium">Precio total:</span> {data.price_total?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                 </p>
                                 <p className="text-muted-foreground">
                                   <span className="font-medium">Costo total:</span> {data.cost_total?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                 </p>
                                 <p className="text-success font-medium">
                                   <span>Utilidad total:</span> {data.profit_total?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                 </p>
                               </div>
                             </div>
                           );
                         }
                         return null;
                       }}
                     />
                    <Bar 
                      dataKey="utilidad" 
                      fill="hsl(var(--success))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}