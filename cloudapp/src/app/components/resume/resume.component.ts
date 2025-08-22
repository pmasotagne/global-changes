import { Component, Inject } from "@angular/core"
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog"
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'resume',
  templateUrl: './resume.component.html',
  styleUrls: ['./resume.component.scss']
})
  
export class ProcessSummaryModalComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ProcessSummaryModalComponent>,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) { }

  close() {
    this.dialogRef.close()
  }

  copyToClipboard(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      this.snackBar.open('Copied to clipboard!', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-success']
      });
    }).catch(() => {
      this.snackBar.open('Failed to copy', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-error']
      });
    });
  }

  copyAllIdentifiers() {
    // Flatten all identifiers into a string
    const allIds = this.data.errorLog
      .map(e => Object.entries(e.identifiers)
        .map(([k, v]) => `${k}: ${v}`).join(' | '))
      .join('\n');

    navigator.clipboard.writeText(allIds).then(() => {
      this.translate.get('resume.idsCopied').subscribe((msg: string) => {
        this.snackBar.open(msg, this.translate.instant('resume.idsCopied'), {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['snackbar-success']
        });
      });
    }).catch(() => {
      this.translate.get('resume.idsCopiedFailed').subscribe((msg: string) => {
        this.snackBar.open(msg, this.translate.instant('resume.idsCopiedFailed'), {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['snackbar-error']
        });
      });
    });
  }

  /** Download errors file */
  downloadAsFile(filename: string, filetype: string, contents: string): boolean {
    try {
      const blob = new Blob([contents], { type: filetype });
      const url = URL.createObjectURL(blob);

      const element = document.createElement('a');
      element.href = url;
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      URL.revokeObjectURL(url); // cleanup
      return true;
    } catch (error: any) {
      console.warn('Download file failed!', error.message);
      return false;
    }
  }

  /** Download all error log entries as CSV */
  downloadErrorsCsv(): void {
    if (!this.data?.errorLog?.length) {
      console.warn('No error log available to download');
      return;
    }

    // Get identifier keys from the first error
    const identifierKeys = Object.keys(this.data.errorLog[0]?.identifiers || {});

    // CSV header
    const headers = [...identifierKeys, 'Error'];
    const rows: string[] = [];
    rows.push(headers.join(','));

    // CSV rows
    this.data.errorLog.forEach((e: any) => {
      const row = [
        ...identifierKeys.map(k => e.identifiers[k] || ''),
        e.error
      ];
      rows.push(row.map(val => `"${val}"`).join(','));
    });

    const csvContent = rows.join('\n');

    // Generate filename with current date
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const filename = `error-log-${year}-${month}-${day}.csv`;

    const ok = this.downloadAsFile(filename, 'text/csv', csvContent);

    if (ok) {
      this.translate.get('resume.downloadSuccess').subscribe((msg: string) => {
        this.snackBar.open(msg, this.translate.instant('resume.downloadSuccess'), {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['snackbar-success']
        });
      });
    } else {
      this.translate.get('resume.downloadFailed').subscribe((msg: string) => {
        this.snackBar.open(msg, this.translate.instant('resume.downloadFailed'), {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['snackbar-error']
        });
      });
    }
  }
  
}
