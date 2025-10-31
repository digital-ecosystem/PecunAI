import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown } from 'pdf-lib';
import fs from 'fs';

export interface FormFieldData {
  [fieldName: string]: string | boolean | number;
}

export interface PDFFormFillerOptions {
  flattenForm?: boolean;
  debugMode?: boolean;
}

export interface UserInfo {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  maritalStatus?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
  education?: string;
  currentJob?: string;
  industry?: string;
  occupation?: string;
  documentType?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  issuedOn?: string;
  validUntil?: string;
  isPEP?: boolean;
  residenceAbroad?: boolean;
  actingFor?: string;
}

export interface FieldInfo {
  name: string;
  type: string;
  value?: string | boolean | string[];
}

/**
 * Utility class for filling PDF forms with dynamic data
 */
export class PDFFormFiller {
  private pdfDoc: PDFDocument;
  private form: PDFForm;
  private debugMode: boolean;

  constructor(pdfDoc: PDFDocument, options: PDFFormFillerOptions = {}) {
    this.pdfDoc = pdfDoc;
    this.form = pdfDoc.getForm();
    this.debugMode = options.debugMode || false;
  }

  /**
   * Load PDF from file path
   */
  static async loadFromFile(filePath: string, options: PDFFormFillerOptions = {}): Promise<PDFFormFiller> {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return new PDFFormFiller(pdfDoc, options);
  }

  /**
   * Load PDF from buffer
   */
  static async loadFromBuffer(pdfBuffer: Buffer, options: PDFFormFillerOptions = {}): Promise<PDFFormFiller> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return new PDFFormFiller(pdfDoc, options);
  }

  /**
   * Load PDF from base64 string
   */
  static async loadFromBase64(base64Data: string, options: PDFFormFillerOptions = {}): Promise<PDFFormFiller> {
    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '');
    const pdfBytes = Buffer.from(base64Clean, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return new PDFFormFiller(pdfDoc, options);
  }

  /**
   * Get all form field names
   */
  getFieldNames(): string[] {
    return this.form.getFields().map(field => field.getName());
  }

  /**
   * Get form field information for debugging
   */
  getFieldInfo(): FieldInfo[] {
    return this.form.getFields().map(field => {
      const name = field.getName();
      let type = 'unknown';
      let value: string | boolean | string[] | undefined = undefined;

      try {
        if (field.constructor.name.includes('TextField')) {
          type = 'text';
          value = (field as PDFTextField).getText();
        } else if (field.constructor.name.includes('CheckBox')) {
          type = 'checkbox';
          value = (field as PDFCheckBox).isChecked();
        } else if (field.constructor.name.includes('Dropdown')) {
          type = 'dropdown';
          value = (field as PDFDropdown).getSelected();
        }
      } catch {
        // Field type detection failed
      }

      return { name, type, value };
    });
  }

  /**
   * Fill form fields with provided data
   */
  fillForm(fieldData: FormFieldData): void {
    if (this.debugMode) {
      console.log('📝 Available form fields:', this.getFieldNames());
      console.log('📊 Field details:', this.getFieldInfo());
      console.log('🔄 Data to fill:', fieldData);
    }

    Object.entries(fieldData).forEach(([fieldName, value]) => {
      try {
        // Try to get the field
        const field = this.form.getField(fieldName);
        
        if (!field) {
          if (this.debugMode) {
            console.warn(`⚠️ Field '${fieldName}' not found in PDF form`);
          }
          return;
        }

        // Fill based on field type and value type
        if (typeof value === 'string') {
          try {
            const textField = this.form.getTextField(fieldName);
            textField.setText(value);
            if (this.debugMode) {
              console.log(`✅ Text field '${fieldName}' filled with: ${value}`);
            }
          } catch {
            // Not a text field, try dropdown
            try {
              const dropdown = this.form.getDropdown(fieldName);
              dropdown.select(value);
              if (this.debugMode) {
                console.log(`✅ Dropdown '${fieldName}' selected: ${value}`);
              }
            } catch {
              if (this.debugMode) {
                console.warn(`⚠️ Could not fill field '${fieldName}' as text or dropdown`);
              }
            }
          }
        } else if (typeof value === 'boolean') {
          try {
            const checkBox = this.form.getCheckBox(fieldName);
            if (value) {
              checkBox.check();
            } else {
              checkBox.uncheck();
            }
            if (this.debugMode) {
              console.log(`✅ Checkbox '${fieldName}' set to: ${value}`);
            }
          } catch (error) {
            if (this.debugMode) {
              console.warn(`⚠️ Could not set checkbox '${fieldName}':`, error);
            }
          }
        } else if (typeof value === 'number') {
          try {
            const textField = this.form.getTextField(fieldName);
            textField.setText(value.toString());
            if (this.debugMode) {
              console.log(`✅ Number field '${fieldName}' filled with: ${value}`);
            }
          } catch (error) {
            if (this.debugMode) {
              console.warn(`⚠️ Could not fill number field '${fieldName}':`, error);
            }
          }
        }
      } catch (error) {
        if (this.debugMode) {
          console.error(`❌ Error filling field '${fieldName}':`, error);
        }
      }
    });
  }

  /**
   * Flatten the form (make fields non-editable)
   */
  flattenForm(): void {
    this.form.flatten();
    if (this.debugMode) {
      console.log('🔒 Form flattened - fields are now non-editable');
    }
  }

  /**
   * Save the PDF and return as buffer
   */
  async save(): Promise<Buffer> {
    const pdfBytes = await this.pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Save the PDF to file
   */
  async saveToFile(outputPath: string): Promise<void> {
    const pdfBytes = await this.save();
    fs.writeFileSync(outputPath, pdfBytes);
    if (this.debugMode) {
      console.log(`💾 PDF saved to: ${outputPath}`);
    }
  }

  /**
   * Get PDF as base64 string
   */
  async toBase64(): Promise<string> {
    const pdfBytes = await this.save();
    return pdfBytes.toString('base64');
  }
}

