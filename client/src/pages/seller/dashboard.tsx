import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, BarChart3, Settings, Plus } from "lucide-react";
import { Link } from "wouter";

export default function SellerDashboard() {
  const { user } = useAuth();

  // Lógica condicional para o botão "Gerenciar Planos"
  const getManagePlansLink = () => {
    if (!user?.stores || user.stores.length === 0) {
      return "/seller/stores"; // Usuário sem lojas vai para a lista
    } else if (user.stores.length === 1) {
      return `/seller/stores/${user.stores[0].id}/subscription`; // Uma loja vai direto para assinatura
    } else {
      return "/seller/stores"; // Múltiplas lojas vai para a lista
    }
  };

  const getManagePlansText = () => {
    if (!user?.stores || user.stores.length === 0) {
      return "Criar Primeira Loja";
    } else if (user.stores.length === 1) {
      return "Gerenciar Plano";
    } else {
      return "Gerenciar Lojas";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Painel do Vendedor</h1>
          <p className="text-gray-600">Visão geral das suas lojas e negócios</p>
        </div>
        <div className="flex gap-2">
          <Link href={getManagePlansLink()}>
            <Button>
              <Settings className="w-4 h-4 mr-2" />
              {getManagePlansText()}
            </Button>
          </Link>
          <Link href="/seller/stores/add">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Nova Loja
            </Button>
          </Link>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Lojas</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.stores?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Lojas ativas em sua conta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.stores?.filter(store => store.isOpen).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Lojas abertas de {user?.stores?.length || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.stores?.filter(store => store.subscriptionPlan !== 'freemium').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Lojas com planos pagos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Lojas */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Lojas</CardTitle>
          <CardDescription>
            Gerencie cada uma das suas lojas individualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user?.stores && user.stores.length > 0 ? (
            <div className="space-y-4">
              {user.stores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Store className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{store.name}</h3>
                      <p className="text-sm text-gray-600">
                        {store.category} • Plano: {store.subscriptionPlan}
                      </p>
                      <p className="text-xs text-gray-500">
                        Status: {store.isOpen ? 'Aberta' : 'Fechada'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/seller/stores/${store.id}/analytics`}>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analytics
                      </Button>
                    </Link>
                    <Link href={`/seller/stores/${store.id}/subscription`}>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Assinatura
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhuma loja encontrada
              </h3>
              <p className="text-gray-500 mb-4">
                Crie sua primeira loja para começar a vender
              </p>
              <Link href="/seller/stores/add">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Loja
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso rápido às funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/seller/stores">
              <Button variant="outline" className="w-full">
                <Store className="w-4 h-4 mr-2" />
                Ver Todas as Lojas
              </Button>
            </Link>
            <Link href="/seller/stores/add">
              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Loja
              </Button>
            </Link>
            <Link href="/seller/products">
              <Button variant="outline" className="w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                Todos os Produtos
              </Button>
            </Link>
            <Link href="/seller/promotions">
              <Button variant="outline" className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Todas as Promoções
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}