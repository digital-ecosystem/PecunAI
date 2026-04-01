import { PDFFormFiller, createFormDataFromUser } from './src/utils/pdfFormFiller.js';
import path from 'path';

async function testPDFFormFilling() {
  console.log('🧪 Testing PDF Form Filling...');
  
  try {
    // Path to your PDF
    const pdfPath = path.join(process.cwd(), 'public/static-pdf/4money_protokoll_PecunAI_v1.pdf');
    console.log('📄 PDF Path:', pdfPath);
    
    // Load the PDF and analyze fields
    const filler = await PDFFormFiller.loadFromFile(pdfPath, { debugMode: true });
    
    console.log('\n📝 Available Form Fields:');
    const fieldNames = filler.getFieldNames();
    fieldNames.forEach((name, index) => {
      console.log(`${index + 1}. "${name}"`);
    });
    
    console.log('\n📊 Detailed Field Information:');
    const fieldInfo = filler.getFieldInfo();
    fieldInfo.forEach((field, index) => {
      console.log(`${index + 1}. Name: "${field.name}" | Type: ${field.type} | Value: ${field.value}`);
    });
    
    // Test data
    const testUserInfo = {
      firstName: 'Robert',
      lastName: 'Testmann',
      birthDate: '15.05.1985',
      birthPlace: 'Vienna',
      nationality: 'Austria',
      maritalStatus: 'Single',
      street: 'Teststraße',
      houseNumber: '42',
      postalCode: '1010',
      city: 'Vienna',
      countryCode: '+43',
      phone: '6641234567',
      email: 'robert.test@example.com',
      education: 'University',
      currentJob: 'Software Developer',
      industry: 'Technology',
      occupation: 'Developer',
      documentType: 'passport',
      documentNumber: 'P123456789',
      issuingAuthority: 'City of Vienna',
      issuedOn: '01.01.2020',
      validUntil: '01.01.2030',
      isPEP: false,
      residenceAbroad: false,
      actingFor: 'own',
    };
    
    // Create form data
    const formData = createFormDataFromUser(testUserInfo, {
      'datum': new Date().toLocaleDateString('de-DE'),
      'zeit': new Date().toLocaleTimeString('de-DE'),
    });
    
    console.log('\n🔄 Form Data to Fill:');
    Object.entries(formData).forEach(([key, value]) => {
      console.log(`"${key}": ${value}`);
    });
    
    // Fill the form
    console.log('\n📝 Filling form...');
    filler.fillForm(formData);
    
    // Flatten and save
    filler.flattenForm();
    
    // Save the filled PDF
    const outputPath = path.join(process.cwd(), '4money_filled_test.pdf');
    await filler.saveToFile(outputPath);
    
    console.log(`\n✅ Success! Filled PDF saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testPDFFormFilling();