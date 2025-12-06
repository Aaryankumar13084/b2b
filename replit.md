# DocuTools AI - AI-Powered Document & Data Processing Platform

## Overview

DocuTools AI is a B2B SaaS platform that provides AI-powered document and data processing tools. The platform offers a comprehensive suite of features including PDF conversion, image processing, data manipulation, and AI-powered document analysis capabilities. Built with a focus on enterprise-grade security and professional user experience, it serves as an all-in-one solution for document workflow automation.

The platform implements a credit-based subscription model with three tiers (Free, Pro, Enterprise) and includes features like document chat, automated summarization, invoice extraction, resume parsing, and legal document analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type safety and developer experience
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing instead of React Router

**UI Component System**
- shadcn/ui component library (New York style variant) built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for component variant management
- Design system inspired by Linear, Stripe, and Notion with emphasis on clarity and efficiency

**State Management**
- TanStack Query (React Query) for server state management, caching, and data fetching
- Custom hooks pattern for authentication (`useAuth`) and other shared logic
- React Context for theme management (light/dark mode) and sidebar state

**Design Principles**
- System-based approach prioritizing information clarity over decoration
- Consistent spacing primitives (Tailwind units: 2, 4, 6, 8, 12, 16, 24)
- Typography hierarchy using Inter font family with SF Mono for code/data
- Responsive layouts with defined max-widths for different page types

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server with custom middleware stack
- Node.js with TypeScript and ESM modules
- HTTP server creation for potential WebSocket support

**Authentication & Sessions**
- Replit Auth integration using OpenID Connect (OIDC) strategy
- Passport.js for authentication middleware
- PostgreSQL-backed session storage using connect-pg-simple
- Session-based authentication with secure cookies (7-day TTL)
- Role-based access control (user/admin roles)

**API Design**
- RESTful API endpoints organized by feature domain
- File upload handling with Multer (50MB file size limit)
- Express middleware for request logging with timing metrics
- Raw body preservation for webhook verification
- Credit-based rate limiting for AI features

**Data Processing Services**
- PDF manipulation: splitting, merging, compression, locking/unlocking (pdf-lib)
- Image processing: compression, resizing, conversion, background removal (sharp, @imgly/background-removal-node)
- Excel/CSV operations: data cleaning, format conversion (exceljs, xlsx)
- Document text extraction: PDF, Word, Excel parsing (pdf-parse, mammoth)
- Phone number and email validation utilities

**AI Integration**
- Groq API for AI-powered features (document chat, summarization, analysis)
- Credit tracking system with daily and monthly limits per subscription tier
- AI usage logging for analytics and billing

### Database Architecture

**ORM & Schema Design**
- Drizzle ORM with PostgreSQL dialect for type-safe database operations
- Schema-first approach with Zod validation integration
- PostgreSQL enums for type safety (subscription tiers, file status, tool types, user roles)

**Core Data Models**
- **Users**: Profile information, subscription tier, role, AI credit tracking
- **Files**: Uploaded file metadata, processing status, retention tracking
- **Subscriptions**: Stripe integration, billing cycles, plan management
- **AI Usage Logs**: Detailed tracking of AI operations for analytics and billing
- **Sessions**: Secure session storage for authentication

**Data Features**
- UUID primary keys for security and distribution
- Timestamp tracking (created_at, updated_at) for all entities
- Soft deletion support for files
- Relational integrity with foreign key constraints
- JSON fields for flexible metadata storage

### File Storage & Processing

**Upload Management**
- Local filesystem storage in `uploads` directory
- Unique filename generation with timestamps and random suffixes
- File retention system with automatic cleanup of expired files
- Support for multiple file types: PDF, Word, Excel, images

**Processing Pipeline**
- Asynchronous file processing with status tracking (pending → processing → completed/failed)
- Result storage with output path and filename tracking
- Error handling and retry mechanisms
- File expiration based on subscription tier (1 hour for free, 24 hours for pro)

### Security Considerations

**Authentication Security**
- OIDC-based authentication through Replit
- Secure session cookies with httpOnly and secure flags
- CSRF protection through session-based authentication
- Token refresh mechanism for long-lived sessions

**Authorization**
- Role-based middleware (`isAuthenticated`, `isAdmin`)
- Resource ownership verification for file operations
- API endpoint protection with authentication gates

**Data Security**
- Environment variable configuration for sensitive credentials
- SQL injection prevention through parameterized queries (Drizzle ORM)
- File upload validation and size limits
- Secure file storage with access control

## External Dependencies

### Core Services

**Database**
- PostgreSQL as primary data store (connection via DATABASE_URL environment variable)
- Required for user data, files, subscriptions, and session management
- Drizzle Kit for schema migrations

**Authentication Provider**
- Replit Auth (OpenID Connect)
- Issuer URL: `process.env.ISSUER_URL` (default: https://replit.com/oidc)
- Client ID: `process.env.REPL_ID`
- Session secret: `process.env.SESSION_SECRET`

### AI & ML Services

**Groq API**
- API Key: `process.env.GROQ_API_KEY`
- Used for all AI-powered features (chat, summarization, extraction)
- Rate limiting applied based on subscription tier

**Background Removal**
- IMG.LY Background Removal Node service
- Used for automated image background removal tool

### Payment Processing

**Stripe** (Optional)
- Payment gateway for subscription management
- Webhook handling for subscription events
- Customer portal integration

### Email Service

**Nodemailer** (Configured but usage unclear)
- Email delivery for notifications and transactional emails
- SMTP configuration required

### Development Tools

**Replit-Specific Plugins**
- @replit/vite-plugin-runtime-error-modal: Development error overlay
- @replit/vite-plugin-cartographer: Code navigation
- @replit/vite-plugin-dev-banner: Development mode indicator

### Build Dependencies

**Production Build**
- esbuild for server-side bundling with selective dependency bundling
- Vite for client-side bundling and optimization
- Server dependencies bundled to reduce cold start times

### Font Assets

**Google Fonts**
- Inter: Primary UI font (weights 100-900)
- JetBrains Mono: Code and monospace content (weights 400, 500, 600)