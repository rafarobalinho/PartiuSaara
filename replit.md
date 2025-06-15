# Partiu Saara - Marketplace Application

## Overview

Partiu Saara is a comprehensive marketplace application built with Node.js, Express, React, and PostgreSQL. The application enables users to browse stores, products, and manage reservations with integrated payment processing through Stripe. It features a location-based system using Google Maps API for store discovery and includes subscription-based business models for sellers.

## System Architecture

The application follows a full-stack architecture with clear separation between frontend and backend components:

- **Frontend**: React-based SPA with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Express.js REST API with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication with express-session
- **File Storage**: Local file system for image uploads with Sharp for processing
- **Payment Processing**: Stripe integration for subscriptions and payments
- **Maps Integration**: Google Maps API for location services

## Key Components

### Frontend Architecture
- **React Components**: Modular component structure using shadcn/ui design system
- **State Management**: React Query for server state management
- **Styling**: Tailwind CSS with custom component library
- **Form Handling**: React Hook Form with Zod validation
- **Maps**: Google Maps integration for store location display

### Backend Architecture
- **API Structure**: RESTful endpoints organized by feature modules
- **Middleware Stack**: Authentication, CORS, CSP, and custom validation middleware
- **Database Layer**: Drizzle ORM for type-safe database operations
- **File Processing**: Sharp for image optimization and thumbnail generation
- **Session Management**: PostgreSQL-backed session storage

### Database Schema
- **Users**: Authentication and profile management
- **Stores**: Business listings with location data
- **Products**: Inventory management with image support
- **Reservations**: Customer booking system
- **Promotions**: Marketing and discount system
- **Subscriptions**: Seller subscription plans
- **Images**: Secure image storage with relationship validation

## Data Flow

1. **User Authentication**: Session-based auth with PostgreSQL session store
2. **Content Management**: CRUD operations through protected API endpoints
3. **Image Processing**: Multi-stage pipeline with validation and optimization
4. **Location Services**: Google Maps geocoding and display integration
5. **Payment Processing**: Stripe webhooks for subscription management
6. **Real-time Updates**: Session-based state synchronization

## External Dependencies

- **Stripe**: Payment processing and subscription management
- **Google Maps API**: Geocoding and map display services
- **Sharp**: Image processing and optimization
- **PostgreSQL**: Primary database storage
- **Neon Database**: Cloud PostgreSQL provider

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:

- **Development**: Hot-reloading with Vite dev server
- **Production**: Built assets served through Express
- **Database**: Auto-provisioned PostgreSQL via Replit
- **Environment**: Auto-detection of production/development modes
- **Port Configuration**: Dynamic port management with cleanup scripts

Key deployment features:
- Automatic Stripe mode detection based on environment
- Database migration handling via Drizzle
- Static asset serving with fallback support
- Session persistence across deployments

## Changelog

```
Changelog:
- June 15, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```