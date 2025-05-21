import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface UserData {
  id: number;
  username: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'seller';
  createdAt?: string;
  avatarUrl?: string;
  avatarThumbnailUrl?: string;
  stats?: {
    wishlistCount: number;
    reservationsCount: number;
    favoriteStoresCount: number;
  };
}

interface Reservation {
  id: number;
  productId: number;
  quantity: number;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  product: {
    id: number;
    name: string;
    images: string[];
    price: number;
    discountedPrice?: number;
    store: {
      id: number;
      name: string;
    };
  };
}

export default function Account() {
  const { user, isAuthenticated, isSeller, logout } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Estados para o modal de edição de perfil
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    avatar: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordFieldsEnabled, setPasswordFieldsEnabled] = useState(false);
  
  // Estados para o avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dados do usuário são obtidos na useQuery abaixo

  // Função para lidar com as mudanças nos campos do formulário
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm({
      ...profileForm,
      [name]: value
    });
  };

  // Função para verificar a senha atual e habilitar os campos de nova senha
  const verifyCurrentPassword = async () => {
    try {
      const response = await fetch('/api/users/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: profileForm.currentPassword })
      });

      if (response.ok) {
        setPasswordFieldsEnabled(true);
        toast({
          title: "Senha verificada",
          description: "Agora você pode definir uma nova senha",
          variant: "default"
        });
      } else {
        toast({
          title: "Senha incorreta",
          description: "A senha atual não está correta",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar a senha",
        variant: "destructive"
      });
    }
  };

  // Função para salvar as alterações do perfil
  const saveProfileChanges = async () => {
    try {
      // Validar os campos
      if (!profileForm.name || !profileForm.email) {
        toast({
          title: "Erro",
          description: "Nome e email são obrigatórios",
          variant: "destructive"
        });
        return;
      }

      // Validar a senha se estiver tentando alterá-la
      if (passwordFieldsEnabled) {
        if (profileForm.newPassword !== profileForm.confirmPassword) {
          toast({
            title: "Erro",
            description: "As senhas não coincidem",
            variant: "destructive"
          });
          return;
        }
      }

      // Preparar os dados para enviar
      const updateData: {
        name: string;
        email: string;
        password?: string;
      } = {
        name: profileForm.name,
        email: profileForm.email
      };

      // Adicionar senha se estiver alterando
      if (passwordFieldsEnabled && profileForm.newPassword) {
        updateData.password = profileForm.newPassword;
      }

      // Primeiro, vamos atualizar o perfil básico
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      // Fazer upload do avatar se houver um arquivo selecionado
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        
        const avatarResponse = await fetch('/api/users/avatar', {
          method: 'POST',
          body: formData
        });
        
        if (!avatarResponse.ok) {
          const errorData = await avatarResponse.json();
          throw new Error(errorData.message || 'Erro ao atualizar avatar');
        }
      }

      if (response.ok) {
        // Fechar o modal e atualizar os dados
        setIsEditProfileOpen(false);
        // Invalidar a query para recarregar os dados do usuário
        queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
        
        toast({
          title: "Perfil atualizado",
          description: "Suas informações foram atualizadas com sucesso",
          variant: "default"
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Erro",
          description: errorData.message || "Não foi possível atualizar o perfil",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o perfil",
        variant: "destructive"
      });
    }
  };

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const { data: userData, isLoading: isUserDataLoading } = useQuery({
    queryKey: ['/api/users/me'],
    retry: false
  });
  
  // Ao receber os dados do usuário, preencher o formulário
  useEffect(() => {
    if (userData) {
      setProfileForm(prev => ({
        ...prev,
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        email: userData.email || ''
      }));
      
      // Inicializar preview do avatar se existir
      if (userData.avatarUrl) {
        setAvatarPreview(userData.avatarUrl);
      }
    }
  }, [userData]);
  
  // Função para selecionar avatar
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  // Função para lidar com a seleção de arquivo de avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo de imagem válido.",
          variant: "destructive"
        });
        return;
      }
      
      // Validar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive"
        });
        return;
      }
      
      setAvatarFile(file);
      
      // Criar URL temporária para preview
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
    }
  };

  const { data: recentReservations = [], isLoading: isReservationsLoading } = useQuery({
    queryKey: ['/api/reservations?limit=3'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/reservations?limit=3');
        if (!response.ok) {
          throw new Error('Failed to fetch reservations');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching reservations:', error);
        return [];
      }
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Minha Conta</h1>
        <p className="text-gray-600">Gerencie suas informações e acompanhe suas atividades</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Menu</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col space-y-1">
                <Button variant="ghost" className="justify-start">
                  <i className="fas fa-user mr-2"></i> Perfil
                </Button>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/account/wishlist">
                    <a>
                      <i className="fas fa-heart mr-2"></i> Lista de Desejos
                    </a>
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/account/reservations">
                    <a>
                      <i className="fas fa-bookmark mr-2"></i> Minhas Reservas
                    </a>
                  </Link>
                </Button>
                {isSeller && (
                  <Button asChild variant="ghost" className="justify-start">
                    <Link href="/seller/dashboard">
                      <a>
                        <i className="fas fa-store mr-2"></i> Painel do Lojista
                      </a>
                    </Link>
                  </Button>
                )}
                <div className="pt-4 mt-2 border-t border-gray-200">
                  <Button variant="ghost" className="justify-start w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={logout}>
                    <i className="fas fa-sign-out-alt mr-2"></i> Sair
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* User Info Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <Avatar size="lg">
                  {userData?.avatarUrl ? (
                    <AvatarImage src={userData.avatarUrl} alt="Avatar do usuário" />
                  ) : (
                    <AvatarFallback>
                      <i className="fas fa-user text-3xl"></i>
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{userData ? `${userData.firstName} ${userData.lastName}` : user?.email}</h2>
                  <p className="text-gray-500">{userData?.email || user?.email}</p>
                  
                  <div className="flex items-center mt-2">
                    <Badge variant="outline" className="mr-2">
                      {userData?.role === 'seller' ? 'Lojista' : 'Consumidor'}
                    </Badge>
                    {userData?.createdAt && (
                      <span className="text-xs text-gray-500">
                        Membro desde {new Date(userData.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="flex-shrink-0"
                  onClick={() => setIsEditProfileOpen(true)}
                >
                  <i className="fas fa-edit mr-2"></i> Editar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Lista de Desejos</p>
                    <h3 className="text-2xl font-bold">{userData?.stats?.wishlistCount || 0}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fas fa-heart"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Reservas</p>
                    <h3 className="text-2xl font-bold">{userData?.stats?.reservationsCount || 0}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fas fa-bookmark"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Lojas Favoritas</p>
                    <h3 className="text-2xl font-bold">{userData?.stats?.favoriteStoresCount || 0}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fas fa-store"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="reservations">
                <TabsList className="mb-4">
                  <TabsTrigger value="reservations">Reservas</TabsTrigger>
                  <TabsTrigger value="wishlist">Lista de Desejos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="reservations">
                  {isReservationsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((_, index) => (
                        <div key={index} className="flex items-center p-3 border rounded-lg">
                          <div className="w-16 h-16 bg-gray-200 animate-pulse rounded-md mr-4"></div>
                          <div className="flex-1">
                            <div className="h-5 bg-gray-200 animate-pulse rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
                          </div>
                          <div className="h-8 bg-gray-200 animate-pulse rounded w-20"></div>
                        </div>
                      ))}
                    </div>
                  ) : recentReservations.length > 0 ? (
                    <div className="space-y-4">
                      {recentReservations.map((reservation: Reservation) => (
                        <div key={reservation.id} className="flex items-center p-3 border rounded-lg">
                          <div className="w-16 h-16 rounded-md mr-4 overflow-hidden">
                            {reservation.product && reservation.product.images && reservation.product.images.length > 0 ? (
                              <img 
                                src={reservation.product.images[0]} 
                                alt={reservation.product?.name || 'Produto'} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <i className="fas fa-image text-gray-400"></i>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{reservation.product?.name || 'Produto indisponível'}</h4>
                            <p className="text-sm text-gray-500">
                              {reservation.product?.store?.name || 'Loja'} • {new Date(reservation.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <Badge className={
                              reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              reservation.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {reservation.status === 'pending' ? 'Pendente' :
                               reservation.status === 'completed' ? 'Concluída' :
                               reservation.status === 'expired' ? 'Expirada' : 'Cancelada'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      
                      <div className="mt-4 text-center">
                        <Button asChild variant="link" className="text-primary">
                          <Link href="/account/reservations">
                            <a>Ver todas as reservas</a>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4"><i className="fas fa-bookmark text-gray-300"></i></div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma reserva ainda</h3>
                      <p className="text-gray-500 mb-4">Você ainda não fez nenhuma reserva de produto.</p>
                      <Button asChild className="bg-primary text-white hover:bg-primary/90">
                        <Link href="/products">
                          <a>Explorar produtos</a>
                        </Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="wishlist">
                  {/* Similar to reservations tab but with wishlist data */}
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4"><i className="fas fa-heart text-gray-300"></i></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Lista de desejos</h3>
                    <p className="text-gray-500 mb-4">Veja todos os produtos da sua lista de desejos.</p>
                    <Button asChild className="bg-primary text-white hover:bg-primary/90">
                      <Link href="/account/wishlist">
                        <a>Ver lista de desejos</a>
                      </Link>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Edição de Perfil */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="mb-4 flex flex-col items-center">
              <div 
                className="w-24 h-24 rounded-full overflow-hidden cursor-pointer relative mb-2"
                onClick={handleAvatarClick}
              >
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar do usuário" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fas fa-user text-3xl"></i>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm">Alterar</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarChange}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleAvatarClick}
                type="button"
              >
                <i className="fas fa-camera mr-2"></i> Alterar foto
              </Button>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                name="name"
                value={profileForm.name}
                onChange={handleProfileChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                className="col-span-3"
              />
            </div>
            
            <Separator className="my-2" />
            
            <h3 className="font-medium text-lg">Segurança da Conta</h3>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentPassword" className="text-right">
                Senha Atual
              </Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={profileForm.currentPassword}
                  onChange={handleProfileChange}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={verifyCurrentPassword}
                  disabled={!profileForm.currentPassword}
                >
                  Verificar
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPassword" className="text-right">
                Nova Senha
              </Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                disabled={!passwordFieldsEnabled}
                value={profileForm.newPassword}
                onChange={handleProfileChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmPassword" className="text-right">
                Confirmar
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                disabled={!passwordFieldsEnabled}
                value={profileForm.confirmPassword}
                onChange={handleProfileChange}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditProfileOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={saveProfileChanges}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add this missing Badge component
function Badge({ children, className = "", variant = "default" }) {
  const variantClasses = {
    default: "bg-primary text-white",
    secondary: "bg-gray-100 text-gray-800",
    outline: "border border-gray-200 text-gray-800",
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
