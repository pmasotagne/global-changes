import { Component, OnInit } from '@angular/core';
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { ItemService } from '../../../services/item.service';
import { ConfigService } from '../../../services/configuration.service';
import { MatDialog } from '@angular/material/dialog';
import { fieldOptions, positionOptions, delimiterOptions, REQUIRED_COLUMN_HEADERS, ALLOWED_COLUMN_COUNTS } from './field-options';
import { showAlert, formatDate, showSummary, logError, ErrorLogEntry } from '../../../utils/utils-alert';
import { FileValidationResult, parseCSV, validateColumns, validateFile } from '../../../utils/utils-csv';
import { chunkArray } from '../../../utils/utils-misc';
import { createSet, addMembersToSet } from '../../../utils/utils-sets';
import { Timer } from '../../../utils/utils-timer';
import { ProcessDataService } from '../../../services/process-data.service';
import { UserAccessService } from '../../../services/userAccess.service'

// Lines processed in block
const CHUNK_SIZE = 25;

@Component({
  selector: 'app-moveField-items',
  templateUrl: './move-field-items.component.html',
  styleUrls: ['./move-field-items.component.scss'],
})

export class MoveFieldItemsComponent implements OnInit {
  // Form inputs
  emptyField: boolean = false;
  createResultSets: boolean = false;
  selectedFile: File | null = null;
  selectedFieldOrigin: string;
  selectedFieldDestination: string;
  selectedFieldPosition: string;
  selectedFieldDelimiter: string;
  isDelimiterDisabled: boolean = false;

  // File Validation
  fileValidated: boolean = false;
  validationError: string | null = null;
  rowCount: number | null = null;

  // Processing State
  loading: boolean;
  private timer = new Timer();

  // Results
  totalRows : number;
  processedCount : number;
  updatedCount: number = 0;
  errorsCount: number = 0;

  // Sets
  private setCreated: boolean = false;
  private setId: string | null = null;
  private set: any = null;
  private updatedPhysicalIds: string[] = [];

  private errorSetCreated: boolean = false;
  private errorSetId: string | null = null;
  private errorSet: any = null;
  private errorPhysicalIds: string[] = [];

  // Options
  fieldOptions = fieldOptions;
  positionOptions = positionOptions;
  delimiterOptions = delimiterOptions;

  // User Validation
  checkingUser: boolean = false;
  isModuleUserAllowed: boolean = false;

  // Logs
  errorLog: ErrorLogEntry[] = [];

