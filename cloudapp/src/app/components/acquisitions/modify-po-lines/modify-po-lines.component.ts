import { Component, OnInit } from '@angular/core';
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { AcquisitionService } from '../../../services/acquisition.service';
import { ConfigService } from '../../../services/configuration.service';
import { MatDialog } from '@angular/material/dialog';
import { fieldOptions, REQUIRED_COLUMN_HEADERS, ALLOWED_COLUMN_COUNTS } from './field-options';
import { showAlert, formatDate, showSummary } from '../../../utils/utils-alert';
import { FileValidationResult, parseCSV, validateColumns, validateFile } from '../../../utils/utils-csv';
import { chunkArray } from '../../../utils/utils-misc';
import { createSet, addMembersToSet } from '../../../utils/utils-sets';
import { Timer } from '../../../utils/utils-timer';
import { ProcessDataService } from '../../../services/process-data.service';
import { UserAccessService } from '../../../services/userAccess.service'

// Lines processed in block
const CHUNK_SIZE = 25;

@Component({
  selector: 'app-modify-po-lines',
  templateUrl: './modify-po-lines.component.html',
  styleUrls: ['./modify-po-lines.component.scss'],
})

export class ModifyPOLinesComponent implements OnInit {
  
  // Form inputs
  selectedField: string = '';
  exactContent: boolean = false;
  checkRequests: boolean = false;
  createResultSets: boolean = false;
  selectedFile: File | null = null;

  // File Validation
  fileValidated: boolean = false;
  validationError: string | null = null;
  rowCount: number | null = null;

  // Processing State
  loading: boolean;
  private timer = new Timer();
  loaderStatusMessage: string = '';

  // Results
  totalRows : number;
  processedCount : number;
  updatedCount: number = 0;
  errorsCount: number = 0;

  // User Validation
  checkingUser: boolean = false;
  isModuleUserAllowed: boolean = false;

  // Sets
  private setCreated: boolean = false;
  private setId: string | null = null;
  private set: any = null;
  private updatedPOLines: string[] = [];

  private errorSetCreated: boolean = false;
  private errorSetId: string | null = null;
  private errorSet: any = null;
  private errorPOLines: string[] = [];

  // Options
  fieldOptions = fieldOptions;

  constructor(
    private router: Router,
    private translate: TranslateService,
    private alert: AlertService,
    private acquisitionService: AcquisitionService,
    private ConfigService: ConfigService,
    private dialog: MatDialog,
    private userAccessService: UserAccessService,
    private processDataService: ProcessDataService
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.checkingUser = true;
    this.userAccessService.isModuleAccessAllowed('acquisitions')
      .subscribe(
        allowed => {
          this.isModuleUserAllowed = allowed;
          this.checkingUser = false;
          this.loading = false;
        },
        error => {
          const alertMsg = this.translate.instant('acquisitions.error.permissionCheck', { status: error.status });
          this.alert.error(alertMsg, { autoClose: true });
          this.checkingUser = false;
          this.loading = false;
        }
      );

    this.sortAndTranslateFieldOptions();
  }

  // Back button
  back(): void {
    if (!this.loading) {
      this.router.navigate(['/'])
      return
    }
  }

  reload(): void {
    if (!this.loading) {
        this.fileValidated = false;
        this.selectedFile = null;
        this.resetCounters();
    }
  }

  private sortAndTranslateFieldOptions(): void {
    const translationKeys = this.fieldOptions.map(option => option.label);
  
    this.translate.get(translationKeys).subscribe(translations => {
      this.fieldOptions.forEach(option => {
        option.label = translations[option.label];
      });
  
      this.fieldOptions.sort((a, b) => a.label.localeCompare(b.label));
    });
  }
    
