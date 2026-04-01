# PDF Form Filling Implementation Guide

I've implemented a comprehensive PDF form filling solution for your Next.js application using `pdf-lib`. Here's how to use it:

## Implementation Summary

### 1. Created Utilities (`/src/utils/pdfFormFiller.ts`)
- **PDFFormFiller class**: Main utility for handling PDF form operations
- **createFormDataFromUser()**: Helper to map user data to form fields
- **fillPDFForm()**: Convenience function for quick form filling

### 2. API Routes
- **`/api/pdf-form-fill`**: Fill PDF forms with user data
- **`/api/pdf-fields`**: Analyze PDF form fields (for debugging)

### 3. Updated Stepper Page
Your `generatePDF()` function now uses the form filling approach instead of reading static PDFs.

## How to Use

### Basic Usage Example

```typescript
// Example from your stepper page - this is already implemented
const formFillResponse = await fetch('/api/pdf-form-fill', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userInfo: {
      firstName: 'Robert',
      lastName: 'Testmann',
      birthDate: '15.05.1985',
      email: 'robert@example.com',
      // ... all other user fields
    },
    additionalData: {
      'datum': new Date().toLocaleDateString('de-DE'),
      'zeit': new Date().toLocaleTimeString('de-DE'),
    },
    options: {
      flattenForm: true,
      debugMode: true // Enable to see field mapping in console
    }
  }),
});

const result = await formFillResponse.json();
if (result.success) {
  // Use result.pdfBase64 for SignTeq or other purposes
  console.log('PDF filled successfully!');
}
```

### Field Mapping

The `createFormDataFromUser()` function automatically maps your form data to common PDF field names:

```typescript
// User data → PDF field names
{
  firstName: 'Robert' → 'vorname': 'Robert'
  lastName: 'Test' → 'nachname': 'Test'
  birthDate: '15.05.1985' → 'geburtsdatum': '15.05.1985'
  email: 'test@example.com' → 'email': 'test@example.com'
  countryCode: '+43' → Country code used for phone formatting
  phone: '1234567' → 'telefon': '+431234567'
  // ... many more mappings
}
```

### Custom Field Mapping

If you need to map additional fields, you can extend the mapping:

```typescript
const additionalData = {
  'custom_field_name': 'custom_value',
  'produktname': suggestedProduct?.name,
  'datum': new Date().toLocaleDateString('de-DE'),
};
```

## Discovering PDF Field Names

To see what fields are available in your PDF:

1. **Use the debug mode** (already enabled in your implementation):
   ```typescript
   options: {
     debugMode: true // This will log field names to console
   }
   ```

2. **Call the fields analysis API**:
   ```bash
   curl http://localhost:3000/api/pdf-fields
   ```

3. **Use the utility directly**:
   ```typescript
   import { PDFFormFiller } from '@/utils/pdfFormFiller';
   
   const filler = await PDFFormFiller.loadFromFile('path/to/your.pdf', { debugMode: true });
   const fieldNames = filler.getFieldNames();
   console.log('Available fields:', fieldNames);
   ```

## Example Field Names (based on your PDF)

Based on typical financial form PDFs, you might find fields like:
- `vorname`, `nachname` (first/last name)
- `geburtsdatum`, `geburtsort` (birth date/place)
- `strasse`, `hausnummer`, `plz`, `ort` (address)
- `telefon`, `email` (contact)
- `beruf`, `branche` (profession/industry)
- `datum`, `zeit` (date/time)

## Advanced Usage

### Direct Utility Usage
```typescript
import { PDFFormFiller, createFormDataFromUser } from '@/utils/pdfFormFiller';

// Load PDF
const filler = await PDFFormFiller.loadFromFile('/path/to/form.pdf');

// Create form data
const formData = createFormDataFromUser(userInfo, additionalData);

// Fill and save
filler.fillForm(formData);
filler.flattenForm(); // Make non-editable
const pdfBuffer = await filler.save();
```

### Multiple PDF Sources
```typescript
// From file
const filler1 = await PDFFormFiller.loadFromFile('/path/to/form.pdf');

// From base64
const filler2 = await PDFFormFiller.loadFromBase64(base64String);

// From buffer
const filler3 = await PDFFormFiller.loadFromBuffer(pdfBuffer);
```

## Integration Status

✅ **Complete**: Your stepper page now uses this implementation in the `generatePDF()` function
✅ **API Routes**: Both form filling and field analysis endpoints are ready
✅ **Type Safety**: Full TypeScript support with proper interfaces
✅ **Error Handling**: Comprehensive error handling and logging
✅ **Debugging**: Debug mode for field discovery

## Next Steps

1. **Test the implementation** by running through your stepper flow
2. **Check the console logs** when `debugMode: true` to see field mappings
3. **Adjust field mappings** in `createFormDataFromUser()` if needed
4. **Add any missing PDF fields** to the mapping function

The implementation follows your exact example pattern:
- Loads PDF with `pdf-lib`
- Maps user data to form fields
- Fills the form programmatically
- Flattens the form (making it non-editable)
- Returns base64 for use with SignTeq

Your stepper now automatically fills the PDF form with user data instead of using a static PDF!