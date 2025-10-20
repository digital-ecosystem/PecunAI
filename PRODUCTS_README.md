# Products Management API & Admin Panel

This document outlines the new Products management functionality added to the admin panel.

## Overview

The Products management system allows administrators to:
- Create, read, update, and delete products
- Upload PDF documents for products
- Set risk types and year ranges for products
- Search and filter products
- View product usage statistics

## Database Schema Changes

The `Product` model has been updated with new fields:
- `minimumYear` (Int, optional): Minimum applicable year
- `maximumYear` (Int, optional): Maximum applicable year
- `riskType` (RiskType enum, optional): Risk level of the product

New enum `RiskType` with values:
- `LOW`
- `MEDIUM` 
- `HIGH`
- `VERY_HIGH`

## API Endpoints

### Products CRUD

- `GET /api/admin/products` - List products with pagination and filtering
- `POST /api/admin/products` - Create a new product
- `GET /api/admin/products/[id]` - Get a single product
- `PUT /api/admin/products/[id]` - Update a product
- `DELETE /api/admin/products/[id]` - Delete a product

### File Upload

- `POST /api/admin/products/upload` - Upload product PDF files

## Query Parameters for GET /api/admin/products

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term for name, description, or short name
- `riskType`: Filter by risk type (all, LOW, MEDIUM, HIGH, VERY_HIGH)

## Admin Panel Features

### Products Page (/admin/products)

- **Dashboard Stats**: Shows total products, active products, high-risk products, and products created this month
- **Search & Filter**: Real-time search and risk type filtering
- **Product Table**: Displays product information with actions
- **Modal Interface**: Add/edit/view products in modal dialogs
- **PDF Upload**: Drag-and-drop or click to upload PDF files
- **Pagination**: Navigate through products with pagination controls

### Navigation

The admin panel now includes navigation between:
- Dashboard (`/admin/dashboard`)
- Products (`/admin/products`)

## Form Validation

Products form includes validation for:
- Required product name
- Year range validation (minimum ≤ maximum)
- PDF file type and size validation (max 10MB)
- Risk type selection

## Usage Examples

### Create a Product

```javascript
const response = await fetch('/api/admin/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Investment Product',
    description: 'A high-yield investment option',
    shortName: 'NIP',
    minimumYear: 2020,
    maximumYear: 2030,
    riskType: 'HIGH',
    fileName: '/products/nip_guide.pdf'
  })
});
```

### Search Products

```javascript
const response = await fetch('/api/admin/products?search=investment&riskType=HIGH&page=1&limit=10');
```

## File Upload Process

1. Select or drag PDF file to upload area
2. File is validated (PDF type, max 10MB)
3. File is uploaded to `/public/products/` directory
4. File path is stored in product record
5. File can be viewed via direct link

## Error Handling

The API provides detailed error responses:
- 400: Validation errors with field-specific messages
- 404: Product not found
- 500: Server errors

## Security Considerations

- File uploads are restricted to PDF files only
- File size limited to 10MB
- Admin authentication required for all operations
- Product deletion checks for dependencies

## Migration

A database migration has been created to add the new fields. Run:

```bash
npx prisma migrate dev
```

## Sample Data

The seed file has been updated to include sample products with various risk types and year ranges. Run:

```bash
npm run seed
```

## Components

### Shared Components
- `AdminHeader`: Shared navigation header for admin pages

### Product Components
- `ProductsPage`: Main products management page
- Modal dialogs for create/edit/view operations
- File upload component with drag-and-drop

## Styling

The interface follows the existing admin panel theme with:
- Tailwind CSS for styling
- Consistent color scheme (blue primary, proper status colors)
- Responsive design for mobile/desktop
- Smooth transitions and hover effects
- Loading states and error handling

## Future Enhancements

Potential improvements:
- Bulk product operations
- Product categories/tags
- Advanced filtering options
- Product analytics dashboard
- Export functionality
- Image upload support
- Product versioning