  // Handle file selection
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.[0]) {
      this.selectedFile = input.files[0];
      this.validationError = null;
      this.rowCount = null;
    }
  }

  async validateFile(): Promise<void> {
    if (!this.selectedFile) {
      showAlert(this.alert, this.translate, 'errors.noFile');
      return;
    }
    this.loading = true;
    const result: FileValidationResult = await validateFile(this.selectedFile, ALLOWED_COLUMN_COUNTS, this.translate, 'polines');
    if (result.isValid) {
      this.fileValidated = true;
      this.validationError = null;
      this.rowCount = result.rowCount || 0;
    } else {
      this.fileValidated = false;
      this.validationError = result.errorMessage || 'File validation failed.';
      this.rowCount = null;
    }
    this.loading = false;
  }
  
  async submitForm(): Promise<void> {

    if (!this.validateInputs()) return;

    this.resetCounters();
  
    const fileContent = await this.readFileContent(this.selectedFile!);
    const rows = parseCSV(fileContent);
  
    if (!this.validateCSV(rows)) return;
  
    this.totalRows = rows.length - 1;
    this.processedCount = 0;
  
    this.loading = true;
    this.timer.startTimer();

    const blocks = chunkArray(rows.slice(1), CHUNK_SIZE);
    for (const block of blocks) {
      await this.processBlock(block);
    }
  
    
    this.timer.stopTimer();
  
    this.showResults();

    await this.finalize();

  }

  private async processBlock(rows: string[][]): Promise<void> {
    await Promise.all(rows.map(row => this.processRow(row)));
    this.processedCount += rows.length;
  }

  private async processRow(row: string[]): Promise<void> {
    try {
      let poline : any = null;
      let { poId, textOriginal, textNou } = this.extractRowData(row);

      if(poId){
        poline = await this.acquisitionService.getPOLineId(poId).toPromise();

        const updatedValue = this.calculateUpdatedValue(poline, textOriginal, textNou);
        //console.log(updatedValue);
        if (updatedValue !== null) {

          poline[this.selectedField] = updatedValue;
          try {
            const response = await this.acquisitionService.updatePOLine(poId, poline).toPromise();
            //console.log(`Update successful:`, response);
            this.updatedCount++;
        
            if (this.createResultSets) { await this.addPhysicalIdToSet(poId, 'success'); }
          } catch (updateError) {
            this.errorsCount++;
            if (this.createResultSets) { await this.addPhysicalIdToSet(poId, 'error'); }
          }
        } else {
            this.errorsCount++;
            if (this.createResultSets) { await this.addPhysicalIdToSet(poId, 'error'); }
        }
      } else {
        this.errorsCount++;
      }
    } catch (error) {
      this.errorsCount++;
    }
  }

  private extractRowData(row: string[]): { poId: string; textOriginal?: string; textNou?: string } {
    return { poId: row[0], textOriginal: row[1], textNou: row[2] }
  }

  private calculateUpdatedValue(poline: any, textOriginal?: string, textNou?: string): string | null {
    
    const fieldValue = typeof poline[this.selectedField] === 'object'
      ? poline[this.selectedField]?.value
      : poline[this.selectedField];
    if (this.exactContent) {
      return fieldValue === textOriginal ? textNou! : null;
    } else {
      if (textOriginal === '') {
        return fieldValue === textOriginal ? textNou! : null;
      } else {
        return fieldValue && fieldValue.includes(textOriginal!) ? fieldValue.replace(textOriginal!, textNou!) : null;
      }
    }
  }
  
  private async addPhysicalIdToSet(poId: string, setType: 'success' | 'error'): Promise<void> {

    if (setType === 'success') {
      if (!this.setCreated) {
        this.setCreated = true;
        const date = formatDate(new Date());
        const nameSet = `CloudAppSet ${date} : ${this.translate.instant('global.sets.change')} '${this.selectedField}' - ${this.translate.instant('global.sets.updatedRecords')}`;
        const result = await createSet(nameSet, 'PO_LINE', this.ConfigService);
        
        this.setId = result.id;
        this.set = result.set;
      }

      if (!this.updatedPOLines.includes(poId)) {
        this.updatedPOLines.push(poId);
      }
      
    } else {
      if (!this.errorSetCreated) {
        this.errorSetCreated = true;
        const date = formatDate(new Date());
        const nameSet = `CloudAppSet ${date} : ${this.translate.instant('global.sets.change')} '${this.selectedField}' - ${this.translate.instant('global.sets.notUpdatedRecords')}`;
        const result = await createSet(nameSet, 'PO_LINE', this.ConfigService); 
        this.errorSetId = result.id;
        this.errorSet = result.set;
      }
      if (!this.errorPOLines.includes(poId)) {
        this.errorPOLines.push(poId);
      }

    }
  }
  
  private validateInputs(): boolean {
    if (!this.selectedFile) {
      showAlert(this.alert, this.translate, 'validateFile.error.emptyFile');
      return false;
    }{
      const maxFileSize = 2 * 1024 * 1024;
      if (this.selectedFile.size > maxFileSize) {
        showAlert(this.alert, this.translate, 'validateFile.error.fileTooLarge');
        return;
      }
    }
    if (!this.selectedFile.name.endsWith('.csv')) {
      showAlert(this.alert, this.translate, 'validateFile.error.invalidFileType');
      return false;
    }
    if (!this.selectedField) {
      showAlert(this.alert, this.translate, 'errors.selectField');
      return false;
    }
    return true;
  }

  validateCSV(rows: string[][]): boolean {
    if (rows.length === 0) {
      showAlert(this.alert, this.translate, 'errors.emptyInvalid');
      return false;
    }
    
    const headers = rows[0];
      if (!REQUIRED_COLUMN_HEADERS.some((requiredColumns) => validateColumns(headers, requiredColumns))) {
      showAlert(this.alert, this.translate, 'modifyItems.error.headers', true, false, false, 10000);
      return false;
    }
    return true;
  }

  async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = () => resolve(fileReader.result as string);
      fileReader.onerror = () => {
        showAlert(this.alert, this.translate, 'errors.readingFile');
        reject(new Error('File reading error'));
      };
      fileReader.readAsText(file);
    });
  }

  resetCounters(): void {
    this.totalRows = 0;
    this.updatedCount = 0;
    this.errorsCount = 0;
    this.updatedPOLines = [];
    this.errorPOLines = [];
    this.setCreated = false;
    this.setId = null;
    this.errorSetId = null;
    this.processedCount = 0;
  }

  private showResults(): void {
    if (this.updatedCount > 0 && this.errorsCount > 0) {
      showAlert(this.alert, this.translate, 'modifyItems.warning.partialSuccess', false, true, false, 15000);
    } else if (this.updatedCount > 0 && this.errorsCount == 0) {
      showAlert(this.alert, this.translate, 'modifyItems.success.recordsUpdated', false, false, false, 15000);
    } else {
      showAlert(this.alert, this.translate, 'modifyItems.error.recordsNotUpdated', true, false, false, 15000);
    }
  }

  private async finalize(): Promise<void> {

    if (this.createResultSets) {
      const threshold = 1000;

      // Process updatedPOLines in chunks of 1000
      while (this.updatedPOLines.length > 0) {
        const chunk = this.updatedPOLines.splice(0, threshold);
        await addMembersToSet(this.setId!, chunk, this.set, this.ConfigService);
      }
      
      // Process errorPOLines in chunks of 1000
      while (this.errorPOLines.length > 0) {
        const chunk = this.errorPOLines.splice(0, threshold);
        await addMembersToSet(this.errorSetId!, chunk, this.errorSet, this.ConfigService);
      }
    }

    this.loading = false;

    showSummary(
      this.dialog,
      this.updatedCount,
      this.errorsCount,
      this.totalRows,
      this.setId,
      this.errorSetId,
      this.timer.elapsedMinutes,
      this.timer.elapsedSeconds
    );

    const institutionCode = localStorage.getItem('institutionCode') || 'UNKNOWN_INSTITUTION';

    const processData = {
      updatedCount: this.updatedCount,
      errorsCount: this.errorsCount,
      totalRows: this.totalRows,
      elapsedMinutes: this.timer.elapsedMinutes,
      elapsedSeconds: this.timer.elapsedSeconds,
      type: 'modify_polines',
      institutionCode: institutionCode
    };

    // Send the data to the server
    this.processDataService.sendProcessData(processData).subscribe(
      (response) => {
        console.log('Data sent successfully:', response);
      },
      (error) => {
        console.error('Error sending data:', error);
      }
    );

  }

}
