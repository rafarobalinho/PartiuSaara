import { PageHeader } from '@/components/ui/page-header';
import GeocodingPanel from '@/components/admin/GeocodingPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StoresMap from '@/components/ui/StoresMap';

export default function LocationSettingsPage() {
  return (
    <div className="container max-w-5xl mx-auto py-6">
      <PageHeader
        title="Configurações de Localização"
        description="Gerencie as informações de localização das suas lojas"
      />

      <Tabs defaultValue="geocoding" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="geocoding">Geocodificação</TabsTrigger>
          <TabsTrigger value="preview">Visualização no Mapa</TabsTrigger>
        </TabsList>

        <TabsContent value="geocoding">
          <GeocodingPanel />
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Visualização no Mapa</CardTitle>
              <CardDescription>
                Veja como suas lojas aparecem no mapa da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StoresMap height="500px" />
              <p className="text-xs text-muted-foreground mt-4">
                Use a guia de Geocodificação para atualizar a localização de suas lojas no mapa.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}