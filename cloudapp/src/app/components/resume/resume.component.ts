import { Component, Inject } from "@angular/core"
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog"
import { NgModule } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'resume',
  templateUrl: './resume.component.html',
  styleUrls: ['./resume.component.scss']
})

@NgModule({
  imports: [
    MatExpansionModule
  ]
})
  
export class ProcessSummaryModalComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ProcessSummaryModalComponent>
  ) { }

  close() {
    this.dialogRef.close()
  }

}
