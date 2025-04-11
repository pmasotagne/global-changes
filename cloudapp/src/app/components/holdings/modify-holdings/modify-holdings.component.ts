import { Component, OnInit } from '@angular/core';
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { ItemService } from '../../../services/item.service';
import { MatDialog } from '@angular/material/dialog';
import { fieldOptions, REQUIRED_COLUMN_HEADERS, ALLOWED_COLUMN_COUNTS } from './field-options';
import { showAlert, showSummary } from '../../../utils/utils-alert';
import { FileValidationResult, parseCSV, validateColumns, validateFile } from '../../../utils/utils-csv';
import { chunkArray } from '../../../utils/utils-misc';
import { Timer } from '../../../utils/utils-timer';
import { ProcessDataService } from '../../../services/process-data.service';
import { UserAccessService } from '../../../services/userAccess.service'

// Lines processed in block
const CHUNK_SIZE = 25;

@Component({
  selector: 'app-modify-holding',
  templateUrl: './modify-holdings.component.html',
  styleUrls: ['./modify-holdings.component.scss'],
})

export class ModifyHoldingsComponent implements OnInit {
  // Form inputs
  selectedFile: File | null = null;

  // File Validation
  fileValidated: boolean = false; // default: false (true = tests)
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

  // Options
  fieldOptions = fieldOptions;

  // User Validation
  checkingUser: boolean = false;
  isModuleUserAllowed: boolean = false;

  constructor(
    private router: Router,
    private translate: TranslateService,
    private alert: AlertService,
    private itemService: ItemService,
    private dialog: MatDialog,
    private userAccessService: UserAccessService,
    private processDataService: ProcessDataService
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.checkingUser = true;
    this.userAccessService.isModuleAccessAllowed('holdings')
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
    const result: FileValidationResult = await validateFile(this.selectedFile, ALLOWED_COLUMN_COUNTS, this.translate, 'holding');
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
      let holding : any = null;
      let { mmsId, holdingId, field, subfield, textOriginal, textNou } = this.extractRowData(row);
      
      holding = await this.itemService.getHolding({mmsid: mmsId, holdingid: holdingId});
      
      let marcXML = holding.anies[0];

      const parser = new DOMParser();

      const xmlDoc = parser.parseFromString(marcXML, "application/xml");

      const datafields = Array.from(xmlDoc.getElementsByTagName("datafield"));

      let matchCount = 0;

      for (let df of datafields) {
        if (df.getAttribute("tag") === field) {
          const subfields = Array.from(df.getElementsByTagName("subfield"));
          for (let sf of subfields) {
            if (sf.getAttribute("code") === subfield) {
              if(sf.textContent === textOriginal){
                sf.textContent = textNou;
                matchCount++;
              }
            }
          }
        }
      }

      if (matchCount > 0) {
        holding.anies = new XMLSerializer().serializeToString(xmlDoc.documentElement);

        const holding_record = `<holding>${holding.anies}</holding>`;
        
        try {
          const response = await this.itemService.updateHolding(mmsId, holdingId, holding_record).toPromise();
          //console.log(`Update successful:`, response);
          this.updatedCount++;
        }catch(updateError){
          this.errorsCount++;
        }
      }else{
        this.errorsCount++;
      }

    } catch (error) {
      this.errorsCount++;
    }
  }

  private extractRowData(row: string[]): { mmsId: string; holdingId?: string; field?: string; subfield?: string; textOriginal?: string; textNou?: string } {
    return { mmsId: row[0], holdingId: row[1], field: row[2], subfield: row[3], textOriginal: row[4], textNou: row[5] };
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
    null;
    null;
    null;
    null;
    null;
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
    this.loading = false;

    showSummary(
      this.dialog,
      this.updatedCount,
      this.errorsCount,
      this.totalRows,
      null,
      null,
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
      type: 'modify_holdings',
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
