import { Component, Inject } from "@angular/core"
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog"
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'resume',
  templateUrl: './resume.component.html',
  styleUrls: ['./resume.component.scss']
})
  
export class ProcessSummaryModalComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ProcessSummaryModalComponent>,
    private snackBar: MatSnackBar
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
      this.snackBar.open('All identifiers copied!', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-success']
      });
    }).catch(() => {
      this.snackBar.open('Failed to copy all', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-error']
      });
    });
  }

}
