# SignTeq API Integration

This implementation integrates SignTeq's digital signature service into the stepper flow for document signing.

## Features

- ✅ **PDF Document Signing**: Generates investment agreements and sends them to SignTeq for signature
- ✅ **Embedded Signing**: Uses SignTeq's iframe for seamless in-app signing experience
- ✅ **Automatic PDF Generation**: Creates complete investment documents with user data
- ✅ **Real-time Status Updates**: Handles signing success, error, and cancellation events
- ✅ **Base64 PDF Conversion**: Automatically converts generated PDFs to base64 for API submission

## Setup

### 1. Environment Variables

Add your SignTeq API token to your `.env` file:

```env
SIGNTEQ_API_KEY=your_signteq_api_token_here
```

### 2. API Configuration

The integration uses the following SignTeq API settings:

- **API Endpoint**: `https://api.signteq.io/v1/sign`
- **Signing Interface**: `https://app.signteq.io/sign/{signature_id}?token={signature_token}`
- **Document Type**: PDF with signature fields
- **QES Mode**: Set to `false` for testing (skips identity verification phase)

## Integration Flow

### 1. **Personal Info Collection** (Phase 7)
- User fills out personal information form
- Data is validated and saved to database
- SignTeq signing session is automatically created

### 2. **Document Generation**
- System generates final PDF with:
  - Terms and conditions
  - Q&A responses  
  - Suggested product information
  - Personal information
- PDF is converted to base64 format

### 3. **SignTeq Session Creation**
- API call to `/api/signteq/create-session`
- Document sent to SignTeq with user details
- Signature field configured at coordinates (300, 500) with 450x100 dimensions

### 4. **Document Signing** (Phase 8)
- SignTeq iframe embedded in application
- User signs document within the interface
- Real-time event handling for success/error/cancellation

### 5. **Completion** (Phase 9)
- Signed document information saved
- Final PDF generated and displayed
- User can download completed investment agreement

## API Endpoints

### POST `/api/signteq/create-session`

Creates a new SignTeq signing session.

**Request Body:**
```json
{
  "subject": "Investment Agreement Signature",
  "documentName": "investment_agreement_12345.pdf",
  "documentBase64": "JVBERi0xLjcNCiW1tbW1...",
  "recipientEmail": "user@example.com",
  "recipientName": "John Doe",
  "sessionId": "session_12345"
}
```

**Response:**
```json
{
  "success": true,
  "signature_id": "7e9a3272-21f5-45fc-a199-92244430d3e4",
  "signature_token": "QUYHUQIuDJQMXRgzRZg2u9kjwVezchyEyjiDoybWUt0Wp8N5xaNmdDcuHjkG328j",
  "signing_url": "https://app.signteq.io/sign/7e9a3272-21f5-45fc-a199-92244430d3e4?token=QUYHUQIuDJQMXRgzRZg2u9kjwVezchyEyjiDoybWUt0Wp8N5xaNmdDcuHjkG328j"
}
```

## Components

### `useSignTeq` Hook

Custom React hook for SignTeq API integration:

```typescript
const {
  loading,
  error,
  signTeqData,
  createSigningSession,
  getSigningUrl,
  setError,
} = useSignTeq(apiToken);
```

### `SignTeqIframe` Component

Embedded iframe component for document signing:

```jsx
<SignTeqIframe
  src={signingUrl}
  onSuccess={handleSignTeqSuccess}
  onError={handleSignTeqError}
  onCancel={handleSignTeqCancel}
  className="rounded-md border border-gray-200"
/>
```

### PDF Utilities

Helper functions for PDF processing:

```typescript
import { pdfBlobToBase64, fetchPdfAsBase64, arrayBufferToBase64 } from '@/utils/pdfUtils';

// Convert blob to base64
const base64 = await pdfBlobToBase64(pdfBlob);

// Fetch PDF from URL and convert
const base64 = await fetchPdfAsBase64('https://example.com/document.pdf');

// Convert ArrayBuffer to base64
const base64 = arrayBufferToBase64(arrayBuffer);
```

## Configuration Options

### Document Fields

The signature field is configured with these default settings:

```json
{
  "page": 1,
  "x": 300,
  "y": 500,
  "type": "signature",
  "width": 450,
  "height": 100,
  "required": true,
  "read_only": false,
  "recipient_id": 1
}
```

### Signing Settings

```json
{
  "close_on_success": true,
  "redirect_success_url": "http://localhost:3000/customer/success",
  "redirect_error_url": "http://localhost:3000/customer/error"
}
```

### Recipient Configuration

```json
{
  "id": 1,
  "type": "signatory",
  "qes": false,
  "email": "user@example.com",
  "name": "User Name",
  "do_not_notify": true,
  "language": "en"
}
```

## Error Handling

The integration includes comprehensive error handling:

- **API Errors**: Network issues, invalid tokens, malformed requests
- **PDF Generation Errors**: Document creation failures
- **Signing Errors**: User cancellation, technical failures
- **Session Errors**: Invalid or expired signing sessions

## Testing

### Test Configuration

For testing purposes, set `qes: false` in the recipient configuration to skip identity verification.

### Test Credentials

Use the test API token provided in your SignTeq developer account.

### Test Document

The system generates a complete PDF document including:
- Investment agreement terms
- User's Q&A responses
- Selected investment product details
- Personal information

## Security

- ✅ **API Token Protection**: Server-side token storage
- ✅ **PDF Content Validation**: Sanitized HTML content rendering
- ✅ **User Data Encryption**: Secure personal information handling
- ✅ **Session Management**: Secure session tracking and validation

## Customization

### Signature Field Position

Modify the signature field coordinates in `/api/signteq/create-session/route.ts`:

```typescript
fields: [{
  page: 1,
  x: 300,      // X coordinate
  y: 500,      // Y coordinate
  width: 450,  // Field width
  height: 100, // Field height
  // ... other settings
}]
```

### Document Subject

Customize the email subject in the signing session creation:

```typescript
subject: "Your Custom Document Title"
```

### Redirect URLs

Update success and error redirect URLs:

```typescript
redirect_success_url: "https://yourdomain.com/success",
redirect_error_url: "https://yourdomain.com/error"
```

## Troubleshooting

### Common Issues

1. **Invalid API Token**
   - Check environment variable `SIGNTEQ_API_KEY`
   - Verify token is active in SignTeq dashboard

2. **PDF Generation Errors**
   - Ensure all required form fields are filled
   - Check PDF generation dependencies

3. **Iframe Loading Issues**
   - Verify signing URL is correctly formatted
   - Check browser console for errors
   - Ensure iframe permissions are set

4. **Base64 Conversion Errors**
   - Check PDF blob generation
   - Verify PDF content is valid

### Debug Mode

Enable detailed logging by adding console logs in the API route:

```typescript
console.log('SignTeq API Request:', payload);
console.log('SignTeq API Response:', data);
```

## API Reference

For complete API documentation, refer to:
- [SignTeq API Documentation](https://api.signteq.io/docs)
- [SignTeq Developer Portal](https://developer.signteq.io)

---

This integration provides a seamless document signing experience within your investment application, ensuring legal compliance and user-friendly digital signatures.