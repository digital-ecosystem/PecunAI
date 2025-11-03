import { PDFDocument, PDFForm } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

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

      // Try text field first
      try {
        const textField = this.form.getTextField(name);
        type = 'text';
        value = textField.getText();
      } catch {
        // Not a text field, try checkbox
        try {
          const checkBox = this.form.getCheckBox(name);
          type = 'checkbox';
          value = checkBox.isChecked();
        } catch {
          // Not a checkbox, try dropdown
          try {
            const dropdown = this.form.getDropdown(name);
            type = 'dropdown';
            value = dropdown.getSelected();
          } catch {
            // Unknown field type
          }
        }
      }

      return { name, type, value };
    });
  }

  /**
   * Fill form fields with provided data
   */
  fillForm(fieldData: FormFieldData): void {
    if (this.debugMode) {
      console.log('📝 Available form fields:', JSON.stringify(this.getFieldNames()));
      console.log('📊 Field details:', JSON.stringify(this.getFieldInfo()));
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
    const pdfBytes = await this.pdfDoc.save({
      useObjectStreams: false, // Better compatibility with third-party tools
      addDefaultPage: false,
      objectsPerTick: 50,
      updateFieldAppearances: true, // Ensure form fields render correctly
    });
    return Buffer.from(pdfBytes);
  }


  async saveToFile(outputPath: string): Promise<void> {
    // Check if directory exists, create if not
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
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

    "vorname 32": userInfo.firstName || '',
    "vorname 33": userInfo.lastName || '',
    "vorname 34": userInfo.birthDate || '',
    "vorname 35": userInfo.birthPlace || '',
    "vorname 36": userInfo.nationality || '',
    "vorname 37": userInfo.maritalStatus || '',

    "vorname 38": userInfo.street || '',
    "vorname 39": userInfo.houseNumber || '',
    "vorname 40": userInfo.postalCode || '',
    "vorname 41": userInfo.city || '',
    "vorname 42": `${userInfo.countryCode || ''}${userInfo.phone || ''}` || '',
    "vorname 43": userInfo.email || '',

    "vorname 44": userInfo.education || '',
    "vorname 45": userInfo.currentJob || '',
    "vorname 46": userInfo.occupation || '',

    "vorname 47": userInfo.currentJob || '',
    "vorname 48": userInfo.issuingAuthority || '',
    "vorname 49": userInfo.documentNumber || '',
    "vorname 50": userInfo.issuedOn || '',
    "vorname 51": userInfo.validUntil || '',

    "Kontrollkästchen 25": true,
    "Kontrollkästchen 26": true,
    "Kontrollkästchen 27": true,
    "Kontrollkästchen 28": true,

    // Document type checkboxes
    "Kontrollkästchen 370": userInfo.documentType === 'passport',
    "Kontrollkästchen 371": userInfo.documentType === 'identity_card',
    "Kontrollkästchen 372": userInfo.documentType === 'drivers_license',

    // Other checkboxes
    "Kontrollkästchen 374": userInfo.residenceAbroad === true,
    "Kontrollkästchen 462": userInfo.isPEP === true,
    "Kontrollkästchen 463": userInfo.isPEP === false,

    "Kontrollkästchen 478": true,

    "vorname 150": "456798",
    "vorname 157": "123456",

    "vorname 7": "vorname 7",
    "vorname 8": "vorname 8",
    "vorname 9": "vorname 9",
    "vorname 10": "vorname 10",
    "vorname 148": "vorname 148",
    "vorname 149": "vorname 149",
    "vorname 151": "vorname 151",
    "vorname 152": "vorname 152",
    "vorname 153": "vorname 153",
    "vorname 12": "vorname 12",
    "vorname 13": "vorname 13",
    "vorname 14": "vorname 14",
    "vorname 16": "vorname 16",
    "vorname 26": "vorname 26",
    // "vorname 150": "vorname 150",
    // "vorname 157": "vorname 157",
    // "vorname 32": "vorname 32",
    // "vorname 33": "vorname 33",
    // "vorname 34": "vorname 34",
    // "vorname 35": "vorname 35",
    // "vorname 36": "vorname 36",
    // "vorname 37": "vorname 37",
    // "vorname 38": "vorname 38",
    // "vorname 39": "vorname 39",
    // "vorname 40": "vorname 40",
    // "vorname 41": "vorname 41",
    // "vorname 42": "vorname 42",
    // "vorname 43": "vorname 43",
    // "vorname 44": "vorname 44",
    // "vorname 45": "vorname 45",
    // "vorname 46": "vorname 46",
    // "vorname 47": "vorname 47",
    // "vorname 48": "vorname 48",
    // "vorname 49": "vorname 49",
    // "vorname 50": "vorname 50",
    // "vorname 51": "vorname 51",
    "vorname 52": "vorname 52",
    "vorname 54": "vorname 54",
    "vorname 55": "vorname 55",
    "vorname 56": "vorname 56",
    "vorname 57": "vorname 57",
    "vorname 58": "vorname 58",
    "vorname 59": "vorname 59",
    "vorname 60": "vorname 60",
    "vorname 158": "vorname 158",
    "vorname 63": new Date().toLocaleDateString('de-DE'),
    "vorname 159": `${userInfo.firstName} ${userInfo.lastName}, ${userInfo.countryCode}${userInfo.phone}` || '',
    "vorname 62": "vorname 62",
    "vorname 64": "vorname 64",
    "vorname 65": "vorname 65",
    "vorname 66": "vorname 66",
    "vorname 67": "vorname 67",
    "vorname 68": "vorname 68",
    "vorname 69": "vorname 69",
    "vorname 70": "vorname 70",
    "vorname 71": "vorname 71",
    "vorname 72": "vorname 72",
    "vorname 73": "vorname 73",
    "vorname 74": "vorname 74",
    "vorname 75": "vorname 75",
    "vorname 76": "vorname 76",
    "vorname 77": "vorname 77",
    "vorname 78": "vorname 78",
    "vorname 79": "vorname 79",
    "vorname 80": "vorname 80",
    "vorname 81": "vorname 81",
    "vorname 82": "vorname 82",
    "vorname 83": "vorname 83",
    "vorname 84": "vorname 84",
    "vorname 85": "vorname 85",
    "vorname 86": "vorname 86",
    "vorname 87": "vorname 87",
    "vorname 88": "vorname 88",
    "vorname 89": "vorname 89",
    "vorname 90": "vorname 90",
    "vorname 91": "vorname 91",
    "vorname 92": "vorname 92",
    "vorname 93": "vorname 93",
    "vorname 94": "vorname 94",
    "vorname 95": "vorname 95",
    "vorname 96": "vorname 96",
    "vorname 97": "vorname 97",
    "vorname 98": "vorname 98",
    "vorname 99": "vorname 99",
    "vorname 100": "vorname 100",
    "vorname 101": "vorname 101",
    "vorname 102": "vorname 102",
    "vorname 103": "vorname 103",
    "vorname 104": "vorname 104",
    "vorname 105": "vorname 105",
    "vorname 106": "vorname 106",
    "vorname 107": "vorname 107",
    "vorname 108": "vorname 108",
    "vorname 109": "vorname 109",
    "vorname 110": "vorname 110",
    "vorname 111": "vorname 111",
    "vorname 112": "vorname 112",
    "vorname 113": "vorname 113",
    "vorname 114": "vorname 114",
    "vorname 115": "vorname 115",
    "vorname 116": "vorname 116",
    "vorname 117": "vorname 117",
    "vorname 118": "vorname 118",
    "vorname 119": "vorname 119",
    "vorname 120": "vorname 120",
    "vorname 121": "vorname 121",
    "vorname 122": "vorname 122",
    "vorname 123": "vorname 123",
    "vorname 124": "vorname 124",
    "vorname 125": "vorname 125",
    "vorname 126": "vorname 126",
    "vorname 127": "vorname 127",
    "vorname 128": "vorname 128",
    "vorname 129": "vorname 129",
    "vorname 130": "vorname 130",
    "vorname 131": "vorname 131",
    "vorname 132": "vorname 132",
    "vorname 133": "vorname 133",
    "vorname 134": "vorname 134",
    "vorname 135": "vorname 135",
    "vorname 136": "vorname 136",
    "vorname 137": "vorname 137",
    "vorname 138": "vorname 138",
    "vorname 139": "vorname 139",
    "vorname 140": "vorname 140",
    "vorname 141": new Date().toLocaleDateString('de-DE'),
    "vorname 142": "vorname 142",
    "vorname 143": "vorname 143",
    "vorname 144": "vorname 144",
    "vorname 145": "vorname 145",
    "vorname 146": new Date().toLocaleDateString('de-DE'),
    "vorname 147": `${userInfo.firstName} ${userInfo.lastName}, ${userInfo.countryCode}${userInfo.phone}` || '',
    "vorname 165": "vorname 165",

    //     "Kontrollkästchen 478": true,
    // "Kontrollkästchen 25": true,
    // "Kontrollkästchen 26": true,
    // "Kontrollkästchen 27": true,
    // "Kontrollkästchen 28": true,
    "Kontrollkästchen 31": true,
    "Kontrollkästchen 32": true,
    "Kontrollkästchen 33": true,
    "Kontrollkästchen 34": true,
    "Kontrollkästchen 35": true,
    "Kontrollkästchen 36": true,
    "Kontrollkästchen 37": true,
    "Kontrollkästchen 38": true,
    "Kontrollkästchen 39": true,
    "Kontrollkästchen 40": true,
    "Kontrollkästchen 41": true,
    "Kontrollkästchen 42": true,
    "Kontrollkästchen 43": true,
    "Kontrollkästchen 45": true,
    "Kontrollkästchen 46": true,
    "Kontrollkästchen 47": true,
    "Kontrollkästchen 48": true,
    "Kontrollkästchen 49": true,
    "Kontrollkästchen 50": true,
    "Kontrollkästchen 51": true,
    "Kontrollkästchen 437": true,
    "Kontrollkästchen 52": true,
    "Kontrollkästchen 53": true,
    "Kontrollkästchen 54": true,
    "Kontrollkästchen 55": true,
    "Kontrollkästchen 56": true,
    "Kontrollkästchen 57": true,
    "Kontrollkästchen 58": true,
    "Kontrollkästchen 59": true,
    "Kontrollkästchen 60": true,
    "Kontrollkästchen 61": true,
    "Kontrollkästchen 62": true,
    "Kontrollkästchen 63": true,
    "Kontrollkästchen 64": true,
    "Kontrollkästchen 65": true,
    "Kontrollkästchen 66": true,
    "Kontrollkästchen 67": true,
    "Kontrollkästchen 68": true,
    "Kontrollkästchen 69": true,
    "Kontrollkästchen 70": true,
    "Kontrollkästchen 71": true,
    "Kontrollkästchen 72": true,
    "Kontrollkästchen 73": true,
    "Kontrollkästchen 74": true,
    "Kontrollkästchen 75": true,
    "Kontrollkästchen 76": true,
    "Kontrollkästchen 77": true,
    "Kontrollkästchen 78": true,
    "Kontrollkästchen 79": true,
    "Kontrollkästchen 438": true,
    "Kontrollkästchen 439": true,
    "Kontrollkästchen 440": true,
    "Kontrollkästchen 441": true,
    "Kontrollkästchen 442": true,
    "Kontrollkästchen 443": true,
    "Kontrollkästchen 86": true,
    "Kontrollkästchen 87": true,
    "Kontrollkästchen 88": true,
    "Kontrollkästchen 100": true,
    "Kontrollkästchen 101": true,
    "Kontrollkästchen 102": true,
    "Kontrollkästchen 103": true,
    "Kontrollkästchen 104": true,
    "Kontrollkästchen 516": true,
    "Kontrollkästchen 517": true,
    "Kontrollkästchen 518": true,
    "Kontrollkästchen 519": true,
    "Kontrollkästchen 520": true,
    "Kontrollkästchen 521": true,
    "Kontrollkästchen 522": true,
    "Kontrollkästchen 523": true,
    "Kontrollkästchen 524": true,
    "Kontrollkästchen 525": true,
    "Kontrollkästchen 526": true,
    "Kontrollkästchen 527": true,
    "Kontrollkästchen 528": true,
    "Kontrollkästchen 529": true,
    "Kontrollkästchen 530": true,
    "Kontrollkästchen 531": true,
    "Kontrollkästchen 532": true,
    "Kontrollkästchen 533": true,
    "Kontrollkästchen 534": true,
    "Kontrollkästchen 535": true,
    "Kontrollkästchen 536": true,
    "Kontrollkästchen 537": true,
    "Kontrollkästchen 538": true,
    "Kontrollkästchen 539": true,
    "Kontrollkästchen 540": true,
    "Kontrollkästchen 541": true,
    "Kontrollkästchen 542": true,
    "Kontrollkästchen 543": true,
    "Kontrollkästchen 544": true,
    "Kontrollkästchen 545": true,
    "Kontrollkästchen 107": true,
    "Kontrollkästchen 108": true,
    // "Kontrollkästchen 370": true,
    // "Kontrollkästchen 371": true,
    // "Kontrollkästchen 372": true,
    "Kontrollkästchen 373": true,
    // "Kontrollkästchen 374": true,
    "Kontrollkästchen 375": true,
    "Kontrollkästchen 376": true,
    "Kontrollkästchen 377": true,
    "Kontrollkästchen 378": true,
    // "Kontrollkästchen 462": true,
    // "Kontrollkästchen 463": true,
    "Kontrollkästchen 445": true,
    "Kontrollkästchen 446": true,
    "Kontrollkästchen 447": true,
    "Kontrollkästchen 448": true,
    "Kontrollkästchen 449": true,
    "Kontrollkästchen 450": true,
    "Kontrollkästchen 451": true,
    "Kontrollkästchen 452": true,
    "Kontrollkästchen 453": true,
    "Kontrollkästchen 454": true,
    "Kontrollkästchen 455": true,
    "Kontrollkästchen 456": true,
    "Kontrollkästchen 457": true,
    "Kontrollkästchen 458": true,
    "Kontrollkästchen 459": true,
    "Kontrollkästchen 460": true,
    "Kontrollkästchen 461": true,
    "Kontrollkästchen 512": true,
    "Kontrollkästchen 513": true,
    "Kontrollkästchen 466": true,
    "Kontrollkästchen 467": true,
    "Kontrollkästchen 397": true,
    "Kontrollkästchen 398": true,
    "Kontrollkästchen 399": true,
    "Kontrollkästchen 400": true,
    "Kontrollkästchen 401": true,
    "Kontrollkästchen 402": true,
    "Kontrollkästchen 403": true,
    "Kontrollkästchen 404": true,
    "Kontrollkästchen 405": true,
    "Kontrollkästchen 406": true,
    "Kontrollkästchen 407": true,
    "Kontrollkästchen 408": true,
    "Kontrollkästchen 409": true,
    "Kontrollkästchen 410": true,
    "Kontrollkästchen 411": true,
    "Kontrollkästchen 412": true,
    "Kontrollkästchen 413": true,
    "Kontrollkästchen 414": true,
    "Kontrollkästchen 415": true,
    "Kontrollkästchen 416": true,
    "Kontrollkästchen 417": true,
    "Kontrollkästchen 418": true,
    "Kontrollkästchen 419": true,
    "Kontrollkästchen 420": true,
    "Kontrollkästchen 421": true,
    "Kontrollkästchen 436": true,

    // 'geburtsdatum': userInfo.birthDate || '',
    // 'geburtsort': userInfo.birthPlace || '',
    // 'nationalitaet': userInfo.nationality || '',
    // 'familienstand': userInfo.maritalStatus || '',

    // Address Information
    // 'strasse': userInfo.street || '',
    // 'hausnummer': userInfo.houseNumber || '',
    // 'plz': userInfo.postalCode || '',
    // 'ort': userInfo.city || '',
    // 'telefon': `${userInfo.countryCode || ''}${userInfo.phone || ''}`,
    // 'email': userInfo.email || '',

    // Professional Information
    // 'ausbildung': userInfo.education || '',
    // 'beruf': userInfo.currentJob || '',
    // 'branche': userInfo.industry || '',
    // 'taetigkeit': userInfo.occupation || '',

    // Document Information
    // 'dokumenttyp': userInfo.documentType || '',
    // 'dokumentnummer': userInfo.documentNumber || '',
    // 'ausstellende_behoerde': userInfo.issuingAuthority || '',
    // 'ausstellungsdatum': userInfo.issuedOn || '',
    // 'gueltig_bis': userInfo.validUntil || '',

    // Additional checkboxes/flags
    // 'pep': userInfo.isPEP || false,
    // 'auslandsansaessig': userInfo.residenceAbroad || false,
    // 'eigene_rechnung': userInfo.actingFor === 'own',

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