import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AlertModule, CloudAppTranslateModule, MaterialModule } from '@exlibris/exl-cloudapp-angular-lib';
import { SelectEntitiesModule } from 'eca-components';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ConfigurationComponent } from './components/configuration/configuration.component';
import { FindUserComponent } from './components/findUser/findUser.component';
import { LoaderComponent } from './components/loader/loader.component';
import { MainComponent } from './components/main/main.component';
import { ModificarExemplarComponent } from './components/items/modify-items/modify-items.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { ProcessSummaryModalComponent } from './components/resume/resume.component';
import { MoveFieldItemsComponent } from './components/items/move-fields/move-field-items.component';
import { SplitFieldItemsComponent } from './components/items/split-fields/split-field-items.component';
import { CreateItemsInBulk } from './components/items/create-items/create-items.component';
import { ClonePOLinesComponent } from './components/acquisitions/clone-po-lines/clone-POLines.component';
import { ModifyPOLinesComponent } from './components/acquisitions/modify-po-lines/modify-po-lines.component';
import { MenuComponent } from './components/menu/menu.component';
import { CodeTablesComponent } from './components/code-tables/code-tables.component';
import { ModifyHoldingsComponent } from './components/holdings/modify-holdings/modify-holdings.component';
import { RemoveUsersComponent } from './components/users/remove-users/remove-users.component';

@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
    ConfigurationComponent,
    ProcessSummaryModalComponent,
    FindUserComponent,
    LoaderComponent,
    ModificarExemplarComponent,
    MoveFieldItemsComponent,
    MenuComponent,
    SplitFieldItemsComponent,
    CreateItemsInBulk,
    ClonePOLinesComponent,
    ModifyPOLinesComponent,
    CodeTablesComponent,
    ModifyHoldingsComponent,
    RemoveUsersComponent
  ],
  entryComponents: [
    ProcessSummaryModalComponent,
    FindUserComponent,
    LoaderComponent,
  ],
  imports: [
    SelectEntitiesModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MaterialModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    AlertModule,
    FormsModule,
    ReactiveFormsModule,
    CloudAppTranslateModule.forRoot(),
    CommonModule,
    MatCheckboxModule,
    MatButtonModule,
    TranslateModule,
    MatIconModule,
    MatInputModule
  ],
  providers: [
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'standard' } }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

