# Wistaar Reading Studio - Architecture Knowledge Graph

## Executive Summary
- **Corpus**: 213 files · ~117,952 words
- **Code**: 179 files
- **Document**: 31 files
- **Image**: 3 files

## Graph Statistics
- **Nodes**: 553
- **Edges**: 1339
- **Communities**: 69

## God Nodes (Highest Connectivity)
Nodes with the most influence across the system:
1. **ApiClient**
2. **useAuth()**
3. **toast()**
4. **CryptoUtil**
5. **logSecurityEvent()**
6. **CacheManager**
7. **AuthService**
8. **handleSubmit()**
9. **S3Uploader**
10. **loadAdmins()**

## Surprising Connections
Unexpected relationships that may indicate cross-cutting concerns:
1. **handleGoogleSignIn()** calls **toast()**
2. **handleSubmit()** calls **toast()**
3. **EmailVerificationBanner()** calls **useAuth()**
4. **GoogleLoginButton()** calls **useToast()**
5. **RealTimeDashboard()** calls **useAuth()**

## Architecture Communities
Clustered groups of related components:
- **Community 0**: booksearch_getchaptercontent, calendar_calendar, carousel_usecarousel ...
- **Community 1**: react_query, useapprovedbooks_new_useapprovedbooks, useapprovedbooks_new_usebook ...
- **Community 2**: client_apiclient, client_apiclient_addadmin, client_apiclient_addbookmark ...
- **Community 3**: EarningsBreakdown, admindashboard_checkadminandload, admindashboard_downloadmanuscript ...
- **Community 4**: app_createapp, app_startserver, auth_authmiddleware ...
- **Community 5**: animatedroutes_lazyfallback, auth_handlegooglesignin, auth_handlesubmit ...
- **Community 6**: animated_routes, app_component, approved_book_card ...
- **Community 7**: crypto_cryptoutil, crypto_cryptoutil_comparepassword, crypto_cryptoutil_constructor ...
- **Community 8**: HeroSection, booksubmit_analyzepdf, booksubmit_handlecoverchange ...
- **Community 9**: cache_cachemanager, cache_cachemanager_constructor, cache_cachemanager_get ...
- **Community 10**: fileupload_filefilter, fileupload_s3uploader, fileupload_s3uploader_constructor ...
- **Community 11**: emailverificationbanner_emailverificationbanner, googleloginbutton_googleloginbutton, realtimedashboard_example_realtimedashboard ...
- **Community 12**: couponmanagement_copycode, couponmanagement_generatecode, couponmanagement_handlecreate ...
- **Community 13**: pageskeleton_bookcardskeleton, pageskeleton_bookgridskeleton, pageskeleton_heroskeleton ...
- **Community 14**: pagination_pagination, pagination_paginationellipsis, pagination_paginationlink ...

## Key Insights

### Frontend Architecture
- React-based SPA with Vite for build optimization
- Framer Motion handles animations and page transitions
- React Router manages client-side routing
- TanStack Query for data fetching and caching

### Backend Architecture
- Express.js RESTful API
- Prisma ORM with MySQL database
- JWT authentication with RBAC middleware
- Rate limiting and security headers via Helmet

### Data Layer
- Supabase for real-time subscriptions and auth
- MySQL for transactional data (payments, submissions)
- Hybrid architecture balancing real-time and persistence needs

### Key Features
- Book submission and approval workflow
- E-commerce with shopping cart and coupon system
- Reader experience with PDF parsing and chapter extraction
- Author earnings tracking and analytics
- Real-time admin notifications
- Email verification and Google OAuth integration

## Security & Compliance
- Encryption for sensitive data (AES-256-GCM)
- Comprehensive audit logging
- CORS configuration and helmet security headers
- Role-based access control (USER, AUTHOR, ADMIN, SUPER_ADMIN)

## Outputs Generated
- **graph.json**: GraphRAG-ready network data
- **graph.html**: Interactive visualization (open in browser)
- **GRAPH_REPORT.md**: This architectural summary