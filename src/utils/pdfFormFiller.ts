import { PDFDocument, PDFForm } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { Option, Question } from '@/types';

export interface FormFieldData {
  [fieldName: string]: string | boolean | number;
}

export interface PDFFormFillerOptions {
  flattenForm?: boolean;
  debugMode?: boolean;
}

export interface suggestedProduct {
  id: string;
  shortName: string;
  name: string;
  sri: string;
  maximumYear: number;
  minimumYear: number;
  startTime?: Date;
}

export interface Partner {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  birthday: Date;
  referralCode: string;
  agentNumber: string;
  isActive: boolean;
}

export interface UserInfo {
  firstName?: string;
  lastName?: string;
  birthDate?: string | Date;
  birthPlace?: string;
  birthCountry?: string;
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
  issuedOn?: string | Date;
  validUntil?: string | Date;
  isPEP?: boolean;
  residenceAbroad?: boolean;
  actingFor?: string;
  iban?: string;
  country?: string;
  bic?: string | null;
  bankName?: string;
  isTaxResidentAT?: boolean;
  isTaxResidentOther?: boolean;
  taxResidencyCountry?: string;
  gender?: string;
  isSelfEmployed?: boolean;
}

interface AnswerWithOptions {
  selectedOption: string;
  options: Option[];
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
export function createFormDataFromUser(userInfo: UserInfo, questionAnswers: Record<number, AnswerWithOptions>, additionalData: FormFieldData = {}, suggestedProduct: suggestedProduct, partner: Partner): FormFieldData {
  const date = new Date();
  const sessionTime = new Date(suggestedProduct.startTime || Date.now());
  const formData: FormFieldData = {
    // Personal Information
    'vorname': userInfo.firstName || '',
    'nachname': userInfo.lastName || '',
    'Name, Gebdatum': `${partner.firstName || ''} ${partner.lastName || ''} , ${formatGermanDate(partner.birthday)}`,
    "vermittlerinnennummer": partner.agentNumber || '',
    "vorname 159": partner.agentNumber || '',

    
    "vorname 32": userInfo.firstName || '',
    "vorname 33": userInfo.lastName || '',
    "vorname 34": formatGermanDate(userInfo.birthDate),
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
    //"vorname 46": userInfo.occupation || '',

    //"vorname 47": userInfo.currentJob || '',
    "vorname 48": userInfo.issuingAuthority || '',
    "vorname 49": userInfo.documentNumber || '',
    "vorname 50": formatGermanDate(userInfo.issuedOn),
    "vorname 51": formatGermanDate(userInfo.validUntil),

    // Document type checkboxes
    "Kontrollkästchen 370": userInfo.documentType === 'passport',
    "Kontrollkästchen 371": userInfo.documentType === 'identity_card',
    "Kontrollkästchen 372": userInfo.documentType === 'drivers_license',

    // Other checkboxes
    // "Kontrollkästchen 462": userInfo.isPEP == true,
    // "Kontrollkästchen 463": userInfo.isPEP == false,
    "Kontrollkästchen 373": userInfo.residenceAbroad || false,
    "Kontrollkästchen 375": !userInfo.residenceAbroad || false,
    // "Kontrollkästchen 375": true,
    // "Kontrollkästchen 376": true,
    "Kontrollkästchen 378": userInfo.isPEP || false,
    "Kontrollkästchen 377": !userInfo.isPEP || false,
    // "Kontrollkästchen 445": true,
    // "Kontrollkästchen 446": true,
    // "Kontrollkästchen 447": true,

    // "vorname 150": "456798",
    // "vorname 157": "123456",

    // Question 1 - set all to true as example

    // Fetch answers for Question 1
    // ...Object.fromEntries(
    //   Object.entries(questionAnswers).flatMap(([questionId, answerData]) => {
    //     const qId = Number(questionId);
    //     if (qId === 1) {
    //       return answerData.options.map((opt, index) => {
    //         const isSelected = opt === answerData.selectedOption || (typeof opt === 'object' && 'value' in opt && opt.value === answerData.selectedOption);
    //         return [`Kontrollkästchen ${546 + index}`, isSelected];
    //       });
    //     }
    //     return [];
    //   })
    // ),

    "Kontrollkästchen 546": questionAnswers[1]?.selectedOption == "general_wealth_building" || false,
    "Kontrollkästchen 547": questionAnswers[1]?.selectedOption == "diversification_total_assets" || false,
    "Kontrollkästchen 548": questionAnswers[1]?.selectedOption == "retirement_planning" || false,
    "Kontrollkästchen 549": questionAnswers[1]?.selectedOption == "other" || false,

    // Question 2
    "Kontrollkästchen 25": Number(questionAnswers[2]?.selectedOption) < 3 ? true : false,
    "Kontrollkästchen 26": Number(questionAnswers[2]?.selectedOption) >= 3 && Number(questionAnswers[2]?.selectedOption) < 7 ? true : false,
    "Kontrollkästchen 27": Number(questionAnswers[2]?.selectedOption) >= 7 && Number(questionAnswers[2]?.selectedOption) < 10 ? true : false,
    "Kontrollkästchen 28": Number(questionAnswers[2]?.selectedOption) >= 10 ? true : false,

    "vorname 7": Number(questionAnswers[2]?.selectedOption) < 3 ? '100' : '',
    "vorname 8": Number(questionAnswers[2]?.selectedOption) >= 3 && Number(questionAnswers[2]?.selectedOption) < 7 ? '100' : '',
    "vorname 9": Number(questionAnswers[2]?.selectedOption) >= 7 && Number(questionAnswers[2]?.selectedOption) < 10 ? '100' : '',
    "vorname 10": Number(questionAnswers[2]?.selectedOption) >= 10 ? '100' : '',


    // Question 3
    "Kontrollkästchen 31": questionAnswers[3]?.selectedOption == "yes" || false,
    "Kontrollkästchen 32": questionAnswers[3]?.selectedOption == "no" || false,

    // Question 4
    "Kontrollkästchen 33": questionAnswers[4]?.selectedOption == "yes" || false,
    "Kontrollkästchen 34": questionAnswers[4]?.selectedOption == "no" || false,
    "Kontrollkästchen 35": questionAnswers[4]?.selectedOption == "neutral" || false,

    // Question 5
    "Kontrollkästchen 86": questionAnswers[5]?.selectedOption == "KONSERVATIV" || false,
    "Kontrollkästchen 87": questionAnswers[5]?.selectedOption == "GEWINNORIENTIERT" || false,
    "Kontrollkästchen 88": questionAnswers[5]?.selectedOption == "AUSGEWOGEN" || false,

    // "Kontrollkästchen 33": true,
    // "Kontrollkästchen 34": true,
    // "Kontrollkästchen 35": true,
    // "Kontrollkästchen 36": true,
    // "Kontrollkästchen 37": true,
    // "Kontrollkästchen 38": true,
    // "Kontrollkästchen 39": true,
    // "Kontrollkästchen 40": true,
    // "Kontrollkästchen 41": true,
    // "Kontrollkästchen 42": true,
    // "Kontrollkästchen 43": true,
    // "Kontrollkästchen 45": true,
    // "Kontrollkästchen 46": true,
    // "Kontrollkästchen 47": true,
    // "Kontrollkästchen 48": true,
    // "Kontrollkästchen 49": true,
    // "Kontrollkästchen 50": true,
    // "Kontrollkästchen 51": true,


    // "Kontrollkästchen 478": true,

    // "vorname 148": "vorname 148",
    // "vorname 149": "vorname 149",
    // "vorname 151": "vorname 151",
    // "vorname 152": "vorname 152",
    // "vorname 153": "vorname 153",
    "vorname 12": manageAnswer(questionAnswers[6]),
    "vorname 13": manageAnswer(questionAnswers[8]),
    "vorname 14": manageAnswer(questionAnswers[7]),
    "vorname 16": (parseInt(manageAnswer(questionAnswers[6])) - parseInt(manageAnswer(questionAnswers[7]))).toString() || '',
    "Kontrollkästchen 100": questionAnswers[19]?.selectedOption == "employment_income" ? true : false,
    "Kontrollkästchen 102": (questionAnswers[19]?.selectedOption == "savings" || questionAnswers[19]?.selectedOption == "pension" || questionAnswers[19]?.selectedOption == "sale_of_assets") ? true : false,
    "Kontrollkästchen 103": questionAnswers[19]?.selectedOption == "inheritance" ? true : false,
    "Kontrollkästchen 104": questionAnswers[19]?.selectedOption == "rental_income" ? true : false,
    "Kontrollkästchen 101": questionAnswers[19]?.selectedOption == "other" ? true : false,
    // "vorname 16": "vorname 16",
    // "vorname 26": "vorname 26",
    "vorname 150": manageAnswer(questionAnswers[20]) || '',
    "vorname 157": manageAnswer(questionAnswers[21]) || '',

    // "vorname 52": "vorname 52",
    "vorname 54": date.getDay().toString().padStart(2, '0'),
    "vorname 55": (date.getMonth() + 1).toString().padStart(2, '0'),
    "vorname 56": date.getFullYear().toString(),
    "vorname 57": sessionTime.getMinutes().toString().padStart(2, '0'),
    "vorname 58": sessionTime.getHours().toString().padStart(2, '0'),
    "vorname 59": date.getMinutes().toString().padStart(2, '0'),
    "vorname 60": date.getHours().toString().padStart(2, '0'),
    "vorname 158": "online",
    "vorname 63": new Date().toLocaleDateString('de-DE'),
    // "vorname 62": "vorname 62",
    // "vorname 64": "vorname 64",
    // "vorname 65": "vorname 65",
    // "vorname 66": "vorname 66",
    // "vorname 67": "vorname 67",
    // "vorname 68": "vorname 68",
    "vorname 69": suggestedProduct?.shortName || '',
    "vorname 70": suggestedProduct?.name || '',
    "vorname 71": suggestedProduct?.sri || '',
    "vorname 72": suggestedProduct?.maximumYear === 7 ? "7+" : suggestedProduct?.maximumYear.toString() || '',
    // "vorname 73": "vorname 73",
    // "vorname 74": "vorname 74",
    //"vorname 75": "75",
    // "vorname 76": "vorname 76",
    // "vorname 77": "vorname 77",
    // "vorname 78": "vorname 78",
    // "vorname 79": "vorname 79",
    // "vorname 80": "vorname 80",
    // "vorname 81": "vorname 81",
    // "vorname 82": "vorname 82",
    // "vorname 83": "vorname 83",
    // "vorname 84": "vorname 84",
    // "vorname 85": "vorname 85",
    // "vorname 86": "vorname 86",
    // "vorname 87": "vorname 87",
    // "vorname 88": "vorname 88",
    // "vorname 89": "vorname 89",
    // "vorname 90": "vorname 90",
    // "vorname 91": "vorname 91",
    // "vorname 92": "vorname 92",
    // "vorname 93": "vorname 93",
    // "vorname 94": "vorname 94",
    // "vorname 95": "vorname 95",
    // "vorname 96": "vorname 96",
    "vorname 97": "Wie empfanden",
    // "vorname 98": "vorname 98",
    // "vorname 99": "vorname 99",
    // "vorname 100": "vorname 100",
    // "vorname 101": "vorname 101",
    // "vorname 102": "vorname 102",
    // "vorname 103": "vorname 103",
    // "vorname 104": "vorname 104",
    // "vorname 105": "vorname 105",
    // "vorname 106": "vorname 106",
    // "vorname 107": "vorname 107",
    // "vorname 108": "vorname 108",
    // "vorname 109": "vorname 109",
    // "vorname 110": "vorname 110",
    // "vorname 111": "vorname 111",
    // "vorname 112": "vorname 112",
    // "vorname 113": "vorname 113",
    // "vorname 114": "vorname 114",
    // "vorname 115": "vorname 115",
    // "vorname 116": "vorname 116",
    // "vorname 117": "vorname 117",
    // "vorname 118": "vorname 118",
    // "vorname 119": "vorname 119",
    // "vorname 120": "vorname 120",
    // "vorname 121": "vorname 121",
    // "vorname 122": "vorname 122",
    // "vorname 123": "vorname 123",
    // "vorname 124": "vorname 124",
    // "vorname 125": "vorname 125",
    // "vorname 126": "vorname 126",
    "vorname 127": date.getDay().toString().padStart(2, '0'),
    "vorname 128": (date.getMonth() + 1).toString().padStart(2, '0'),
    "vorname 129": (date.getFullYear() % 100).toString().padStart(2, '0'),
    // "vorname 130": "vorname 130",
    // "vorname 131": "vorname 131",
    // "vorname 132": "vorname 132",
    "vorname 133": date.getDay().toString().padStart(2, '0'),
    "vorname 134": (date.getMonth() + 1).toString().padStart(2, '0'),
    "vorname 135": date.getFullYear().toString(),
    "vorname 136": sessionTime.getMinutes().toString().padStart(2, '0'),
    "vorname 137": sessionTime.getHours().toString().padStart(2, '0'),
    "vorname 138": date.getMinutes().toString().padStart(2, '0'),
    "vorname 139": date.getHours().toString().padStart(2, '0'),
    "vorname 140": "online",
    "vorname 141": new Date().toLocaleDateString('de-DE'),
    // "vorname 142": "vorname 142",
    // "vorname 143": "vorname 143",
    // "vorname 144": "vorname 144",
    // "vorname 145": "vorname 145",
    "vorname 146": new Date().toLocaleDateString('de-DE'),
    "vorname 147": `${userInfo.firstName} ${userInfo.lastName}, ${userInfo.countryCode || ''}${userInfo.phone || ''}` || '',
    // "vorname 165": "vorname 165",


    //checkboxes that always need to be checked
    "Kontrollkästchen 107": true,

    "Kontrollkästchen 374": true,

    "Kontrollkästchen 462": true,

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

    "Optionsfeld 294": true,
    "Kontrollkästchen 397": true,
    "Kontrollkästchen 398": true,
    "Kontrollkästchen 399": true,
    "Kontrollkästchen 400": true,
    "Kontrollkästchen 401": true,
    "Kontrollkästchen 402": true,
    "Kontrollkästchen 403": true,

    "Kontrollkästchen 405": true,
    "Kontrollkästchen 408": true,
    "Kontrollkästchen 409": true,
    "Kontrollkästchen 410": true,

    "Kontrollkästchen 411": true,
    "Kontrollkästchen 412": true,
    "Kontrollkästchen 413": true,
    "Kontrollkästchen 414": true,

    "Kontrollkästchen 417": true,
    "Kontrollkästchen 436": true,


    // "Kontrollkästchen 33": true,
    // "Kontrollkästchen 34": true,
    // "Kontrollkästchen 35": true,
    // "Kontrollkästchen 36": true,
    // "Kontrollkästchen 37": true,
    // "Kontrollkästchen 38": true,
    // "Kontrollkästchen 39": true,
    // "Kontrollkästchen 40": true,
    // "Kontrollkästchen 41": true,
    // "Kontrollkästchen 42": true,
    // "Kontrollkästchen 43": true,
    // "Kontrollkästchen 45": true,
    // "Kontrollkästchen 46": true,
    // "Kontrollkästchen 47": true,
    // "Kontrollkästchen 48": true,
    // "Kontrollkästchen 49": true,
    // "Kontrollkästchen 50": true,
    // "Kontrollkästchen 51": true,
    // "Kontrollkästchen 437": true,
    // "Kontrollkästchen 52": true,
    // "Kontrollkästchen 53": true,
    // "Kontrollkästchen 54": true,
    // "Kontrollkästchen 55": true,
    // "Kontrollkästchen 56": true,
    // "Kontrollkästchen 57": true,
    // "Kontrollkästchen 58": true,
    // "Kontrollkästchen 59": true,
    // "Kontrollkästchen 60": true,
    // "Kontrollkästchen 61": true,
    // "Kontrollkästchen 62": true,
    // "Kontrollkästchen 63": true,
    // "Kontrollkästchen 64": true,
    // "Kontrollkästchen 65": true,
    // "Kontrollkästchen 66": true,
    // "Kontrollkästchen 67": true,
    // "Kontrollkästchen 68": true,
    // "Kontrollkästchen 69": true,
    // "Kontrollkästchen 70": true,
    // "Kontrollkästchen 71": true,
    // "Kontrollkästchen 72": true,
    // "Kontrollkästchen 73": true,
    // "Kontrollkästchen 74": true,
    // "Kontrollkästchen 75": true,
    // "Kontrollkästchen 76": true,
    // "Kontrollkästchen 77": true,
    // "Kontrollkästchen 78": true,
    // "Kontrollkästchen 79": true,
    // "Kontrollkästchen 438": true,
    // "Kontrollkästchen 439": true,
    // "Kontrollkästchen 440": true,
    // "Kontrollkästchen 441": true,
    // "Kontrollkästchen 442": true,
    // "Kontrollkästchen 443": true,
    // "Kontrollkästchen 86": true,
    // "Kontrollkästchen 87": true,
    // "Kontrollkästchen 88": true,
    // "Kontrollkästchen 100": true,
    // "Kontrollkästchen 101": true,
    // "Kontrollkästchen 102": true,
    // "Kontrollkästchen 103": true,
    // "Kontrollkästchen 104": true,
    // "Kontrollkästchen 516": true,
    // "Kontrollkästchen 517": true,
    // "Kontrollkästchen 518": true,
    // "Kontrollkästchen 519": true,
    // "Kontrollkästchen 520": true,
    // "Kontrollkästchen 521": true,
    // "Kontrollkästchen 522": true,
    // "Kontrollkästchen 523": true,
    // "Kontrollkästchen 524": true,
    // "Kontrollkästchen 525": true,
    // "Kontrollkästchen 526": true,
    // "Kontrollkästchen 527": true,
    // "Kontrollkästchen 528": true,
    // "Kontrollkästchen 529": true,
    // "Kontrollkästchen 530": true,
    // "Kontrollkästchen 531": true,
    // "Kontrollkästchen 532": true,
    // "Kontrollkästchen 533": true,
    // "Kontrollkästchen 534": true,
    // "Kontrollkästchen 535": true,
    // "Kontrollkästchen 536": true,
    // "Kontrollkästchen 537": true,
    // "Kontrollkästchen 538": true,
    // "Kontrollkästchen 539": true,
    // "Kontrollkästchen 540": true,
    // "Kontrollkästchen 541": true,
    // "Kontrollkästchen 542": true,
    // "Kontrollkästchen 543": true,
    // "Kontrollkästchen 544": true,
    // "Kontrollkästchen 545": true,
    // "Kontrollkästchen 107": true,
    // "Kontrollkästchen 108": true,
    // "Kontrollkästchen 370": true,
    // "Kontrollkästchen 371": true,
    // "Kontrollkästchen 372": true,

    // "Kontrollkästchen 374": true,
    // "Kontrollkästchen 462": true,
    // "Kontrollkästchen 463": true,
    // "Kontrollkästchen 448": true,
    // "Kontrollkästchen 449": true,
    // "Kontrollkästchen 450": true,
    // "Kontrollkästchen 451": true,
    // "Kontrollkästchen 452": true,
    // "Kontrollkästchen 453": true,
    // "Kontrollkästchen 454": true,
    // "Kontrollkästchen 455": true,
    // "Kontrollkästchen 456": true,
    // "Kontrollkästchen 457": true,
    // "Kontrollkästchen 458": true,
    // "Kontrollkästchen 459": true,
    // "Kontrollkästchen 460": true,
    // "Kontrollkästchen 461": true,
    // "Kontrollkästchen 512": true,
    // "Kontrollkästchen 513": true,
    // "Kontrollkästchen 466": true,
    // "Kontrollkästchen 467": true,
    // "Kontrollkästchen 397": true,
    // "Kontrollkästchen 398": true,
    // "Kontrollkästchen 399": true,
    // "Kontrollkästchen 400": true,
    // "Kontrollkästchen 401": true,
    // "Kontrollkästchen 402": true,
    // "Kontrollkästchen 403": true,
    // "Kontrollkästchen 404": true,
    // "Kontrollkästchen 405": true,
    // "Kontrollkästchen 406": true,
    // "Kontrollkästchen 407": true,
    // "Kontrollkästchen 408": true,
    // "Kontrollkästchen 409": true,
    // "Kontrollkästchen 410": true,
    // "Kontrollkästchen 411": true,
    // "Kontrollkästchen 412": true,
    // "Kontrollkästchen 413": true,
    // "Kontrollkästchen 414": true,
    // "Kontrollkästchen 415": true,
    // "Kontrollkästchen 416": true,
    // "Kontrollkästchen 417": true,
    // "Kontrollkästchen 418": true,
    // "Kontrollkästchen 419": true,
    // "Kontrollkästchen 420": true,
    // "Kontrollkästchen 421": true,
    // "Kontrollkästchen 436": true,

    // Question 9 - 17
    // Knowledge, experience
    // Anleihen / Anleihefonds / Anleihen ETFs
    "Kontrollkästchen 550": questionAnswers[12]?.selectedOption == "none",
    "Kontrollkästchen 551": questionAnswers[12]?.selectedOption == "average",
    "Kontrollkästchen 552": questionAnswers[12]?.selectedOption == "good",

    "Kontrollkästchen 553": questionAnswers[12]?.selectedOption == "none",
    "Kontrollkästchen 554": questionAnswers[12]?.selectedOption == "average",
    "Kontrollkästchen 555": questionAnswers[12]?.selectedOption == "good",

    "Kontrollkästchen 556": questionAnswers[12]?.selectedOption == "none",
    "Kontrollkästchen 557": questionAnswers[12]?.selectedOption == "average",
    "Kontrollkästchen 558": questionAnswers[12]?.selectedOption == "good",

    "Kontrollkästchen 559": questionAnswers[14]?.selectedOption == "none",
    "Kontrollkästchen 560": questionAnswers[14]?.selectedOption == "average",
    "Kontrollkästchen 561": questionAnswers[14]?.selectedOption == "good",

    "Kontrollkästchen 562": questionAnswers[16]?.selectedOption == "none",
    "Kontrollkästchen 563": questionAnswers[16]?.selectedOption == "average",
    "Kontrollkästchen 564": questionAnswers[16]?.selectedOption == "good",

    "Kontrollkästchen 565": questionAnswers[16]?.selectedOption == "none",
    "Kontrollkästchen 566": questionAnswers[16]?.selectedOption == "average",
    "Kontrollkästchen 567": questionAnswers[16]?.selectedOption == "good",

    // 0, 1-10, +10 Transaktion
    "Kontrollkästchen 568": questionAnswers[13]?.selectedOption == "0",
    "Kontrollkästchen 569": questionAnswers[15]?.selectedOption == "0",
    "Kontrollkästchen 570": questionAnswers[17]?.selectedOption == "0",

    "Kontrollkästchen 571": questionAnswers[13]?.selectedOption == "1-10",
    "Kontrollkästchen 572": questionAnswers[15]?.selectedOption == "1-10",
    "Kontrollkästchen 573": questionAnswers[17]?.selectedOption == "1-10",

    "Kontrollkästchen 574": questionAnswers[13]?.selectedOption == "+10",
    "Kontrollkästchen 575": questionAnswers[15]?.selectedOption == "+10",
    "Kontrollkästchen 576": questionAnswers[17]?.selectedOption == "+10",

    "Kontrollkästchen 577": false,
    "Kontrollkästchen 578": false,
    "Kontrollkästchen 579": false,

    // 0
    "Kontrollkästchen 580": questionAnswers[9]?.selectedOption == "0",
    "Kontrollkästchen 581": questionAnswers[10]?.selectedOption == "0",
    "Kontrollkästchen 582": questionAnswers[11]?.selectedOption == "0",
    // up_to_10000
    "Kontrollkästchen 583": questionAnswers[9]?.selectedOption == "up_to_10000",
    "Kontrollkästchen 584": questionAnswers[10]?.selectedOption == "up_to_10000",
    "Kontrollkästchen 585": questionAnswers[11]?.selectedOption == "up_to_10000",
    // 10000_to_50000
    "Kontrollkästchen 586": questionAnswers[9]?.selectedOption == "10000_to_50000",
    "Kontrollkästchen 587": questionAnswers[10]?.selectedOption == "10000_to_50000",
    "Kontrollkästchen 588": questionAnswers[11]?.selectedOption == "10000_to_50000",
    // above_50000, 50000_to_500000
    "Kontrollkästchen 589": (questionAnswers[9]?.selectedOption == "50000_to_500000" || questionAnswers[9]?.selectedOption == "above_50000") ? true : false,
    "Kontrollkästchen 590": (questionAnswers[10]?.selectedOption == "50000_to_500000" || questionAnswers[10]?.selectedOption == "above_50000") ? true : false,
    "Kontrollkästchen 591": (questionAnswers[11]?.selectedOption == "50000_to_500000" || questionAnswers[11]?.selectedOption == "above_50000") ? true : false,

    // if (type == "ZeroAmount") {
    //       fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[10], answers, true) == "0" ? true : false;
    //     } else if (type == "Below10kAmount") {
    //       fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[10], answers, true) == "up_to_10000" ? true : false;
    //     } else if (type == "Below50kAmount") {
    //       fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[10], answers, true) == "10000_to_50000" ? true : false;
    //     } else {
    //       fields[`UserFinancialKnowledge${category}${type}`] = (
    //         (getDynamicAnswer(questions[10], answers, true) == "50000_to_500000") ||
    //         getDynamicAnswer(questions[10], answers, true) == "above_500000"
    //       ) ? true : false;
    //     }

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
  options: PDFFormFillerOptions = {},
  questionAnswers: Record<number, AnswerWithOptions> = {},
  suggestedProduct: suggestedProduct,
  partner: Partner
): Promise<Buffer> {
  const filler = await PDFFormFiller.loadFromFile(pdfPath, options);
  const formData = createFormDataFromUser(userInfo, questionAnswers, additionalData, suggestedProduct, partner);

  filler.fillForm(formData);

  if (options.flattenForm !== false) {
    filler.flattenForm();
  }

  return await filler.save();
}

const manageAnswer = (answer?: AnswerWithOptions | null) => {
  // Check if the answer exists
  if (!answer) return '';

  const ans = answer?.options?.length === 0 ? answer.selectedOption : answer.options
    .map(opt => {
      // Handle string options
      if (typeof opt === 'string') {
        return opt === answer.selectedOption ? opt : '';
      }
      // Handle object options (Option type) with value and label properties
      const maybeOpt: Option = opt;
      if (typeof maybeOpt.value !== 'undefined') {
        return maybeOpt.value === answer.selectedOption ? (maybeOpt.label ?? '') : '';
      }
      return '';
    })
    .filter(Boolean) // Remove any empty strings from the array
    .join(', '); // Join them with commas

  // Remove the euro sign if it exists
  return ans.includes('€') ? ans.replaceAll('€ ', '') : ans;
};

function formatGermanDate(dateInput?: string | Date) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function formatCurrency(amount?: number | string) {
  if (amount === undefined || amount === null || amount === "") return "";
  const num = Number(amount);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
}


// formFieldMappers.ts
const getCurrentDate = () => formatGermanDate(new Date());

const getFullName = (userInfo: UserInfo): string => {
  return userInfo.firstName && userInfo.lastName
    ? `${userInfo.firstName} ${userInfo.lastName}`
    : "";
};

// Base field generators for reusability
const basePersonalFields = (userInfo: UserInfo): FormFieldData => ({
  UserFirstName: userInfo.firstName || "",
  UserLastName: userInfo.lastName || "",
  UserEmail: userInfo.email || "",
  UserCity: userInfo.city || "",
  UserFullName: getFullName(userInfo),
  DateToday: getCurrentDate(),
});

// Base field generators for reusability
const basePersonalFieldsDepoter = (userInfo: UserInfo): FormFieldData => ({
  UserFirstName: userInfo.lastName || "",
  UserLastName: userInfo.firstName || "",
  UserEmail: userInfo.email || "",
  UserCity: userInfo.city || "",
  UserFullName: getFullName(userInfo),
  DateToday: getCurrentDate(),
});

const baseAddressFields = (userInfo: UserInfo): FormFieldData => ({
  UserStreet: userInfo.street || "",
  UserHouseNr: userInfo.houseNumber || "",
  UserZip: userInfo.postalCode || "",
  UserCity: userInfo.city || "",
});

const baseContactFields = (userInfo: UserInfo): FormFieldData => ({
  UserEmail: userInfo.email || "",
  UserPhone: `${userInfo.countryCode || ""}${userInfo.phone || ""}`,
});

const baseNationalityFields = (userInfo: UserInfo): FormFieldData => ({
  UserNationality: userInfo.nationality || "",
  UserCountry: userInfo.country || "",
  UserCountryOfOrigin: userInfo.birthCountry || "",
});

// Individual form mappers

// Helper to get dynamic answer based on question type
const getDynamicAnswer = (question: Question | undefined, answers: Record<string, string>, value?: boolean): string | number | boolean => {
  if (!question) return "";
  
  const answer = answers[question.id];
  if (answer === undefined || answer === null) return "";

  // If question has options, try to find the label for the selected value
  if (question.options && question.options.length > 0) {
    const selectedOption = question.options.find(opt => opt.value === answer);
    if (selectedOption) {
      return value ? selectedOption.value : selectedOption.label;
    }
  }
  return answer;
};

const depoteroeffnungsantragMapper = (userInfo: UserInfo, questions: Question[], answers: Record<string, string>, suggestedProduct: suggestedProduct, partner: Partner): FormFieldData => ({
  ...basePersonalFieldsDepoter(userInfo),
  ...baseAddressFields(userInfo),
  ...baseContactFields(userInfo),
  ...baseNationalityFields(userInfo),
  UserDoB: formatGermanDate(userInfo.birthDate),
  UserCityOfOrigin: userInfo.birthPlace || "",
  UserProfession: userInfo.currentJob || "",
  UserSector: userInfo.industry || "",
  GoalMonthlyPayment: formatCurrency(Number(getDynamicAnswer(questions[20], answers))),
  // Next Month From Today
  //NextMonthFromToday: getNextMonthFromToday(),
  //YearOfNextMonthFromToday: getNextMonthYear(),
  UserConsentInformationDigitalForm: "",
  UserNotUsTaxEligible: "",
  UserCountry1: userInfo.isTaxResidentAT ? "Österreich" : (userInfo.taxResidencyCountry || ""),
  UserConsentfrootsPowerOfAttorny: "",
  UserConsentDiePlattformDepotBank: "",
  UserConsentDiePlattformConditions: "",
  UserConsentDataProcessing: "",
  UserConsentContractAgreement: "",
  UserConsentEsaeg: "",
  UserCity1: userInfo.city || "",
  UserFullName1: getFullName(userInfo),
  UserReferenceAccountIban: userInfo.iban || "",
  CheckboxUserGenderMale: userInfo.gender === "male" ? true : false,
  CheckboxUserGenderFemale: userInfo.gender === "female" ? true : false,
  CheckboxUserSelfEmploymentStatus: userInfo.isSelfEmployed ? true : false,
  UserPepYes: userInfo.isPEP ? true : false,
  AdvisorPhone: partner.phone || "",
  AdvisorFullName: `${partner.agentNumber} ${partner.firstName} ${partner.lastName}` || "",
  UserAnnualIncome: formatCurrency(Number(getDynamicAnswer(questions[6], answers)) * 14),
});

const deckblattVertragspaketMapper = (userInfo: UserInfo): FormFieldData => ({
  UserLastName: userInfo.lastName || "",
  UserEmail: userInfo.email || "",
  UserFirstName: userInfo.firstName || "",
});

const serviceentgeltMapper = (userInfo: UserInfo): FormFieldData => ({
  UserFullName: getFullName(userInfo),
  UserCity: userInfo.city || "",
  DateToday: getCurrentDate(),
  AdvisorPhone: "06769061716",
  YesByDefault: true,
  AdviserFullName: "14020007	ALEXANDER BRACIC",
});

const servicegebuehrMapper = (userInfo: UserInfo): FormFieldData => ({
  ...baseAddressFields(userInfo),
  UserFullName: getFullName(userInfo),
  UserReferenceAccountIban: "",
  DateToday: getCurrentDate(),
  UserCity1: userInfo.city || "",
});

const vermittlungsgebuehrMapper = (userInfo: UserInfo, questions: Question[], answers: Record<string, string>): FormFieldData => ({
  DepotAgencyFee: Number(getDynamicAnswer(questions[19], answers)) > 0 ? '5' : '-',
  DepotSetupFee: Number(getDynamicAnswer(questions[20], answers)) > 0 ? Math.round(Number(getDynamicAnswer(questions[20], answers)) * 2.5) : '-',
  UserFirstName: userInfo.firstName || "",
  UserLastName: userInfo.lastName || "",
  UserCity: userInfo.city || "",
  DateToday: getCurrentDate(),
  AdviserFullName: "",
});

const initializeFinancialKnowledgeFields = (questions: Question[], answers: Record<string, string>): FormFieldData => {
  const categories = ["Equities", "Bonds", "Commodities"];
  const knowledgeTypes = ["NoKnowledge", "PassiveKnowledge", "ActiveKnowledge"];
  const experienceTypes = ["ActiveExperience", "PassiveExperience", "NoExperience"];
  const tradeTypes = ["ZeroTrades", "TenTrades", "MoreTenTrades", "SavingPlanTrades"];
  const amountTypes = ["ZeroAmount", "Below10kAmount", "Below50kAmount", "More50kAmount"];

  const fields: FormFieldData = {};

  categories.forEach(category => {

    console.log("answers for 17 and 18 questions:", getDynamicAnswer(questions[14], answers, true), getDynamicAnswer(questions[15], answers, true));
    // Question 9
    
    knowledgeTypes.forEach(type => {
      if (category == "Equities") {
        if (type == "NoKnowledge") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[11], answers, true) == "none" ? true : false;
        } else if (type == "PassiveKnowledge") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[11], answers, true) == "average" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[11], answers, true) == "good" ? true : false;
        }
      } else if (category == "Bonds") {
        if (type == "NoKnowledge") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[13], answers, true) == "none" ? true : false;
        } else if (type == "PassiveKnowledge") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[13], answers, true) == "average" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[13], answers, true) == "good" ? true : false;
        }
      } else {
        if (type == "NoKnowledge") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[15], answers, true) == "none" ? true : false;
        } else if (type == "PassiveKnowledge") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[15], answers, true) == "average" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[15], answers, true) == "good" ? true : false;
        }
      }
    });

    experienceTypes.forEach(type => {
      if (category == "Equities") {
        if (type == "NoExperience") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[11], answers, true) == "none" ? true : false;
        } else if (type == "PassiveExperience") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[11], answers, true) == "average" ? true : false;
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[11], answers, true) == "average" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[11], answers, true) == "good" ? true : false;
        }
      } else if (category == "Bonds") {
        if (type == "NoExperience") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[13], answers, true) == "none" ? true : false;
        } else if (type == "PassiveExperience") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[13], answers, true) == "average" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[13], answers, true) == "good" ? true : false;
        }
      } else {
        if (type == "NoExperience") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[15], answers, true) == "none" ? true : false;
        } else if (type == "PassiveExperience") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[15], answers, true) == "average" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[15], answers, true) == "good" ? true : false;
        }
      }
    });

    tradeTypes.forEach(type => {
      if (category == "Equities") {
        if (type == "ZeroTrades") {
          const knowledgeAnswer = getDynamicAnswer(questions[11], answers, true);
          fields[`UserFinancialKnowledge${category}${type}`] = (knowledgeAnswer == "none" || knowledgeAnswer == "average") ? true : false;
        } else if (type == "TenTrades") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[12], answers, true) == "1-10" ? true : false;
        } else if (type == "MoreTenTrades") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[12], answers, true) == "+10" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = false
        }

      } else if (category == "Bonds") {
        if (type == "ZeroTrades") {
          const knowledgeAnswer = getDynamicAnswer(questions[13], answers, true);
          fields[`UserFinancialKnowledge${category}${type}`] = (knowledgeAnswer == "none" || knowledgeAnswer == "average") ? true : false;
        } else if (type == "TenTrades") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[14], answers, true) == "1-10" ? true : false;
        } else if (type == "MoreTenTrades") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[14], answers, true) == "+10" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = false
        }
      } else {
        if (type == "ZeroTrades") {
          const knowledgeAnswer = getDynamicAnswer(questions[15], answers, true);
          fields[`UserFinancialKnowledge${category}${type}`] = (knowledgeAnswer == "none" || knowledgeAnswer == "average") ? true : false;
        } else if (type == "TenTrades") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[16], answers, true) == "1-10" ? true : false;
        } else if (type == "MoreTenTrades") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[16], answers, true) == "+10" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = false
        }
      }
    });
    amountTypes.forEach(type => {
      if (category == "Equities") {
        if (type == "ZeroAmount") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[8], answers, true) == "0" ? true : false;
        } else if (type == "Below10kAmount") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[8], answers, true) == "up_to_10000" ? true : false;
        } else if (type == "Below50kAmount") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[8], answers, true) == "10000_to_50000" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = (
            (getDynamicAnswer(questions[8], answers, true) == "50000_to_500000") ||
            getDynamicAnswer(questions[8], answers, true) == "above_500000"
          ) ? true : false;
        }
      } else if (category == "Bonds") {
        if (type == "ZeroAmount") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[9], answers, true) == "0" ? true : false;
        } else if (type == "Below10kAmount") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[9], answers, true) == "up_to_10000" ? true : false;
        } else if (type == "Below50kAmount") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[9], answers, true) == "10000_to_50000" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = (
            (getDynamicAnswer(questions[9], answers, true) == "50000_to_500000") ||
            getDynamicAnswer(questions[9], answers, true) == "above_500000"
          ) ? true : false;
        }
      } else {
        if (type == "ZeroAmount") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[10], answers, true) == "0" ? true : false;
        } else if (type == "Below10kAmount") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[10], answers, true) == "up_to_10000" ? true : false;
        } else if (type == "Below50kAmount") {
          fields[`UserFinancialKnowledge${category}${type}`] = getDynamicAnswer(questions[10], answers, true) == "10000_to_50000" ? true : false;
        } else {
          fields[`UserFinancialKnowledge${category}${type}`] = (
            (getDynamicAnswer(questions[10], answers, true) == "50000_to_500000") ||
            getDynamicAnswer(questions[10], answers, true) == "above_500000"
          ) ? true : false;
        }
      }

    });
  });
  return fields;
};