/**
 * Helper function to create form data from user information
 */
export function createFormDataFromUser(userInfo: UserInfo, additionalData: FormFieldData = {}): FormFieldData {
  const formData: FormFieldData = {
    // Personal Information
    'vorname': userInfo.firstName || '',
    'nachname': userInfo.lastName || '',
    'Name, Gebdatum': `${userInfo.firstName || ''} ${userInfo.lastName || ''} , ${userInfo.birthDate || ''}`,
    'geburtsdatum': userInfo.birthDate || '',
    'geburtsort': userInfo.birthPlace || '',
    'nationalitaet': userInfo.nationality || '',
    'familienstand': userInfo.maritalStatus || '',
    
    // Address Information
    'strasse': userInfo.street || '',
    'hausnummer': userInfo.houseNumber || '',
    'plz': userInfo.postalCode || '',
    'ort': userInfo.city || '',
    'telefon': `${userInfo.countryCode || ''}${userInfo.phone || ''}`,
    'email': userInfo.email || '',
    
    // Professional Information
    'ausbildung': userInfo.education || '',
    'beruf': userInfo.currentJob || '',
    'branche': userInfo.industry || '',
    'taetigkeit': userInfo.occupation || '',
    
    // Document Information
    'dokumenttyp': userInfo.documentType || '',
    'dokumentnummer': userInfo.documentNumber || '',
    'ausstellende_behoerde': userInfo.issuingAuthority || '',
    'ausstellungsdatum': userInfo.issuedOn || '',
    'gueltig_bis': userInfo.validUntil || '',
    
    // Additional checkboxes/flags
    'pep': userInfo.isPEP || false,
    'auslandsansaessig': userInfo.residenceAbroad || false,
    'eigene_rechnung': userInfo.actingFor === 'own',
    
    // Merge with any additional data
    ...additionalData
  };

  return formData;
}

/**
 * Convenience function to fill a PDF form with user data
 */
export async function fillPDFForm(
  pdfPath: string,
  userInfo: UserInfo,
  additionalData: FormFieldData = {},
  options: PDFFormFillerOptions = {}
): Promise<Buffer> {
  const filler = await PDFFormFiller.loadFromFile(pdfPath, options);
  const formData = createFormDataFromUser(userInfo, additionalData);
  
  filler.fillForm(formData);
  
  if (options.flattenForm !== false) {
    filler.flattenForm();
  }
  
  return await filler.save();
}