  constructor(
    private router: Router,
    private translate: TranslateService,
    private alert: AlertService,
    private itemService: ItemService,
    private ConfigService: ConfigService,
    private dialog: MatDialog,
    private userAccessService: UserAccessService,
    private processDataService: ProcessDataService
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.checkingUser = true;
    this.userAccessService.isModuleAccessAllowed('items')
      .subscribe(
        allowed => {
          this.isModuleUserAllowed = allowed;
          this.checkingUser = false;
          this.loading = false;
        },
        error => {
          const alertMsg = this.translate.instant('main.error.permissionCheck', { status: error.status });
          this.alert.error(alertMsg, { autoClose: true });
          this.checkingUser = false;
          this.loading = false;
        }
      );

    this.sortAndTranslateOptions(this.fieldOptions);
    this.sortAndTranslateOptions(this.positionOptions);
    this.sortAndTranslateOptions(this.delimiterOptions);
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

  // Block / Empty delimiter dropdown
  onPositionChange(): void {
    if (this.selectedFieldPosition === 'overwrite') {
      this.selectedFieldDelimiter = '';
      this.isDelimiterDisabled = true;
    } else {
      this.isDelimiterDisabled = false;
    }
  }

  // Sort field options alphabetically and translate their labels
  private sortAndTranslateOptions(options: { label: string }[]): void {
    const translationKeys = options.map(option => option.label);
  
    this.translate.get(translationKeys).subscribe(translations => {
      options.forEach(option => {
        option.label = translations[option.label];
      });
  
      options.sort((a, b) => a.label.localeCompare(b.label));
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
    const result: FileValidationResult = await validateFile(this.selectedFile, ALLOWED_COLUMN_COUNTS, this.translate, 'item');
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
      let item : any = null;
      let { mmsId, holdingId, physicalId } = this.extractRowData(row);
      if (!holdingId || !physicalId){
        item = await this.itemService.getItem({barcode: mmsId}).toPromise();
        holdingId = item.holding_data.holding_id;
        physicalId = item.item_data.pid;
      }else{
        item = await this.itemService.getItem({mmsid: mmsId, holdingid: holdingId, pid: physicalId}).toPromise();
      }

      if (!item?.item_data || !item.item_data[this.selectedFieldOrigin]) {
        this.errorsCount++;
        logError(this.errorLog, { physicalId }, this.translate.instant('resume.resumeErrors.field_not_found', { field: this.selectedFieldOrigin }));
        if (this.createResultSets) { await this.addPhysicalIdToSet(physicalId, 'error'); }
        return;
      }

      const updatedValue = this.calculateUpdatedValue(item, this.selectedFieldOrigin, this.selectedFieldDestination, this.selectedFieldPosition, this.selectedFieldDelimiter);
  
      if (updatedValue !== null) {
        item.item_data[this.selectedFieldDestination] = updatedValue;
  
        if (this.emptyField == true) { item.item_data[this.selectedFieldOrigin] = ""; }

        try {
          const response = await this.itemService.updateItem(mmsId, holdingId, physicalId, item).toPromise();
          //console.log(`Update successful:`, response);
          this.updatedCount++;
  
          if (this.createResultSets) {
            await this.addPhysicalIdToSet(physicalId, 'success');
          }
        } catch (updateError) {
          this.errorsCount++;
          logError(this.errorLog, { physicalId }, this.translate.instant('resume.resumeErrors.item_update_failed', { error: updateError?.message || updateError }));
          if (this.createResultSets) { await this.addPhysicalIdToSet(physicalId, 'error'); }
        }
      } else {
        this.errorsCount++;
        logError(this.errorLog, { physicalId }, this.translate.instant('resume.resumeErrors.values_not_moved'));
        if (this.createResultSets) { await this.addPhysicalIdToSet(physicalId, 'error'); }
      }
    } catch (error) {
      this.errorsCount++;
      logError(this.errorLog, { barcode : undefined }, `${error?.message || error}`);
    }
  }

  private extractRowData(row: string[]): { mmsId: string; holdingId?: string; physicalId?: string; } {
    return row.length === 1
      ? { mmsId: row[0] }
      : { mmsId: row[0], holdingId: row[1], physicalId: row[2] };
  }

  private calculateUpdatedValue(
    item: any,
    selectedFieldOrigin: string,
    selectedFieldDestination: string,
    selectedFieldPosition: string,
    selectedFieldDelimiter: string
  ): string | null {
    const getFieldValue = (field: string) => {
      const value = item.item_data[field];
      return typeof value === 'object' ? value?.value : value;
    };
      
    const fieldOriginValue = getFieldValue(selectedFieldOrigin)?.trim() || "";
    const fieldDestinationValue = getFieldValue(selectedFieldDestination)?.trim() || "";
      
    if (selectedFieldPosition === "overwrite") {
      console.log("Updated Value (overwrite):", fieldOriginValue);
      return fieldOriginValue;
    }
      
    if (!fieldDestinationValue) {
      console.log("Updated Value Empty Destination:", fieldOriginValue);
      return fieldOriginValue;
    }
      
    // Determine order based on position
    const [first, second] =
      selectedFieldPosition === "front"
        ? [fieldOriginValue, fieldDestinationValue]
        : [fieldDestinationValue, fieldOriginValue];
      
    const delimiter = selectedFieldDelimiter === "." ? `${selectedFieldDelimiter} ` : ` ${selectedFieldDelimiter} `;
    const updatedValue = `${first}${delimiter}${second}`;
      
    console.log("Updated Value:", updatedValue);
    return updatedValue;
  }
      
  private async addPhysicalIdToSet(physicalId: string, setType: 'success' | 'error'): Promise<void> {
    if (setType === 'success') {
      // For updated items
      if (!this.setCreated) {
        this.setCreated = true;
        const date = formatDate(new Date());
        const nameSet = `CloudAppSet ${date} : ${this.translate.instant('global.sets.move')} '${this.selectedFieldOrigin}' - '${this.selectedFieldDestination}' : ${this.translate.instant('global.sets.updatedRecords')}`;
        const result = await createSet(nameSet, 'ITEM', this.ConfigService);
        
        this.setId = result.id;
        this.set = result.set;
      }
      // Add physicalId if not already present
      if (!this.updatedPhysicalIds.includes(physicalId)) {
        this.updatedPhysicalIds.push(physicalId);
      }
    } else {
      // For error items
      if (!this.errorSetCreated) {
        this.errorSetCreated = true;
        const date = formatDate(new Date());
        const nameSet = `CloudAppSet ${date} : ${this.translate.instant('global.sets.move')} '${this.selectedFieldOrigin}' - '${this.selectedFieldDestination}' : ${this.translate.instant('global.sets.notUpdatedRecords')}`;
        const result = await createSet(nameSet, 'ITEM', this.ConfigService); 
        this.errorSetId = result.id;
        this.errorSet = result.set;
      }
      if (!this.errorPhysicalIds.includes(physicalId)) {
        this.errorPhysicalIds.push(physicalId);
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
    if (!this.selectedFieldOrigin || !this.selectedFieldDestination) {
      showAlert(this.alert, this.translate, 'errors.selectField');
      return false;
    }
    if (!this.selectedFieldPosition){
        showAlert(this.alert, this.translate, 'errors.selectPosition');
        return false;
    } else if (this.selectedFieldPosition !== "overwrite" && !this.selectedFieldDelimiter) {
        showAlert(this.alert, this.translate, 'errors.selectDelimiter');
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
      showAlert(this.alert, this.translate, 'moveFieldItems.error.headers', true, false, false, 10000);
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
    this.updatedPhysicalIds = [];
    this.errorPhysicalIds = [];
    this.setCreated = false;
    this.setId = null;
    this.errorSetId = null;
    this.processedCount = 0;
    this.errorLog = [];
  }

  private showResults(): void {
    if (this.updatedCount > 0 && this.errorsCount > 0) {
      showAlert(this.alert, this.translate, 'moveFieldItems.warning.partialSuccess', false, true, false, 15000);
    } else if (this.updatedCount > 0 && this.errorsCount == 0) {
      showAlert(this.alert, this.translate, 'moveFieldItems.success.recordsUpdated', false, false, false, 15000);
    } else {
      showAlert(this.alert, this.translate, 'moveFieldItems.error.recordsNotUpdated', true, false, false, 15000);
    }
  }

  private async finalize(): Promise<void> {
    if (this.createResultSets) {
      const threshold = 1000;

      // Process updatedPhysicalIds in chunks of 1000
      while (this.updatedPhysicalIds.length > 0) {
        const chunk = this.updatedPhysicalIds.splice(0, threshold);
        await addMembersToSet(this.setId!, chunk, this.set, this.ConfigService);
      }
      
      // Process errorPhysicalIds in chunks of 1000
      while (this.errorPhysicalIds.length > 0) {
        const chunk = this.errorPhysicalIds.splice(0, threshold);
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
      this.timer.elapsedSeconds,
      this.errorLog
    );

    const institutionCode = localStorage.getItem('institutionCode') || 'UNKNOWN_INSTITUTION';

    const processData = {
      updatedCount: this.updatedCount,
      errorsCount: this.errorsCount,
      totalRows: this.totalRows,
      elapsedMinutes: this.timer.elapsedMinutes,
      elapsedSeconds: this.timer.elapsedSeconds,
      type: 'move_field_items',
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
