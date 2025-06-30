// client/src/pages/seller/coupons/index.tsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { formatCurrency, formatDate, formatBrazilDateTime } from '@/lib/utils';

interface Coupon {
  id: number;
  code: string;
  description: string;
  discountPercentage?: number;
  discountAmount?: number;
  minimumPurchase?: number;
  maxUsage?: number;
  usageCount: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  store?: {
    id: number;
    name: string;
  };
}

interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalUses: number;
  conversionRate: number;
}

interface PlanInfo {
  currentPlan: string;
  maxCouponsPerMonth: number;
  currentCouponsThisMonth: number;
  remaining: number | string;
  canCreateCoupons: boolean;
}

export default function SellerCoupons() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'inactive'>('all');

  useEffect(() => {
    loadCoupons();
    loadPlanInfo();
  }, []);

  useEffect(() => {
    filterCoupons();
  }, [coupons, searchTerm, statusFilter]);

  const loadCoupons = async () => {
    try {
      const response = await fetch('/api/seller/coupons', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCoupons(data);
        calculateStats(data);
      } else {
        toast({
          title: "Erro",
          description: "Erro ao carregar cupons",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cupons",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPlanInfo = async () => {
    try {
      const response = await fetch('/api/seller/coupons/limits', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPlanInfo(data);
      }
    } catch (error) {
      console.error('Error loading plan info:', error);
    }
  };

  const calculateStats = (couponsData: Coupon[]) => {
    const now = new Date();
    const totalCoupons = couponsData.length;
    const activeCoupons = couponsData.filter(c => 
      c.isActive && new Date(c.startTime) <= now && new Date(c.endTime) >= now
    ).length;
    const expiredCoupons = couponsData.filter(c => new Date(c.endTime) < now).length;
    const totalUses = couponsData.reduce((sum, c) => sum + c.usageCount, 0);

    // Simple conversion rate calculation (uses / total coupons)
    const conversionRate = totalCoupons > 0 ? (totalUses / totalCoupons) * 100 : 0;

    setStats({
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      totalUses,
      conversionRate
    });
  };

  const filterCoupons = () => {
    let filtered = coupons;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(coupon =>
        coupon.code.toLowerCase().includes(search) ||
        coupon.description.toLowerCase().includes(search)
      );
    }

    // Filter by status
    const now = new Date();
    if (statusFilter === 'active') {
      filtered = filtered.filter(c => 
        c.isActive && new Date(c.startTime) <= now && new Date(c.endTime) >= now
      );
    } else if (statusFilter === 'expired') {
      filtered = filtered.filter(c => new Date(c.endTime) < now);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(c => !c.isActive);
    }

    setFilteredCoupons(filtered);
  };

  const getCouponStatus = (coupon: Coupon) => {
    const now = new Date();
    const startDate = new Date(coupon.startTime);
    const endDate = new Date(coupon.endTime);

    if (!coupon.isActive) {
      return { label: 'Inativo', variant: 'secondary' as const };
    } else if (endDate < now) {
      return { label: 'Expirado', variant: 'destructive' as const };
    } else if (startDate > now) {
      return { label: 'Agendado', variant: 'default' as const };
    } else {
      return { label: 'Ativo', variant: 'default' as const };
    }
  };

  const toggleCouponStatus = async (couponId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/seller/coupons/${couponId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        setCoupons(prev => prev.map(c => 
          c.id === couponId ? { ...c, isActive: !currentStatus } : c
        ));
        toast({
          title: "Sucesso",
          description: `Cupom ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`,
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao alterar status do cupom",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do cupom",
        variant: "destructive"
      });
    }
  };

  const markAsUsed = async (couponId: number, code: string) => {
    const validationCode = prompt(`Digite o código de validação do cupom ${code}:`); if (!validationCode?.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/seller/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ validationCode: validationCode.trim().toUpperCase() })
      });

      const result = await response.json();
      if (result.success) {
        setCoupons(prev => prev.map(c => 
          c.id === couponId ? { ...c, usageCount: c.usageCount + 1 } : c
        ));
        toast({
          title: "Cupom utilizado",
          description: `Cupom ${code} marcado como usado`,
                  variant: "success"
        });
            } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Erro ao marcar cupom como usado",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error marking coupon as used:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar cupom como usado",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discountPercentage) {
      return `${coupon.discountPercentage}%`;
    } else if (coupon.discountAmount) {
      return `R$ ${coupon.discountAmount.toFixed(2)}`;
    }
    return '-';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <i className="fas fa-spinner fa-spin text-2xl text-gray-500"></i>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Cupons</h1>
          <p className="text-gray-600 mt-1">
            Gerencie seus cupons de desconto
          </p>
        </div>

        <Button asChild disabled={!planInfo?.canCreateCoupons}>
          <Link href="/seller/coupons/add">
            <i className="fas fa-plus mr-2"></i>
            Criar Cupom
          </Link>
        </Button>
      </div>

      {/* Plan Info Alert */}
      {planInfo && (
        <Alert className="mb-6">
          <i className="fas fa-info-circle"></i>
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Plano {planInfo.currentPlan}: {planInfo.currentCouponsThisMonth} de{' '}
                {planInfo.maxCouponsPerMonth === -1 ? 'ilimitados' : planInfo.maxCouponsPerMonth} cupons criados este mês
              </span>
              {planInfo.remaining !== 'Ilimitado' && (
                <Badge variant={planInfo.remaining === 0 ? 'destructive' : 'secondary'}>
                  {planInfo.remaining} restantes
                </Badge>
              )}
            </div>
            {!planInfo.canCreateCoupons && (
              <p className="text-sm mt-2 text-orange-600">
                Você atingiu o limite de cupons do seu plano. Faça upgrade para criar mais cupons.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.totalCoupons}</p>
                </div>
                <i className="fas fa-ticket-alt text-blue-500 text-xl"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ativos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeCoupons}</p>
                </div>
                <i className="fas fa-check-circle text-green-500 text-xl"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expirados</p>
                  <p className="text-2xl font-bold text-red-600">{stats.expiredCoupons}</p>
                </div>
                <i className="fas fa-times-circle text-red-500 text-xl"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Usos</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalUses}</p>
                </div>
                <i className="fas fa-chart-line text-purple-500 text-xl"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.conversionRate.toFixed(1)}%</p>
                </div>
                <i className="fas fa-percentage text-orange-500 text-xl"></i>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
              >
                Ativos
              </Button>
              <Button
                variant={statusFilter === 'expired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('expired')}
              >
                Expirados
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
              >
                Inativos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Cupons ({filteredCoupons.length})
          </CardTitle>
          <CardDescription>
            Gerencie seus cupons de desconto
          </CardDescription>
        </CardHeader>

        <CardContent>
          {filteredCoupons.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-ticket-alt text-4xl text-gray-300 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {coupons.length === 0 ? 'Nenhum cupom criado' : 'Nenhum cupom encontrado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {coupons.length === 0 
                  ? 'Crie seu primeiro cupom para começar a oferecer descontos aos seus clientes.'
                  : 'Tente ajustar os filtros para encontrar os cupons desejados.'
                }
              </p>
              {coupons.length === 0 && planInfo?.canCreateCoupons && (
                <Button asChild>
                  <Link href="/seller/coupons/add">
                    <i className="fas fa-plus mr-2"></i>
                    Criar Primeiro Cupom
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredCoupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    const isExpired = new Date(coupon.endTime) < new Date();
                    const isLimitReached = coupon.maxUsage && coupon.usageCount >= coupon.maxUsage;

                    return (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="font-mono font-bold text-sm">
                            {coupon.code}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm font-medium">{coupon.description}</p>
                            {coupon.minimumPurchase && (
                              <p className="text-xs text-gray-500">
                                Mín: R$ {coupon.minimumPurchase.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="font-bold text-green-600">
                            {formatDiscount(coupon)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{coupon.usageCount}</span>
                            {coupon.maxUsage && (
                              <span className="text-gray-500">
                                /{coupon.maxUsage}
                              </span>
                            )}
                            {isLimitReached && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Esgotado
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs text-gray-500">
                            {formatBrazilDateTime(coupon.startTime)}
                            <br />
                            até {formatBrazilDateTime(coupon.endTime)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <i className="fas fa-ellipsis-v"></i>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!isExpired && !isLimitReached && coupon.isActive && (
                                <DropdownMenuItem
                                  onClick={() => markAsUsed(coupon.id, coupon.code)}
                                >
                                  <i className="fas fa-check mr-2"></i>
                                  Marcar como Usado
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => toggleCouponStatus(coupon.id, coupon.isActive)}
                              >
                                <i className={`fas ${coupon.isActive ? 'fa-eye-slash' : 'fa-eye'} mr-2`}></i>
                                {coupon.isActive ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => navigate(`/seller/coupons/${coupon.id}/edit`)}
                              >
                                <i className="fas fa-edit mr-2"></i>
                                Editar
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(coupon.code);
                                  toast({
                                    title: "Copiado!",
                                    description: `Código ${coupon.code} copiado para a área de transferência`,
                                  });
                                }}
                              >
                                <i className="fas fa-copy mr-2"></i>
                                Copiar Código
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions for Mobile */}
      <div className="md:hidden fixed bottom-6 right-6">
        {planInfo?.canCreateCoupons && (
          <Button asChild size="lg" className="rounded-full shadow-lg">
            <Link href="/seller/coupons/add">
              <i className="fas fa-plus"></i>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}