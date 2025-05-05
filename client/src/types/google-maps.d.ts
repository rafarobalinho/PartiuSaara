declare module '@react-google-maps/api' {
  import { ReactNode, ComponentType } from 'react';
  
  export interface GoogleMapProps {
    id?: string;
    mapContainerStyle?: {
      height?: string;
      width?: string;
    };
    options?: {
      fullscreenControl?: boolean;
      streetViewControl?: boolean;
      mapTypeControl?: boolean;
      zoomControl?: boolean;
      [key: string]: any;
    };
    center?: {
      lat: number;
      lng: number;
    };
    zoom?: number;
    onClick?: (e: any) => void;
    onLoad?: (map: any) => void;
    onUnmount?: () => void;
    children?: ReactNode;
  }
  
  export const GoogleMap: ComponentType<GoogleMapProps>;
  
  export interface MarkerProps {
    position: {
      lat: number;
      lng: number;
    };
    onClick?: () => void;
    title?: string;
    icon?: string;
    onLoad?: (marker: any) => void;
  }
  
  export const Marker: ComponentType<MarkerProps>;
  
  export interface InfoWindowProps {
    position: {
      lat: number;
      lng: number;
    };
    onCloseClick?: () => void;
    children: ReactNode;
  }
  
  export const InfoWindow: ComponentType<InfoWindowProps>;
  
  export interface UseJsApiLoaderOptions {
    id: string;
    googleMapsApiKey: string;
    libraries?: string[];
    version?: string;
  }
  
  export interface UseJsApiLoaderReturn {
    isLoaded: boolean;
    loadError: Error | null;
  }
  
  export function useJsApiLoader(options: UseJsApiLoaderOptions): UseJsApiLoaderReturn;
}

// Adicionar namespace global para o Google Maps API
declare global {
  namespace google {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options: any);
        fitBounds(bounds: any): void;
        setZoom(zoom: number): void;
        setCenter(center: { lat: number; lng: number }): void;
      }
      
      class LatLngBounds {
        constructor();
        extend(latLng: { lat: number; lng: number }): void;
      }
    }
  }
}