import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { AlertService } from '@exlibris/exl-cloudapp-angular-lib'
import { Router } from '@angular/router';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService } from '@ngx-translate/core'
import { MatDialog } from '@angular/material/dialog';
import { ProcessSummaryModalComponent } from '../../resume/resume.component';
import { REQUIRED_COLUMN_HEADERS, ALLOWED_COLUMN_COUNTS } from './field-options';
import { showAlert, logError, ErrorLogEntry } from '../../../utils/utils-alert';
import { chunkArray } from '../../../utils/utils-misc';
import { FileValidationResult, parseCSV, validateColumns, validateFile } from '../../../utils/utils-csv';
import { Timer } from '../../../utils/utils-timer';
import { ProcessDataService } from '../../../services/process-data.service';
import { UserAccessService } from '../../../services/userAccess.service';

// Lines processed in block
const CHUNK_SIZE = 25;

@Component({
  selector: 'remove-users',
  templateUrl: './remove-users.component.html',
  styleUrls: ['./remove-users.component.scss']
})

export class RemoveUsersComponent implements OnInit {
  selectedFile: File | null = null;

  // File Validation
  fileValidated: boolean = false;
  validationError: string | null = null;
  rowCount: number | null = null;

  count = 0;
  totalRows : number;
  error = false;
  loading: boolean;
  private timer = new Timer();
  selectedEntities = new Array<Entity>();
  processedCount : number;
  removedCount : number;
  errorsCount : number;
  loaderStatusMessage: string = '';

  createdNumbers: string[] = [];

  // User Validation
  checkingUser: boolean = false;
  isModuleUserAllowed: boolean = false;

  // Logs
  errorLog: ErrorLogEntry[] = [];

  constructor(
    private userService: UserService,
    private router: Router,
    private dialog: MatDialog,
    private translate: TranslateService,
    private alert: AlertService,
    private userAccessService: UserAccessService,
    private processDataService: ProcessDataService
  ) { }

  ngOnInit() {
    this.loading = true;
    this.checkingUser = true;
    this.userAccessService.isModuleAccessAllowed('users')
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

  back(): void {
    if (!this.loading) {
      this.router.navigate(['/main']);
    }
  }

  reload(): void {
    if (!this.loading) {
      this.fileValidated = false;
      this.selectedFile = null;
      this.resetCounters();
    }
  }

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
    const result: FileValidationResult = await validateFile(this.selectedFile, ALLOWED_COLUMN_COUNTS, this.translate, 'user');
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
      let { userId } = this.extractRowData(row);

      await this.userService.deleteUser(userId).toPromise();

      this.removedCount++;
      
    } catch (error) {
      this.errorsCount++;
      logError(this.errorLog, { holdingId : undefined }, `${error?.message || error}`);
    }
  }

  private extractRowData(row: string[]): { userId: string } {
    return { userId: row[0] };
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

  validateCSV(rows: string[][]): boolean {
    if (rows.length === 0) {
      showAlert(this.alert, this.translate, 'errors.emptyInvalid');
      return false;
    }
    
    const headers = rows[0];
      if (!REQUIRED_COLUMN_HEADERS.some((requiredColumns) => validateColumns(headers, requiredColumns))) {
      // falta aquesta traducció als fitxers
      showAlert(this.alert, this.translate, 'removeUsers.error.headers', true, false, false, 10000);
      return false;
    }
    return true;
  }

  resetCounters(): void {
    this.totalRows = 0;
    this.removedCount = 0;
    this.errorsCount = 0;
    this.processedCount = 0;
    this.errorLog = [];
  }

  openSummaryModal() {
    this.dialog.open(ProcessSummaryModalComponent, {
      data: {
        users : true,
        totalRows: this.totalRows,
        processedCount: this.processedCount,
        removedCount: this.removedCount,
        errorsCount: this.errorsCount,
        minutes: this.timer.elapsedMinutes,
        seconds: this.timer.elapsedSeconds,
        errorLog: this.errorLog
      }
    });
  }

  private showResults(): void {
    if (this.removedCount > 0 && this.errorsCount > 0) {
      showAlert(this.alert, this.translate, 'modifyItems.warning.partialSuccess', false, true, false, 15000);
    } else if (this.removedCount > 0 && this.errorsCount == 0) {
      showAlert(this.alert, this.translate, 'modifyItems.success.recordsUpdated', false, false, false, 15000);
    } else {
      showAlert(this.alert, this.translate, 'modifyItems.error.recordsNotUpdated', true, false, false, 15000);
    }
  }

  private async finalize(): Promise<void> {
    this.loading = false;

    this.openSummaryModal();

    const institutionCode = localStorage.getItem('institutionCode') || 'UNKNOWN_INSTITUTION';

    const processData = {
      updatedCount: this.removedCount,
      errorsCount: this.errorsCount,
      totalRows: this.totalRows,
      elapsedMinutes: this.timer.elapsedMinutes,
      elapsedSeconds: this.timer.elapsedSeconds,
      type: 'remove_users',
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