const vermoegensverwaltungsvertragMapper = (userInfo: UserInfo, questions: Question[], answers: Record<string, string>): FormFieldData => ({
  ...basePersonalFields(userInfo),
  ...baseAddressFields(userInfo),
  ...baseContactFields(userInfo),
  ...baseNationalityFields(userInfo),
  GoalName: getDynamicAnswer(questions[0], answers),
  GoalTerm0: Number(getDynamicAnswer(questions[1], answers)) + " Jahre",
  GoalTerm1: Number(getDynamicAnswer(questions[1], answers)) + " Jahre",
  GoalTerm2: Number(getDynamicAnswer(questions[1], answers)) + " Jahre",
  UserDoB: formatGermanDate(userInfo.birthDate),
  UserCityOfOrigin: userInfo.birthPlace || "",
  UserProfession: userInfo.currentJob || "",
  UserSector: userInfo.industry || "",
  UserEducation: userInfo.education || "",

  // Question 18
  UserPreviousFinancialActivitiesProfessional: getDynamicAnswer(questions[17], answers, true) == "experienced_positive" ? true : false,

  GoalRiskScoreFrootsConservative: getDynamicAnswer(questions[4], answers, true) == "KONSERVATIV" ? true : false,
  GoalRiskScoreFrootsBalanced: getDynamicAnswer(questions[4], answers, true) == "GEWINNORIENTIERT" ? true : false,
  GoalRiskScoreFrootsProfitOrientated: getDynamicAnswer(questions[4], answers, true) == "AUSGEWOGEN" ? true : false,
  UserReferenceAccountIban: userInfo.iban || "",
  ...initializeFinancialKnowledgeFields(questions, answers),
  UserMonthlyAvailableIncome: formatCurrency(Number(getDynamicAnswer(questions[5], answers))),
  UserMonthlyExpenditures: formatCurrency(Number(getDynamicAnswer(questions[6], answers))),
  UserTotalNetAssets: formatCurrency(Number(getDynamicAnswer(questions[7], answers))),
  // Question 19
  UserSourceOfIncomeWork: getDynamicAnswer(questions[18], answers, true) == "employment_income" || getDynamicAnswer(questions[18], answers, true) == "savings" ? true : false,
  UserSourceOfIncomePension: getDynamicAnswer(questions[18], answers, true) == "pension" ? true : false,
  UserSourceOfIncomeHeritage: getDynamicAnswer(questions[18], answers, true) == "inheritance" ? true : false,
  UserSourceOfIncomeRent: getDynamicAnswer(questions[18], answers, true) == "rental_income" ? true : false,
  UserSourceOfIncomeAssetSale: getDynamicAnswer(questions[18], answers, true) == "sale_of_assets" ? true : false,
  UserSourceOfIncomeOther: getDynamicAnswer(questions[18], answers, true) == "other" ? true : false,
  UserSourceOfIncomeOtherText: "",

  UserPreviousFinancialActivitiesBoth0: getDynamicAnswer(questions[21], answers, true) == "with_professional_help" ? true : false,
  UserPreviousFinancialActivitiesPrivate: getDynamicAnswer(questions[21], answers, true) == "independently" ? true : false,
  UserPreviousFinancialActivitiesNo: getDynamicAnswer(questions[21], answers, true) == "other_method" ? true : false,

  UserFullName1: getFullName(userInfo),
  UserCity1: userInfo.city || "",
  UserGoalRiskScoreName0: getDynamicAnswer(questions[4], answers),
  UserGoalRiskScoreName1: getDynamicAnswer(questions[4], answers),
  UserGoalRiskScoreIndex0: getDynamicAnswer(questions[4], answers),
  UserGoalRiskScoreIndex1: getDynamicAnswer(questions[4], answers),
  // Question 4
  UserEsgIndex0: getDynamicAnswer(questions[3], answers),
  UserEsgIndex1: getDynamicAnswer(questions[3], answers),
});

