import { Component, OnInit } from '@angular/core';
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { ItemService } from '../../../services/item.service';
import { ConfigService } from '../../../services/configuration.service';
import { MatDialog } from '@angular/material/dialog';
import { ALLOWED_COLUMN_COUNTS } from './field-options';
import { showAlert, formatDate, showSummary, logError, ErrorLogEntry } from '../../../utils/utils-alert';
import { FileValidationResult, parseCSV, validateFile } from '../../../utils/utils-csv';
import { chunkArray } from '../../../utils/utils-misc';
import { createSet, addMembersToSet } from '../../../utils/utils-sets';
import { Timer } from '../../../utils/utils-timer';
import { ProcessDataService } from '../../../services/process-data.service';
import { UserAccessService } from '../../../services/userAccess.service'

// Lines processed in block
const CHUNK_SIZE = 25;

@Component({
  selector: 'app-create-items',
  templateUrl: './create-items.component.html',
  styleUrls: ['./create-items.component.scss'],
})

export class CreateItemsInBulk implements OnInit {
  // Form inputs
  createResultSets: boolean = false;
  generateDescription: boolean = false;
  selectedFile: File | null = null;

  // File Validation
  fileValidated: boolean = false; // default: false (true = tests)
  validationError: string | null = null;
  rowCount: number | null = null;

  // Processing State
  loading: boolean;
  private timer = new Timer();
  loaderStatusMessage: string = '';

  // Results
  totalRows : number;
  processedCount : number;
  createdCount: number = 0;
  errorsCount: number = 0;

  // Sets
  private setCreated: boolean = false;
  private setId: string | null = null;
  private set: any = null;
  private createdPhysicalIds: string[] = [];

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
    const result: FileValidationResult = await validateFile(this.selectedFile, ALLOWED_COLUMN_COUNTS, this.translate, 'optional');
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
  
    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);
  
    this.totalRows = dataRows.length;
    this.processedCount = 0;
  
    this.loading = true;
    this.timer.startTimer();

    const blocks = chunkArray(dataRows, CHUNK_SIZE);
    for (const block of blocks) {
      await Promise.all(block.map(row => this.processRow(headers, row)));
      this.processedCount += block.length;
    }
  
    this.timer.stopTimer();
  
    this.showResults();

    await this.finalize();
  }

  private async processRow(headers: string[], row: string[]): Promise<void> {
    const itemData = headers.reduce((acc, header, index) => {
      acc[header] = row[index] ? row[index].trim() : '';
      return acc;
    }, {} as { [key: string]: string });

    await this.createNewItem(itemData);

  }
    
  private generateXMLAndIdentifiers(itemData: { [key: string]: string }): { mmsId: string, holdingId: string, xml: string } {
    const mmsId = itemData["MMS ID"];
    const holdingId = itemData["Holding ID"];
  
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    xml += '<item>\n';
  
    // Build bib_data section
    xml += `  <bib_data link="https://api-eu.hosted.exlibrisgroup.com/almaws/v1/bibs/${this.escapeXml(String(mmsId))}">\n`;
    xml += `    <mms_id>${this.escapeXml(String(mmsId))}</mms_id>\n`;
    xml += '  </bib_data>\n';
  
    // Build holding_data section
    xml += `  <holding_data link="https://api-eu.hosted.exlibrisgroup.com/almaws/v1/bibs/${this.escapeXml(String(mmsId))}/holdings/${this.escapeXml(String(holdingId))}">\n`;
    xml += `    <holding_id>${this.escapeXml(String(holdingId))}</holding_id>\n`;
    xml += '  </holding_data>\n';
  
    // Build item_data section
    xml += '  <item_data>\n';
    for (const key in itemData) {
      if (itemData.hasOwnProperty(key) && key !== 'MMS ID' && key !== 'Holding ID') {
        const value = itemData[key];
        if (value === undefined || value === null || value === '') {
          continue;
        }
        xml += `    <${key}>${this.escapeXml(String(value))}</${key}>\n`;
      }
    }
    xml += '  </item_data>\n';
    xml += '</item>';
  
    return { mmsId, holdingId, xml };
  }

  async createNewItem(itemData: { [key: string]: string }): Promise<void> {
    
    const { mmsId, holdingId, xml } = this.generateXMLAndIdentifiers(itemData);
  
    try {
      const response = (await this.itemService.createItem(mmsId, holdingId, xml, this.generateDescription).toPromise());

      this.createdCount++;

      if (this.createResultSets) {

        const physicalId = response?.item_data?.pid;

        if (physicalId) {
          await this.addItemToSet(physicalId);
        }
      }
    } catch (error) {
      this.errorsCount++;
      logError(this.errorLog, { mmsId }, `${error?.message || error}`);
    }
    
  }
      
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }  

  private async addItemToSet(physicalId: string): Promise<void> {
    if (!this.setCreated) {
      this.setCreated = true;
      const date = formatDate(new Date());
      const nameSet = `CloudAppSet ${date} : ${this.translate.instant('global.sets.create')} - ${this.translate.instant('global.sets.createdRecords')}`;
      const result = await createSet(nameSet, 'ITEM', this.ConfigService);
      this.setId = result.id;
      this.set = result.set;
    }
  
    if (!this.createdPhysicalIds.includes(physicalId)) {
      this.createdPhysicalIds.push(physicalId);
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
    this.createdCount = 0;
    this.errorsCount = 0;
    this.createdPhysicalIds = [];
    this.setCreated = false;
    this.setId = null;
    this.processedCount = 0;
    this.errorLog = [];
  }

  private showResults(): void {
    if (this.createdCount > 0 && this.errorsCount > 0) {
      showAlert(this.alert, this.translate, 'createItems.warning.partialSuccess', false, true, false, 15000);
    } else if (this.createdCount > 0 && this.errorsCount == 0) {
      showAlert(this.alert, this.translate, 'createItems.success.recordsCreated', false, false, false, 15000);
    } else {
      showAlert(this.alert, this.translate, 'createItems.error.recordsNotCreated', true, false, false, 15000);
    }
  }

  private async finalize(): Promise<void> {

    this.loaderStatusMessage = this.translate.instant('loader.preparingResultsAndSets');
    await this.timer.sleep(3000);

    if (this.createResultSets) {
      const threshold = 1000;
  
      // Process updatedPhysicalIds in chunks of 1000
      while (this.createdPhysicalIds.length > 0) {
        const chunk = this.createdPhysicalIds.splice(0, threshold);
        await addMembersToSet(this.setId!, chunk, this.set, this.ConfigService);
      }
    }
  
    this.loading = false;

    showSummary(
      this.dialog,
      this.createdCount,
      this.errorsCount,
      this.totalRows,
      this.setId,
      null,
      this.timer.elapsedMinutes,
      this.timer.elapsedSeconds,
      this.errorLog
    );

    this.loaderStatusMessage = '';

    const institutionCode = localStorage.getItem('institutionCode') || 'UNKNOWN_INSTITUTION';

    const processData = {
      updatedCount: this.createdCount,
      errorsCount: this.errorsCount,
      totalRows: this.totalRows,
      elapsedMinutes: this.timer.elapsedMinutes,
      elapsedSeconds: this.timer.elapsedSeconds,
      type: 'create_items',
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