const moneyProtokollMapper = (userInfo: UserInfo, questions: Question[], answers: Record<string, string>, suggestedProduct: suggestedProduct, partner: Partner): FormFieldData => {
  const questionAnswers: Record<number, AnswerWithOptions> = {};

  questions.forEach(q => {
    const answerValue = answers[q.id];
    if (answerValue !== undefined) {
      questionAnswers[q.questionOrder] = {
        selectedOption: answerValue,
        options: q.options || []
      };
    }
  });

  return createFormDataFromUser(userInfo, questionAnswers, {}, suggestedProduct, partner);
};

// Form mapper registry
const FORM_MAPPERS: Record<string, (userInfo: UserInfo, questions: Question[], answers: Record<string, string>, suggestedProduct: suggestedProduct, partner: Partner) => FormFieldData> = {
  "Depoteröffnungsantrag.pdf": depoteroeffnungsantragMapper,
  // Done
  "Deckblatt_Vertragspaket.pdf": deckblattVertragspaketMapper,
  // Done
  "Serviceentgelt.pdf": serviceentgeltMapper,
  // Done
  "Servicegebühr.pdf": servicegebuehrMapper,
  // Done
  "Vermittlungsgebühr.pdf": vermittlungsgebuehrMapper,
  "Vermögensverwaltungsvertrag.pdf": vermoegensverwaltungsvertragMapper,
  "4money_protokoll_PecunAI_v4.pdf": moneyProtokollMapper,
};



// Main function
export function createFormDataForContactForm(
  userInfo: UserInfo,
  fileName: string,
  questions: Question[],
  answers: Record<string, string>,
  suggestedProduct: suggestedProduct,
  partner: Partner
): FormFieldData {
  const mapper = FORM_MAPPERS[fileName];
  return mapper ? mapper(userInfo, questions, answers, suggestedProduct, partner) : {};
}


// function getNextMonthFromToday(): string {
//   const today = new Date();
//   const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
//   return formatGermanDate(nextMonth);
// }

// function getNextMonthYear(): string {
//   const today = new Date();
//   const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
//   return nextMonth.getFullYear().toString();
// }
// Optional: Type-safe file name validation
// export const SUPPORTED_FORMS = Object.keys(FORM_MAPPERS) as const;
// export type SupportedFormName = typeof SUPPORTED_FORMS[number];

// export function isSupportedForm(fileName: string): fileName is SupportedFormName {
//   return fileName in FORM_MAPPERS;
// }
